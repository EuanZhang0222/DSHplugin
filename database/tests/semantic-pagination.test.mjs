import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatasetQueryStore } from '../lib/semantic/query-snapshots.js';
import { compileDatasetQuery } from '../lib/semantic/query.js';
import { estimateTokens } from '../lib/semantic/budget.js';
import { loadNumberedPage, pageNumbers, validatePage } from '../src/client/dataset-pagination.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function setup(t, rows = [], options = {}) {
  let calls = 0;
  const state = { connection: { type: 'mysql', id: 'c', password: 'must-not-leak' }, dataset: {
    id: 'd', name: '全量分页测试', connectionId: 'c', database: 'fixture', table: 'records', enabled: true,
    fields: ['id', 'value', 'secret', 'disabled'].map(name => ({ name, dataType: 'varchar(100)', enabled: name !== 'disabled', sensitive: name === 'secret' })),
  } };
  const store = createDatasetQueryStore({ getSource: id => { if (id !== 'd') throw new Error('missing'); return state; },
    async *streamRows(_connection, compiled, signal) {
      calls++;
      assert.doesNotMatch(compiled.sql, /LIMIT|OFFSET/);
      for (const row of rows) { signal.throwIfAborted(); yield row; }
    }, ...options });
  t.after(() => store.dispose());
  return { store, state, calls: () => calls };
}
async function drain(store, request = {}, exec) {
  const all = [], fragments = new Map();
  let page = await store.query('d', request, exec), pages = 0, lastCursor;
  for (;;) {
    pages++;
    assert.ok(pages < 10000, '分页必须终止');
    assert.notEqual(page.status, 'failed', page.error);
    assert.notEqual(page.status, 'budget_exceeded');
    assert.ok(estimateTokens(page) <= (request.maxTokens || 6000));
    all.push(...page.rows);
    if (page.rowFragment) {
      const f = page.rowFragment, old = fragments.get(f.rowNumber) || '';
      assert.equal(f.offset, old.length); fragments.set(f.rowNumber, old + f.text);
      if (f.complete) { all.push(JSON.parse(fragments.get(f.rowNumber))); fragments.delete(f.rowNumber); }
    }
    lastCursor = page.cursor;
    if (page.complete) { assert.equal(page.status, 'ready'); assert.equal(page.nextCursor, null); assert.equal(page.hasMore, false); break; }
    assert.ok(page.nextCursor);
    if (!page.rows.length && !page.rowFragment) await sleep(5);
    page = await store.query('d', { cursor: page.nextCursor, limit: request.limit, maxTokens: request.maxTokens }, exec);
  }
  assert.equal(fragments.size, 0);
  return { all, pages, page, lastCursor };
}

for (const count of [0, 1, 200, 201, 1507]) test(`全量${count}条，全部字段不丢行、不重复，单次SQL无总LIMIT`, async t => {
  const rows = Array.from({ length: count }, (_, i) => ({ id: String(9007199254740993n + BigInt(count - i)), value: '中文🦑' + i, secret: 'hidden', disabled: 'hidden' }));
  const s = setup(t, rows);
  const result = await drain(s.store, { limit: 200 });
  assert.deepEqual(result.all, rows.map(({ id, value }) => ({ id, value })));
  assert.equal(result.page.totalRows, count); assert.equal(result.page.readThrough, count); assert.equal(s.calls(), 1);
  assert.doesNotMatch(JSON.stringify(result), /must-not-leak|hidden/);
});

test('无主键、重复值、完全相同的行保持原始数量；翻页不受源数据变化影响', async t => {
  const rows = Array.from({ length: 520 }, () => ({ id: null, value: '重复' }));
  const s = setup(t, rows);
  let first = await s.store.query('d', { limit: 20 });
  while (first.status !== 'ready') first = await s.store.query('d', { cursor: first.cursor, limit: 20 });
  rows.splice(0, rows.length, { id: 'new', value: '源数据已修改' });
  const replay = await s.store.query('d', { cursor: first.cursor, limit: 20 });
  assert.deepEqual(first.rows, replay.rows);
  let count = first.rows.length, page = first;
  while (!page.complete) { page = await s.store.query('d', { cursor: page.nextCursor, limit: 20 }); count += page.rows.length; }
  assert.equal(count, 520); assert.equal(s.calls(), 1);
});

