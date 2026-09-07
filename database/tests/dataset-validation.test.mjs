import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDatasetDraft } from '../src/client/dataset-validation.mjs';

const connections = [{ id: 'mysql' }, { id: 'ck' }];
function ready() {
  const fields = [{ name: 'id', dataType: 'bigint', enabled: true }];
  const draft = { name: '设备类型', connectionId: 'mysql', database: 'ems', table: 'device_model', fields };
  const source = { ...draft, databases: ['ems'], tables: ['device_model'], metadata: { fields }, loading: '', error: null };
  return { draft, source };
}

test('点击保存一次列出名称及三个来源必填项，空白字符不算名称', () => {
  assert.deepEqual(validateDatasetDraft({ name: '  \t ' }, { source: {}, connections }).map((item) => item.field), ['name', 'connectionId', 'database', 'table']);
});

test('只填名称和有效来源即可保存，业务用途和字段语义不变成必填', () => {
  const { draft, source } = ready();
  assert.deepEqual(validateDatasetDraft(draft, { source, connections }), []);
  draft.fields[0] = { ...draft.fields[0], enabled: false, sensitive: true };
  assert.deepEqual(validateDatasetDraft(draft, { source, connections }), []);
});

test('名称长度与服务端一致，允许200字符并拒绝201字符', () => {
  const { draft, source } = ready();
  assert.deepEqual(validateDatasetDraft({ ...draft, name: '名'.repeat(200) }, { source, connections }), []);
  assert.match(validateDatasetDraft({ ...draft, name: '名'.repeat(201) }, { source, connections })[0].message, /200/);
});

test('必填错误随输入实时消除，不保留过期提示', () => {
  const { draft, source } = ready();
  assert.equal(validateDatasetDraft({ ...draft, name: '' }, { source, connections })[0].field, 'name');
  assert.deepEqual(validateDatasetDraft(draft, { source, connections }), []);
});

test('库、表、字段加载中说明等待原因，不能提交旧元数据', () => {
  const { draft, source } = ready();
  for (const stage of ['databases', 'tables', 'fields']) {
    const issues = validateDatasetDraft(draft, { source: { ...source, loading: stage }, connections });
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /正在/);
  }
});

test('读取失败与未填名称同时提示，并指出对应重试入口', () => {
  const { draft, source } = ready();
  for (const stage of ['databases', 'tables', 'fields']) {
    const issues = validateDatasetDraft({ ...draft, name: '' }, { source: { ...source, error: { stage, message: '网络不可达' } }, connections });
    assert.equal(issues[0].field, 'name');
    assert.match(issues[1].message, /重试/);
  }
});

test('缺少字段或切换来源后的旧字段都不能通过保存校验', () => {
  const { draft, source } = ready();
  assert.equal(validateDatasetDraft({ ...draft, fields: [] }, { source, connections })[0].field, 'fields');
  assert.equal(validateDatasetDraft(draft, { source: { ...source, metadata: null }, connections })[0].field, 'fields');
  assert.equal(validateDatasetDraft({ ...draft, table: 'previous' }, { source, connections })[0].field, 'fields');
});

test('被删除的连接、库、表明确提示重新检查，不绕过真实目录', () => {
  const { draft, source } = ready();
  assert.equal(validateDatasetDraft(draft, { source, connections: [] })[0].field, 'connectionId');
  assert.equal(validateDatasetDraft(draft, { source: { ...source, databases: [] }, connections })[0].field, 'database');
  assert.equal(validateDatasetDraft(draft, { source: { ...source, tables: [] }, connections })[0].field, 'table');
});

test('编辑已有数据集使用已保存来源，但仍需名称和字段', () => {
  const { draft } = ready();
  assert.deepEqual(validateDatasetDraft(draft, { editing: true, connections }), []);
  assert.equal(validateDatasetDraft({ ...draft, name: '' }, { editing: true, connections })[0].field, 'name');
  assert.equal(validateDatasetDraft({ ...draft, fields: [] }, { editing: true, connections })[0].field, 'fields');
});
