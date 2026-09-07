import React, { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  IconApiOutline14,
  IconBranchOutline16,
  IconBrowseOutline16,
  IconCheckOutline16,
  IconChevronRightOutline14,
  IconCloseOutline16,
  IconCodeOutline16,
  IconDataOutline16,
  IconDownloadOutline16,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconLinkOutline16,
  IconListPenOutline16,
  IconLoadingOutline16,
  IconPlusOutline16,
  IconRefreshOutline16,
  IconSearchOutline16,
  IconSparkle16,
  IconTrashOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { PLUGIN_STYLES } from './styles.ts'
import { createDatasetSourceCatalog, mergeDatasetMetadata, sameDatasetSource } from './dataset-source.mjs'
import { DATASET_NAME_MAX_LENGTH, validateDatasetDraft } from './dataset-validation.mjs'
import { COMMENT_COPY_TARGETS, copyDatabaseComments } from './field-comment-copy.mjs'
import { SemanticPreview, RelationBatchModal } from './semantic-preview.tsx'
import { DatasetQueryBrowser } from './dataset-query.tsx'

const API_PREFIX = '/api/database-connections'
const PLUGIN_ID = '@deepseek-ai/dsh-database-connections'
const PLUGIN_VERSION = '2.1.0'
const EMPTY_STATE = { datasets: [], semanticConcepts: [], relations: [], topologies: [], modelConfig: {} }
const DEFAULT_PORT = { mysql: 3306, clickhouse: 8123 }
const CARDINALITY = {
  'one-to-one': '一对一（1:1）',
  'one-to-many': '一对多（1:N）',
  'many-to-one': '多对一（N:1）',
  'many-to-many': '多对多（N:N）',
}
const STATUS = { confirmed: '已人工确认', candidate: '候选待确认', rejected: '已拒绝' }
const ORIGIN = { manual: '手动维护', rule: '规则引擎', llm: '大模型识别' }

class ApiFailure extends Error {
  status
  versionMismatch
  constructor(message, status = 0, versionMismatch = false) {
    super(message)
    this.status = status
    this.versionMismatch = versionMismatch
  }
}

async function api(path, body, { signal } = {}) {
  const init = { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, signal }
  if (body !== undefined) init.body = JSON.stringify(body)
  let response
  try {
    response = await fetch(`${API_PREFIX}${path}`, init)
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiFailure('无法连接到 DSH 后端服务')
  }
  let value
  try {
    value = await response.json()
  } catch {
    throw new ApiFailure(`后端返回了非 JSON 响应（HTTP ${response.status}）`, response.status)
  }
  if (!response.ok || value?.ok === false) {
    const original = value?.error || `请求失败（HTTP ${response.status}）`
    const mismatch = path.startsWith('/semantic/') && (response.status === 404 || /未知.*接口/.test(original))
    throw new ApiFailure(
      mismatch ? '浏览器端已载入数据库语义层 2.0，但 DSH 宿主端仍是旧版本。请重启 DSH 后重新打开插件。' : original,
      response.status,
      mismatch,
    )
  }
  return value
}

function usePluginStyles() {
  useEffect(() => {
    const id = 'dsh-database-semantic-layer-styles'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.dataset.plugin = PLUGIN_ID
    style.textContent = PLUGIN_STYLES
    document.head.appendChild(style)
    return () => style.remove()
  }, [])
}

function textError(error) {
  return error instanceof Error ? error.message : String(error)
}

function cellText(value) {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function connectionPayload(connection, credentials = {}) {
  return {
    id: connection.id || '',
    name: connection.name || '',
    type: connection.type || 'mysql',
    host: connection.host || '',
    port: Number(connection.port) || DEFAULT_PORT[connection.type || 'mysql'],
    username: credentials.username || connection.username || '',
    password: credentials.password || connection.password || '',
    database: connection.database || '',
  }
}

function sourceLabel(dataset, connections) {
  const connection = connections.find((item) => item.id === dataset.connectionId)
  return { connection: connection?.name || '连接已删除', path: `${dataset.database}.${dataset.table}` }
}

function semanticCount(dataset) {
  return (dataset.fields || []).filter((field) => field.businessName || field.customComment || field.semanticConceptId).length
}

function endpointText(endpoint, datasets) {
  const dataset = datasets.find((item) => item.id === endpoint.datasetId)
  return `${dataset?.name || '未知数据集'}｜${dataset?.database || '未知数据库'}.${dataset?.table || '未知表'}.${endpoint.field}`
}

function createExportDocument(connections) {
  return {
    format: 'dsh-plugin-config', formatVersion: 1, plugin: PLUGIN_ID, pluginVersion: PLUGIN_VERSION,
    exportedAt: new Date().toISOString(), secretPolicy: 'credentials-omitted',
    items: connections.map(({ id, name, type, host, port, database }) => ({ id, name, type, host, port, database })),
  }
}

function downloadDocument(value) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dsh-database-connections-${stamp}.dshconfig.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function Button({ children, kind = 'default', icon: Icon, iconOnly = false, className = '', ...props }) {
  const names = ['dsl-button', kind === 'primary' ? 'dsl-button-primary' : '', kind === 'danger' ? 'dsl-button-danger' : '', iconOnly ? 'dsl-icon-button' : '', className].filter(Boolean).join(' ')
  const accessibleName = props['aria-label'] || (iconOnly && typeof children === 'string' ? children : undefined)
  return <button type="button" className={names} {...props} aria-label={accessibleName} title={iconOnly && typeof children === 'string' ? children : props.title}>{Icon ? <Icon size={16} aria-hidden="true" /> : null}<span>{children}</span></button>
}

function StatusPill({ children, kind = 'neutral' }) {
  return <span className={`dsl-status dsl-status-${kind}`}>{children}</span>
}

function Message({ value }) {
  if (!value) return null
  return <div className={`dsl-message dsl-message-${value.kind === 'error' ? 'error' : 'ok'}`} role="status">{value.kind === 'error' ? <IconWarningOutline16 size={16} /> : <IconCheckOutline16 size={16} />}{value.text}</div>
}

function Field({ label, children, span = false, required = false, error, hint, messageId }) {
  return <label className={`dsl-field ${span ? 'dsl-span-2' : ''}`}><span>{label}{required ? <span className="dsl-required" aria-hidden="true"> * 必填</span> : null}</span>{children}{error || hint ? <small id={messageId} className={error ? 'dsl-field-error' : 'dsl-field-hint'}>{error || hint}</small> : null}</label>
}

function PageHeader({ eyebrow, title, description, actions }) {
  return <header className="dsl-page-header"><div>{eyebrow ? <div className="dsl-eyebrow">{eyebrow}</div> : null}<h1>{title}</h1><p>{description}</p></div>{actions ? <div className="dsl-actions">{actions}</div> : null}</header>
}

function Modal({ eyebrow, title, description, children, footer, onClose, wide = false }) {
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  return <div className="dsl-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`dsl-modal ${wide ? 'dsl-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header className="dsl-modal-header"><div><div className="dsl-eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div><button type="button" className="dsl-modal-close" aria-label="关闭" onClick={onClose}><IconCloseOutline16 /></button></header><div className="dsl-modal-body">{children}</div>{footer ? <footer className="dsl-modal-footer">{footer}</footer> : null}</section></div>
}

function ConnectionEditor({ connection, onClose, onSaved }) {
  const editing = Boolean(connection?.id)
  const [form, setForm] = useState(connection ? { ...connection, username: '', password: '' } : { id: '', name: '', type: 'mysql', host: '', port: '3306', username: '', password: '', database: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const patch = (value) => setForm((current) => ({ ...current, ...value }))
  const test = async () => {
    setBusy(true); setMessage(null)
    try { const data = await api('/test', { connection: connectionPayload(form) }); setMessage({ kind: 'ok', text: data.message || '连接成功' }) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setBusy(false) }
  }
  const save = async () => {
    if (!form.name.trim() || !form.host.trim()) { setMessage({ kind: 'error', text: '请填写连接名称和主机地址' }); return }
    setBusy(true); setMessage(null)
    try { const data = await api('/save', { connection: connectionPayload(form) }); const saved = (data.connections || []).find((item) => item.id === form.id || item.name === form.name.trim()); onSaved(data.connections || [], saved); onClose() }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setBusy(false) }
  }
  return <Modal eyebrow="连接管理" title={editing ? '编辑数据库连接' : '新建数据库连接'} description={editing ? '原用户名和密码不会回显；留空表示保持原凭据。' : 'MySQL（关系型数据库）与 ClickHouse（列式分析数据库）使用同一套连接能力。'} onClose={onClose} footer={<><Button onClick={onClose}>取消</Button><Button icon={IconRefreshOutline16} disabled={busy} onClick={test}>{busy ? '处理中…' : '测试连接'}</Button><Button kind="primary" icon={IconCheckOutline16} disabled={busy || !form.name.trim() || !form.host.trim()} onClick={save}>保存连接</Button></>}>
    <div className="dsl-form-grid">
      <Field label="连接名称"><input className="dsl-input" value={form.name} onChange={(event) => patch({ name: event.target.value })} placeholder="例如：生产环境 MySQL" /></Field>
      <Field label="数据库类型"><select className="dsl-select" value={form.type} onChange={(event) => patch({ type: event.target.value, port: String(DEFAULT_PORT[event.target.value]) })}><option value="mysql">MySQL（关系型数据库）</option><option value="clickhouse">ClickHouse（列式分析数据库）</option></select></Field>
      <Field label="主机地址"><input className="dsl-input" value={form.host} onChange={(event) => patch({ host: event.target.value })} placeholder="127.0.0.1" /></Field>
      <Field label="端口"><input className="dsl-input" inputMode="numeric" value={form.port} onChange={(event) => patch({ port: event.target.value })} /></Field>
      <Field label="默认数据库" span><input className="dsl-input" value={form.database} onChange={(event) => patch({ database: event.target.value })} /></Field>
      <Field label={editing ? '新用户名（可选）' : '用户名'}><input className="dsl-input" autoComplete="off" value={form.username} onChange={(event) => patch({ username: event.target.value })} placeholder={editing ? '留空则保持原用户名' : '请输入数据库用户名'} /></Field>
      <Field label={editing ? '新密码（可选）' : '密码'}><div className="dsl-row" style={{ flexWrap: 'nowrap' }}><input className="dsl-input" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => patch({ password: event.target.value })} placeholder={editing ? '留空则保持原密码' : '请输入数据库密码'} /><Button icon={showPassword ? IconBrowseOutline16 : IconDataOutline16} iconOnly aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? '隐藏密码' : '显示密码'}</Button></div></Field>
    </div>
    <div className="dsl-privacy"><IconCheckOutline16 size={18} /><div><strong>创建成功后完全隐藏凭据</strong><span>用户名和密码只用于连接认证；连接卡片、查看详情、数据浏览、查询和导出内容均不显示明文。</span></div></div>
    <div style={{ marginTop: 12 }}><Message value={message} /></div>
  </Modal>
}

function ExportConnections({ connections, onClose, notify }) {
  const [selectedIds, setSelectedIds] = useState(connections.map((item) => item.id))
  const toggle = (id) => setSelectedIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const run = () => {
    const selected = connections.filter((item) => selectedIds.includes(item.id))
    downloadDocument(createExportDocument(selected)); notify(`已导出 ${selected.length} 个数据库连接；文件不包含用户名和密码`); onClose()
  }
  return <Modal wide eyebrow="连接迁移" title="批量导出数据库连接" description="选择一个或多个连接，导出为 DSH 插件配置文件；凭据不会写入文件。" onClose={onClose} footer={<><Button onClick={onClose}>取消</Button><Button kind="primary" icon={IconDownloadOutline16} disabled={!selectedIds.length} onClick={run}>导出选中连接</Button></>}>
    <div className="dsl-export-list">{connections.map((connection) => <label key={connection.id} className={`dsl-export-item ${selectedIds.includes(connection.id) ? 'selected' : ''}`}><input type="checkbox" checked={selectedIds.includes(connection.id)} onChange={() => toggle(connection.id)} /><span className={`dsl-db-icon ${connection.type}`}><IconDataOutline16 /></span><span><strong>{connection.name}</strong><small>{connection.type === 'mysql' ? 'MySQL（关系型数据库）' : 'ClickHouse（列式分析数据库）'} · {connection.host}:{connection.port}</small><code>{connection.database || '未指定默认数据库'}</code></span><StatusPill kind="success">可导出</StatusPill></label>)}</div>
    <div className="dsl-privacy"><IconCheckOutline16 size={18} /><div><strong>批量导出不携带凭据</strong><span>目标环境导入后，需要重新填写用户名和密码并测试连接。</span></div></div>
  </Modal>
}

function BrowseConnection({ connection, onClose, onCreateDataset }) {
  const [databases, setDatabases] = useState([])
  const [tables, setTables] = useState([])
  const [database, setDatabase] = useState(connection.database || '')
  const [table, setTable] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const operational = connectionPayload(connection)
  const loadDatabases = useCallback(async () => {
    setBusy(true)
    try { const data = await api('/databases', { connection: operational }); setDatabases(data.rows || []); if (!database && data.rows?.length) setDatabase(data.rows[0]) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setBusy(false) }
  }, [connection.id])
  const loadTables = async () => {
    setBusy(true)
    try { const data = await api('/tables', { connection: operational, database }); setTables(data.rows || []); if (data.rows?.length) setTable(data.rows[0]) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setBusy(false) }
  }
  const preview = async () => {
    if (!table) return
    setBusy(true)
    try { const safeTable = table.replace(/`/g, '``'); setResult(await api('/query', { connection: operational, sql: `SELECT * FROM \`${safeTable}\` LIMIT 100` })) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setBusy(false) }
  }
  useEffect(() => { void loadDatabases() }, [loadDatabases])
  return <Modal wide eyebrow="数据浏览" title={`浏览 ${connection.name}`} description="从真实数据库读取数据库、表和最多 100 行样例数据。" onClose={onClose} footer={<><Button onClick={onClose}>关闭</Button><Button kind="primary" icon={IconPlusOutline16} disabled={!table} onClick={() => { onClose(); onCreateDataset(connection.id, database, table) }}>用此表创建数据集</Button></>}>
    <div className="dsl-form-grid"><Field label="数据库"><div className="dsl-row" style={{ flexWrap: 'nowrap' }}><select className="dsl-select" value={database} onChange={(event) => { setDatabase(event.target.value); setTables([]); setTable('') }}><option value="">选择数据库</option>{databases.map((name) => <option key={name} value={name}>{name}</option>)}</select><Button icon={IconRefreshOutline16} iconOnly onClick={loadDatabases} disabled={busy}>读取数据库</Button></div></Field><Field label="数据表"><div className="dsl-row" style={{ flexWrap: 'nowrap' }}><select className="dsl-select" value={table} onChange={(event) => setTable(event.target.value)}><option value="">选择数据表</option>{tables.map((name) => <option key={name} value={name}>{name}</option>)}</select><Button icon={IconRefreshOutline16} iconOnly onClick={loadTables} disabled={busy || !database}>读取数据表</Button></div></Field></div>
    <div className="dsl-row" style={{ marginTop: 12 }}><Button icon={busy ? IconLoadingOutline16 : IconBrowseOutline16} disabled={busy || !table} onClick={preview}>{busy ? '读取中…' : '预览数据'}</Button></div>
    <div style={{ marginTop: 12 }}><Message value={message} /></div>
    {result ? <QueryResult value={result} /> : null}
  </Modal>
}

