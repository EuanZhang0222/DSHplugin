'use strict';
// Isolated protocol fixture. No production credentials/data or real database writes.
const mysql = require(process.env.SEMANTIC_MYSQL2_MODULE || 'mysql2');
const http = require('node:http');
const rows = Array.from({ length: 1507 }, (_, i) => ({ id: String(9007199254740993n + BigInt(i)), value: `分页验收第${i + 1}条`, amount: '1234567890.123456789', secret: 'must-not-expose' }));
const columns = ['id', 'value', 'amount', 'secret'];
let sqlCalls = 0;
const mysqlPort = Number(process.env.SEMANTIC_FIXTURE_PORT || 33307), ckPort = Number(process.env.SEMANTIC_CLICKHOUSE_FIXTURE_PORT || 38124);
function output(c, data, names) {
  c.writeColumns(names.map(name => ({ catalog: 'def', schema: 'paging_fixture', table: '', orgTable: '', name, orgName: name,
    characterSet: 45, columnLength: 512, columnType: name === 'id' ? mysql.Types.LONGLONG : name === 'amount' ? mysql.Types.NEWDECIMAL : mysql.Types.VAR_STRING, flags: 0, decimals: name === 'amount' ? 9 : 0 })));
  for (const row of data) c.writeTextRow(names.map(name => row[name]));
  c.writeEof();
}
function selected(sql) { return sql.match(/^\s*SELECT\s+(.+?)\s+FROM\s/is)?.[1].split(',').map(s => s.trim().replaceAll('`', '')) || []; }
function selectRows(sql, params = {}) {
  let data = rows;
  if (sql.includes('WHERE')) {
    const low = sql.match(/`id`\s*>\s*'?(\d+)'?/)?.[1] || params.p0;
    if (low) data = data.filter(row => BigInt(row.id) > BigInt(low));
  }
  if (/ORDER BY.+DESC/i.test(sql)) data = [...data].reverse();
  const limit = sql.match(/LIMIT\s+(\d+)/i)?.[1];
  return limit ? data.slice(0, Number(limit)) : data;
}
const server = mysql.createServer();
server.on('connection', c => {
  c.serverHandshake({ protocolVersion: 10, serverVersion: '8.0.36-pagination-fixture', connectionId: 101, statusFlags: 2, characterSet: 45, capabilityFlags: 0xffffff, authCallback(_auth, done) { done(null, null); } });
  c.on('query', sql => {
    c._resetSequenceId(); c.sequenceId = 1;
    if (/information_schema\.COLUMNS/i.test(sql)) return output(c, columns.map((name, i) => ({ COLUMN_NAME: name, ORDINAL_POSITION: i + 1, COLUMN_TYPE: name === 'id' ? 'bigint' : name === 'amount' ? 'decimal(30,9)' : 'varchar(255)', IS_NULLABLE: 'YES', COLUMN_DEFAULT: null, COLUMN_COMMENT: name === 'secret' ? '敏感字段' : '分页验收字段' })), ['COLUMN_NAME', 'ORDINAL_POSITION', 'COLUMN_TYPE', 'IS_NULLABLE', 'COLUMN_DEFAULT', 'COLUMN_COMMENT']);
    if (/information_schema\.(STATISTICS|KEY_COLUMN_USAGE)/i.test(sql)) return output(c, [], ['COLUMN_NAME']);
    if (/information_schema\.TABLES/i.test(sql)) return output(c, [{ TABLE_COMMENT: '1507条完整性验收表' }], ['TABLE_COMMENT']);
    if (/FROM `paging_fixture`\.`records`/i.test(sql)) { sqlCalls++; const names = selected(sql); return output(c, selectRows(sql), names); }
    if (/SHOW DATABASES/i.test(sql)) return output(c, [{ Database: 'paging_fixture' }], ['Database']);
    if (/SHOW TABLES/i.test(sql)) return output(c, [{ name: 'records' }], ['name']);
    c.writeError({ code: 1064, message: 'Unsupported fixture query' });
  });
  c.on('ping', () => { c._resetSequenceId(); c.sequenceId = 1; c.writeOk(); });
  c.on('error', () => {});
});
server.listen(mysqlPort, '127.0.0.1');
const ck = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/stats') return response.end(JSON.stringify({ sqlCalls }));
  if (url.pathname === '/ping') return response.end('Ok.\n');
  let sql = ''; for await (const chunk of request) sql += chunk;
  const params = Object.fromEntries([...url.searchParams].filter(([key]) => key.startsWith('param_')).map(([key, value]) => [key.slice(6), value]));
  let data;
  if (/FROM `paging_fixture`\.`records`/i.test(sql)) { sqlCalls++; data = selectRows(sql, params).map(row => Object.fromEntries(selected(sql).map(name => [name, row[name]]))); }
  else if (/FROM system\.columns/i.test(sql)) data = columns.map((name, i) => ({ name, position: i + 1, type: name === 'id' ? 'Int64' : name === 'amount' ? 'Decimal(30,9)' : 'String', default_expression: '', comment: '分页验收字段', is_in_primary_key: 0, is_in_sorting_key: 0 }));
  else if (/SELECT comment/i.test(sql)) data = [{ comment: '1507条完整性验收表' }];
  else if (/FROM system\.databases/i.test(sql)) data = [{ name: 'paging_fixture' }];
  else if (/FROM system\.tables/i.test(sql)) data = [{ name: 'records' }];
  else if (/SELECT 1/i.test(sql)) data = [{ result: 1 }];
  else { response.statusCode = 400; return response.end('Unsupported fixture query'); }
  response.setHeader('Content-Type', 'application/x-ndjson');
  for (const row of data) response.write(JSON.stringify(row) + '\n');
  response.end();
});
ck.listen(ckPort, '127.0.0.1', () => console.log(`PAGINATION_FIXTURE_READY ${mysqlPort}/${ckPort}`));
