'use strict';

/**
 * 仅用于插件验收的 MySQL 协议测试服务。它不实现通用数据库，只返回两张固定测试表的
 * information_schema（元数据）和少量查询行，验证 mysql2 驱动到插件运行时的完整链路。
 */
const mysql = require(process.env.SEMANTIC_MYSQL2_MODULE || 'mysql2');

const port = Number(process.env.SEMANTIC_FIXTURE_PORT || 33306);
const Types = mysql.Types;
let connectionId = 100;

const tableFields = {
  meter: [
    ['id', 1, 'varchar(32)', 'NO', null, '计量设备统一标识'],
    ['name', 2, 'varchar(128)', 'NO', '', '设备名称'],
    ['area_id', 3, 'bigint', 'YES', null, '所属区域标识'],
  ],
  meter_reading: [
    ['id', 1, 'bigint', 'NO', null, '采集记录主键'],
    ['meter_id', 2, 'varchar(32)', 'NO', null, '计量设备标识'],
    ['collect_time', 3, 'datetime', 'NO', null, '业务采集时间'],
    ['active_energy', 4, 'decimal(18,4)', 'YES', null, '累计有功电量'],
    ['secret_note', 5, 'varchar(255)', 'YES', null, '内部敏感备注'],
  ],
};

const dataRows = {
  meter: [
    { id: 'M-001', name: '1号电表', area_id: 10 },
    { id: 'M-002', name: '2号电表', area_id: 20 },
  ],
  meter_reading: [
    { id: 1, meter_id: 'M-001', collect_time: '2026-08-25 12:00:00', active_energy: '123.4000', secret_note: '不应进入查询' },
    { id: 2, meter_id: 'M-002', collect_time: '2026-08-25 12:01:00', active_energy: '456.7000', secret_note: '不应进入查询' },
  ],
};

function column(name, type = Types.VAR_STRING) {
  return {
    catalog: 'def', schema: 'semantic_fixture', table: '', orgTable: '', name, orgName: name,
    characterSet: 45, columnLength: 512, columnType: type, flags: 0, decimals: 0,
  };
}

function writeResult(connection, rows, names) {
  const columns = names.map((name) => column(name, typeof rows[0]?.[name] === 'number' ? Types.LONG : Types.VAR_STRING));
  connection.writeColumns(columns);
  for (const row of rows) connection.writeTextRow(names.map((name) => row[name]));
  connection.writeEof();
}

