/**
 * DSH 技能管理器 —— host 半部（纯 ESM，依赖 skills + webServer）。
 *
 * 职责：
 * 1. 维护自定义技能目录 $DSH_HOME/skills/（每个技能一个 frontmatter Markdown 文件）。
 * 2. 把每个「已启用」技能注册成运行时 skill（ctx.skills.register），配置后立即生效；
 *    同时落盘为标准 skill 文件，skill-filesystem 等 provider 可长期发现，跨会话持久。
 * 3. 支持技能正文用 @技能名 引用其他技能（递归展开，循环防护，禁用技能不参与引用）。
 * 4. 支持技能内嵌 Python 脚本（可配解释器命令），注入正文由模型按需执行。
 * 5. 支持「能力引用」：接口工具 / 数据库表 / SQL 命令，渲染时展开成调用指引。
 * 6. 提供 /api/dsh-skill-manager HTTP API（list / save / remove / catalog / export / import）。
 *
 * 设计取舍：技能文件走 $DSH_HOME/skills/ 文件持久化而不是 settings 命名空间，是为了
 * 让本插件只依赖 skills + webServer（安装门槛低），且技能文件本身是 DSH 标准 skill
 * 文件，即使本插件卸载，技能仍可被其它 skill provider 发现。
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const API_PREFIX = '/api/dsh-skill-manager'
const MAX_REF_DEPTH = 6
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const EXPORT_FORMAT = 'dsh-plugin-config'
const EXPORT_FORMAT_VERSION = 1
const PLUGIN_ID = 'dsh-skill-manager'
const PLUGIN_VERSION = '1.0.0'
const MAX_IMPORT_ITEMS = 200

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// HTTP 辅助
// ---------------------------------------------------------------------------

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 16_000_000) {
        reject(new ApiError(413, '请求体过大'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (data.trim().length === 0) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch {
        reject(new ApiError(400, '请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

// ---------------------------------------------------------------------------
// 应用入口
// ---------------------------------------------------------------------------

function apply(ctx) {
  ctx.inject(['skills', 'webServer'], (sctx) => {
    // name -> { record, disposer }
    const state = new Map()

    // ---- 目录 ----

    function dshHome() {
      if (process.env.DSH_HOME) return process.env.DSH_HOME
      return join(homedir(), '.dsh')
    }

    function skillsDir() {
      return join(dshHome(), 'skills')
    }

    // ---- 校验 / 规范化 ----

    function normalizeRef(r) {
      if (!r || typeof r !== 'object') return null
      if (r.type === 'tool') {
        const name = String(r.name == null ? '' : r.name).trim()
        if (!name) return null
        return { type: 'tool', name }
      }
      if (r.type === 'database') {
        const connection = String(r.connection == null ? '' : r.connection).trim()
        if (!connection) return null
        return {
          type: 'database',
          connection,
          database: String(r.database == null ? '' : r.database).trim(),
          table: String(r.table == null ? '' : r.table).trim(),
        }
      }
      if (r.type === 'sql') {
        const sql = String(r.sql == null ? '' : r.sql).trim()
        if (!sql) return null
        return { type: 'sql', label: String(r.label == null ? '' : r.label).trim() || 'SQL', sql }
      }
      return null
    }

    function normalizeRefs(raw) {
      if (Array.isArray(raw)) {
        const out = []
        for (const r of raw) { const n = normalizeRef(r); if (n) out.push(n) }
        return out
      }
      if (typeof raw === 'string' && raw.trim()) {
        try { return normalizeRefs(JSON.parse(raw)) } catch { return [] }
      }
      return []
    }

    function validate(raw) {
      const r = raw || {}
      const name = String(r.name == null ? '' : r.name).trim()
      if (!SKILL_NAME_RE.test(name)) {
        throw new ApiError(400, '技能名称必须是 kebab-case（小写字母/数字，连字符分隔），如 my-review')
      }
      const description = String(r.description == null ? '' : r.description).trim()
      if (!description) throw new ApiError(400, '技能描述不能为空')
      const content = String(r.content == null ? '' : r.content)
      const scripts = []
      if (Array.isArray(r.scripts)) {
        for (const s of r.scripts) {
          if (!s || typeof s !== 'object') continue
          const code = String(s.code == null ? '' : s.code).trim()
          if (!code) continue
          scripts.push({
            name: String(s.name == null ? '' : s.name).replace(/[\r\n]+/g, ' ').trim() || '脚本',
            code,
          })
        }
      }
      const refs = normalizeRefs(r.refs)
      if (!content.trim() && scripts.length === 0 && refs.length === 0) {
        throw new ApiError(400, '技能正文、Python 脚本或能力引用至少填一项')
      }
      return {
        name,
        description: description.replace(/[\r\n]+/g, ' '),
        whenToUse: String(r.whenToUse == null ? '' : r.whenToUse).trim().replace(/[\r\n]+/g, ' '),
        interpreter: String(r.interpreter == null ? '' : r.interpreter).trim().replace(/[\r\n]+/g, ' ') || 'python',
        modelInvocable: r.modelInvocable !== false,
        userInvocable: r.userInvocable !== false,
        enabled: r.enabled !== false,
        content,
        scripts,
        refs,
      }
    }

    // ---- 批量迁移 ----

    /** 只导出技能配置本身；API 密钥和数据库密码由对应插件单独管理。 */
    function toPortableRecord(record) {
      return {
        name: record.name,
        description: record.description,
        whenToUse: record.whenToUse,
        interpreter: record.interpreter,
        modelInvocable: record.modelInvocable,
        userInvocable: record.userInvocable,
        enabled: record.enabled,
        content: record.content,
        scripts: (record.scripts || []).map((script) => ({ name: script.name, code: script.code })),
        refs: (record.refs || []).map((ref) => ({ ...ref })),
      }
    }

    function createExportDocument(records) {
      return {
        format: EXPORT_FORMAT,
        formatVersion: EXPORT_FORMAT_VERSION,
        plugin: PLUGIN_ID,
        pluginVersion: PLUGIN_VERSION,
        exportedAt: new Date().toISOString(),
        secretPolicy: 'no-managed-credentials',
        contentPolicy: 'full-skill-content',
        items: records.map(toPortableRecord),
      }
    }

    function readImportDocument(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ApiError(400, '导入文件不是合法的 DSH 插件配置对象')
      }
      if (value.format !== EXPORT_FORMAT || value.formatVersion !== EXPORT_FORMAT_VERSION) {
        throw new ApiError(400, '导入文件格式或版本不受支持')
      }
      if (value.plugin !== PLUGIN_ID) {
        throw new ApiError(400, '该文件不是技能插件的配置包')
      }
      if (!Array.isArray(value.items)) throw new ApiError(400, '导入文件缺少 items 配置列表')
      if (value.items.length === 0) throw new ApiError(400, '导入文件中没有可导入的技能')
      if (value.items.length > MAX_IMPORT_ITEMS) throw new ApiError(400, `单次最多导入 ${MAX_IMPORT_ITEMS} 个技能`)
      return value.items
    }

    function readConflictPolicy(value) {
      return value === 'replace' || value === 'copy' ? value : 'skip'
    }

    function uniqueSkillName(base, usedNames) {
      let candidate = `${base}-copy`
      let index = 2
      while (usedNames.has(candidate)) {
        candidate = `${base}-copy-${index}`
        index += 1
      }
      return candidate
    }

    /** 创建副本时同步改写同一批次中的 @技能名，避免副本仍错误引用目标环境旧技能。 */
    function rewriteSkillRefs(content, renameMap) {
      if (renameMap.size === 0) return content
      return content.replace(/(^|[^a-zA-Z0-9@])@([a-z0-9]+(?:-[a-z0-9]+)*)(?![a-zA-Z0-9:-])/g, (whole, prefix, name) => {
        const renamed = renameMap.get(name)
        return renamed ? `${prefix}@${renamed}` : whole
      })
    }

    /**
     * 先严格校验整份文件，再计算本轮写入项；任何一项无效都会终止整次导入。
     * 技能以 name 为唯一标识，因此冲突判断和替换均只基于 name。
     */
    function mergeImportedSkills(existingRecords, rawItems, policy) {
      const parsed = rawItems.map((item, index) => {
        try {
          return validate(item)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          throw new ApiError(400, `第 ${index + 1} 个技能无效：${message}`)
        }
      })

      const duplicateNames = new Set()
      const importedNames = new Set()
      for (const record of parsed) {
        if (importedNames.has(record.name)) duplicateNames.add(record.name)
        importedNames.add(record.name)
      }
      if (duplicateNames.size > 0) {
        throw new ApiError(400, `导入文件包含重复技能名：${[...duplicateNames].join('、')}`)
      }

      const existingNames = new Set(existingRecords.map((record) => record.name))
      const usedNames = new Set(existingNames)
      const renameMap = new Map()
      if (policy === 'copy') {
        for (const record of parsed) {
          if (existingNames.has(record.name)) {
            const copyName = uniqueSkillName(record.name, usedNames)
            renameMap.set(record.name, copyName)
            usedNames.add(copyName)
          } else {
            usedNames.add(record.name)
          }
        }
      }

      const writes = []
      const summary = { imported: 0, replaced: 0, copied: 0, skipped: 0 }
      const skipped = []

      for (const input of parsed) {
        const conflict = existingNames.has(input.name)
        if (conflict && policy === 'skip') {
          summary.skipped += 1
          skipped.push({ name: input.name, reason: '同名技能已存在' })
          continue
        }

        let record = {
          ...input,
          content: rewriteSkillRefs(input.content, renameMap),
          scripts: input.scripts.map((script) => ({ ...script })),
          refs: input.refs.map((ref) => ({ ...ref })),
        }

        if (conflict && policy === 'copy') {
          record = {
            ...record,
            name: renameMap.get(input.name),
            description: `${record.description}（导入副本）`,
          }
          summary.copied += 1
        } else if (conflict && policy === 'replace') {
          summary.replaced += 1
        } else {
          summary.imported += 1
        }
        writes.push(record)
      }

      return { writes, summary, skipped }
    }

    /** 批量写文件；若任一写入失败，恢复本轮涉及文件的导入前内容。 */
    function persistImportedRecords(records) {
      if (records.length === 0) return
      const dir = skillsDir()
      mkdirSync(dir, { recursive: true })
      const payloads = records.map((record) => ({
        file: join(dir, record.name + '.md'),
        text: serialize(record),
      }))
      const backups = payloads.map(({ file }) => ({
        file,
        existed: existsSync(file),
        text: existsSync(file) ? readFileSync(file, 'utf8') : '',
      }))
      try {
        for (const payload of payloads) writeFileSync(payload.file, payload.text, 'utf8')
      } catch (error) {
        for (const backup of backups) {
          try {
            if (backup.existed) writeFileSync(backup.file, backup.text, 'utf8')
            else rmSync(backup.file, { force: true })
          } catch { /* 尽力回滚，保留原始错误 */ }
        }
        const message = error instanceof Error ? error.message : String(error)
        throw new ApiError(500, `导入文件写入失败，本次变更已回滚：${message}`)
      }
    }

    // ---- 序列化（frontmatter + 正文 + 脚本标记块）----

    function yq(s) {
      return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
    }

    function serialize(r) {
      const lines = ['---']
      lines.push('name: ' + yq(r.name))
      lines.push('description: ' + yq(r.description))
      if (r.whenToUse) lines.push('whenToUse: ' + yq(r.whenToUse))
      lines.push('interpreter: ' + yq(r.interpreter || 'python'))
      lines.push('disable-model-invocation: ' + (r.enabled && r.modelInvocable ? 'false' : 'true'))
      lines.push('user-invocable: ' + (r.enabled && r.userInvocable ? 'true' : 'false'))
      lines.push('enabled: ' + (r.enabled ? 'true' : 'false'))
      lines.push('refs: ' + yq(JSON.stringify(r.refs || [])))
      lines.push('---')
      lines.push('')
      lines.push(r.content)
      for (const s of r.scripts) {
        lines.push('')
        lines.push('<!-- ds-script-start: ' + s.name.replace(/--/g, '-') + ' -->')
        lines.push('```python')
        lines.push(s.code)
        lines.push('```')
        lines.push('<!-- ds-script-end -->')
      }
      return lines.join('\n')
    }

    // ---- 解析（frontmatter + 正文 + 脚本标记块）----

    function unquote(s) {
      s = s.trim()
      if (s.length >= 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
        return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      }
      return s
    }

    function stripFence(arr) {
      let start = 0
      let end = arr.length
      if (arr.length > 0 && arr[0].trim().indexOf('```') === 0) start = 1
      if (end > start && arr[end - 1].trim() === '```') end = end - 1
      return arr.slice(start, end).join('\n')
    }

    function splitScripts(body) {
      const lines = body.split(/\r?\n/)
      const scripts = []
      const out = []
      let cur = null
      for (const line of lines) {
        if (cur === null) {
          const p = line.indexOf('<!-- ds-script-start:')
          if (p !== -1) {
            const end = line.indexOf('-->', p)
            const rawName = end === -1 ? '脚本' : line.slice(p + '<!-- ds-script-start:'.length, end).trim()
            cur = { name: rawName || '脚本', lines: [] }
            continue
          }
          out.push(line)
        } else {
          if (line.indexOf('<!-- ds-script-end -->') !== -1) {
            const code = stripFence(cur.lines)
            if (code.trim()) scripts.push({ name: cur.name, code: code.trim() })
            cur = null
            continue
          }
          cur.lines.push(line)
        }
      }
      return { content: out.join('\n').trim(), scripts }
    }

    function parseFile(text) {
      const lines = String(text).split(/\r?\n/)
      if (lines[0] !== '---') return undefined
      let i = 1
      const meta = {}
      while (i < lines.length && lines[i] !== '---') {
        const line = lines[i]
        const idx = line.indexOf(':')
        if (idx > 0) {
          const key = line.slice(0, idx).trim()
          const val = line.slice(idx + 1).trim()
          if (!key) { i++; continue }
          if (val === 'true') meta[key] = true
          else if (val === 'false') meta[key] = false
          else meta[key] = unquote(val)
        }
        i++
      }
      if (i >= lines.length) return undefined
      const body = lines.slice(i + 1).join('\n')
      const split = splitScripts(body)
      return { meta, content: split.content, scripts: split.scripts }
    }

    // ---- 渲染（脚本 + 能力引用 + @技能名 展开）----

    function renderScriptBlock(s, interpreter) {
      return '### Python 脚本：' + s.name + '\n'
        + '当需要执行该脚本时，用 pwsh 工具运行：将代码写入临时 .py 文件后执行 `' + interpreter + ' 文件.py`，或 `' + interpreter + ' -c "代码"`。\n'
        + '```python\n' + s.code + '\n```'
    }

    function findTool(name) {
      try {
        const toolsSvc = sctx.get('tools')
        const list = toolsSvc && typeof toolsSvc.schemas === 'function' ? toolsSvc.schemas() : []
        for (const t of list) { if (t && t.name === name) return t }
      } catch { /* tools 服务可能未挂载 */ }
      return undefined
    }

    function renderRefs(refs) {
      if (!refs || !refs.length) return ''
      const blocks = []
      for (const r of refs) {
        if (r.type === 'tool') {
          const t = findTool(r.name)
          blocks.push('### 接口工具：' + r.name + '\n' + (t && t.description ? t.description : '（该工具当前不可用，请检查是否已启用）'))
        } else if (r.type === 'database') {
          let s = '### 数据库表：连接「' + r.connection + '」'
          if (r.database) s += ' / 库「' + r.database + '」'
          if (r.table) s += ' / 表「' + r.table + '」'
          s += '\n本技能需要查询该表数据。仅执行只读查询（SELECT / SHOW / DESCRIBE / EXPLAIN / WITH），通过可用的数据库查询能力获取数据。'
          blocks.push(s)
        } else if (r.type === 'sql') {
          blocks.push('### SQL 命令：' + (r.label || 'SQL') + '\n当需要时执行以下只读 SQL：\n```sql\n' + r.sql + '\n```')
        }
      }
      return blocks.length ? '## 能力引用\n\n' + blocks.join('\n\n') : ''
    }

    // 展开 @api:工具名 —— 引用 api 插件注册的 Agent 工具（注入其完整说明）。
    function expandApiRefs(text) {
      return text.replace(/(^|[^a-zA-Z0-9@])@api:([a-z][a-z0-9_]*)/g, (whole, pre, name) => {
        const t = findTool(name)
        if (!t || !t.description) return whole
        return pre + '<api_ref name="' + name + '">\n' + t.description + '\n</api_ref>'
      })
    }

    // 展开 @db:连接名 —— 引用 database 插件的连接，注入只读查询指引。
    function expandDbRefs(text) {
      return text.replace(/(^|[^a-zA-Z0-9@])@db:([^\s@]+)/g, (whole, pre, name) => {
        const clean = name.replace(/[，。；、：,.!?）)（("'`]+$/g, '')
        if (!clean) return whole
        return pre + '<database_ref name="' + clean + '">\n'
          + '查询数据库请使用 query_database 工具：connectionName 填 "' + clean + '"，sql 填只读 SQL（仅 SELECT / SHOW / DESCRIBE / EXPLAIN / WITH）。\n'
          + '</database_ref>'
      })
    }

    function renderFinalContent(rec, visiting, depth) {
      let text = rec.content
      if (rec.scripts && rec.scripts.length) {
        const interp = rec.interpreter || 'python'
        text += '\n\n' + rec.scripts.map((s) => renderScriptBlock(s, interp)).join('\n\n')
      }
      const refText = renderRefs(rec.refs)
      if (refText) text += '\n\n' + refText
      // 先展开 @api: 与 @db:（显式前缀，避免被技能名正则抢先匹配），再展开 @技能名。
      text = expandApiRefs(text)
      text = expandDbRefs(text)
      text = text.replace(/(^|[^a-zA-Z0-9@])@([a-z0-9]+(?:-[a-z0-9]+)*)/g, (whole, pre, name) => {
        const target = state.get(name)
        if (!target || !target.record.enabled || visiting.has(name) || depth >= MAX_REF_DEPTH) return whole
        visiting.add(name)
        const inner = renderFinalContent(target.record, visiting, depth + 1)
        visiting.delete(name)
        return pre + '<skill_ref name="' + name + '">\n' + inner + '\n</skill_ref>'
      })
      return text
    }

    function toRegistration(rec) {
      return {
        name: rec.name,
        description: rec.description,
        ...(rec.whenToUse ? { whenToUse: rec.whenToUse } : {}),
        invocation: { modelInvocable: rec.modelInvocable, userInvocable: rec.userInvocable },
        source: 'custom',
        content: renderFinalContent(rec, new Set([rec.name]), 0),
      }
    }

    function rebuildAll() {
      for (const entry of state.values()) {
        if (entry.disposer) { try { entry.disposer() } catch { /* ignore */ } entry.disposer = null }
      }
      for (const entry of state.values()) {
        if (entry.record.enabled) {
          try {
            entry.disposer = sctx.skills.register(toRegistration(entry.record))
          } catch (e) {
            sctx.logger?.warn?.('dsh-skill-manager: 注册技能 %s 失败：%s', entry.record.name, e instanceof Error ? e.message : String(e))
          }
        }
      }
    }

    // ---- 文件读写 ----

    function writeSkillFile(r) {
      const dir = skillsDir()
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, r.name + '.md'), serialize(r), 'utf8')
    }

    function deleteSkillFile(name) {
      const file = join(skillsDir(), name + '.md')
      try { rmSync(file, { force: true }) } catch { /* ignore */ }
    }

    // ---- 启动扫描 ----

    function loadAll() {
      const dir = skillsDir()
      if (!existsSync(dir)) return
      let entries
      try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue
        try {
          const parsed = parseFile(readFileSync(join(dir, entry.name), 'utf8'))
          if (!parsed || !parsed.meta.name) continue
          const r = validate({
            name: parsed.meta.name,
            description: parsed.meta.description,
            whenToUse: parsed.meta.whenToUse,
            interpreter: parsed.meta.interpreter,
            modelInvocable: parsed.meta['disable-model-invocation'] !== true,
            userInvocable: parsed.meta['user-invocable'] !== false,
            enabled: parsed.meta.enabled !== false,
            content: parsed.content,
            scripts: parsed.scripts,
            refs: parsed.meta.refs,
          })
          state.set(r.name, { record: r, disposer: null })
        } catch { /* 跳过无效文件 */ }
      }
      rebuildAll()
    }

    // ---- API 分发 ----

    async function dispatch(req, res) {
      const pathname = new URL(req.url ?? '/', 'http://x').pathname
      const sub = pathname.slice(API_PREFIX.length).replace(/^\/+/, '')
      const method = req.method ?? 'GET'

      if (method === 'GET' && sub === 'list') {
        sendJson(res, 200, { ok: true, skills: [...state.values()].map((v) => v.record) })
        return
      }

      if (method === 'GET' && sub === 'catalog') {
        let tools = []
        try {
          const toolsSvc = sctx.get('tools')
          const list = toolsSvc && typeof toolsSvc.schemas === 'function' ? toolsSvc.schemas() : []
          tools = list.map((t) => ({ name: t.name, description: t.description }))
        } catch { /* ignore */ }
        // 读 database 插件已保存的连接（脱敏，只留名称/类型/默认库，绝不带密码）。
        let connections = []
        try {
          const settingsSvc = sctx.get('settings')
          const raw = settingsSvc && typeof settingsSvc.get === 'function' ? settingsSvc.get('database-connections') : undefined
          const conns = raw && Array.isArray(raw.connections) ? raw.connections : []
          connections = conns.map((c) => ({
            name: c.name ?? '',
            id: c.id ?? '',
            type: c.type ?? '',
            database: c.database ?? '',
          }))
        } catch { /* database 插件可能未安装 */ }
        // 读 api 插件已保存的工具（只留 toolId 名称，供 @api: 引用）。
        let apis = []
        try {
          const settingsSvc = sctx.get('settings')
          const raw = settingsSvc && typeof settingsSvc.get === 'function' ? settingsSvc.get('api-tools') : undefined
          const list = raw && Array.isArray(raw.tools) ? raw.tools : []
          apis = list.map((t) => ({ name: t.name ?? '', toolId: t.toolId ?? '', enabled: t.enabled === true }))
        } catch { /* api 插件可能未安装 */ }
        sendJson(res, 200, { ok: true, tools, connections, apis })
        return
      }

      const body = await readJsonBody(req)

      if (method === 'POST' && sub === 'save') {
        let record
        try {
          record = validate(body.record ?? body)
        } catch (e) {
          throw e instanceof ApiError ? e : new ApiError(400, e instanceof Error ? e.message : String(e))
        }
        const oldName = body.oldName ? String(body.oldName) : undefined
        if (oldName && oldName !== record.name) {
          const old = state.get(oldName)
          if (old && old.disposer) { try { old.disposer() } catch { /* ignore */ } }
          state.delete(oldName)
          deleteSkillFile(oldName)
        }
        let persisted = true
        let persistError
        try {
          writeSkillFile(record)
        } catch (e) {
          persisted = false
          persistError = e instanceof Error ? e.message : String(e)
        }
        state.set(record.name, { record, disposer: null })
        rebuildAll()
        sendJson(res, 200, {
          ok: true,
          persisted,
          ...(persistError ? { error: '持久化失败（技能仍已生效）：' + persistError } : {}),
        })
        return
      }

      if (method === 'POST' && sub === 'remove') {
        const name = String(body.name ?? '')
        const existing = state.get(name)
        if (existing && existing.disposer) { try { existing.disposer() } catch { /* ignore */ } }
        state.delete(name)
        deleteSkillFile(name)
        rebuildAll()
        sendJson(res, 200, { ok: true })
        return
      }

      if (method === 'POST' && sub === 'export') {
        const names = Array.isArray(body.names) ? body.names.map((name) => String(name)) : []
        if (names.length === 0) throw new ApiError(400, '请至少选择一个技能再导出')
        const nameSet = new Set(names)
        const selected = [...state.values()].map((entry) => entry.record).filter((record) => nameSet.has(record.name))
        if (selected.length === 0) throw new ApiError(400, '没有找到可导出的技能')
        sendJson(res, 200, { ok: true, document: createExportDocument(selected) })
        return
      }

      if (method === 'POST' && sub === 'import') {
        const items = readImportDocument(body.document)
        const policy = readConflictPolicy(body.conflictPolicy)
        const existing = [...state.values()].map((entry) => entry.record)
        const result = mergeImportedSkills(existing, items, policy)
        persistImportedRecords(result.writes)
        for (const record of result.writes) state.set(record.name, { record, disposer: null })
        rebuildAll()
        sendJson(res, 200, {
          ok: true,
          summary: result.summary,
          skipped: result.skipped,
          importedNames: result.writes.map((record) => record.name),
        })
        return
      }

      throw new ApiError(404, `未知接口：${method} ${sub}`)
    }

    // ---- 注册 ----

    loadAll()

    sctx.effect(() => sctx.webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: async (req, res) => {
        try {
          await dispatch(req, res)
        } catch (error) {
          if (error instanceof ApiError) {
            sendJson(res, error.status, { ok: false, error: error.message })
            return
          }
          const message = error instanceof Error ? error.message : String(error)
          sctx.logger?.warn?.('dsh-skill-manager: %s', message)
          sendJson(res, 500, { ok: false, error: message })
        }
      },
    }), 'dsh-skill-manager: skill API')
  })
}

export { apply }
