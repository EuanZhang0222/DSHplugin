// Local isolated-host acceptance only; never targets the user's production profile.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const origin = 'http://127.0.0.1:3081/api/database-connections';
const evidence = process.env.SEMANTIC_EVIDENCE_DIR;
if (!evidence) throw new Error('缺少隔离测试证据目录');
async function api(path, body) {
  const response = await fetch(origin + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || `${response.status}`);
  return data;
}
if (process.argv.includes('--setup')) {
  const before = (await api('/semantic/state')).state;
  const fixtureConnection = (await api('/list')).connections.find(c => c.name === '本地协议测试 MySQL');
  assert.ok(fixtureConnection);
  const metadata = (await api('/semantic/datasets/inspect', { connectionId: fixtureConnection.id, database: 'semantic_fixture', table: 'meter' })).metadata;
  const ids = [];
  await writeFile(`${evidence}/temporary-dataset-ids.json`, JSON.stringify(ids));
  for (let n = 1; n <= 3; n++) {
    const dataset = (await api('/semantic/datasets/save', { dataset: { name: `语义按需验收-临时${n}`, connectionId: fixtureConnection.id, database: 'semantic_fixture', table: 'meter', purpose: '临时验收设备数据', fields: metadata.fields.map(f => f.name === 'id' && n === 3 ? { ...f, customComment: '设备唯一标识业务规则'.repeat(400) } : f) } })).dataset;
    ids.push(dataset.id); await writeFile(`${evidence}/temporary-dataset-ids.json`, JSON.stringify(ids));
  }
  await writeFile(`${evidence}/isolated-before.json`, JSON.stringify({ datasets: before.datasets.length, relations: before.relations.length, topologies: before.topologies.length }));
  console.log(JSON.stringify({ temporaryDatasetIds: ids }));
} else if (process.argv.includes('--cleanup')) {
  const ids = JSON.parse(await readFile(`${evidence}/temporary-dataset-ids.json`, 'utf8'));
  for (const id of ids) await api('/semantic/datasets/delete', { id });
  const state = (await api('/semantic/state')).state;
  console.log(JSON.stringify({ temporaryDatasetsRemoved: ids.length, retainedDatasets: state.datasets.length }));
} else {
  const before = (await api('/semantic/state')).state;
  const page = await api('/semantic/context/catalog', { limit: 2 });
  const next = await api('/semantic/context/catalog', { limit: 2, cursor: page.nextCursor });
  assert.equal(new Set([...page.datasets, ...next.datasets].map(d => d.id)).size, 4);
  const reading = before.datasets.find(d => d.name === '电表采集明细');
  const topology = before.topologies.find(t => t.name === '能源计量主题拓扑');
  const task = (await api('/semantic/context/task', { question: '设备用电量', topologyId: topology.id })).result;
  assert.equal(task.status, 'ok'); assert.equal(task.context.relations.length, 1);
  const fields = await api('/semantic/context/fields', { datasetId: reading.id, limit: 2 });
  assert.ok(fields.nextCursor); assert.ok(!fields.fields.some(f => f.name === 'secret_note'));
  const plan = (await api('/semantic/relations/plan-llm', { topologyId: topology.id })).plan;
  assert.equal(plan.totalBatches, 1); assert.ok(plan.batches[0].fits);
  const bad = await fetch(origin + '/semantic/context/task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topologyId: 'invalid', question: '电量' }) });
  assert.equal(bad.status, 400);
  const after = (await api('/semantic/state')).state;
  assert.deepEqual(before, after);
  const result = { ok: true, apiChecks: 6, datasetCount: before.datasets.length, selectedDatasets: task.context.datasets.length, relationCount: task.context.relations.length, estimatedTokens: task.budget.estimatedTokens, noStateMutation: true, modelCalls: 0 };
  await writeFile(`${evidence}/api-validation.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
}