test('超长中文/Emoji/换行/引号文本无损分片；小预算不截字段', async t => {
  const value = '🦑中文\n"\\'.repeat(5000);
  const s = setup(t, [{ id: 'long', value }, { id: 'next', value: null }]);
  const result = await drain(s.store, { limit: 100, maxTokens: 2000 });
  assert.deepEqual(result.all, [{ id: 'long', value }, { id: 'next', value: null }]);
  assert.ok(result.pages > 10);
});

test('全部可查询字段超过100列时仍完整读取', async t => {
  const row = Object.fromEntries(Array.from({ length: 350 }, (_, i) => ['field_' + i, '值' + i]));
  const s = setup(t, [row]); s.state.dataset.fields = Object.keys(row).map(name => ({ name, enabled: true, dataType: 'String' }));
  const result = await drain(s.store, { maxTokens: 2000 }); assert.deepEqual(result.all, [row]);
});

test('签名游标不可篡改、跨数据集/会话复用或改变过滤条件', async t => {
  const s = setup(t, [{ id: '1', value: 'a' }]);
  const page = await s.store.query('d', { fields: ['id'], limit: 1 }, { owner: 'session-a' });
  await assert.rejects(() => s.store.query('d', { cursor: page.cursor.slice(0, -3) + 'BAD' }, { owner: 'session-a' }), /游标/);
  await assert.rejects(() => s.store.query('other', { cursor: page.cursor }, { owner: 'session-a' }), /不属于/);
  await assert.rejects(() => s.store.query('d', { cursor: page.cursor }, { owner: 'session-b' }), /不属于/);
  await assert.rejects(() => s.store.query('d', { cursor: page.cursor, fields: ['value'] }, { owner: 'session-a' }), /不能改变/);
});

test('查询后字段变为敏感或连接变更，旧缓存不能再读取', async t => {
  const s = setup(t, [{ id: '1', value: 'a' }]); const page = await s.store.query('d', {});
  s.state.dataset.fields[1].sensitive = true;
  await assert.rejects(() => s.store.query('d', { cursor: page.cursor }), /已变更/);
});

test('敏感、停用字段过滤/排序/选择均不能绕过，关闭后游标失效', async t => {
  const s = setup(t, [{ id: '1', value: 'a' }]);
  for (const fields of [['secret'], ['disabled']]) await assert.rejects(() => s.store.query('d', { fields }), /敏感|未启用/);
  await assert.rejects(() => s.store.query('d', { filters: [{ field: 'secret', operator: 'eq', value: 'x' }] }), /敏感/);
  await assert.rejects(() => s.store.query('d', { orderBy: [{ field: 'secret' }] }), /敏感/);
  const page = await s.store.query('d', {});
  assert.equal((await s.store.query('d', { cursor: page.cursor, action: 'close' })).status, 'closed');
  await assert.rejects(() => s.store.query('d', { cursor: page.cursor }), /过期/);
});

test('后台采集尚未结束及后续失败都不能标记complete', async t => {
  let finish;
  const s = setup(t, [], { waitMs: 1, async *streamRows() { yield { id: 1, value: 'partial' }; await new Promise(resolve => { finish = resolve; }); throw new Error('database password secret'); } });
  let page = await s.store.query('d', {});
  while (!finish) { await sleep(2); }
  assert.equal(page.complete, false); assert.equal(page.totalRows, null);
  finish(); await sleep(5);
  page = await s.store.query('d', { cursor: page.cursor });
  assert.equal(page.status, 'failed'); assert.equal(page.complete, false); assert.equal(page.nextCursor, null);
  assert.doesNotMatch(page.error, /password|secret/);
});

test('资源上限明确失败，缓存关闭后释放容量；不存在静默行数截断', async t => {
  const s = setup(t, [{ id: '1', value: 'x'.repeat(3000) }], { maxBytes: 1000 });
  const page = await s.store.query('d', {});
  assert.equal(page.status, 'failed'); assert.equal(page.complete, false); assert.match(page.error, /缓存空间不足/);
});

