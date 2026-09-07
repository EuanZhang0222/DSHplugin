/** 页码与固定行数页装配：网络分片不是用户看到的页数。只保留当前页。 */
export function pageNumbers(current, total) {
  if (!total) return [];
  const numbers = [...new Set([1, total, current - 2, current - 1, current, current + 1, current + 2])]
    .filter(number => number >= 1 && number <= total).sort((a, b) => a - b);
  return numbers.flatMap((number, index) => index && number - numbers[index - 1] > 1 ? [`gap-${number}`, number] : [number]);
}

export function validatePage(text, total) {
  if (!/^\d+$/.test(String(text).trim())) throw new Error('请输入有效的整数页码');
  const page = Number(text);
  if (!Number.isSafeInteger(page) || page < 1 || page > total) throw new Error(`请输入1到${total}之间的页码`);
  return page;
}

export async function loadNumberedPage(fetchPage, request, { isCurrent = () => true, onCursor = () => {}, maxBytes = 32 * 1024 * 1024 } = {}) {
  let chunk = await fetchPage({ ...request, maxTokens: 16000 });
  const rows = [];
  let fragment = '', fragmentRow = 0, bytes = 0;
  for (;;) {
    onCursor(chunk.cursor);
    if (!isCurrent()) return null;
    if (['failed', 'budget_exceeded'].includes(chunk.status)) throw new Error(chunk.error || chunk.nextAction || '查询未完整完成');
    bytes += JSON.stringify(chunk.rows || []).length * 2 + (chunk.rowFragment?.text.length || 0) * 2;
    if (bytes > maxBytes) throw new Error('当前页内容超过浏览器32MiB保护上限，请减少每页行数；未截断数据，模型接口仍可无损分片读取');
    rows.push(...(chunk.rows || []));
    if (chunk.rowFragment) {
      const f = chunk.rowFragment;
      if ((fragment && fragmentRow !== f.rowNumber) || f.offset !== fragment.length) throw new Error('页内数据分片不连续，请重新读取本页');
      fragmentRow = f.rowNumber; fragment += f.text;
      if (f.complete) { rows.push(JSON.parse(fragment)); fragment = ''; fragmentRow = 0; }
    }
    if (chunk.pageComplete || (chunk.status === 'collecting' && !chunk.rows?.length && !chunk.rowFragment)) {
      if (fragment) throw new Error('记录尚未完整获取，请刷新本页；不会展示被截断的记录');
      return { ...chunk, rows, rowFragment: undefined, rowStart: (request.page - 1) * request.limit + 1 };
    }
    if (!chunk.pageNextCursor) throw new Error('缺少页内续读游标，不能把部分结果作为完整页面');
    chunk = await fetchPage({ cursor: chunk.pageNextCursor, limit: request.limit, maxTokens: 16000 });
  }
}