function quotedTable(sql) {
  if (/['`]meter_reading['`]/i.test(sql) || /\.\s*`meter_reading`/i.test(sql)) return 'meter_reading';
  if (/['`]meter['`]/i.test(sql) || /\.\s*`meter`/i.test(sql)) return 'meter';
  return '';
}

function selectedFields(sql) {
  const match = sql.match(/^\s*SELECT\s+(.+?)\s+FROM\s+/is);
  if (!match) return [];
  return match[1].split(',').map((part) => {
    const alias = part.match(/\bAS\s+`?([\w]+)`?\s*$/i)?.[1];
    if (alias) return alias;
    return part.trim().replace(/^DISTINCT\s+/i, '').replace(/`/g, '').split('.').at(-1).trim();
  });
}

function handleQuery(connection, sql) {
	// 每条 MySQL 命令的响应包序号从1开始；mysql2 的实验性 server API 不会自动重置。
	connection._resetSequenceId();
	connection.sequenceId = 1;
  process.stdout.write(`QUERY ${sql.replace(/\s+/g, ' ').trim()}\n`);
  if (/^\s*SHOW\s+DATABASES/i.test(sql)) {
    writeResult(connection, [{ Database: 'semantic_fixture' }], ['Database']);
    return;
  }
  if (/^\s*SHOW\s+TABLES/i.test(sql)) {
    writeResult(connection, [{ Tables_in_semantic_fixture: 'meter' }, { Tables_in_semantic_fixture: 'meter_reading' }], ['Tables_in_semantic_fixture']);
    return;
  }
  const table = quotedTable(sql);
  if (/information_schema\.COLUMNS/i.test(sql)) {
    const rows = (tableFields[table] || []).map(([COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT]) => ({ COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT }));
    writeResult(connection, rows, ['COLUMN_NAME', 'ORDINAL_POSITION', 'COLUMN_TYPE', 'IS_NULLABLE', 'COLUMN_DEFAULT', 'COLUMN_COMMENT']);
    return;
  }
  if (/information_schema\.STATISTICS/i.test(sql)) {
    const rows = table === 'meter'
      ? [{ COLUMN_NAME: 'id', INDEX_NAME: 'PRIMARY', NON_UNIQUE: 0 }]
      : [{ COLUMN_NAME: 'id', INDEX_NAME: 'PRIMARY', NON_UNIQUE: 0 }, { COLUMN_NAME: 'meter_id', INDEX_NAME: 'idx_meter', NON_UNIQUE: 1 }];
    writeResult(connection, rows, ['COLUMN_NAME', 'INDEX_NAME', 'NON_UNIQUE']);
    return;
  }
  if (/information_schema\.KEY_COLUMN_USAGE/i.test(sql)) {
    const rows = table === 'meter_reading' ? [{
      COLUMN_NAME: 'meter_id', CONSTRAINT_NAME: 'fk_reading_meter', REFERENCED_TABLE_SCHEMA: 'semantic_fixture', REFERENCED_TABLE_NAME: 'meter', REFERENCED_COLUMN_NAME: 'id',
    }] : [];
    writeResult(connection, rows, ['COLUMN_NAME', 'CONSTRAINT_NAME', 'REFERENCED_TABLE_SCHEMA', 'REFERENCED_TABLE_NAME', 'REFERENCED_COLUMN_NAME']);
    return;
  }
  if (/information_schema\.TABLES/i.test(sql)) {
    writeResult(connection, [{ TABLE_COMMENT: table === 'meter' ? '计量设备主数据表' : '电表分钟采集明细表' }], ['TABLE_COMMENT']);
    return;
  }
  if (/^\s*SELECT\s+DISTINCT/i.test(sql)) {
    const sourceField = sql.match(/DISTINCT\s+`([^`]+)`/i)?.[1] || 'id';
    const values = [...new Set((dataRows[table] || []).map((row) => row[sourceField]).filter((value) => value != null))];
    writeResult(connection, values.map((value) => ({ __semantic_value: value })), ['__semantic_value']);
    return;
  }
  if (/^\s*SELECT/i.test(sql) && table) {
    const fields = selectedFields(sql);
    let rows = dataRows[table] || [];
    if (/`meter_id`\s*=\s*'M-001'/i.test(sql)) rows = rows.filter((row) => row.meter_id === 'M-001');
    writeResult(connection, rows.map((row) => Object.fromEntries(fields.map((name) => [name, row[name]]))), fields);
    return;
  }
  if (/^\s*SELECT\s+1/i.test(sql)) {
    writeResult(connection, [{ ok: 1 }], ['ok']);
    return;
  }
  connection.writeError({ code: 1064, message: `测试服务不支持该语句：${sql.slice(0, 120)}` });
}

const server = mysql.createServer();
server.on('connection', (connection) => {
  connection.serverHandshake({
    protocolVersion: 10,
    serverVersion: '8.0.36-semantic-fixture',
    connectionId: connectionId++,
    statusFlags: 2,
    characterSet: 45,
    capabilityFlags: 0xffffff,
    authCallback(_auth, done) { done(null, null); },
  });
  connection.on('query', (sql) => handleQuery(connection, sql));
  connection.on('ping', () => { connection._resetSequenceId(); connection.sequenceId = 1; connection.writeOk(); });
  connection.on('error', (error) => process.stderr.write(`${error.stack || error}\n`));
});

server.listen(port, '127.0.0.1', () => process.stdout.write(`MYSQL_FIXTURE_READY ${port}\n`));
function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
