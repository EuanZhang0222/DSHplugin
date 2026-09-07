/** Read-only formal verification; persists hashes/counts, never credentials or field contents. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const evidence = process.env.SEMANTIC_EVIDENCE_DIR;
if (!evidence) throw new Error('缺少证据目录');
const origin = 'http://127.0.0.1:3080/api/database-connections';
async function api(path, body) {
  const r = await fetch(origin + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  if (!r.ok) throw new Error(`${path} HTTP ${r.status}`);
  return r.json();
}
const state = (await api('/semantic/state')).state;
const connections = (await api('/list')).connections;
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const snapshot = { semanticVersion: state.semanticVersion, datasets: state.datasets.length, fields: state.datasets.reduce((n, d) => n + d.fields.length, 0), relations: state.relations.length, topologies: state.topologies.length, connections: connections.length, semanticHash: digest(state), publicConnectionHash: digest(connections) };
if (process.argv.includes('--before')) {
  await writeFile(`${evidence}/formal-before.json`, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot));
} else {
  assert.deepEqual(snapshot, JSON.parse(await readFile(`${evidence}/formal-before.json`, 'utf8')), '升级前后正式语义及连接元数据必须一致');
  const dataset = state.datasets.find(d => d.table === 'energy_info') || state.datasets[0];
  const old = (await api('/semantic/context/dataset', { id: dataset.id })).context;
  const result = (await api('/semantic/context/task', { datasetId: dataset.id, question: '能源单位和排放因子', maxTokens: 6000 })).result;
  assert.equal(result.status, 'ok');
  const compactLength = JSON.stringify(result).length, fullLength = JSON.stringify(old).length;
  const report = { ...snapshot, noDataMutation: true, fullContextCharacters: fullLength, taskContextCharacters: compactLength, reductionPercent: Math.round((1 - compactLength / fullLength) * 100), fullFields: old.dataset.fields.length, taskFields: result.context.datasets.reduce((n, d) => n + d.fields.length, 0), estimatedTokens: result.budget.estimatedTokens, status: result.status, budgetMode: result.budget.mode };
  await writeFile(`${evidence}/formal-after.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
}
