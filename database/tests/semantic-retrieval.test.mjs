import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './support/semantic-retrieval-fixture.mjs';
import { prepareTaskContext, searchDatasetCatalog, searchDatasetFields, semanticScope, compactField } from '../lib/semantic/retrieval.js';
import { estimateTokens, fitContext, resolveContextBudget, reserveResponse } from '../lib/semantic/budget.js';
import { relationBatchPlan } from '../lib/semantic/relation-batches.js';
import { buildRelationPrompt } from '../lib/semantic/model.js';
import { findConfirmedJoinPath, getDatasetContext } from '../lib/semantic/context.js';

test('目录检索字段注释、中文与统一概念别名，隐藏凭据和敏感词', () => {
  const c = fixture();
  assert.equal(searchDatasetCatalog(c, { keyword: '用电量' }).datasets[0].id, 'reading');
  assert.equal(searchDatasetCatalog(c, { keyword: 'meterkey' }).total, 2);
  assert.equal(searchDatasetCatalog(c, { keyword: '不可见密码' }).total, 0);
  assert.doesNotMatch(JSON.stringify(searchDatasetCatalog(c)), /never-user|never-password|不可见密码/);
});
test('目录分页稳定、失效游标与条件篡改明确报错', () => {
  const c = fixture(), first = searchDatasetCatalog(c, { limit: 2 });
  const next = searchDatasetCatalog(c, { limit: 2, cursor: first.nextCursor });
  assert.equal(new Set([...first.datasets, ...next.datasets].map(d => d.id)).size, 4);
  assert.equal(next.nextCursor, null);
  assert.throws(() => searchDatasetCatalog({ ...c, semanticVersion: 8 }, { cursor: first.nextCursor }), /第一页/);
  assert.throws(() => searchDatasetCatalog(c, { keyword: '别的', cursor: first.nextCursor }), /第一页/);
  assert.throws(() => searchDatasetCatalog(c, { cursor: 'bad' }), /第一页/);
});
test('字段分页只返回公开字段', () => {
  const c = fixture(), page = searchDatasetFields(c, { datasetId: 'reading', limit: 2 });
  assert.equal(page.total, 5); assert.ok(page.nextCursor);
  assert.equal(searchDatasetFields(c, { datasetId: 'reading', keyword: '停用' }).total, 0);
});
test('按问题压缩且保留时间键，原始资料完全不变', () => {
  const c = fixture(), original = JSON.stringify(c);
  const result = prepareTaskContext(c, { datasetId: 'reading', question: '查询用电量', maxTokens: 6000 });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.context.datasets[0].fields.map(f => f.name), ['id', 'active_energy', 'collect_time']);
  assert.equal(result.context.datasets[0].omittedFields, 2);
  assert.doesNotMatch(JSON.stringify(result), /secret|disabled|不相关概念|never-password/);
  assert.equal(JSON.stringify(c), original);
  assert.ok(estimateTokens(result) <= result.budget.limit);
});
test('补齐已确认路径的中间表及两端关联键，可补中间表字段', () => {
  const result = prepareTaskContext(fixture(), { datasetIds: ['reading', 'area'], question: '区域用电量', includeFields: [{ datasetId: 'meter', field: 'remark' }] });
  assert.equal(result.status, 'ok');
  assert.equal(result.context.relations.length, 2);
  const bridge = result.context.datasets.find(d => d.id === 'meter');
  assert.equal(bridge.selectionReason, '已确认路径的中间表');
  assert.deepEqual(bridge.fields.map(f => f.name), ['id', 'area_id', 'remark']);
  assert.equal(result.context.concepts.length, 1);
});
test('拒绝未确认、孤立、敏感、禁用端点与无效拓扑路径', () => {
  const c = fixture();
  c.relations[0].source.field = 'secret';
  assert.equal(semanticScope(c).relations.length, 1);
  assert.equal(findConfirmedJoinPath(c, 'reading', 'meter'), undefined);
  assert.equal(getDatasetContext(c, 'reading').relations.length, 0);
  c.relations[1].status = 'candidate';
  assert.equal(semanticScope(c).relations.length, 0);
  assert.throws(() => prepareTaskContext(c, { topologyId: 'missing', question: '用电' }), /拓扑/);
  assert.throws(() => findConfirmedJoinPath(c, 'reading', 'meter', 'missing'), /拓扑/);
  c.relations[1].status = 'confirmed'; c.topologies[0].relationIds = [];
  assert.equal(semanticScope(c).relations.length, 0);
});
test('精简去重优先自定义说明，完整接口仍保留数据库原注释', () => {
  const c = fixture(); const f = c.datasets[0].fields[2];
  assert.equal(compactField(f).label, undefined);
  f.customComment = '以末次读数减首次读数计算周期用量';
  assert.equal(compactField(f).meaning, f.customComment);
  assert.equal(getDatasetContext(c, 'reading').dataset.fields[2].databaseComment, '累计用电量');
});
test('超预算不截断字段、关系或关键说明，明确返回未加载', () => {
  const c = fixture(); c.datasets[0].fields[2].customComment = '这是必须完整保留的业务口径'.repeat(500);
  const result = prepareTaskContext(c, { datasetId: 'reading', question: '用电量', maxTokens: 1024 });
  assert.equal(result.status, 'budget_exceeded'); assert.equal(result.context, undefined);
  assert.ok(result.budget.requiredEstimate > 1024); assert.ok(estimateTokens(result) <= 1024);
});
test('空问题不会载入整拓扑，未命中明确说明，非法补选与大参数拒绝', () => {
  const c = fixture();
  assert.equal(prepareTaskContext(c, { topologyId: 't' }).status, 'needs_selection');
  assert.equal(prepareTaskContext(c, { question: '完全不存在的xyz主题' }).status, 'no_match');
  assert.throws(() => prepareTaskContext(c, { datasetId: 'reading', question: '电量', includeFields: [{ datasetId: 'reading', field: 'secret' }] }), /补充/);
  assert.throws(() => searchDatasetCatalog(c, { limit: 300 }), /每页/);
  assert.throws(() => prepareTaskContext(c, { maxTokens: 100000 }), /预算/);
});
test('宿主预算读取真实窗口和会话用量，同一会话版本预留已返回内容', async () => {
  const session = { requestHeader: () => ({ config: { provider: 'p', model: 'm', maxTokens: 4096 } }) };
  let revision = 1, used = 2000;
  const services = { llm: { resolveModelInfo: async () => ({ context: { contextWindow: 12000 } }) }, tokenMeter: { measure: () => ({ logRevision: revision, totalTokens: used }) } };
  const ctx = { get: key => services[key] }, exec = { agent: { session, ctx } };
  const budget = await resolveContextBudget(ctx, 6000, exec);
  assert.equal(budget.mode, 'session'); assert.equal(budget.limit, 3856);
  reserveResponse(budget, { output: 'a'.repeat(600) });
  const second = await resolveContextBudget(ctx, 6000, exec);
  assert.ok(second.limit < budget.limit);
  revision++; used += 250;
  const third = await resolveContextBudget(ctx, 6000, exec);
  assert.equal(third.reservedResponses, 0);
  used = 11000;
  assert.equal((await resolveContextBudget(ctx, 6000, exec)).limit, 0);
});
test('宿主能力缺失与页面预览不假装知道会话长度', async () => {
  const ctx = { get: () => undefined };
  assert.equal((await resolveContextBudget(ctx, 6000)).mode, 'standalone');
  assert.equal((await resolveContextBudget(ctx, 6000, { agent: { session: {} } })).mode, 'fallback');
  assert.equal(fitContext({ context: 'x'.repeat(500) }, { limit: 0 }).status, 'budget_exceeded');
});
test('大拓扑分批没有首80表或首500字段截断，批次虚拟分页覆盖最后表', () => {
  const c = fixture(); c.datasets = Array.from({ length: 90 }, (_, i) => ({ ...c.datasets[0], id: `d${String(i).padStart(3, '0')}`, fields: Array.from({ length: 6 }, (_, n) => ({ name: `f${n}`, dataType: 'int', databaseComment: '业务' })) }));
  c.topologies[0].datasetIds = c.datasets.map(d => d.id);
  const plan = relationBatchPlan(c, 't', { limit: 1 });
  assert.equal(plan.datasetCount, 90); assert.equal(plan.fieldCount, 540); assert.equal(plan.totalBatches, 4005);
  assert.ok(plan.at(plan.totalBatches - 1).datasets.some(d => d.id === 'd089'));
  assert.throws(() => buildRelationPrompt({ topology: c.topologies[0], datasets: c.datasets, concepts: [], ruleCandidates: [] }), /批次/);
});
test('多字段分片覆盖所有字段组合，单字段过长显式阻断，计划不会输出凭据', () => {
  const c = fixture(); c.datasets = c.datasets.slice(0, 2);
  for (const d of c.datasets) d.fields = Array.from({ length: 65 }, (_, i) => ({ name: `f${i}`, dataType: 'int', databaseComment: '字段业务' }));
  const plan = relationBatchPlan(c, 't', { limit: 1 }); const covered = new Set();
  for (let i = 0; i < plan.totalBatches; i++) {
    const batch = plan.at(i);
    for (const a of batch.datasets[0].fields) for (const b of batch.datasets[1].fields) covered.add(`${a.name}:${b.name}`);
  }
  assert.equal(covered.size, 65 * 65); assert.doesNotMatch(JSON.stringify(plan), /never-user|never-password/);
  c.datasets[0].fields[0].databaseComment = '很长'.repeat(15000);
  const huge = relationBatchPlan(c, 't', { limit: 1 }); assert.equal(huge.batches[0].fits, false);
});
test('批次计划对候选写入稳定，对源结构和概念变更失效', () => {
  const c = fixture(), version = relationBatchPlan(c, 't').version;
  c.semanticVersion++; c.relations.push({ ...c.relations[0], id: 'new', status: 'candidate' }); c.topologies[0].relationIds.push('new');
  assert.equal(relationBatchPlan(c, 't').version, version);
  c.datasets[0].fields[0].customComment = '新业务';
  assert.notEqual(relationBatchPlan(c, 't').version, version);
});
