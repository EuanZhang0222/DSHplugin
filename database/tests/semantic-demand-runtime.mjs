import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { fixture } from './support/semantic-retrieval-fixture.mjs';
const root = process.env.SEMANTIC_INSTALLED_PLUGIN;
if (!root) throw new Error('请设置 SEMANTIC_INSTALLED_PLUGIN（隔离安装插件目录）');
const { createSemanticRuntime } = await import(pathToFileURL(`${root}/lib/semantic/runtime.js`).href);
const { buildSemanticTools } = await import(pathToFileURL(`${root}/lib/semantic/tools.js`).href);

function setup() {
  let config = fixture(), calls = 0;
  // Use exactly two tables for a single charged batch; no real provider is contacted.
  config.datasets = config.datasets.filter(d => ['reading', 'meter'].includes(d.id));
  config.topologies[0].datasetIds = ['reading', 'meter']; config.topologies[0].relationIds = []; config.relations = [];
  let output = { relations: [{ source: { datasetId: 'reading', field: 'meter_id' }, target: { datasetId: 'meter', field: 'id' }, decision: 'candidate', cardinality: 'many-to-one', reason: '计量标识统一且设备端唯一，候选需人工确认' }] };
  let mutate = () => {};
  const llm = { resolveModelInfo: async () => ({ context: { contextWindow: 32768 } }),
    async *stream(request) { calls++; assert.doesNotMatch(request.messages[0].content[0].text, /never-password|不可见密码/); mutate(); yield { type: 'text-delta', text: JSON.stringify(output) }; yield { type: 'finish', reason: { kind: 'stop' } }; } };
  const scope = { get: () => config, replace: async value => { config = structuredClone(value); } };
  const runtime = createSemanticRuntime(scope, { get: key => key === 'llm' ? llm : undefined });
  return { runtime, llm, config: () => config, calls: () => calls, output: value => { output = value }, mutate: fn => { mutate = fn } };
}

test('真实工具注册走按需服务，目录分页与补查可调用，旧完整接口保留', async () => {
  const s = setup(), tools = buildSemanticTools(s.runtime), exec = { signal: new AbortController().signal };
  assert.equal(tools.length, 5);
  const list = tools.find(t => t.name === 'list_database_datasets');
  assert.equal((await list.execute({ keyword: '用电量', limit: 1 }, exec)).datasets[0].id, 'reading');
  const context = tools.find(t => t.name === 'get_database_semantic_context');
  const args = { datasetId: 'reading', question: '用电量' };
  assert.deepEqual(await context.execute(args, exec), await s.runtime.prepareTaskContext(args));
  assert.equal((await tools.find(t => t.name === 'search_database_dataset_fields').execute({ datasetId: 'reading', keyword: '备注' }, exec)).fields[0].name, 'remark');
  assert.equal(s.runtime.getDatasetContext('reading').dataset.fields.length, 5);
  assert.equal(s.calls(), 0);
});
test('模型分批真实调用接口模拟：候选入库但不自动发布，重复不新增', async () => {
  const s = setup(), plan = s.runtime.planRelationBatches('t');
  assert.equal(s.calls(), 0); assert.equal(plan.totalBatches, 1);
  const first = await s.runtime.identifyByLlm('t', { batchIndex: 0, planVersion: plan.version });
  assert.equal(s.calls(), 1); assert.equal(first.summary.deterministicAccepted, 1); assert.equal(first.summary.created, 1);
  assert.equal(s.runtime.getDatasetContext('reading').relations.length, 0);
  const second = await s.runtime.identifyByLlm('t', { batchIndex: 0, planVersion: plan.version });
  assert.equal(second.summary.created, 0); assert.equal(s.config().relations.length, 1);
});
test('模型胡编端点、基数不符不会写入', async () => {
  const s = setup(); s.output({ relations: [{ source: { datasetId: 'reading', field: 'secret' }, target: { datasetId: 'meter', field: 'id' }, reason: 'bad' }] });
  await assert.rejects(() => s.runtime.identifyByLlm('t'), /白名单/); assert.equal(s.config().relations.length, 0);
  s.output({ relations: [{ source: { datasetId: 'reading', field: 'meter_id' }, target: { datasetId: 'meter', field: 'id' }, reason: '基数错误', cardinality: 'one-to-one' }] });
  const result = await s.runtime.identifyByLlm('t'); assert.equal(result.summary.deterministicAccepted, 0); assert.equal(s.config().relations.length, 0);
});
test('批次执行前与执行中语义变更均拒绝旧计划', async () => {
  const s = setup(), plan = s.runtime.planRelationBatches('t');
  s.config().datasets[0].purpose = '变更用途';
  await assert.rejects(() => s.runtime.identifyByLlm('t', { planVersion: plan.version, batchIndex: 0 }), /重新规划/);
  assert.equal(s.calls(), 0);
  s.mutate(() => { s.config().datasets[0].purpose = '执行期间修改'; });
  await assert.rejects(() => s.runtime.identifyByLlm('t'), /未写入/); assert.equal(s.config().relations.length, 0);
});
test('模型窗口不足与取消请求不产生模型调用', async () => {
  const s = setup(); s.llm.resolveModelInfo = async () => ({ context: { contextWindow: 2000 } });
  await assert.rejects(() => s.runtime.identifyByLlm('t'), /窗口不足/);
  const controller = new AbortController(); controller.abort(new Error('已取消'));
  await assert.rejects(() => s.runtime.identifyByLlm('t', {}, controller.signal), /已取消/); assert.equal(s.calls(), 0);
});
