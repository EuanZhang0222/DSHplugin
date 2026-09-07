import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const plugin = process.env.SEMANTIC_INSTALLED_PLUGIN;
if (!plugin) throw new Error('缺少隔离插件目录');
const { createSemanticRuntime } = await import(pathToFileURL(`${plugin}/lib/semantic/runtime.js`));
const { buildSemanticTools } = await import(pathToFileURL(`${plugin}/lib/semantic/tools.js`));
const report = [];
for (const type of ['mysql', 'clickhouse']) {
  const config = { connections: [{ id: 'c', type, name: '本地分页验收', host: '127.0.0.1', port: type === 'mysql' ? 33307 : 38124, username: 'fixture', password: 'fixture', database: 'paging_fixture' }],
    datasets: [{ id: 'd', connectionId: 'c', name: '完整性验收数据集', database: 'paging_fixture', table: 'records', enabled: true,
      fields: ['id', 'value', 'amount', 'secret'].map(name => ({ name, dataType: name === 'id' ? 'Int64' : 'String', enabled: true, sensitive: name === 'secret' })) }] };
  const runtime = createSemanticRuntime({ get: () => config }, { get: () => undefined });
  try {
    const tool = buildSemanticTools(runtime).find(t => t.name === 'query_database_dataset');
    const exec = { signal: new AbortController().signal };
    let result = await tool.execute({ datasetId: 'd', limit: 200 }, exec), all = [], pages = 0;
    while (true) {
      assert.notEqual(result.status, 'failed', result.error); assert.notEqual(result.status, 'budget_exceeded');
      all.push(...result.rows); pages++;
      if (result.complete) break;
      assert.ok(result.nextCursor); assert.ok(pages < 100);
      result = await tool.execute({ datasetId: 'd', cursor: result.nextCursor, limit: 200 }, exec);
    }
    assert.equal(result.totalRows, 1507); assert.equal(all.length, 1507); assert.equal(new Set(all.map(row => row.id)).size, 1507);
    assert.equal(all[0].id, '9007199254740993'); assert.equal(all.at(-1).id, '9007199254742499');
    assert.equal(all[0].amount, '1234567890.123456789'); assert.ok(all.every(row => !Object.hasOwn(row, 'secret')));
    const replay = await tool.execute({ datasetId: 'd', cursor: result.cursor, limit: 200 }, exec); assert.deepEqual(replay.rows, result.rows);
    await tool.execute({ datasetId: 'd', cursor: result.cursor, action: 'close' }, exec);
    let filtered = await tool.execute({ datasetId: 'd', fields: ['id'], filters: [{ field: 'id', operator: 'gt', value: '9007199254742400' }], orderBy: [{ field: 'id', direction: 'desc' }] }, exec);
    while (!filtered.rows.length && !filtered.complete && filtered.status !== 'failed') filtered = await tool.execute({ datasetId: 'd', cursor: filtered.nextCursor }, exec);
    assert.equal(filtered.rows.length, 99); assert.equal(filtered.rows[0].id, '9007199254742499');
    assert.equal(filtered.complete, true); assert.equal(filtered.totalRows, 99);
    report.push({ type, rows: all.length, uniqueRows: new Set(all.map(row => row.id)).size, pages, complete: result.complete, bigIntegerAndDecimalExact: true, filteredRows: filtered.rows.length });
  } finally { await runtime.dispose(); }
}
console.log(JSON.stringify(report, null, 2));
if (process.env.SEMANTIC_EVIDENCE_DIR) await writeFile(`${process.env.SEMANTIC_EVIDENCE_DIR}/driver-runtime.json`, JSON.stringify(report, null, 2));
