import React, { useEffect, useState } from 'react'

function useRead(api, path, body, dependency) {
  const [value, setValue] = useState({ data: null, error: '', busy: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setValue({ data: null, error: '', busy: true })
    api(path, body, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setValue({ data, error: '', busy: false })
    }).catch((error) => { if (!controller.signal.aborted) setValue({ data: null, error: error.message, busy: false }) })
    return () => controller.abort()
  }, [api, path, dependency, attempt])
  return { ...value, retry: () => setAttempt((n) => n + 1) }
}

function Pages({ ui, next, previous, onNext, onPrevious }) {
  return <div className="dsl-preview-pages"><ui.Button disabled={!previous} onClick={onPrevious}>上一页</ui.Button><ui.Button disabled={!next} onClick={onNext}>下一页</ui.Button></div>
}

function FieldPicker({ ui, dataset, picked, onChange }) {
  const [keyword, setKeyword] = useState(''), [cursors, setCursors] = useState([''])
  const cursor = cursors[cursors.length - 1]
  const resource = useRead(ui.api, '/semantic/context/fields', { datasetId: dataset.id, keyword, cursor, limit: 10 }, JSON.stringify([dataset.id, keyword, cursor]))
  return <div className="dsl-field-picker"><input className="dsl-input" aria-label={`搜索${dataset.name}的字段`} placeholder="搜索字段、业务名称或注释" value={keyword} onChange={(e) => { setKeyword(e.target.value); setCursors(['']) }} />
    {resource.error ? <div role="alert" className="dsl-hint">{resource.error}<ui.Button onClick={() => { setCursors(['']); resource.retry() }}>重新检索</ui.Button></div> : resource.busy ? <p>正在读取字段…</p> : <><small>共 {resource.data.total} 个可用字段；勾选后点击“生成预览”</small><div className="dsl-field-choices">{resource.data.fields.map((field) => {
      const checked = picked.some((p) => p.datasetId === dataset.id && p.field === field.name)
      return <label key={field.name}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked ? [...picked, { datasetId: dataset.id, field: field.name }] : picked.filter((p) => !(p.datasetId === dataset.id && p.field === field.name)))} /><span><code>{field.name}</code> · {field.type}<small>{field.label || field.meaning || '未填写业务说明'}</small></span></label>
    })}</div><Pages ui={ui} previous={cursors.length > 1} next={resource.data.nextCursor} onPrevious={() => setCursors(cursors.slice(0, -1))} onNext={() => setCursors([...cursors, resource.data.nextCursor])} /></>}
  </div>
}

