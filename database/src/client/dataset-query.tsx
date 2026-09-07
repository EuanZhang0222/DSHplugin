import React, { useEffect, useRef, useState } from 'react'
import { loadNumberedPage, pageNumbers, validatePage } from './dataset-pagination.mjs'

/** 单页替换显示；只保存游标，不把所有业务行累积到浏览器内存。 */
export function DatasetQueryBrowser({ dataset, onClose, ui }) {
  const { api, Modal, Button, Message, QueryResult } = ui
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [jumpPage, setJumpPage] = useState('1')
  const [pageSize, setPageSize] = useState(100)
  const currentCursor = useRef('')
  const mounted = useRef(false)
  const generation = useRef(0)
  const tableViewport = useRef(null)
  useEffect(() => { if (tableViewport.current) tableViewport.current.scrollTop = 0 }, [result?.cursor])

  const release = (cursor) => cursor ? api('/semantic/query/dataset', { datasetId: dataset.id, request: { cursor, action: 'close' } }).catch(() => {}) : Promise.resolve()
  const load = async (cursor = '', page = 1, initial = false, limit = pageSize) => {
    const version = ++generation.current
    setBusy(true); setMessage(null)
    let issuedCursor = ''
    const isCurrent = () => mounted.current && generation.current === version
    try {
      const value = await loadNumberedPage(request => api('/semantic/query/dataset', { datasetId: dataset.id, request }),
        { ...(cursor ? { cursor } : {}), page, limit }, { isCurrent, onCursor: value => { issuedCursor = value || issuedCursor; if (isCurrent()) currentCursor.current = issuedCursor || cursor } })
      if (!isCurrent()) { if (initial) await release(issuedCursor); return }
      setResult(value); setPageNumber(page); setPageSize(limit); setJumpPage(String(page))
    } catch (error) { if (isCurrent()) setMessage({ kind: 'error', text: error.message }); else if (initial) await release(issuedCursor) }
    finally { if (isCurrent()) setBusy(false) }
  }
  useEffect(() => {
    mounted.current = true
    load('', 1, true)
    return () => { mounted.current = false; generation.current++; release(currentCursor.current); currentCursor.current = '' }
  }, [dataset.id])
  useEffect(() => {
    if (result?.status !== 'collecting' || busy || message?.kind === 'error') return
    const timer = setTimeout(() => load(currentCursor.current, pageNumber), 1000)
    return () => clearTimeout(timer)
  }, [result?.status, busy, pageNumber, pageSize, message])
  const refresh = async () => {
    setBusy(true); await release(currentCursor.current); currentCursor.current = ''; setResult(null)
    await load('', 1, true)
  }
  const jump = () => {
    try { load(currentCursor.current, validatePage(jumpPage, result?.totalPages || 0)) }
    catch (error) { setMessage({ kind: 'error', text: error.message }) }
  }
  const rows = result?.rows || []
  const totalPages = result?.totalPages
  const canPage = !busy && totalPages > 0 && !!currentCursor.current
  return <Modal wide eyebrow="全量查询 · 分页浏览" title={`浏览 ${dataset.name}`}
    description="读取当前数据集全部可查询字段与记录，每页显示部分内容；不受200条总量限制。敏感和停用字段仍排除。"
    onClose={onClose} footer={<Button onClick={onClose}>关闭并释放查询</Button>}>
    <Message value={message} />
    <div className="dsl-query-pagination">
      <label>每页 <select className="dsl-select" aria-label="每页行数" value={pageSize} disabled={busy || !currentCursor.current} onChange={event => load(currentCursor.current, 1, false, Number(event.target.value))}>
        {[20, 50, 100, 200].map(size => <option key={size} value={size}>{size} 行</option>)}
      </select></label>
      {result?.status === 'collecting' ? <Button disabled={busy} onClick={() => load(currentCursor.current, pageNumber)}>刷新采集进度</Button> : null}
      <Button disabled={busy} onClick={refresh}>重新查询最新数据</Button>
    </div>
    <div className="dsl-hint" role="status" aria-live="polite">
      {!result ? (message?.kind === 'error' ? '查询未完成，请查看上方提示后重试。' : '正在创建查询结果…') : result.status === 'failed' ? result.error : result.status === 'budget_exceeded' ? result.nextAction : <>
        <strong>{result.complete ? '当前为最后一页' : result.status === 'collecting' ? '数据库正在采集结果，总页数待确定' : '完整结果已就绪，可翻页或直接跳转'}</strong>
        <div>{result.totalRows === null ? `已采集 ${result.capturedRows} 条，总数待查询结束确定` : `共 ${result.totalRows} 条`}
          {rows.length ? ` · 当前第 ${result.rowStart}–${result.readThrough} 条` : ''}{totalPages !== null && totalPages !== undefined ? ` · 第 ${totalPages ? pageNumber : 0} / ${totalPages} 页` : ''}</div>
      </>}
    </div>
    {rows.length ? <div className="dsl-paged-table" ref={tableViewport}><QueryResult value={{ ...result, columns: result.columns?.length ? result.columns : Object.keys(rows[0]) }} /></div> : null}
    {result?.complete && !rows.length && !result.rowFragment ? <div className="dsl-empty">没有更多记录</div> : null}
    <nav className="dsl-numbered-pagination" aria-label="数据集分页器" aria-busy={busy}>
      <span>{totalPages === null || totalPages === undefined ? '总页数待确定' : `共 ${result.totalRows} 条 · ${totalPages} 页`}{busy ? ' · 正在读取…' : ''}</span>
      <div className="dsl-page-buttons">
        <Button disabled={!canPage || pageNumber <= 1} onClick={() => load(currentCursor.current, pageNumber - 1)}>上一页</Button>
        {pageNumbers(pageNumber, totalPages).map(page => typeof page === 'number' ?
          <Button key={page} kind={page === pageNumber ? 'primary' : 'default'} aria-label={`第 ${page} 页`} aria-current={page === pageNumber ? 'page' : undefined}
            disabled={!canPage} onClick={() => load(currentCursor.current, page)}>{page}</Button> : <span key={page} aria-hidden="true">…</span>)}
        <Button disabled={!canPage || pageNumber >= totalPages} onClick={() => load(currentCursor.current, pageNumber + 1)}>下一页</Button>
      </div>
      <form noValidate onSubmit={event => { event.preventDefault(); jump() }}>
        <label>前往 <input className="dsl-input" type="number" min="1" max={totalPages || 1} step="1" aria-label="跳转页码" disabled={!canPage}
          value={jumpPage} onChange={event => setJumpPage(event.target.value)} /> 页</label>
        <Button type="submit" disabled={!canPage}>跳转</Button>
      </form>
    </nav>
    <details className="dsl-query-notes"><summary>查询完整性说明</summary>
      <p>每次新查询在数据库执行一次完整只读查询，并流式缓存结果。翻页不会重新扫描数据库，因此无主键、排序值重复或翻页期间源数据变化不会造成分页漏行。数据一致性仍由数据库自身的引擎与读取隔离语义决定。</p>
      <p>总页数 = 总记录数 ÷ 每页行数后向上取整。采集完成前总页数待确定，不能跳转未知页面。网络分片在本页内自动装配，不会改变页数；跳到最后一页不等于已经查看前面的页。浏览器单页32MiB保护上限不影响模型接口无损分片读取。</p>
      <p>查询失败、超时、缓存空间不足、权限变化或游标失效时，会明确提示未完整完成。缓存空闲一小时过期，关闭窗口或重启服务会释放/失效。需要最新记录请重新查询。</p>
    </details>
  </Modal>
}
