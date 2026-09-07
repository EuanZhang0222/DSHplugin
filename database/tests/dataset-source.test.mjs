import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatasetSourceCatalog, mergeDatasetMetadata, sameDatasetSource } from '../src/client/dataset-source.mjs';

const metadata = (name) => ({ tableComment: name, metadataVersion: name, fields: [{ name: 'id', dataType: 'bigint', databaseComment: `${name}标识` }] });
const deferred = () => { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };
const base = (overrides = {}) => createDatasetSourceCatalog({ databases: async () => ['energy', 'archive'], tables: async () => ['meter', 'reading'], inspect: async ({ table }) => metadata(table), ...overrides });

test('按连接、库、表逐级选择，只有选表后才自动读取字段', async () => {
  const calls = [];
  const catalog = base({ tables: async (connection, database) => { calls.push([connection, database]); return ['meter', 'reading']; }, inspect: async (selection) => { calls.push(selection); return metadata(selection.table); } });
  await catalog.selectConnection('mysql');
  assert.deepEqual(catalog.getSnapshot().databases, ['energy', 'archive']);
  assert.equal(catalog.getSnapshot().database, '');
  assert.equal(calls.length, 0);
  await catalog.selectDatabase('energy');
  assert.deepEqual(calls, [['mysql', 'energy']]);
  assert.equal(catalog.getSnapshot().table, '');
  await catalog.selectTable('reading');
  assert.deepEqual(calls[1], { connectionId: 'mysql', database: 'energy', table: 'reading' });
  assert.equal(catalog.getSnapshot().metadata.fields[0].dataType, 'bigint');
  assert.equal(catalog.getSnapshot().loading, '');
});

test('默认库和浏览数据入口的预选表必须在真实返回目录中', async () => {
  const catalog = base();
  await catalog.selectConnection('mysql', 'energy', 'meter');
  assert.equal(catalog.getSnapshot().metadata.tableComment, 'meter');
  await catalog.selectConnection('mysql', 'missing', 'meter');
  assert.equal(catalog.getSnapshot().database, '');
  assert.equal(catalog.getSnapshot().table, '');
  assert.equal(catalog.getSnapshot().metadata, null);
  await catalog.selectDatabase('unlisted');
  assert.equal(catalog.getSnapshot().database, '');
});

test('只有一个可访问库时自动展开，保留名称大小写和空格', async () => {
  const catalog = base({ databases: async () => ['Energy Space', 'Energy Space', null, ''], tables: async () => ['Meter A'] });
  await catalog.selectConnection('clickhouse');
  assert.deepEqual(catalog.getSnapshot().databases, ['Energy Space']);
  assert.equal(catalog.getSnapshot().database, 'Energy Space');
  assert.deepEqual(catalog.getSnapshot().tables, ['Meter A']);
  assert.equal(catalog.getSnapshot().table, '');
});

test('切换连接撤销旧请求，旧连接的迟到结果不能污染新目录', async () => {
  const slow = deferred(); let oldSignal;
  const catalog = base({ databases: (id, signal) => { if (id === 'slow') { oldSignal = signal; return slow.promise; } return Promise.resolve(['new_db']); } });
  const previous = catalog.selectConnection('slow');
  await catalog.selectConnection('fast');
  assert.equal(oldSignal.aborted, true);
  slow.resolve(['old_db']); await previous;
  assert.equal(catalog.getSnapshot().connectionId, 'fast');
  assert.equal(catalog.getSnapshot().database, 'new_db');
  assert.equal(catalog.getSnapshot().error, null);
});

test('切换库清空旧表和字段，忽略上一库迟到的报错', async () => {
  const slow = deferred();
  const catalog = base({ tables: (_id, database) => database === 'energy' ? slow.promise : Promise.resolve(['archived']) });
  await catalog.selectConnection('mysql');
  const previous = catalog.selectDatabase('energy');
  await catalog.selectDatabase('archive');
  slow.reject(new Error('旧库网络失败')); await previous;
  assert.deepEqual(catalog.getSnapshot().tables, ['archived']);
  assert.equal(catalog.getSnapshot().table, '');
  assert.equal(catalog.getSnapshot().metadata, null);
  assert.equal(catalog.getSnapshot().error, null);
});

