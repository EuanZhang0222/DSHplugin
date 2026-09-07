'use strict';

// 仅用于验收的本机 ClickHouse HTTP 协议服务；不连接或模拟生产业务数据。
const http = require('node:http');
const port = Number(process.env.SEMANTIC_CLICKHOUSE_FIXTURE_PORT || 38123);
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/ping') { response.end('Ok.\n'); return; }
  let sql = '';
  for await (const chunk of request) sql += chunk.toString();
  sql = sql || url.searchParams.get('query') || '';
  const database = url.searchParams.get('param_db');
  const table = url.searchParams.get('param_table');
  let rows;
  if (/SELECT name FROM system\.databases/i.test(sql)) rows = [{ name: 'energy_analysis' }, { name: 'empty_analysis' }];
  else if (/SELECT name FROM system\.tables/i.test(sql)) rows = database === 'energy_analysis' ? [{ name: 'energy_daily' }] : [];
  else if (/FROM system\.columns/i.test(sql)) rows = table === 'energy_daily' && database === 'energy_analysis' ? [
    { name: 'device_code', position: 1, type: 'String', default_expression: '', comment: '设备业务编码', is_in_primary_key: 1, is_in_sorting_key: 1 },
    { name: 'stat_date', position: 2, type: 'Date', default_expression: '', comment: '统计日期', is_in_primary_key: 1, is_in_sorting_key: 1 },
    { name: 'energy_kwh', position: 3, type: 'Decimal(18, 4)', default_expression: '', comment: '日电量（千瓦时）', is_in_primary_key: 0, is_in_sorting_key: 0 },
  ] : [];
  else if (/SELECT comment FROM system\.tables/i.test(sql)) rows = [{ comment: '按设备与日期汇总的日电量分析表' }];
  else if (/SELECT 1/i.test(sql)) rows = [{ result: 1 }];
  else { response.statusCode = 400; response.end('Unsupported query in local fixture'); return; }
  response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  response.end(rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
});
server.listen(port, '127.0.0.1', () => process.stdout.write(`CLICKHOUSE_FIXTURE_READY ${port}\n`));
function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
