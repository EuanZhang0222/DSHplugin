import test from 'node:test';
import assert from 'node:assert/strict';
import { copyDatabaseComments } from '../src/client/field-comment-copy.mjs';

test('可分别复制到业务名称或自定义业务注释，不触碰另一列', () => {
  for (const target of ['businessName', 'customComment']) {
    const fields = [{ name: 'area_id', databaseComment: '所属区域', businessName: '', customComment: '' }];
    const result = copyDatabaseComments(fields, target);
    assert.equal(result.copied, 1);
    assert.equal(result.fields[0][target], '所属区域');
    assert.equal(result.fields[0][target === 'businessName' ? 'customComment' : 'businessName'], '');
  }
});

test('默认保留人工内容，空白项可以填充', () => {
  const result = copyDatabaseComments([
    { name: 'a', databaseComment: '库注释', businessName: '人工名称' },
    { name: 'b', databaseComment: '  设备标识  ', businessName: ' \t ' },
  ], 'businessName');
  assert.equal(result.preserved, 1);
  assert.equal(result.fields[0].businessName, '人工名称');
  assert.equal(result.fields[1].businessName, '设备标识');
  assert.equal(result.overwritten, 0);
});

test('缺少数据库注释时跳过，不把界面占位文字当作数据', () => {
  const fields = [undefined, null, '', ' \n '].map((databaseComment, i) => ({ name: String(i), databaseComment }));
  const result = copyDatabaseComments(fields, 'customComment');
  assert.equal(result.emptyComment, 4);
  assert.equal(result.copied, 0);
  assert.equal(result.fields, fields);
  assert.equal(result.fields.some((field) => field.customComment === '数据库未提供'), false);
});

test('显式覆盖只替换有原注释的项目，无原注释不会清空人工内容', () => {
  const result = copyDatabaseComments([
    { name: 'a', databaseComment: '库注释', customComment: '人工注释' },
    { name: 'b', databaseComment: '', customComment: '保留人工注释' },
  ], 'customComment', { overwrite: true });
  assert.equal(result.overwritten, 1);
  assert.equal(result.fields[0].customComment, '库注释');
  assert.equal(result.fields[1].customComment, '保留人工注释');
  assert.equal(result.emptyComment, 1);
});

test('覆盖模式跳过完全相同的值，重复操作不产生额外修改', () => {
  const first = copyDatabaseComments([{ name: 'a', databaseComment: '原注释' }], 'businessName');
  const second = copyDatabaseComments(first.fields, 'businessName', { overwrite: true });
  assert.equal(second.copied, 0);
  assert.equal(second.unchanged, 1);
  assert.equal(second.fields, first.fields);
});

test('业务名称200字符边界：超长跳过，不能静默截断或覆盖旧值', () => {
  const result = copyDatabaseComments([
    { name: 'allowed', databaseComment: '名'.repeat(200) },
    { name: 'long', databaseComment: '名'.repeat(201), businessName: '原名称' },
  ], 'businessName', { overwrite: true });
  assert.equal(result.copied, 1);
  assert.equal(result.fields[0].businessName.length, 200);
  assert.equal(result.fields[1].businessName, '原名称');
  assert.deepEqual(result.tooLong, [{ name: 'long', length: 201 }]);
  assert.equal(result.overwritten, 0);
});

test('自定义业务注释5000字符边界与服务端一致', () => {
  const result = copyDatabaseComments([
    { name: 'allowed', databaseComment: '注'.repeat(5000) },
    { name: 'long', databaseComment: '注'.repeat(5001) },
  ], 'customComment');
  assert.equal(result.copied, 1);
  assert.equal(result.fields[0].customComment.length, 5000);
  assert.equal(result.fields[1].customComment, undefined);
  assert.equal(result.tooLong.length, 1);
});

test('多行注释复制到名称时换行转空格，复制到注释时保留内部分行', () => {
  const fields = [{ name: 'a', databaseComment: '  设备标识\r\n跨表统一\u2028编码  ' }];
  assert.equal(copyDatabaseComments(fields, 'businessName').fields[0].businessName, '设备标识 跨表统一 编码');
  assert.equal(copyDatabaseComments(fields, 'customComment').fields[0].customComment, '设备标识\r\n跨表统一\u2028编码');
});

test('包括禁用和敏感字段的全部行，但原始元数据与其他语义配置不可改变', () => {
  const field = Object.freeze({ name: 'id', databaseComment: '  标识  ', dataType: 'bigint', enabled: false, sensitive: true, primaryKey: true, semanticConceptId: 'concept-id', customComment: '其他注释' });
  const fields = Object.freeze([field]);
  const result = copyDatabaseComments(fields, 'businessName');
  assert.notEqual(result.fields, fields);
  assert.deepEqual(result.fields[0], { ...field, businessName: '标识' });
  assert.equal(field.businessName, undefined);
});

test('禁止任意属性及原型属性作为复制目标', () => {
  for (const target of ['databaseComment', 'dataType', 'enabled', '__proto__', 'constructor', 'toString']) {
    assert.throws(() => copyDatabaseComments([], target), /不支持/);
  }
});

test('无字段时不产生修改，汇总数量能对齐全部字段', () => {
  assert.equal(copyDatabaseComments(undefined, 'businessName').total, 0);
  const result = copyDatabaseComments([
    { name: 'a', databaseComment: '注释' },
    { name: 'b', databaseComment: '' },
    { name: 'c', databaseComment: '注释', businessName: '人工名称' },
    { name: 'd', databaseComment: '注'.repeat(201) },
  ], 'businessName');
  assert.equal(result.total, result.copied + result.preserved + result.emptyComment + result.unchanged + result.tooLong.length);
});