test('连续切表时旧字段响应不能覆盖新表字段', async () => {
  const slow = deferred();
  const catalog = base({ inspect: ({ table }) => table === 'meter' ? slow.promise : Promise.resolve(metadata(table)) });
  await catalog.selectConnection('mysql', 'energy');
  const previous = catalog.selectTable('meter');
  assert.equal(catalog.getSnapshot().loading, 'fields');
  await catalog.selectTable('reading');
  slow.resolve(metadata('old_meter')); await previous;
  assert.equal(catalog.getSnapshot().table, 'reading');
  assert.equal(catalog.getSnapshot().metadata.tableComment, 'reading');
});

test('刷新保留有效选项；已删除或失权的表必须清空并阻止继续使用旧字段', async () => {
  let tableNames = ['meter'];
  const catalog = base({ tables: async () => tableNames });
  await catalog.selectConnection('mysql', 'energy', 'meter');
  await catalog.refreshDatabases();
  assert.equal(catalog.getSnapshot().metadata.tableComment, 'meter');
  tableNames = [];
  await catalog.refreshTables();
  assert.equal(catalog.getSnapshot().table, '');
  assert.equal(catalog.getSnapshot().metadata, null);
});

test('库、表、字段失败分别提供可重试状态；空目录不伪造内容', async () => {
  let stage = 'databases';
  const catalog = base({
    databases: async () => { if (stage === 'databases') throw new Error('数据库权限不足'); return ['energy']; },
    tables: async () => { if (stage === 'tables') throw new Error('数据表读取失败'); return stage === 'empty' ? [] : ['meter']; },
    inspect: async () => { if (stage === 'fields') throw new Error('字段读取失败'); return metadata('meter'); },
  });
  await catalog.selectConnection('mysql');
  assert.equal(catalog.getSnapshot().error.stage, 'databases');
  stage = 'tables'; await catalog.refreshDatabases();
  assert.equal(catalog.getSnapshot().error.stage, 'tables');
  stage = 'fields'; await catalog.refreshTables(); await catalog.selectTable('meter');
  assert.equal(catalog.getSnapshot().error.stage, 'fields');
  assert.equal(catalog.getSnapshot().metadata, null);
  stage = ''; await catalog.refreshFields();
  assert.equal(catalog.getSnapshot().error, null);
  assert.ok(catalog.getSnapshot().metadata);
  stage = 'empty'; await catalog.refreshTables();
  assert.deepEqual(catalog.getSnapshot().tables, []);
  assert.equal(catalog.getSnapshot().metadata, null);
});

test('取消或退出后迟到响应不再更新状态，允许重新进入', async () => {
  const pending = deferred();
  const catalog = base({ databases: () => pending.promise });
  let notifications = 0;
  const unsubscribe = catalog.subscribe(() => notifications++);
  const running = catalog.selectConnection('mysql');
  const count = notifications; catalog.cancel(); unsubscribe();
  pending.resolve(['energy']); await running;
  assert.equal(notifications, count);
  await catalog.selectConnection('mysql');
  assert.equal(catalog.getSnapshot().database, 'energy');
});

test('字段刷新只保留业务编辑，类型、注释、索引和新增删除以数据库新定义为准', () => {
  const previous = [{ name: 'id', dataType: 'varchar(8)', databaseComment: '旧注释', primaryKey: false, customComment: '业务标识', enabled: false, sensitive: true }, { name: 'removed' }];
  const result = mergeDatasetMetadata(previous, { ...metadata('新表注释'), fields: [{ name: 'id', dataType: 'bigint', databaseComment: '新注释', primaryKey: true }, { name: 'added', dataType: 'text' }] });
  assert.equal(result.fields[0].dataType, 'bigint');
  assert.equal(result.fields[0].databaseComment, '新注释');
  assert.equal(result.fields[0].primaryKey, true);
  assert.equal(result.fields[0].customComment, '业务标识');
  assert.equal(result.fields[0].enabled, false);
  assert.equal(result.fields[0].sensitive, true);
  assert.deepEqual(result.fields.map((item) => item.name), ['id', 'added']);
  assert.equal(sameDatasetSource({ connectionId: 'a', database: 'd', table: 't' }, { connectionId: 'b', database: 'd', table: 't' }), false);
});