function FullDetails({ ui, datasetId }) {
  const [page, setPage] = useState(0), [query, setQuery] = useState('')
  const resource = useRead(ui.api, '/semantic/context/dataset', { id: datasetId }, datasetId)
  useEffect(() => { setPage(0); setQuery('') }, [datasetId])
  if (resource.error) return <div role="alert" className="dsl-hint">{resource.error}<ui.Button onClick={resource.retry}>重新读取</ui.Button></div>
  if (resource.busy) return <div className="dsl-hint">正在读取完整语义资料…</div>
  const context = resource.data.context, dataset = context.dataset
  const fields = dataset.fields.filter((f) => `${f.name} ${f.businessName} ${f.businessComment} ${f.databaseComment}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="dsl-context-panel"><section className="dsl-context-block"><h3>{dataset.name}</h3><p>{dataset.source.connectionName} · <code>{dataset.source.database}.{dataset.source.table}</code></p><p>{dataset.purpose || '未填写表用途'}</p><small>原表注释：{dataset.source.tableComment || '数据库未提供'}。完整资料用于核对，不会自动整份发送给模型。</small></section>
    <section className="dsl-context-block"><div className="dsl-query-head"><h3>字段语义 · {dataset.fields.length} 项</h3><input className="dsl-input dsl-preview-search" aria-label="搜索完整字段语义" placeholder="搜索字段或业务含义" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} /></div>
      <div className="dsl-semantic-fields">{fields.slice(page * 12, page * 12 + 12).map((field) => {
        const meaning = field.businessComment || field.databaseComment || '', label = field.businessName || field.semanticConcept?.name || ''
        return <div key={field.name}><code>{field.name}<small>{field.dataType}</small></code><span>{label && label !== meaning ? <strong>{label}</strong> : null}{meaning || label || '未填写业务说明'}<details><summary>来源与定义</summary><p>数据库原注释：{field.databaseComment || '未提供'}</p><p>自定义注释：{field.businessComment || '未填写，采用数据库原注释'}</p>{field.semanticConcept ? <p>统一语义：{field.semanticConcept.name} · {field.semanticConcept.definition}</p> : null}</details></span></div>
      })}</div><Pages ui={ui} previous={page > 0} next={(page + 1) * 12 < fields.length} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />
    </section><section className="dsl-context-block"><h3>允许使用的关系 · {context.relations.length} 条</h3>{context.relations.length ? context.relations.map((r) => <div className="dsl-preview-relation" key={r.id}><p>{r.source.datasetName} · {r.source.connectionName}<br /><code>{r.source.database}.{r.source.table}.{r.source.field}</code></p><small>{ui.CARDINALITY[r.type] || r.type}</small><p>{r.target.datasetName} · {r.target.connectionName}<br /><code>{r.target.database}.{r.target.table}.{r.target.field}</code></p></div>) : <p>暂无已确认且端点可用的拓扑关系。</p>}</section>
    <details className="dsl-context-block"><summary>查看完整结构化资料（兼容接口）</summary><pre>{JSON.stringify(context, null, 2)}</pre></details>
  </div>
}

function TaskPreview({ ui, state, datasetId }) {
  const [question, setQuestion] = useState(''), [scope, setScope] = useState('all'), [maxTokens, setMaxTokens] = useState(6000)
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [picked, setPicked] = useState([]), [dirty, setDirty] = useState(false)
  const requestRef = React.useRef(null)
  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(() => { requestRef.current?.abort(); setBusy(false); setResult(null); setPicked([]); setError('') }, [scope, datasetId, question, maxTokens])
  const generate = async () => {
    requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller
    setBusy(true); setError('')
    try {
      if (!question.trim()) throw new Error('请先输入业务问题，例如：按区域查询本月用电量')
      const body = { question, maxTokens, includeFields: picked, ...(scope === 'current' ? { datasetId } : scope !== 'all' ? { topologyId: scope } : {}) }
      const data = await ui.api('/semantic/context/task', body, { signal: controller.signal })
      if (!controller.signal.aborted) { setResult(data.result); setDirty(false) }
    } catch (e) { if (!controller.signal.aborted) setError(e.message) }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  const context = result?.context
  const find = (id) => context?.datasets.find((d) => d.id === id)
  const endpoint = (ep) => { const d = find(ep.datasetId); return <span><strong>{d?.name}</strong><small>{d?.source.connectionName}</small><code>{d?.source.database}.{d?.source.table}.{ep.field}</code></span> }
  return <div className="dsl-context-panel"><section className="dsl-context-block"><h3>这个问题需要哪些数据库语义？</h3><p>只检索已保存的语义资料，不查询业务数据，也不调用大模型。</p><textarea className="dsl-textarea" aria-label="预览业务问题" maxLength={1000} placeholder="例如：按区域查询本月用电量，需要哪些表和字段？" value={question} onChange={(e) => setQuestion(e.target.value)} />
    <div className="dsl-preview-controls"><ui.Field label="检索范围"><select className="dsl-select" value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">全部启用数据集（按需选取）</option><option value="current">左侧当前数据集</option>{state.topologies.filter((t) => t.enabled !== false).map((t) => <option key={t.id} value={t.id}>拓扑：{t.name}</option>)}</select></ui.Field><ui.Field label="本次语义预算（Token / 文本计量单位）"><select className="dsl-select" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))}>{[2000, 4000, 6000, 8000, 16000].map((n) => <option key={n} value={n}>{n.toLocaleString()} · 估算上限</option>)}</select></ui.Field><ui.Button kind="primary" disabled={busy || !datasetId} onClick={generate}>{busy ? '正在生成…' : '生成预览'}</ui.Button></div>
    {error ? <p role="alert" className="dsl-field-error">{error}</p> : null}<details className="dsl-preview-explanation"><summary>按需加载与预算说明</summary><p>按表用途、字段/注释、统一语义及别名检索；保留匹配字段与标识、时间、单位等关键字段。只补齐已确认关联路径，不把语义相同当成可关联。原始资料不删除。</p><p>实际调用会结合宿主模型窗口和会话用量重新检查，预留回答与安全余量。无法读取会话计量时，仅执行单次上限并明确提示；这不是整个会话容量的保证。</p></details>
    </section>{result ? <><section className="dsl-context-block" aria-live="polite"><div className="dsl-query-head"><h3>{result.status === 'ok' ? '本次上下文' : result.status === 'budget_exceeded' ? '本次内容超出预算' : '需要补充检索条件'}</h3><ui.StatusPill>{result.budget?.estimatedTokens ? `约 ${result.budget.estimatedTokens.toLocaleString()} Token` : '未载入语义'}</ui.StatusPill></div>{result.budget?.requiredEstimate ? <p>所需约 {result.budget.requiredEstimate.toLocaleString()}，当前上限 {result.budget.limit.toLocaleString()}。未发送残缺内容。</p> : null}<p>{result.budget?.note}</p>{result.nextAction ? <p>{result.nextAction}</p> : null}{dirty ? <p className="dsl-preview-warning">补选字段已改变，请点击“生成预览”更新结果。</p> : null}{context ? <><div className="dsl-preview-metrics"><strong>{context.datasets.length} 张表</strong><strong>{context.datasets.reduce((n, d) => n + d.fields.length, 0)} 个字段</strong><strong>{context.relations.length} 条确认关系</strong></div><p>未载入 {context.datasets.reduce((n, d) => n + d.omittedFields, 0)} 个非相关字段；另有 {result.selection.omittedDatasets} 个候选数据集未选入，可缩小范围后补查。</p>{result.selection.disconnected.length ? <p className="dsl-preview-warning">部分表之间没有已确认路径，不能据此自动关联。</p> : null}</> : null}</section>
    {context?.datasets.map((d) => <section key={d.id} className="dsl-context-block"><div className="dsl-query-head"><h3>{d.name}</h3><small>{d.selectionReason}</small></div><p>{d.source.connectionName} · <code>{d.source.database}.{d.source.table}</code></p><p>{d.purpose || '未填写用途'}</p><div className="dsl-semantic-fields">{d.fields.map((f) => <div key={f.name}><code>{f.name}<small>{f.type}</small></code><span>{f.label ? <strong>{f.label}</strong> : null}{f.meaning || (!f.label ? '未填写业务说明' : '')}{f.conceptId ? <small>统一语义：{context.concepts.find((c) => c.id === f.conceptId)?.name}</small> : null}</span></div>)}</div><details><summary>补选字段（还有 {d.omittedFields} 个未载入）</summary><FieldPicker ui={ui} dataset={d} picked={picked} onChange={(next) => { setPicked(next); setDirty(true) }} /></details></section>)}
    {context ? <><section className="dsl-context-block"><h3>允许使用的关联路径</h3>{context.relations.length ? context.relations.map((r) => <div className="dsl-preview-relation" key={r.id}>{endpoint(r.source)}<small>{ui.CARDINALITY[r.type] || r.type}</small>{endpoint(r.target)}{r.description ? <p>{r.description}</p> : null}</div>) : <p>本次没有载入已确认关系；禁止猜测关联。</p>}</section><details className="dsl-context-block"><summary>查看本次工具返回结构（紧凑格式）</summary><p>与智能体使用同一构建逻辑；实际调用时会重新计算会话预算。下方内容只返回一次，不额外重复自然语言与结构化全文。</p><pre>{JSON.stringify(result)}</pre></details></> : null}</> : <div className="dsl-hint">先输入问题，再生成本次需要的语义上下文。左侧目录不会整份发送给模型。</div>}
  </div>
}

export function SemanticPreview({ ui, state, initialId, onClose }) {
  const [mode, setMode] = useState('task'), [datasetId, setDatasetId] = useState(initialId || state.datasets.find((d) => d.enabled !== false)?.id || '')
  const [keyword, setKeyword] = useState(''), [cursors, setCursors] = useState([''])
  const cursor = cursors[cursors.length - 1]
  const resource = useRead(ui.api, '/semantic/context/catalog', { keyword, cursor, limit: 8 }, JSON.stringify([keyword, cursor]))
  return <ui.Modal wide eyebrow="统一数据语义层" title="预览大模型上下文" description="完整资料用于维护核对；模型按当前问题获取必要语义，不自动载入全部数据集。" onClose={onClose} footer={<ui.Button onClick={onClose}>关闭</ui.Button>}>
    <div className="dsl-preview-modes" role="group" aria-label="语义预览模式">{[['task', '按问题预览'], ['full', '完整详情']].map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} className={mode === id ? 'selected' : ''} onClick={() => setMode(id)}>{label}</button>)}</div>
    <div className="dsl-context-layout dsl-preview-layout"><aside className="dsl-context-switcher"><input className="dsl-input" aria-label="检索语义目录" placeholder="搜索数据集、表或业务词" value={keyword} onChange={(e) => { setKeyword(e.target.value); setCursors(['']) }} /><small>{resource.data ? `${resource.data.total} 个匹配数据集` : '目录读取中…'}</small>{resource.error ? <div role="alert">{resource.error}<ui.Button onClick={() => { setCursors(['']); setKeyword(''); resource.retry() }}>重新检索</ui.Button></div> : null}
      {resource.data?.datasets.map((d) => <button type="button" key={d.id} className={datasetId === d.id ? 'selected' : ''} aria-pressed={datasetId === d.id} onClick={() => setDatasetId(d.id)}><strong>{d.name}</strong><code>{d.source.database}.{d.source.table}</code><small>{d.fieldCount} 个可用字段</small></button>)}{resource.data?.total === 0 ? <p>暂无匹配数据集</p> : null}<Pages ui={ui} previous={cursors.length > 1} next={resource.data?.nextCursor} onPrevious={() => setCursors(cursors.slice(0, -1))} onNext={() => setCursors([...cursors, resource.data.nextCursor])} />
    </aside>{datasetId ? <div className="dsl-preview-content"><div hidden={mode !== 'task'}><TaskPreview ui={ui} state={state} datasetId={datasetId} /></div>{mode === 'full' ? <FullDetails ui={ui} datasetId={datasetId} /> : null}</div> : <div className="dsl-hint">请先创建并启用数据集。</div>}</div>
  </ui.Modal>
}

export function RelationBatchModal({ ui, topology, modelReady = false, inputBudget = 8000, sampleValues, onClose, onSaved }) {
  const [offset, setOffset] = useState(0), [budget, setBudget] = useState(inputBudget), [refreshKey, setRefreshKey] = useState(0)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [completed, setCompleted] = useState(new Set())
  const resource = useRead(ui.api, '/semantic/relations/plan-llm', { topologyId: topology.id, offset, inputBudget: budget, limit: 6 }, JSON.stringify([topology.id, offset, budget, refreshKey]))
  const plan = resource.data?.plan
  const planVersion = React.useRef('')
  useEffect(() => { if (plan?.version && planVersion.current !== plan.version) { planVersion.current = plan.version; setCompleted(new Set()); setMessage('') } }, [plan?.version])
  const run = async (index) => {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const response = await ui.api('/semantic/relations/identify-llm', { topologyId: topology.id, batchIndex: index, planVersion: plan.version, inputBudget: budget, sampleValues })
      setCompleted((previous) => new Set([...previous, index])); setMessage(`第 ${index + 1} 批完成：新增 ${response.summary.created} 条，复核通过 ${response.summary.deterministicAccepted} 条；仍需人工确认。`); await onSaved()
    } catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }
  return <ui.Modal wide eyebrow="控制识别范围与调用成本" title={`分批识别 · ${topology.name}`} description="规划不调用模型；点击某批的识别按钮才会真实调用一次模型，可能产生费用。" onClose={busy ? () => {} : onClose} footer={<ui.Button disabled={busy} onClick={onClose}>关闭</ui.Button>}>{!modelReady ? <p className="dsl-hint">尚未选择模型服务与模型，可以先查看计划；返回拓扑页配置后才能执行识别。</p> : null}<div className="dsl-preview-controls"><ui.Field label="单批输入预算（Token / 文本计量单位）"><select className="dsl-select" disabled={busy} value={budget} onChange={(e) => { setBudget(Number(e.target.value)); setOffset(0) }}>{[4000, 8000, 16000].map((n) => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></ui.Field><ui.Button disabled={busy} onClick={() => { setOffset(0); setRefreshKey(refreshKey + 1) }}>重新规划</ui.Button></div>{resource.error ? <p role="alert">{resource.error}</p> : null}{plan ? <><p>{plan.datasetCount} 张表 / {plan.fieldCount} 个字段，共 {plan.totalBatches.toLocaleString()} 批；本窗口本计划已完成 {completed.size} 批。完成情况仅在本窗口记录，候选关系已持久保存，重复识别按字段对去重。</p><p className="dsl-hint">{plan.note}</p>{plan.batches.map((batch) => <section className="dsl-context-block dsl-batch-row" key={batch.index}><div><strong>第 {batch.index + 1} 批</strong>{batch.datasets.map((d) => <p key={d.id}>{d.name} · <code>{d.database}.{d.table}</code> · {d.fields} 个字段</p>)}<small>预计输入约 {batch.estimatedTokens.toLocaleString()} Token{batch.fits ? '' : ' · 超预算，请调整说明或预算'}</small></div><ui.Button disabled={busy || !modelReady || !batch.fits || completed.has(batch.index)} onClick={() => run(batch.index)}>{completed.has(batch.index) ? '本窗口已完成' : busy ? '识别中…' : '识别此批'}</ui.Button></section>)}<Pages ui={ui} previous={!busy && offset > 0} next={!busy && plan.nextOffset !== null} onPrevious={() => setOffset(Math.max(0, offset - 6))} onNext={() => setOffset(plan.nextOffset)} /></> : <p>正在规划批次…</p>}{message ? <p role="status">{message}</p> : null}</ui.Modal>
}