function QueryResult({ value }) {
  const columns = value.columns || []
  const rows = value.rows || []
  return <div className="dsl-query-result"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{cellText(row[column])}</td>)}</tr>)}</tbody></table>{!rows.length ? <div className="dsl-empty">查询成功，没有返回数据</div> : null}</div>
}

function ConnectionsPage({ onCreateDataset }) {
  const [connections, setConnections] = useState([])
  const [state, setState] = useState(EMPTY_STATE)
  const [dialog, setDialog] = useState(null)
  const [message, setMessage] = useState(null)
  const [testingId, setTestingId] = useState('')
  const [checked, setChecked] = useState({})
  const [queryConnectionId, setQueryConnectionId] = useState('')
  const [sql, setSql] = useState('SELECT * FROM your_table LIMIT 100')
  const [queryResult, setQueryResult] = useState(null)
  const [queryBusy, setQueryBusy] = useState(false)
  const [conflictPolicy, setConflictPolicy] = useState('skip')
  const importRef = useRef(null)
  const reload = useCallback(async () => {
    try {
      const data = await api('/list'); setConnections(data.connections || []); setQueryConnectionId((current) => current || data.connections?.[0]?.id || '')
    } catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    try { const data = await api('/semantic/state'); setState(data.state || EMPTY_STATE) }
    catch (error) { if (error.versionMismatch) setMessage({ kind: 'error', text: error.message }) }
  }, [])
  useEffect(() => { void reload() }, [reload])
  const notify = (text) => setMessage({ kind: 'ok', text })
  const test = async (connection) => {
    setTestingId(connection.id)
    try { const data = await api('/test', { connection: connectionPayload(connection) }); setChecked((current) => ({ ...current, [connection.id]: '刚刚' })); notify(`${connection.name}：${data.message || '连接成功'}`) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setTestingId('') }
  }
  const remove = async (connection) => {
    if (!globalThis.confirm(`确定删除连接“${connection.name}”吗？`)) return
    try { const data = await api('/delete', { id: connection.id }); setConnections(data.connections || []); setDialog(null); notify(`连接“${connection.name}”已删除`) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('配置文件不能超过 5 MB')
      const documentValue = JSON.parse(await file.text())
      const data = await api('/import', { document: documentValue, conflictPolicy }); setConnections(data.connections || [])
      const summary = data.summary || {}; notify(`导入完成：新增 ${summary.imported || 0} 个，覆盖 ${summary.replaced || 0} 个，副本 ${summary.copied || 0} 个，跳过 ${summary.skipped || 0} 个。凭据需重新填写。`)
    } catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  const runQuery = async () => {
    const connection = connections.find((item) => item.id === queryConnectionId)
    if (!connection || !sql.trim()) return
    setQueryBusy(true); setQueryResult(null)
    try { setQueryResult(await api('/query', { connection: connectionPayload(connection), sql })) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setQueryBusy(false) }
  }
  return <div className="dsl-page">
    <PageHeader eyebrow="数据入口" title="数据库连接" description="统一管理 MySQL（关系型数据库）与 ClickHouse（列式分析数据库）的连接、数据集和只读查询。" actions={<><Button icon={IconDownloadOutline16} disabled={!connections.length} onClick={() => setDialog({ type: 'export' })}>批量导出</Button><input ref={importRef} type="file" accept=".json,.dshconfig" hidden onChange={importFile} /><select className="dsl-select" aria-label="导入冲突处理" style={{ width: 128 }} value={conflictPolicy} onChange={(event) => setConflictPolicy(event.target.value)}><option value="skip">导入时跳过</option><option value="replace">导入时覆盖</option><option value="copy">导入为副本</option></select><Button onClick={() => importRef.current?.click()}>批量导入</Button><Button kind="primary" icon={IconPlusOutline16} onClick={() => setDialog({ type: 'edit', connection: null })}>新建连接</Button></>} />
    <Message value={message} />
    <div className="dsl-connection-grid">{connections.map((connection) => {
      const datasetCount = (state.datasets || []).filter((item) => item.connectionId === connection.id).length
      return <article className="dsl-card dsl-connection-card" key={connection.id}><div className="dsl-connection-head"><span className={`dsl-db-icon ${connection.type}`}><IconDataOutline16 size={20} /></span><div><strong>{connection.name}</strong><p>{connection.type === 'mysql' ? 'MySQL（关系型数据库）' : 'ClickHouse（列式分析数据库）'} · {connection.host}:{connection.port}</p></div><StatusPill kind="success">已配置</StatusPill></div><div className="dsl-connection-meta"><span><small>默认数据库</small><strong>{connection.database || '未指定'}</strong></span><span><small>已创建数据集</small><strong>{datasetCount} 个</strong></span><span><small>最近检查</small><strong>{testingId === connection.id ? '正在检查…' : checked[connection.id] || '尚未检查'}</strong></span></div><div className="dsl-actions"><Button icon={IconBrowseOutline16} onClick={() => setDialog({ type: 'browse', connection })}>浏览数据</Button><Button icon={IconRefreshOutline16} disabled={testingId === connection.id} onClick={() => test(connection)}>{testingId === connection.id ? '测试中…' : '测试连接'}</Button><Button kind="primary" icon={IconPlusOutline16} onClick={() => onCreateDataset(connection.id)}>创建数据集</Button><Button icon={IconEllipsisOutline16} onClick={() => setDialog({ type: 'more', connection })}>更多</Button></div></article>
    })}{!connections.length ? <div className="dsl-section dsl-empty">暂无数据库连接，请先新建连接。</div> : null}</div>
    <section className="dsl-section"><div className="dsl-query-head"><div><h2>数据浏览与只读查询</h2><p>连接层用于人工验证表结构和数据样例；查询仍受只读语句白名单约束。</p></div><StatusPill>最多 200 行 · 约 15 秒</StatusPill></div><div className="dsl-form-grid" style={{ marginTop: 12 }}><Field label="执行连接"><select className="dsl-select" value={queryConnectionId} onChange={(event) => setQueryConnectionId(event.target.value)}><option value="">请选择连接</option>{connections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div><div className="dsl-query-line"><textarea className="dsl-textarea dsl-code" aria-label="只读 SQL 查询" value={sql} onChange={(event) => setSql(event.target.value)} /><Button icon={queryBusy ? IconLoadingOutline16 : IconCodeOutline16} disabled={queryBusy || !queryConnectionId || !sql.trim()} onClick={runQuery}>{queryBusy ? '查询中…' : '执行查询'}</Button></div><div className="dsl-safety"><IconCheckOutline16 size={14} />仅允许 SELECT / SHOW / DESCRIBE / EXPLAIN / WITH（只读语句）</div>{queryResult ? <QueryResult value={queryResult} /> : null}</section>
    {dialog?.type === 'edit' ? <ConnectionEditor connection={dialog.connection} onClose={() => setDialog(null)} onSaved={(items) => { setConnections(items); notify(dialog.connection ? '连接已更新；凭据继续隐藏' : '连接已创建；用户名和密码已隐藏') }} /> : null}
    {dialog?.type === 'export' ? <ExportConnections connections={connections} onClose={() => setDialog(null)} notify={notify} /> : null}
    {dialog?.type === 'browse' ? <BrowseConnection connection={dialog.connection} onClose={() => setDialog(null)} onCreateDataset={onCreateDataset} /> : null}
    {dialog?.type === 'more' ? <Modal eyebrow="连接管理" title={dialog.connection.name} description="两种数据库使用统一的查看、编辑和删除操作；不会显示用户名与密码。" onClose={() => setDialog(null)} footer={<Button onClick={() => setDialog(null)}>关闭</Button>}><div className="dsl-export-list"><button className="dsl-export-item" type="button" onClick={() => setDialog({ type: 'edit', connection: dialog.connection })}><IconEditOutline16 /><span><strong>编辑连接</strong><small>修改名称、地址、端口、默认数据库或重新填写凭据</small></span><IconChevronRightOutline14 /></button><button className="dsl-export-item" type="button" onClick={() => remove(dialog.connection)}><IconTrashOutline16 /><span><strong>删除连接</strong><small>存在数据集引用时会由服务端阻止删除</small></span><IconChevronRightOutline14 /></button></div></Modal> : null}
  </div>
}

function SummaryCard({ icon: Icon, label, value, note, tone = '' }) {
  return <article className={`dsl-card dsl-summary-card ${tone ? `dsl-summary-${tone}` : ''}`}><span className="dsl-summary-icon"><Icon size={19} /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>
}

function ConceptManager({ state, refresh, onClose }) {
  const [form, setForm] = useState({ id: '', name: '', definition: '', aliases: '' })
  const [message, setMessage] = useState(null)
  const save = async () => {
    try {
      await api('/semantic/concepts/save', { concept: { ...form, aliases: form.aliases.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean) } })
      await refresh(); setForm({ id: '', name: '', definition: '', aliases: '' }); setMessage({ kind: 'ok', text: '统一语义概念已保存' })
    } catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  const edit = (concept) => setForm({ id: concept.id, name: concept.name, definition: concept.definition || '', aliases: (concept.aliases || []).join('，') })
  const remove = async (concept) => {
    if (!globalThis.confirm(`删除统一语义概念“${concept.name}”吗？字段绑定会同时解除。`)) return
    try { await api('/semantic/concepts/delete', { id: concept.id }); await refresh(); if (form.id === concept.id) setForm({ id: '', name: '', definition: '', aliases: '' }) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  return <Modal wide eyebrow="统一业务词汇" title="统一语义概念" description="把不同表中名称不同、但业务含义相同的字段归到同一个概念；概念相同不自动等于可以关联。" onClose={onClose} footer={<><Button onClick={onClose}>关闭</Button><Button kind="primary" icon={IconCheckOutline16} disabled={!form.name.trim()} onClick={save}>{form.id ? '保存修改' : '新增概念'}</Button></>}>
    <div className="dsl-form-grid"><Field label="概念名称"><input className="dsl-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：计量设备标识" /></Field><Field label="别名（逗号分隔）"><input className="dsl-input" value={form.aliases} onChange={(event) => setForm({ ...form, aliases: event.target.value })} placeholder="meter_id，meter_code" /></Field><Field label="业务定义" span><textarea className="dsl-textarea" value={form.definition} onChange={(event) => setForm({ ...form, definition: event.target.value })} placeholder="说明这个概念在业务中的唯一含义" /></Field></div>
    <div style={{ marginTop: 12 }}><Message value={message} /></div>
    <div className="dsl-concepts">{(state.semanticConcepts || []).map((concept) => <article className="dsl-concept" key={concept.id}><div className="dsl-query-head"><strong>{concept.name}</strong><div className="dsl-row"><Button icon={IconEditOutline16} iconOnly aria-label={`编辑${concept.name}`} onClick={() => edit(concept)}>编辑</Button><Button kind="danger" icon={IconTrashOutline16} iconOnly aria-label={`删除${concept.name}`} onClick={() => remove(concept)}>删除</Button></div></div><p>{concept.definition || '未填写业务定义'}</p><small>别名：{concept.aliases?.length ? concept.aliases.join('、') : '无'}</small></article>)}{!state.semanticConcepts?.length ? <div className="dsl-hint">还没有统一语义概念，可先新增一个，再在数据集字段中绑定。</div> : null}</div>
  </Modal>
}

const semanticPreviewUi = { api, Modal, Button, Field, Message, StatusPill, CARDINALITY }

function DatasetContextModal({ state, initialId, onClose }) {
  return <SemanticPreview ui={semanticPreviewUi} state={state} initialId={initialId} onClose={onClose} />
}

function DatasetPreview({ dataset, onClose }) {
  return <DatasetQueryBrowser dataset={dataset} onClose={onClose} ui={{ api, Modal, Button, Message, QueryResult }} />
}

function DatasetSourcePicker({ source, catalog, connections, disabled, validationErrors = {}, validationId }) {
  const databaseLoading = source.loading === 'databases'
  const tableLoading = source.loading === 'tables'
  const fieldLoading = source.loading === 'fields'
  const progress = databaseLoading ? '正在加载当前连接下的数据库…' : tableLoading ? '正在加载当前数据库下的数据表…' : fieldLoading ? '正在自动读取所选表的字段类型和数据库注释…' : source.metadata ? `已自动读取 ${source.metadata.fields.length} 个字段，可继续编辑业务语义。` : !source.connectionId ? '请选择数据库连接，系统会自动加载库表目录。' : !source.databases.length ? '当前连接没有可访问的数据库，请检查账号权限后刷新。' : !source.database ? '请选择一个数据库，继续展开该库下的数据表。' : !source.tables.length ? '当前数据库没有可访问的数据表，请检查账号权限后刷新。' : '请选择数据表，系统会自动带出字段类型、原始注释和表注释。'
  const retries = { databases: catalog.refreshDatabases, tables: catalog.refreshTables, fields: catalog.refreshFields }
  const retryLabels = { databases: '重试加载数据库', tables: '重试加载数据表', fields: '重试读取字段' }
  return <div className="dsl-source-browser" data-dataset-field="fields" tabIndex={-1} role="group" aria-label="数据来源与字段读取" aria-describedby={validationErrors.fields ? `${validationId}-fields` : undefined}>
    <div className="dsl-source-heading"><strong>按层级选择数据来源</strong><span>连接 → 数据库 → 数据表 → 字段定义</span></div>
    <div className="dsl-source-picker">
      <Field label="来源连接" required error={validationErrors.connectionId} messageId={`${validationId}-connectionId`}><select className="dsl-select" aria-label="来源连接" required aria-invalid={Boolean(validationErrors.connectionId)} aria-describedby={validationErrors.connectionId ? `${validationId}-connectionId` : undefined} data-dataset-field="connectionId" value={source.connectionId} disabled={disabled} onChange={(event) => { const connection = connections.find((item) => item.id === event.target.value); void catalog.selectConnection(event.target.value, connection?.database || '') }}><option value="">请选择连接</option>{connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}｜{connection.type === 'mysql' ? 'MySQL' : 'ClickHouse'}</option>)}</select></Field>
      <Field label="来源数据库" required error={validationErrors.database} messageId={`${validationId}-database`}><div className="dsl-source-control"><select className="dsl-select" aria-label="来源数据库" required aria-invalid={Boolean(validationErrors.database)} aria-describedby={validationErrors.database ? `${validationId}-database` : undefined} data-dataset-field="database" aria-busy={databaseLoading} disabled={disabled || !source.connectionId || databaseLoading || !source.databases.length} value={source.databases.includes(source.database) ? source.database : ''} onChange={(event) => void catalog.selectDatabase(event.target.value)}><option value="">{databaseLoading ? '正在加载数据库…' : !source.connectionId ? '请先选择连接' : !source.databases.length ? '暂无可访问的数据库' : '请选择数据库'}</option>{source.databases.map((name) => <option key={name} value={name}>{name}</option>)}</select><Button icon={databaseLoading ? IconLoadingOutline16 : IconRefreshOutline16} iconOnly disabled={disabled || !source.connectionId || databaseLoading} onClick={() => void catalog.refreshDatabases()}>刷新数据库列表</Button></div></Field>
      <Field label="来源表" required error={validationErrors.table} messageId={`${validationId}-table`}><div className="dsl-source-control"><select className="dsl-select" aria-label="来源表" required aria-invalid={Boolean(validationErrors.table)} aria-describedby={validationErrors.table ? `${validationId}-table` : undefined} data-dataset-field="table" aria-busy={tableLoading} disabled={disabled || databaseLoading || tableLoading || !source.database || !source.tables.length} value={source.tables.includes(source.table) ? source.table : ''} onChange={(event) => void catalog.selectTable(event.target.value)}><option value="">{tableLoading ? '正在加载数据表…' : !source.database ? '请先选择数据库' : !source.tables.length ? '暂无可访问的数据表' : '请选择数据表'}</option>{source.tables.map((name) => <option key={name} value={name}>{name}</option>)}</select><Button icon={tableLoading ? IconLoadingOutline16 : IconRefreshOutline16} iconOnly disabled={disabled || databaseLoading || tableLoading || !source.database || !source.databases.includes(source.database)} onClick={() => void catalog.refreshTables()}>刷新数据表列表</Button></div></Field>
    </div>
    {source.error ? <div className="dsl-source-feedback"><div className="dsl-message dsl-message-error" role="alert"><IconWarningOutline16 size={16} /><span>{retryLabels[source.error.stage].replace('重试', '')}失败：{source.error.message}。请检查连接、网络与账号权限后重试。</span><Button onClick={() => void retries[source.error.stage]()} disabled={disabled}>{retryLabels[source.error.stage]}</Button></div></div> : <div className="dsl-source-feedback" role="status">{source.loading ? <IconLoadingOutline16 size={14} /> : <IconDataOutline16 size={14} />}<span>{progress}</span>{source.metadata ? <Button icon={IconRefreshOutline16} disabled={disabled} onClick={() => void catalog.refreshFields()}>重新读取字段</Button> : null}</div>}
    {validationErrors.fields ? <p className="dsl-field-error" id={`${validationId}-fields`}>{validationErrors.fields}</p> : null}
  </div>
}

function FieldCommentCopy({ fields, disabled, onApply }) {
  const [mode, setMode] = useState('empty')
  const [result, setResult] = useState(null)
  const [pendingTarget, setPendingTarget] = useState(null)
  const pending = pendingTarget ? copyDatabaseComments(fields, pendingTarget, { overwrite: true }) : null
  const apply = (plan) => {
    if (disabled) return
    if (plan.copied) onApply(plan.fields)
    setResult(plan)
    setPendingTarget(null)
  }
  const copy = (target) => {
    if (disabled) return
    const plan = copyDatabaseComments(fields, target, { overwrite: mode === 'overwrite' })
    if (plan.overwritten) setPendingTarget(target)
    else apply(plan)
  }
  const notes = result ? [
    result.overwritten ? `其中覆盖 ${result.overwritten} 项` : '',
    result.preserved ? `保留已有内容 ${result.preserved} 项` : '',
    result.emptyComment ? `无数据库注释 ${result.emptyComment} 项` : '',
    result.unchanged ? `内容相同 ${result.unchanged} 项` : '',
    result.tooLong.length ? `超长跳过 ${result.tooLong.length} 项` : '',
  ].filter(Boolean) : []
  return <div className="dsl-comment-copy">
    <div className="dsl-comment-copy-toolbar">
      <strong>数据库注释一键复制</strong>
      <div className="dsl-comment-copy-actions">
        <select className="dsl-select" aria-label="注释复制方式" disabled={disabled} value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="empty">仅填空白项（默认）</option>
          <option value="overwrite">覆盖已有内容</option>
        </select>
        <Button disabled={disabled} onClick={() => copy('businessName')}>复制到业务名称</Button>
        <Button disabled={disabled} onClick={() => copy('customComment')}>复制到自定义业务注释</Button>
      </div>
    </div>
    <p className="dsl-comment-copy-hint">作用于当前表全部字段，跳过无注释和超长项；业务名称的换行转为空格。复制后可继续编辑，点击“保存数据集”生效。</p>
    {result ? <div className="dsl-comment-copy-result" role="status" aria-live="polite">
      <strong>{result.copied ? `已复制 ${result.copied} 项至${result.label}，尚未保存。` : `未修改${result.label}。`}</strong>
      {notes.length ? <span>{notes.join('；')}。</span> : null}
      {result.tooLong.length ? <details><summary>查看超长字段（目标最多 {result.maxLength} 个字符，未截断）</summary><ul>{result.tooLong.map((field) => <li key={field.name}><code>{field.name}</code>：{field.length} 个字符，请手动精简后填写。</li>)}</ul></details> : null}
    </div> : null}
    {pending ? <Modal eyebrow="覆盖确认" title={`覆盖已有${pending.label}？`} description="此操作只修改当前数据集草稿，不会修改数据库原注释；点击保存数据集后才会生效。" onClose={() => setPendingTarget(null)} footer={<><Button onClick={() => setPendingTarget(null)}>取消</Button><Button kind="danger" disabled={disabled} onClick={() => apply(copyDatabaseComments(fields, pendingTarget, { overwrite: true }))}>确认覆盖并复制</Button></>}>
      <p>将复制 <strong>{pending.copied}</strong> 项数据库注释到“{pending.label}”，其中 <strong>{pending.overwritten}</strong> 项已有内容会被覆盖。</p>
      <p className="dsl-comment-copy-hint">没有原注释、内容相同或超长的字段保持不变。若要保留人工内容，请取消并选择“仅填空白项（默认）”。</p>
    </Modal> : null}
  </div>
}

function DatasetEditor({ initial, connections, state, onCancel, onSaved, onDeleted, onOpenTopology }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(initial)))
  const [activeTab, setActiveTab] = useState('fields')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const savePending = useRef(false)
  const editorRef = useRef(null)
  const serverMessageRef = useRef(null)
  const validationId = useId()
  const editing = Boolean(draft.id)
  const selectedConnection = connections.find((item) => item.id === draft.connectionId)
  const connectionRef = useRef(connections)
  connectionRef.current = connections
  const sourceCatalog = useMemo(() => {
    const payload = (id) => {
      const connection = connectionRef.current.find((item) => item.id === id)
      if (!connection) throw new Error('数据库连接已不存在，请返回连接管理检查')
      return connectionPayload(connection)
    }
    return createDatasetSourceCatalog({
      databases: async (id, signal) => (await api('/databases', { connection: payload(id) }, { signal })).rows,
      tables: async (id, database, signal) => (await api('/tables', { connection: payload(id), database }, { signal })).rows,
      inspect: async (selection, signal) => (await api('/semantic/datasets/inspect', selection, { signal })).metadata,
    })
  }, [])
  const source = useSyncExternalStore(sourceCatalog.subscribe, sourceCatalog.getSnapshot)
  useEffect(() => {
    if (editing) return
    void sourceCatalog.selectConnection(initial.connectionId || '', initial.database || '', initial.table || '')
    return () => sourceCatalog.cancel()
  }, [sourceCatalog, editing])
  useEffect(() => {
    if (editing) return
    setDraft((current) => {
      const sameSource = sameDatasetSource(current, source)
      const fields = sameSource ? current.fields || [] : []
      return {
        ...current, connectionId: source.connectionId, database: source.database, table: source.table,
        ...(source.metadata ? mergeDatasetMetadata(fields, source.metadata) : {
          fields, tableComment: sameSource ? current.tableComment || '' : '', metadataVersion: sameSource ? current.metadataVersion : '',
        }),
      }
    })
  }, [source, editing])
  const validationIssues = validateDatasetDraft(draft, { editing, source, connections })
  const visibleIssues = submitAttempted ? validationIssues : []
  const validationErrors = Object.fromEntries(visibleIssues.map((issue) => [issue.field, issue.message]))
  const focusIssue = (field) => requestAnimationFrame(() => {
    let target = editorRef.current?.querySelector(`[data-dataset-field="${field}"]`)
    if (!target || target.disabled) target = editorRef.current?.querySelector('[data-dataset-field="fields"]')
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'center', behavior: 'auto' })
  })
  const relations = state.relations.filter((relation) => relation.source.datasetId === draft.id || relation.target.datasetId === draft.id)
  const patch = (value) => setDraft((current) => ({ ...current, ...value }))
  const updateField = (name, value) => setDraft((current) => ({ ...current, fields: (current.fields || []).map((field) => field.name === name ? { ...field, ...value } : field) }))
  const inspect = async () => {
    setBusy(true); setMessage(null)
    try {
      const data = await api('/semantic/datasets/inspect', { connectionId: draft.connectionId, database: draft.database, table: draft.table })
      setDraft((current) => ({ ...current, ...mergeDatasetMetadata(current.fields, data.metadata) }))
      setMessage({ kind: 'ok', text: `已从数据库读取 ${data.metadata.fields.length} 个字段、字段类型和数据库注释` })
    } catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setBusy(false) }
  }
  const save = async () => {
    if (savePending.current || busy) return
    setSubmitAttempted(true); setMessage(null)
    if (validationIssues.length) { focusIssue(validationIssues[0].field); return }
    savePending.current = true
    setBusy(true); setSaving(true)
    try { const data = await api('/semantic/datasets/save', { dataset: draft }); await onSaved(data.dataset) }
    catch (error) {
      setMessage({ kind: 'error', text: `保存失败：${textError(error)}。已保留当前填写内容，请检查后重试。` })
      requestAnimationFrame(() => { serverMessageRef.current?.focus({ preventScroll: true }); serverMessageRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' }) })
    }
    finally { savePending.current = false; setBusy(false); setSaving(false) }
  }
  const remove = async () => {
    if (!globalThis.confirm(`删除数据集“${draft.name}”吗？`)) return
    try { await api('/semantic/datasets/delete', { id: draft.id }); await onDeleted() }
    catch (error) {
      if (/级联删除/.test(textError(error)) && globalThis.confirm(`${textError(error)}\n是否继续级联删除？`)) { await api('/semantic/datasets/delete', { id: draft.id, cascade: true }); await onDeleted() }
      else setMessage({ kind: 'error', text: textError(error) })
    }
  }
  return <div className="dsl-page" ref={editorRef}>
    <PageHeader eyebrow={editing ? '数据集详情' : '新建数据集'} title={draft.name || '未命名数据集'} description="数据库原始字段、类型和注释只读保留；数据集名称、表用途、业务名称、自定义注释与统一语义概念可维护。" actions={<><Button onClick={onCancel}>返回列表</Button>{editing ? <Button icon={IconBrowseOutline16} onClick={() => setPreviewOpen(true)}>浏览数据</Button> : null}{editing ? <Button kind="danger" icon={IconTrashOutline16} onClick={remove}>删除</Button> : null}<Button kind="primary" icon={IconCheckOutline16} disabled={busy} onClick={save}>{saving ? '保存中…' : busy ? '读取中…' : '保存数据集'}</Button></>} />
    {visibleIssues.length ? <div className="dsl-validation-summary" role="alert"><strong>暂未保存，请补充或检查以下内容：</strong><ul>{visibleIssues.map((issue) => <li key={issue.field}><button type="button" onClick={() => focusIssue(issue.field)}>{issue.message}</button></li>)}</ul></div> : null}
    {message ? <div ref={serverMessageRef} tabIndex={-1}><Message value={message} /></div> : null}
    <section className="dsl-card dsl-identity">
      <p className="dsl-form-note"><span className="dsl-required">* 必填</span> 项填写完整且字段读取成功后即可保存；表用途、业务名称、自定义注释和统一语义概念均为选填。</p>
      <div className="dsl-identity-grid">
        <Field label="数据集名称" required error={validationErrors.name} hint={`最多 ${DATASET_NAME_MAX_LENGTH} 个字符`} messageId={`${validationId}-name`}><input className="dsl-input" aria-label="数据集名称" required maxLength={DATASET_NAME_MAX_LENGTH} aria-invalid={Boolean(validationErrors.name)} aria-describedby={`${validationId}-name`} data-dataset-field="name" disabled={busy} value={draft.name || ''} onChange={(event) => patch({ name: event.target.value })} placeholder="例如：电表采集明细" /></Field>
        <Field label="表的业务作用（选填）"><textarea className="dsl-textarea" aria-label="表的业务作用" disabled={busy} value={draft.purpose || ''} onChange={(event) => patch({ purpose: event.target.value })} placeholder="说明这张表在业务中做什么、数据粒度和典型用途" /></Field>
      </div>
      {editing ? <div className="dsl-source-strip" data-dataset-field="fields" tabIndex={-1}><span><small>来源连接</small><strong>{selectedConnection?.name || '连接已删除'}</strong></span><span><small>来源数据库</small><strong><code>{draft.database}</code></strong></span><span><small>来源表</small><strong><code>{draft.table}</code></strong></span><StatusPill>物理来源不可编辑</StatusPill></div> : <DatasetSourcePicker source={source} catalog={sourceCatalog} connections={connections} disabled={busy} validationErrors={validationErrors} validationId={validationId} />}
      <div className="dsl-privacy" style={{ marginTop: 14 }}><IconDataOutline16 size={18} /><div><strong>数据库表注释</strong><span>{draft.tableComment || ((draft.fields || []).length ? '数据库未提供表注释' : '选择数据表后会自动读取表注释。')}</span></div></div>
    </section>
    <div className="dsl-detail-tabs" role="tablist"><button type="button" className={activeTab === 'fields' ? 'active' : ''} onClick={() => setActiveTab('fields')}>字段定义</button><button type="button" className={activeTab === 'relations' ? 'active' : ''} onClick={() => setActiveTab('relations')}>关联关系</button><button type="button" className={activeTab === 'context' ? 'active' : ''} onClick={() => setActiveTab('context')}>大模型上下文</button></div>
    {activeTab === 'fields' ? <section className="dsl-section"><div className="dsl-section-title"><div><h2>字段定义</h2><p>字段名、字段类型、数据库注释来自物理库；业务名称、自定义业务注释、统一语义概念和敏感标记可编辑。</p></div><div className="dsl-row">{editing ? <Button icon={IconRefreshOutline16} disabled={busy} onClick={inspect}>同步表结构</Button> : null}<StatusPill kind={(draft.fields || []).length ? 'success' : 'neutral'}>{!editing && source.loading === 'fields' ? '正在自动读取字段…' : (draft.fields || []).length ? `已读取 ${draft.fields.length} 个字段` : '尚未读取字段'}</StatusPill></div></div>
      <FieldCommentCopy key={JSON.stringify([draft.id, draft.connectionId, draft.database, draft.table, draft.metadataVersion])} fields={draft.fields || []} disabled={busy || !(draft.fields || []).length || (!editing && (Boolean(source.loading) || Boolean(source.error) || !source.metadata || !sameDatasetSource(draft, source)))} onApply={(fields) => patch({ fields })} />
      {(draft.fields || []).length ? <div className="dsl-field-wrap" style={{ marginTop: 12 }}><table className="dsl-field-table"><thead><tr><th>启用</th><th>数据库字段</th><th>字段类型</th><th>数据库注释</th><th>业务名称</th><th>自定义业务注释</th><th>统一语义概念</th><th>敏感</th></tr></thead><tbody>{draft.fields.map((field) => <tr key={field.name}><td><input type="checkbox" aria-label={`启用${field.name}`} checked={field.enabled !== false} onChange={(event) => updateField(field.name, { enabled: event.target.checked })} /></td><td><div className="dsl-field-code"><code>{field.name}</code>{field.primaryKey ? <StatusPill>主键</StatusPill> : null}</div></td><td><code className="dsl-type">{field.dataType}</code></td><td><span className="dsl-db-comment">{field.databaseComment || '数据库未提供'}</span></td><td><input className="dsl-input" aria-label={`${field.name}的业务名称`} maxLength={COMMENT_COPY_TARGETS.businessName.maxLength} disabled={busy} value={field.businessName || ''} onChange={(event) => updateField(field.name, { businessName: event.target.value })} /></td><td><textarea className="dsl-textarea" aria-label={`${field.name}的自定义业务注释`} maxLength={COMMENT_COPY_TARGETS.customComment.maxLength} disabled={busy} rows={2} value={field.customComment || ''} onChange={(event) => updateField(field.name, { customComment: event.target.value })} /></td><td><select className="dsl-select" value={field.semanticConceptId || ''} onChange={(event) => updateField(field.name, { semanticConceptId: event.target.value })}><option value="">未关联</option>{state.semanticConcepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}</select></td><td><input type="checkbox" aria-label={`敏感字段${field.name}`} checked={field.sensitive === true} onChange={(event) => updateField(field.name, { sensitive: event.target.checked })} /></td></tr>)}</tbody></table></div> : <div className="dsl-hint" style={{ marginTop: 12 }}>{source.loading === 'fields' ? '正在读取所选表的字段定义，请稍候…' : source.error?.stage === 'fields' ? '字段读取失败，请在数据来源区域重试；成功前不能保存数据集。' : '请按“来源连接 → 来源数据库 → 来源表”逐级选择，选表后自动读取字段，无需手填库名和表名。'}</div>}<div className="dsl-fields-footer" style={{ marginTop: 10 }}><span>数据库原始元数据：<strong>只读保留</strong></span><span>业务语义：<strong>可编辑并版本记录</strong></span></div></section> : null}
    {activeTab === 'relations' ? <section className="dsl-section"><div className="dsl-section-title"><div><h2>已确认关系与识别候选</h2><p>关系的新增、修改、删除和人工确认统一在所属业务拓扑中完成。</p></div><Button kind="primary" icon={IconBranchOutline16} onClick={onOpenTopology}>打开关系拓扑</Button></div><div style={{ marginTop: 12 }}>{relations.length ? relations.map((relation) => <article className="dsl-card dsl-relation-card" key={relation.id}><div className="dsl-query-head"><StatusPill kind={relation.status === 'confirmed' ? 'success' : relation.status === 'candidate' ? 'warning' : 'neutral'}>{STATUS[relation.status]}</StatusPill><strong>{CARDINALITY[relation.cardinality]}</strong></div><div className="dsl-endpoint" style={{ marginTop: 8 }}><code>{endpointText(relation.source, state.datasets)}</code></div><div className="dsl-arrow">↕</div><div className="dsl-endpoint"><code>{endpointText(relation.target, state.datasets)}</code></div></article>) : <div className="dsl-hint">当前数据集还没有关系。</div>}</div></section> : null}
    {activeTab === 'context' ? <section className="dsl-section"><div className="dsl-section-title"><div><h2>提供给大模型的受控语义上下文</h2><p>保存数据集后可从列表统一预览，并在多个数据集之间切换。</p></div></div><div className="dsl-hint" style={{ marginTop: 12 }}>上下文由数据集用途、启用且非敏感的字段语义、统一语义概念，以及关系拓扑中已人工确认的关系自动生成；候选关系不会进入。</div></section> : null}
    {previewOpen ? <DatasetPreview dataset={draft} onClose={() => setPreviewOpen(false)} /> : null}
  </div>
}

function DatasetsPage({ preset, clearPreset, onOpenTopology }) {
  const [connections, setConnections] = useState([])
  const [state, setState] = useState(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [versionReady, setVersionReady] = useState(true)
  const [message, setMessage] = useState(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const [modal, setModal] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const refresh = useCallback(async () => {
    setLoading(true)
    const [connectionResult, semanticResult] = await Promise.allSettled([api('/list'), api('/semantic/state')])
    if (connectionResult.status === 'fulfilled') setConnections(connectionResult.value.connections || [])
    else setMessage({ kind: 'error', text: textError(connectionResult.reason) })
    if (semanticResult.status === 'fulfilled') { setState(semanticResult.value.state || EMPTY_STATE); setVersionReady(true) }
    else { const error = semanticResult.reason; setVersionReady(!error?.versionMismatch); setMessage({ kind: 'error', text: textError(error) }) }
    setLoading(false)
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (!preset || loading || editor) return
    const connection = connections.find((item) => item.id === preset.connectionId) || connections[0]
    if (connection) setEditor({ name: '', purpose: '', enabled: true, connectionId: connection.id, database: preset.database || connection.database || '', table: preset.table || '', fields: [] })
    clearPreset()
  }, [preset, loading, connections, editor, clearPreset])
  const beginNew = () => {
    const connection = connections[0]
    if (!connection) { setMessage({ kind: 'error', text: '请先在“连接管理”中创建数据库连接' }); return }
    setEditor({ name: '', purpose: '', enabled: true, connectionId: connection.id, database: connection.database || '', table: '', fields: [] })
  }
  const saved = async (dataset) => { await refresh(); setEditor(null); setMessage({ kind: 'ok', text: `数据集“${dataset.name}”已保存，真实数据库元数据与自定义业务语义已合并。` }) }
  const syncAll = async () => {
    setSyncing(true)
    try { for (const dataset of state.datasets) await api('/semantic/datasets/sync', { id: dataset.id }); await refresh(); setMessage({ kind: 'ok', text: `已同步 ${state.datasets.length} 个数据集的表结构` }) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setSyncing(false) }
  }
  if (editor) return <DatasetEditor initial={editor} connections={connections} state={state} onCancel={() => setEditor(null)} onSaved={saved} onDeleted={async () => { await refresh(); setEditor(null); setMessage({ kind: 'ok', text: '数据集已删除' }) }} onOpenTopology={onOpenTopology} />
  const fieldTotal = state.datasets.reduce((sum, dataset) => sum + (dataset.fields?.length || 0), 0)
  const annotated = state.datasets.reduce((sum, dataset) => sum + semanticCount(dataset), 0)
  const coverage = fieldTotal ? Math.round(annotated / fieldTotal * 100) : 0
  const confirmed = state.relations.filter((item) => item.status === 'confirmed').length
  const candidate = state.relations.filter((item) => item.status === 'candidate').length
  const filtered = state.datasets.filter((dataset) => `${dataset.name}${dataset.table}${dataset.purpose}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="dsl-page">
    <PageHeader eyebrow="统一数据语义层" title="数据集" description="把数据库的物理表翻译成大模型能稳定理解、可追溯、可关联的业务数据资产。" actions={<Button kind="primary" icon={IconPlusOutline16} disabled={!connections.length || !versionReady} onClick={beginNew}>新建数据集</Button>} />
    <Message value={message} />
    <div className="dsl-summary-grid"><SummaryCard icon={IconDataOutline16} label="数据集" value={`${state.datasets.length} 个`} note={`来自 ${new Set(state.datasets.map((item) => item.connectionId)).size} 个数据库连接`} /><SummaryCard icon={IconListPenOutline16} label="字段语义覆盖" value={`${coverage}%`} note={`${annotated} / ${fieldTotal} 个字段已解释`} tone="success" /><SummaryCard icon={IconBranchOutline16} label="表关联关系" value={`${state.relations.length} 条`} note={`${confirmed} 条确认，${candidate} 条待审核`} tone="warning" /></div>
    <section className="dsl-card dsl-dataset-list"><div className="dsl-list-toolbar"><div className="dsl-search"><IconSearchOutline16 /><input aria-label="搜索数据集" placeholder="搜索数据集、表名或业务含义" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="dsl-actions"><Button onClick={() => setModal({ type: 'concepts' })}>统一语义概念</Button><Button icon={syncing ? IconLoadingOutline16 : IconRefreshOutline16} disabled={syncing || !state.datasets.length} onClick={syncAll}>{syncing ? '同步中…' : '同步表结构'}</Button></div></div><div className="dsl-table-scroll"><div className="dsl-dataset-head"><span>数据集与业务含义</span><span>来源</span><span>语义完整度</span><span>关系</span><span>更新时间</span><span /></div>{filtered.map((dataset) => { const source = sourceLabel(dataset, connections); const datasetCoverage = dataset.fields?.length ? Math.round(semanticCount(dataset) / dataset.fields.length * 100) : 0; const relationCount = state.relations.filter((relation) => relation.source.datasetId === dataset.id || relation.target.datasetId === dataset.id).length; return <div className="dsl-dataset-row" key={dataset.id} role="button" tabIndex={0} onClick={() => setEditor(JSON.parse(JSON.stringify(dataset)))} onKeyDown={(event) => { if (event.key === 'Enter') setEditor(JSON.parse(JSON.stringify(dataset))) }}><div className="dsl-dataset-main"><span className="dsl-dataset-icon"><IconDataOutline16 /></span><div><strong>{dataset.name}</strong><code>{dataset.table}</code><p>{dataset.purpose || dataset.tableComment || '未填写表的业务作用'}</p></div></div><div className="dsl-source-cell"><span>{source.connection}</span><small>{source.path}</small></div><div className="dsl-coverage"><strong>{datasetCoverage}%</strong><div className="dsl-progress"><i style={{ width: `${datasetCoverage}%` }} /></div><small>{semanticCount(dataset)} / {dataset.fields?.length || 0} 个字段</small></div><div className="dsl-relation-count"><IconLinkOutline16 size={14} />{relationCount} 条</div><div className="dsl-updated">{dataset.updatedAt ? new Date(dataset.updatedAt).toLocaleString('zh-CN', { hour12: false }) : '—'}</div><button className="dsl-row-action" aria-label={`查看${dataset.name}`} type="button"><IconChevronRightOutline14 /></button></div> })}{!filtered.length ? <div className="dsl-empty">{loading ? '正在读取数据集…' : '没有找到匹配的数据集'}</div> : null}</div></section>
    <section className="dsl-semantic-callout"><span className="dsl-callout-icon"><IconApiOutline14 size={22} /></span><div><strong>大模型实际看到的不是建表语句，而是受控语义目录</strong><p>每次调用只提供数据集用途、字段业务含义、统一语义概念，以及关系拓扑中的已确认关系和来源证据。</p></div><Button icon={IconBrowseOutline16} disabled={!state.datasets.length} onClick={() => setModal({ type: 'context' })}>预览大模型上下文</Button></section>
    {modal?.type === 'concepts' ? <ConceptManager state={state} refresh={refresh} onClose={() => setModal(null)} /> : null}
    {modal?.type === 'context' ? <DatasetContextModal state={state} connections={connections} initialId={state.datasets[0]?.id} onClose={() => setModal(null)} /> : null}
    {modal?.type === 'preview' ? <DatasetPreview dataset={modal.dataset} onClose={() => setModal(null)} /> : null}
  </div>
}

function TopologyEditor({ topology, datasets, onClose, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(topology)))
  const [message, setMessage] = useState(null)
  const toggleDataset = (id) => setDraft((current) => ({ ...current, datasetIds: current.datasetIds.includes(id) ? current.datasetIds.filter((item) => item !== id) : [...current.datasetIds, id] }))
  const save = async () => {
    try { const data = await api('/semantic/topologies/save', { topology: draft }); await onSaved(data.topology); onClose() }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  const remove = async () => {
    if (!draft.id || !globalThis.confirm(`删除关系拓扑“${draft.name}”吗？关系资产本身会保留。`)) return
    try { await api('/semantic/topologies/delete', { id: draft.id }); await onDeleted(); onClose() }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  return <Modal wide eyebrow="业务关系视图" title={draft.id ? '编辑关系拓扑' : '新建关系拓扑'} description="一个系统可以维护多个业务主题拓扑；把真正相关的表加入当前主题，无关表无需放在一起。" onClose={onClose} footer={<>{draft.id ? <Button kind="danger" icon={IconTrashOutline16} onClick={remove}>删除拓扑</Button> : null}<Button onClick={onClose}>取消</Button><Button kind="primary" icon={IconCheckOutline16} disabled={!draft.name.trim() || draft.datasetIds.length < 2} onClick={save}>保存拓扑</Button></>}>
    <div className="dsl-form-grid"><Field label="拓扑名称"><input className="dsl-input" value={draft.name || ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：能源计量主题拓扑" /></Field><Field label="拓扑用途"><textarea className="dsl-textarea" value={draft.purpose || ''} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} placeholder="说明这组表支持哪类业务分析" /></Field></div>
    <div className="dsl-section-title" style={{ marginTop: 16 }}><div><h2>选择当前拓扑包含的数据表</h2><p>至少选择两张表；同一个数据集可以被多个业务拓扑复用。</p></div><StatusPill>{draft.datasetIds.length} 张表</StatusPill></div>
    <div className="dsl-concepts">{datasets.map((dataset) => <label className={`dsl-concept ${draft.datasetIds.includes(dataset.id) ? 'selected' : ''}`} key={dataset.id} style={{ cursor: 'pointer' }}><div className="dsl-row" style={{ flexWrap: 'nowrap' }}><input type="checkbox" checked={draft.datasetIds.includes(dataset.id)} onChange={() => toggleDataset(dataset.id)} /><span className="dsl-dataset-icon"><IconDataOutline16 /></span><span><strong>{dataset.name}</strong><code style={{ display: 'block', fontSize: 9 }}>{dataset.database}.{dataset.table}</code></span></div><p>数据库表注释：{dataset.tableComment || '无'}</p><small>统一业务用途：{dataset.purpose || '未填写'}</small></label>)}</div>
    <div style={{ marginTop: 12 }}><Message value={message} /></div>
  </Modal>
}

function RelationEditor({ relation, topology, state, onClose, onSaved }) {
  const topologyDatasets = topology.datasetIds.map((id) => state.datasets.find((item) => item.id === id)).filter(Boolean)
  const first = topologyDatasets[0]
  const second = topologyDatasets[1] || first
  const [draft, setDraft] = useState(() => relation ? { id: relation.id, source: { ...relation.source }, target: { ...relation.target }, cardinality: relation.cardinality, status: relation.status === 'confirmed' ? 'confirmed' : 'candidate', businessDescription: relation.businessDescription || '' } : { source: { datasetId: first?.id || '', field: first?.fields?.find((field) => field.enabled !== false)?.name || '' }, target: { datasetId: second?.id || '', field: second?.fields?.find((field) => field.enabled !== false)?.name || '' }, cardinality: 'many-to-one', status: 'candidate', businessDescription: '' })
  const [message, setMessage] = useState(null)
  const datasetFor = (side) => topologyDatasets.find((item) => item.id === draft[side].datasetId)
  const chooseDataset = (side, id) => { const dataset = topologyDatasets.find((item) => item.id === id); setDraft((current) => ({ ...current, [side]: { datasetId: id, field: dataset?.fields?.find((field) => field.enabled !== false)?.name || '' } })) }
  const chooseField = (side, field) => setDraft((current) => ({ ...current, [side]: { ...current[side], field } }))
  const save = async () => {
    try { await api('/semantic/relations/save', { relation: { ...draft, topologyId: topology.id } }); await onSaved(); onClose() }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  const endpointFields = (dataset) => (dataset?.fields || []).filter((field) => field.enabled !== false)
  const fieldLabel = (field) => { const concept = state.semanticConcepts.find((item) => item.id === field.semanticConceptId); return `${field.name}｜${field.dataType}｜数据库注释：${field.databaseComment || '无'}｜统一语义：${concept?.name || field.businessName || '未解释'}` }
  return <Modal wide eyebrow="关系资产维护" title={relation ? '编辑字段关系' : '手动添加字段关系'} description="端点选择同时展示数据库表、字段类型、数据库注释、业务名称和统一语义，便于人工判断。" onClose={onClose} footer={<><Button onClick={onClose}>取消</Button><Button kind="primary" icon={IconCheckOutline16} disabled={!draft.source.datasetId || !draft.source.field || !draft.target.datasetId || !draft.target.field || (draft.status === 'confirmed' && !draft.businessDescription.trim())} onClick={save}>保存关系</Button></>}>
    <div className="dsl-form-grid"><Field label="来源数据集 / 数据库表"><select className="dsl-select" value={draft.source.datasetId} onChange={(event) => chooseDataset('source', event.target.value)}>{topologyDatasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}｜{dataset.database}.{dataset.table}｜{dataset.tableComment || dataset.purpose || '无注释'}</option>)}</select></Field><Field label="来源字段（类型｜数据库注释｜统一语义）"><select className="dsl-select" value={draft.source.field} onChange={(event) => chooseField('source', event.target.value)}>{endpointFields(datasetFor('source')).map((field) => <option key={field.name} value={field.name}>{fieldLabel(field)}</option>)}</select></Field><Field label="目标数据集 / 数据库表"><select className="dsl-select" value={draft.target.datasetId} onChange={(event) => chooseDataset('target', event.target.value)}>{topologyDatasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}｜{dataset.database}.{dataset.table}｜{dataset.tableComment || dataset.purpose || '无注释'}</option>)}</select></Field><Field label="目标字段（类型｜数据库注释｜统一语义）"><select className="dsl-select" value={draft.target.field} onChange={(event) => chooseField('target', event.target.value)}>{endpointFields(datasetFor('target')).map((field) => <option key={field.name} value={field.name}>{fieldLabel(field)}</option>)}</select></Field><Field label="关联基数"><select className="dsl-select" value={draft.cardinality} onChange={(event) => setDraft({ ...draft, cardinality: event.target.value })}>{Object.entries(CARDINALITY).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="确认状态"><select className="dsl-select" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="candidate">候选待确认</option><option value="confirmed">人工确认</option></select></Field><Field label="关系依据与业务说明（人工确认必填）" span><textarea className="dsl-textarea" value={draft.businessDescription} onChange={(event) => setDraft({ ...draft, businessDescription: event.target.value })} placeholder="说明为什么能关联、哪一端唯一，以及业务上用于什么分析" /></Field></div>
    <div style={{ marginTop: 12 }}><Message value={message} /></div>
  </Modal>
}

function TopologyGraph({ datasets, relations, concepts }) {
  return <div className="dsl-graph"><div className="dsl-graph-grid">{datasets.map((dataset) => <article className="dsl-node" key={dataset.id}><div className="dsl-node-head"><span className="dsl-dataset-icon"><IconDataOutline16 /></span><div><strong>{dataset.name}</strong><code>{dataset.database}.{dataset.table}</code></div></div><div className="dsl-node-fields">{(dataset.fields || []).filter((field) => field.enabled !== false).slice(0, 6).map((field) => { const concept = concepts.find((item) => item.id === field.semanticConceptId); return <div className="dsl-node-field" key={field.name}><code>{field.name}</code><span>{concept?.name || field.businessName || field.databaseComment || field.dataType}</span></div> })}</div></article>)}{relations.map((relation) => <div className={`dsl-relation-ribbon ${relation.status === 'candidate' ? 'candidate' : ''}`} key={relation.id}><span>{endpointText(relation.source, datasets)} · {CARDINALITY[relation.cardinality]} · {endpointText(relation.target, datasets)}</span></div>)}</div></div>
}

function RuleDetails({ rules }) {
  if (!rules) return null
  return <details className="dsl-section dsl-rule-details"><summary>查看关系识别规则说明</summary><p style={{ color: 'var(--dsl-muted)', fontSize: 10, lineHeight: 1.5 }}>规则版本：{rules.version}。字段对先经过硬阻断，再按可解释证据计分；达到阈值也只生成待人工确认候选。</p><div className="dsl-rule-list">{Object.entries(rules.weights || {}).map(([name, score]) => <span key={name}><strong>{name}</strong><br />最高 {score} 分</span>)}</div><pre className="dsl-code" style={{ overflow: 'auto', fontSize: 9 }}>{JSON.stringify({ thresholds: rules.thresholds, hardGates: rules.hardGates }, null, 2)}</pre></details>
}

function TopologyPage() {
  const [state, setState] = useState(EMPTY_STATE)
  const [models, setModels] = useState({ available: false, providers: [] })
  const [rules, setRules] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sampleValues, setSampleValues] = useState(false)
  const [message, setMessage] = useState(null)
  const refresh = useCallback(async () => {
    try {
      const data = await api('/semantic/state'); setState(data.state || EMPTY_STATE); setSelectedId((current) => data.state.topologies.some((item) => item.id === current) ? current : data.state.topologies[0]?.id || '')
    } catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    try { const data = await api('/semantic/models'); setModels(data.models || { available: false, providers: [] }) } catch {}
    try { const data = await api('/semantic/rules'); setRules(data.rules || null) } catch {}
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const selected = state.topologies.find((item) => item.id === selectedId)
  const topologyRelations = selected ? selected.relationIds.map((id) => state.relations.find((item) => item.id === id)).filter(Boolean) : []
  const topologyDatasets = selected ? selected.datasetIds.map((id) => state.datasets.find((item) => item.id === id)).filter(Boolean) : []
  const identify = async (kind) => {
    if (!selected) return
    if (kind === 'llm') { setModal({ type: 'batches' }); return }
    setBusy(true); setMessage(null)
    try { const data = await api(`/semantic/relations/${kind === 'llm' ? 'identify-llm' : 'identify-rules'}`, { topologyId: selected.id, sampleValues }); await refresh(); setMessage({ kind: 'ok', text: kind === 'llm' ? `大模型识别并经过确定性复核：新增 ${data.summary?.created || 0} 条、刷新 ${data.summary?.refreshed || 0} 条候选。` : `规则引擎识别完成：新增 ${data.summary?.created || 0} 条、刷新 ${data.summary?.refreshed || 0} 条候选。` }) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
    finally { setBusy(false) }
  }
  const confirm = async (relation) => {
    if (!relation.businessDescription?.trim()) { setModal({ type: 'relation', relation: { ...relation, status: 'confirmed' } }); setMessage({ kind: 'error', text: '人工确认前请先补充关系依据与业务说明' }); return }
    try { await api('/semantic/relations/confirm', { id: relation.id }); await refresh(); setMessage({ kind: 'ok', text: '关系已人工确认，现在可以进入其他插件和大模型的语义上下文。' }) }
    catch (error) { setMessage({ kind: 'error', text: textError(error) }) }
  }
  const reject = async (relation) => { try { await api('/semantic/relations/reject', { id: relation.id }); await refresh() } catch (error) { setMessage({ kind: 'error', text: textError(error) }) } }
  const removeRelation = async (relation) => { if (!globalThis.confirm('删除这条关系吗？')) return; try { await api('/semantic/relations/delete', { id: relation.id }); await refresh() } catch (error) { setMessage({ kind: 'error', text: textError(error) }) } }
  const modelConfig = state.modelConfig || { provider: '', model: '' }
  const provider = models.providers?.find((item) => item.id === modelConfig.provider)
  const modelOptions = (provider?.models || []).map((item) => typeof item === 'string' ? { id: item, label: item } : { id: item.id || item.name, label: item.name || item.id })
  const saveModel = async (patch) => { try { await api('/semantic/model/save', { modelConfig: { ...modelConfig, ...patch } }); await refresh() } catch (error) { setMessage({ kind: 'error', text: textError(error) }) } }
  return <div className="dsl-page dsl-page-wide">
    <PageHeader eyebrow="统一数据语义层" title="数据库关系拓扑" description="按业务主题维护多个拓扑；规则引擎和大模型只生成候选，必须人工确认后其他插件才能使用。" actions={<Button kind="primary" icon={IconPlusOutline16} disabled={state.datasets.length < 2} onClick={() => setModal({ type: 'topology', topology: { name: '', purpose: '', enabled: true, datasetIds: [], relationIds: [] } })}>新建拓扑</Button>} />
    <Message value={message} />
    {state.topologies.length ? <section className="dsl-card dsl-topology-manager"><div className="dsl-topology-primary"><span className="dsl-topology-icon"><IconBranchOutline16 size={22} /></span><div className="dsl-topology-copy"><small>当前业务主题拓扑</small><select aria-label="切换关系拓扑" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{state.topologies.map((topology) => <option key={topology.id} value={topology.id}>{topology.name}｜{topology.datasetIds.length} 张表｜{topology.relationIds.length} 条关系</option>)}</select><p>{selected?.purpose || '未填写拓扑用途'}。切换后，下方识别范围、图谱和关系列表同步变化。</p></div></div><div className="dsl-topology-side"><div className="dsl-topology-stats"><span><strong>{selected?.datasetIds.length || 0}</strong><small>当前表</small></span><span><strong>{topologyRelations.length}</strong><small>当前关系</small></span></div><div className="dsl-actions"><Button icon={IconEditOutline16} onClick={() => setModal({ type: 'topology', topology: JSON.parse(JSON.stringify(selected)) })}>编辑当前拓扑</Button></div></div><div className="dsl-topology-scope"><div><span className="dsl-topology-icon" style={{ width: 34, height: 34 }}><IconSparkle16 /></span><div><small>以下操作只针对当前选中的关系拓扑</small><strong>{selected?.name}</strong><small>规则引擎与大模型均只生成候选；可手动添加、编辑、确认或删除。</small></div></div><div className="dsl-actions"><label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--dsl-muted)', fontSize: 10 }}><input type="checkbox" checked={sampleValues} onChange={(event) => setSampleValues(event.target.checked)} />使用脱敏值匹配</label><Button icon={IconRefreshOutline16} disabled={busy} onClick={() => identify('rules')}>{busy ? '识别中…' : '规则引擎识别'}</Button><Button icon={IconSparkle16} disabled={busy} onClick={() => identify('llm')}>大模型识别关系</Button><Button kind="primary" icon={IconPlusOutline16} disabled={!selected || selected.datasetIds.length < 2} onClick={() => setModal({ type: 'relation', relation: null })}>手动添加关系</Button></div></div></section> : <div className="dsl-section dsl-empty">暂无关系拓扑。请先创建至少两个数据集，再按业务主题新建拓扑。</div>}
    {selected ? <><div className="dsl-query-head"><div className="dsl-legend"><span><i />已确认关系</span><span><i className="candidate" />候选待确认</span><span><IconDataOutline16 size={14} />当前拓扑数据表</span></div><StatusPill>{selected.name}</StatusPill></div><div className="dsl-topology-grid"><section className="dsl-section" style={{ padding: 10 }}><TopologyGraph datasets={topologyDatasets} relations={topologyRelations} concepts={state.semanticConcepts} /></section><aside className="dsl-inspector"><section className="dsl-section"><div className="dsl-section-title"><div><h2>当前拓扑关系</h2><p>端点同时标注数据集、数据库表和字段。</p></div><StatusPill kind="success">{topologyRelations.filter((item) => item.status === 'confirmed').length} 条已确认</StatusPill></div><div style={{ marginTop: 10 }}>{topologyRelations.length ? topologyRelations.map((relation) => <article className="dsl-card dsl-relation-card" key={relation.id}><div className="dsl-query-head"><StatusPill kind={relation.status === 'confirmed' ? 'success' : relation.status === 'candidate' ? 'warning' : 'neutral'}>{STATUS[relation.status]}｜{ORIGIN[relation.origin]}</StatusPill><strong>{CARDINALITY[relation.cardinality]}</strong></div><div className="dsl-endpoint" style={{ marginTop: 8 }}><code>{endpointText(relation.source, state.datasets)}</code></div><div className="dsl-arrow">↕</div><div className="dsl-endpoint"><code>{endpointText(relation.target, state.datasets)}</code></div><p style={{ color: 'var(--dsl-muted)', fontSize: 9, lineHeight: 1.45 }}>置信度 {relation.confidence}%｜{relation.businessDescription || '未填写关系依据'}</p>{relation.hardBlocks?.length ? <div className="dsl-message dsl-message-error">{relation.hardBlocks.join('；')}</div> : null}<div className="dsl-actions">{relation.status !== 'confirmed' ? <Button onClick={() => confirm(relation)}>人工确认</Button> : null}{relation.status !== 'rejected' ? <Button onClick={() => reject(relation)}>拒绝</Button> : null}<Button icon={IconEditOutline16} onClick={() => setModal({ type: 'relation', relation })}>编辑</Button><Button kind="danger" icon={IconTrashOutline16} onClick={() => removeRelation(relation)}>删除</Button></div>{relation.evidence?.length ? <details style={{ marginTop: 8 }}><summary style={{ cursor: 'pointer', fontSize: 9 }}>查看可解释证据</summary><ul style={{ paddingLeft: 18, color: 'var(--dsl-muted)', fontSize: 9 }}>{relation.evidence.map((item) => <li key={item.code}>{item.label}：{item.score}/{item.weight} 分；{item.detail}</li>)}</ul></details> : null}</article>) : <div className="dsl-hint">暂无关系。可使用规则引擎、大模型辅助或手动添加。</div>}</div></section></aside></div></> : null}
    <section className="dsl-section"><div className="dsl-section-title"><div><h2>大模型识别配置</h2><p>{models.available ? '从 Harness（模型服务）读取真实供应商与模型；只发送元数据、语义和规则候选，不发送连接凭据。' : models.error || '当前未提供模型服务，仍可使用规则引擎。'}</p></div><StatusPill kind={models.available ? 'success' : 'neutral'}>{models.available ? '模型服务可选择' : '仅规则引擎可用'}</StatusPill></div><div className="dsl-form-grid" style={{ marginTop: 10 }}><Field label="模型服务提供方（Provider，供应商）"><select className="dsl-select" value={modelConfig.provider || ''} disabled={!models.available} onChange={(event) => { const nextProvider = models.providers.find((item) => item.id === event.target.value); const firstModel = nextProvider?.models?.[0]; void saveModel({ provider: event.target.value, model: typeof firstModel === 'string' ? firstModel : firstModel?.id || firstModel?.name || '' }) }}><option value="">未选择</option>{(models.providers || []).map((item) => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}</select></Field><Field label="模型（Model）"><select className="dsl-select" value={modelConfig.model || ''} disabled={!modelConfig.provider} onChange={(event) => void saveModel({ model: event.target.value })}><option value="">未选择</option>{modelOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field></div><div className="dsl-hint" style={{ marginTop: 10 }}>大模型只能从当前拓扑的已有字段白名单中选择端点；输出还会经过类型、唯一性、值覆盖率等确定性复核，最终仍需人工确认。</div></section>
    <RuleDetails rules={rules} />
    {modal?.type === 'batches' && selected ? <RelationBatchModal ui={semanticPreviewUi} topology={selected} modelReady={Boolean(models.available && modelConfig.provider && modelConfig.model)} sampleValues={sampleValues} onClose={() => setModal(null)} onSaved={refresh} /> : null}
    {modal?.type === 'topology' ? <TopologyEditor topology={modal.topology} datasets={state.datasets} onClose={() => setModal(null)} onSaved={async (topology) => { await refresh(); setSelectedId(topology.id); setMessage({ kind: 'ok', text: `关系拓扑“${topology.name}”已保存` }) }} onDeleted={refresh} /> : null}
    {modal?.type === 'relation' && selected ? <RelationEditor relation={modal.relation} topology={selected} state={state} onClose={() => setModal(null)} onSaved={async () => { await refresh(); setMessage({ kind: 'ok', text: '关系已保存；只有人工确认的关系会进入其他插件和大模型的语义上下文。' }) }} /> : null}
  </div>
}

function WorkspaceTabs({ active, onChange }) {
  const tabs = [{ id: 'connections', label: '连接管理', icon: IconDataOutline16 }, { id: 'datasets', label: '数据集', icon: IconListPenOutline16 }, { id: 'topology', label: '关系拓扑', icon: IconBranchOutline16 }]
  return <div className="dsl-tabs" role="tablist" aria-label="数据库统一语义层功能">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => onChange(id)}><Icon size={16} />{label}</button>)}</div>
}

function DatabaseSemanticLayerSection() {
  usePluginStyles()
  const [tab, setTab] = useState('connections')
  const [datasetPreset, setDatasetPreset] = useState(null)
  const openDataset = (connectionId = '', database = '', table = '') => { setDatasetPreset({ connectionId, database, table, key: Date.now() }); setTab('datasets') }
  return <div className="dsl-root"><div className="dsl-shell"><WorkspaceTabs active={tab} onChange={(next) => { setTab(next); if (next !== 'datasets') setDatasetPreset(null) }} />{tab === 'connections' ? <ConnectionsPage onCreateDataset={openDataset} /> : null}{tab === 'datasets' ? <DatasetsPage preset={datasetPreset} clearPreset={() => setDatasetPreset(null)} onOpenTopology={() => setTab('topology')} /> : null}{tab === 'topology' ? <TopologyPage /> : null}</div></div>
}

export const inject = ['slots']

export function apply(ctx) {
  const myPlugins = 'my-plugins.section'
  const settings = 'settings.section'
  let dispose = null
  let target = null
  const mount = () => {
    const next = ctx.slots.spec(myPlugins) ? myPlugins : settings
    if (next === target && dispose) return
    if (dispose) { try { dispose() } catch {} dispose = null }
    target = next
    if (!ctx.slots.spec(next)) return
    dispose = ctx.slots.register({ name: next, id: 'database-connections', order: 100, label: '数据库连接' }, DatabaseSemanticLayerSection)
  }
  ctx.effect(() => {
    const offMyPlugins = ctx.slots.subscribe(myPlugins, mount)
    const offSettings = ctx.slots.subscribe(settings, mount)
    mount()
    return () => { offMyPlugins(); offSettings(); if (dispose) dispose() }
  }, 'database-connections: section target')
}
