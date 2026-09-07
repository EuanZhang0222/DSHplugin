import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import { loadNumberedPage } from '../src/client/dataset-pagination.mjs';
const origin = 'http://127.0.0.1:3081/api/database-connections';
const evidence = process.env.SEMANTIC_EVIDENCE_DIR;
if (!evidence) throw new Error('缺少证据目录');
async function api(path, body) {
  const r = await fetch(origin + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const value = await r.json(); if (!r.ok || value.ok === false) throw new Error(`${path}: ${value.error}`); return value;
}
if (process.argv.includes('--cleanup')) {
  const created = JSON.parse(await readFile(`${evidence}/pagination-created.json`, 'utf8'));
  for (const d of created.datasets) await api('/semantic/datasets/delete', { id: d.id, cascade: false });
  for (const c of created.connections) await api('/delete', { id: c.id });
  const state = (await api('/semantic/state')).state;
  assert.deepEqual(state.datasets.map(d => d.id).sort(), created.originalDatasetIds.sort());
  console.log('仅清理本轮两组测试数据集和连接，原有数据集完整保留');
} else if (process.argv.includes('--pages')) {
  const created = JSON.parse(await readFile(`${evidence}/pagination-created.json`, 'utf8'));
  const report = [];
  for (const d of created.datasets) {
    let cursor;
    const fetchPage = request => api('/semantic/query/dataset', { datasetId: d.id, request });
    try {
      let first = await loadNumberedPage(fetchPage, { page: 1, limit: 200 }, { onCursor: c => { cursor = c; } });
      while (first.totalPages === null) first = await loadNumberedPage(fetchPage, { cursor, page: 1, limit: 200 });
      assert.equal(first.totalPages, 8); assert.equal(first.rows.length, 200);
      const last = await loadNumberedPage(fetchPage, { cursor, page: 8, limit: 200 });
      assert.equal(last.rows.length, 107); assert.equal(last.rows[0].value, '分页验收第1401条'); assert.equal(last.complete, true);
      const middle = await loadNumberedPage(fetchPage, { cursor, page: 3, limit: 200 });
      assert.equal(middle.rows.length, 200); assert.equal(middle.rows[0].value, '分页验收第401条');
      const small = await loadNumberedPage(fetchPage, { cursor, page: 31, limit: 50 });
      assert.equal(small.totalPages, 31); assert.equal(small.rows.length, 7);
      await assert.rejects(() => fetchPage({ cursor, page: 9, limit: 200 }), /超出/);
      report.push({ dataset: d.name, totalRows: first.totalRows, totalPagesAt200: first.totalPages, jumpedPages: [8, 3], totalPagesAt50: small.totalPages, lastRowsAt50: small.rows.length });
    } finally { if (cursor) await fetchPage({ cursor, action: 'close' }); }
  }
  await writeFile(`${evidence}/api-numbered-pages.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} else {
  const state = (await api('/semantic/state')).state;
  const created = { originalDatasetIds: state.datasets.map(d => d.id), connections: [], datasets: [] };
  const persist = () => writeFile(`${evidence}/pagination-created.json`, JSON.stringify(created, null, 2));
  await persist();
  const report = [];
  for (const type of ['mysql', 'clickhouse']) {
    const name = `全量分页验收连接-${type}-20260828`;
    const saved = await api('/save', { connection: { id: '', name, type, host: '127.0.0.1', port: type === 'mysql' ? 33307 : 38124, username: 'fixture', password: 'fixture', database: 'paging_fixture' } });
    const connection = saved.connections.find(c => c.name === name); created.connections.push({ id: connection.id, name }); await persist();
    const metadata = (await api('/semantic/datasets/inspect', { connectionId: connection.id, database: 'paging_fixture', table: 'records' })).metadata;
    const dataset = (await api('/semantic/datasets/save', { dataset: {
      name: `全量分页验收·${type}（1507条）`, connectionId: connection.id, database: 'paging_fixture', table: 'records', purpose: '隔离协议测试数据，不是生产业务数据',
      fields: metadata.fields.map(f => ({ ...f, sensitive: f.name === 'secret' })),
    } })).dataset;
    created.datasets.push({ id: dataset.id, name: dataset.name }); await persist();
    let page = await api('/semantic/query/dataset', { datasetId: dataset.id, request: { limit: 200 } }), all = [], pages = 0;
    for (;;) {
      assert.notEqual(page.status, 'failed', page.error); assert.notEqual(page.status, 'budget_exceeded');
      all.push(...page.rows); pages++;
      assert.ok(pages < 100);
      if (page.complete) break;
      page = await api('/semantic/query/dataset', { datasetId: dataset.id, request: { cursor: page.nextCursor, limit: 200 } });
    }
    assert.equal(all.length, 1507); assert.equal(new Set(all.map(r => r.id)).size, 1507); assert.equal(page.totalRows, 1507);
    assert.ok(all.every(r => !Object.hasOwn(r, 'secret')));
    await api('/semantic/query/dataset', { datasetId: dataset.id, request: { cursor: page.cursor, action: 'close' } });
    report.push({ type, pages, received: all.length, total: page.totalRows, complete: page.complete, sensitiveExcluded: true });
  }
  await writeFile(`${evidence}/api-pagination.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
}