test('空闲过期与并发上限有明确提示', async t => {
  const s = setup(t, [{ id: 1, value: 'x' }], { ttlMs: 150, maxJobs: 1 });
  const page = await s.store.query('d', {});
  await assert.rejects(() => s.store.query('d', {}), /释放旧结果/);
  await sleep(170);
  await assert.rejects(() => s.store.query('d', { cursor: page.cursor }), /过期/);
});

test('连接取消/超时和预算不足都不能跳过数据', async t => {
  const s = setup(t, [{ id: 1, value: 'x' }]);
  const page = await s.store.query('d', {}, { tokenBudget: 100 });
  assert.equal(page.status, 'budget_exceeded'); assert.equal(page.complete, false);
  const retry = await s.store.query('d', { cursor: page.nextCursor }); assert.equal(retry.rows[0].id, 1);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(() => s.store.query('d', {}, { signal: abort.signal }));
});

test('MySQL和ClickHouse全量编译保留参数化与全部字段，旧编译模式兼容', () => {
  const dataset = { database: 'db', table: 'tbl', fields: [{ name: 'id', dataType: 'Int64', enabled: true }] };
  for (const kind of ['mysql', 'clickhouse']) {
    const q = compileDatasetQuery(kind, dataset, { limit: 200, filters: [{ field: 'id', operator: 'eq', value: "1' OR 1=1" }] }, { fullResult: true });
    assert.doesNotMatch(q.sql, /LIMIT|OR 1=1/);
    assert.match(compileDatasetQuery(kind, dataset, {}).sql, /LIMIT 100$/);
  }
});

test('采集超时明确失败，不把已捕获记录当全量', async t => {
  const s = setup(t, [], { timeoutMs: 30, waitMs: 50,
    async *streamRows(_c, _q, signal) {
      yield { id: 1, value: 'partial' };
      await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    } });
  const page = await s.store.query('d', {});
  assert.equal(page.status, 'failed'); assert.equal(page.complete, false); assert.match(page.error, /超时/);
});

test('首次请求中途取消会释放未交付游标的后台查询', async t => {
  const s = setup(t, [], { maxJobs: 1, waitMs: 30,
    async *streamRows(_c, _q, signal) {
      await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
      yield { id: 1 };
    } });
  const controller = new AbortController();
  const pending = s.store.query('d', {}, { signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(() => pending);
  // If the first job leaked, this would throw the maxJobs error.
  const page = await s.store.query('d', {});
  assert.equal(page.status, 'collecting');
  await s.store.query('d', { cursor: page.cursor, action: 'close' });
});

test('固定分页器1507条共8页，直接跳末页/中间页及改变页大小不重新执行SQL', async t => {
  const rows = Array.from({ length: 1507 }, (_, i) => ({ id: i + 1, value: `记录${i + 1}` }));
  const s = setup(t, rows);
  const fetchPage = request => s.store.query('d', request);
  let first = await loadNumberedPage(fetchPage, { page: 1, limit: 200 });
  while (first.totalPages === null) first = await loadNumberedPage(fetchPage, { cursor: first.cursor, page: 1, limit: 200 });
  assert.equal(first.totalPages, 8); assert.equal(first.rows.length, 200);
  const last = await loadNumberedPage(fetchPage, { cursor: first.cursor, page: 8, limit: 200 });
  assert.equal(last.rows.length, 107); assert.equal(last.rows[0].id, 1401); assert.equal(last.rows.at(-1).id, 1507); assert.equal(last.complete, true);
  const middle = await loadNumberedPage(fetchPage, { cursor: last.cursor, page: 3, limit: 200 });
  assert.equal(middle.rows[0].id, 401); assert.equal(middle.rows.at(-1).id, 600); assert.equal(middle.complete, false);
  const resized = await loadNumberedPage(fetchPage, { cursor: middle.cursor, page: 31, limit: 50 });
  assert.equal(resized.totalPages, 31); assert.equal(resized.rows.length, 7); assert.equal(resized.rows[0].id, 1501);
  await assert.rejects(() => fetchPage({ cursor: middle.cursor, page: 9, limit: 200 }), /超出/);
  assert.equal(s.calls(), 1);
});

test('页内大字段跨网络响应自动拼装，固定页码不漏行不越页，顺序模型续读仍可完整结束', async t => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: i, value: '中文🦑'.repeat(4000) }));
  const s = setup(t, rows);
  const one = await loadNumberedPage(r => s.store.query('d', r), { page: 1, limit: 2 });
  assert.deepEqual(one.rows, rows.slice(0, 2)); assert.equal(one.totalPages, 3); assert.equal(one.pageComplete, true); assert.equal(one.complete, false);
  const two = await loadNumberedPage(r => s.store.query('d', r), { cursor: one.cursor, page: 2, limit: 2 });
  assert.deepEqual(two.rows, rows.slice(2, 4));
  const all = await drain(s.store, { page: 1, limit: 2 });
  assert.deepEqual(all.all, rows);
});

test('页码0/负数/非整数/溢出拒绝，空结果共0页，采集时总页数未知且不能跳未知页', async t => {
  const s = setup(t, []);
  for (const page of [0, -1, 1.5, '2', Number.MAX_SAFE_INTEGER]) await assert.rejects(() => s.store.query('d', { page, limit: 200 }), /正整数/);
  await assert.rejects(() => s.store.query('d', { page: 2 }), /先创建/);
  const empty = await loadNumberedPage(r => s.store.query('d', r), { page: 1, limit: 100 });
  assert.equal(empty.totalPages, 0); assert.equal(empty.pageComplete, true); assert.equal(empty.complete, true);
  const slow = setup(t, [], { waitMs: 1, async *streamRows(_c, _q, signal) { await new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })); yield { id: 1 }; } });
  const waiting = await loadNumberedPage(r => slow.store.query('d', r), { page: 1, limit: 100 });
  assert.equal(waiting.totalPages, null); assert.equal(waiting.pageComplete, false);
  await assert.rejects(() => slow.store.query('d', { cursor: waiting.cursor, page: 2 }), /尚未完整采集/);
});

test('页内游标绑定固定页大小和会话，跳页不能绕过权限', async t => {
  const s = setup(t, Array.from({ length: 10 }, (_, id) => ({ id, value: '长'.repeat(3000) })));
  const first = await s.store.query('d', { page: 1, limit: 5 }, { owner: 'a' });
  assert.equal(first.pageComplete, false);
  await assert.rejects(() => s.store.query('d', { cursor: first.pageNextCursor, limit: 2 }, { owner: 'a' }), /修改每页行数/);
  await assert.rejects(() => s.store.query('d', { cursor: first.cursor, page: 2, limit: 5 }, { owner: 'b' }), /不属于/);
  s.state.dataset.fields[0].sensitive = true;
  await assert.rejects(() => s.store.query('d', { cursor: first.cursor, page: 2, limit: 5 }, { owner: 'a' }), /已变更/);
});

test('分页器数字省略与跳页输入校验，页过大和分片异常不会静默展示残缺页', async t => {
  assert.deepEqual(pageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(pageNumbers(50, 100), [1, 'gap-48', 48, 49, 50, 51, 52, 'gap-100', 100]);
  assert.deepEqual(pageNumbers(1, 0), []);
  assert.equal(validatePage('8', 8), 8);
  for (const text of ['', '0', '9', '-1', '1.5', 'abc']) assert.throws(() => validatePage(text, 8), /页码/);
  const s = setup(t, [{ id: 1, value: 'a'.repeat(200) }]);
  await assert.rejects(() => loadNumberedPage(r => s.store.query('d', r), { page: 1, limit: 100 }, { maxBytes: 100 }), /保护上限/);
  await assert.rejects(() => loadNumberedPage(async () => ({ cursor: 'x', status: 'ready', rows: [], rowFragment: { rowNumber: 1, offset: 5, text: 'x' } }), { page: 1, limit: 100 }), /不连续/);
  assert.equal(await loadNumberedPage(async () => ({ cursor: 'x' }), { page: 1, limit: 100 }, { isCurrent: () => false }), null);
});
