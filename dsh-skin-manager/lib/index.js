/**
 * DSH 皮肤管理器 —— host 半部（纯 ESM，仅依赖 webServer）。
 *
 * 职责：
 * 1. 维护「皮肤目录」：内置默认 / 黑神话·悟空 / 能碳章鱼 / 格创东智 + 已导入皮肤。
 * 2. 校验皮肤文件（什么样的 .dshskin 能被导入，见 validateSkin）。
 * 3. 持久化已导入皮肤与当前选中皮肤到插件安装目录同级的 skins/。
 * 4. 提供 /api/dsh-skins HTTP API（state / install / uninstall / select）。
 * 5. 提供内置资源路由（黑神话·悟空的视频背景）。
 *
 * 设计取舍：已导入皮肤走文件持久化而不是 settings 命名空间，是为了让本
 * 插件只依赖 webServer（安装门槛最低，与 dsh-skin-wukong 一致）。客户端
 * 通过同源 fetch 调用 /api/dsh-skins，因此不需要 settingsScope 桥接。
 */

import {
  createReadStream,
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { OCTACARBON_SKIN, OCTACARBON_ASSETS } from './octacarbon.js'
import { GTRONTEC_SKIN, GTRONTEC_ASSETS } from './gtrontec.js'

// 插件自身位置：.../profiles/node_modules/dsh-skin-manager/lib/index.js
const LIB_DIR = dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = join(LIB_DIR, '..')
const VIDEO_PATH = join(PLUGIN_ROOT, 'assets', 'wukong-video.mp4')
// 已导入皮肤的存储目录：.../profiles/node_modules/skins/
const SKINS_DIR = join(LIB_DIR, '..', '..', 'skins')
const INDEX_PATH = join(SKINS_DIR, 'index.json')

const API_PREFIX = '/api/dsh-skins'
const VIDEO_ROUTE = '/dsh-skin-manager/wukong-video'

const DEFAULT_SKIN_ID = 'default'
const WUKONG_SKIN_ID = 'wukong'

/** 皮肤 ID：小写字母/数字开头，后续可含小写字母、数字、连字符，最长 64。 */
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
/** 语义化版本（x.y.z）。 */
const SEMVER_RE = /^\d+\.\d+\.\d+$/

/**
 * 宽松的 CSS 颜色校验：接受 #hex、rgb()/rgba()、hsl()/hsla() 与颜色关键字。
 * 拒绝包含 `;`、`{`、`}`、`url(` 的值 —— 这些是注入多值 / 引用外部资源的
 * 路径，皮肤令牌只允许是纯颜色。
 */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.,\s%]+\)|hsla?\(\s*[\d.,\s%]+\)|[a-zA-Z]{3,24})$/

/** css 字段里被拒绝的危险片段（防破坏 style 标签 / 执行旧式表达式 / 引入外部样式）。 */
const FORBIDDEN_CSS = ['</style', 'expression(', 'javascript:', '@import', '-moz-binding', 'behavior:']

/** 皮肤文件（.dshskin）格式版本，本实现接受的值。 */
const SCHEMA = 'dsh-skin'
const SCHEMA_VERSION = 1

// ---------------------------------------------------------------------------
// 内置皮肤
// ---------------------------------------------------------------------------

/** 黑神话·悟空皮肤：黑金配色令牌（单值字符串，应用时同时用于 light/dark）。 */
const WUKONG_TOKENS = {
  '--dsw-alias-bg-base': '#0b0a08',
  '--dsw-alias-bg-layer-1': '#14110e',
  '--dsw-alias-bg-layer-2': '#1c1712',
  '--dsw-alias-bg-layer-3': '#221c16',
  '--dsw-alias-bg-overlay': '#181310',
  '--dsw-alias-bg-mask-1': 'rgba(0, 0, 0, 0.5)',
  '--dsw-alias-bg-mask-2': 'rgba(0, 0, 0, 0.6)',
  '--dsw-alias-bg-mask-3': 'rgba(0, 0, 0, 0.7)',
  '--dsw-alias-bg-mask-drop': 'rgba(0, 0, 0, 0.3)',
  '--dsw-alias-bg-mask-photo': 'rgba(0, 0, 0, 0.4)',
  '--dsw-alias-bg-module-platform': '#1a1510',
  '--dsw-alias-bg-multi-select': '#1c1712',
  '--dsw-alias-bg-skeleton': '#1c1712',
  '--dsw-alias-border-inverted': '#413620',
  '--dsw-alias-border-inverted2': '#292116',
  '--dsw-alias-border-l1': '#292116',
  '--dsw-alias-border-l2': '#413620',
  '--dsw-alias-border-l2-darkmode-thin': '#413620',
  '--dsw-alias-border-l3': '#4a3d24',
  '--dsw-alias-border-l4': '#5a4a2c',
  '--dsw-alias-brand-primary': '#d4b06a',
  '--dsw-alias-brand-primary-invert': '#14110e',
  '--dsw-alias-brand-primary-new-colorprimary-new-color': '#d4b06a',
  '--dsw-alias-brand-text': '#d4b06a',
  '--dsw-alias-button-contrast-fill': '#e7ddc8',
  '--dsw-alias-button-elevated-fill': 'rgba(255, 255, 255, 0.08)',
  '--dsw-alias-button-floating-fill': '#1c1712',
  '--dsw-alias-button-floating-hover': '#221c16',
  '--dsw-alias-button-ghost-active-border': 'rgba(212, 176, 106, 0.5)',
  '--dsw-alias-button-ghost-active-fill': 'rgba(212, 176, 106, 0.12)',
  '--dsw-alias-button-ghost-active-hover': 'rgba(212, 176, 106, 0.18)',
  '--dsw-alias-button-info-fill': '#1c1712',
  '--dsw-alias-button-info-hover': '#221c16',
  '--dsw-alias-button-primary-dimmed': 'rgba(212, 176, 106, 0.5)',
  '--dsw-alias-button-primary-fill': '#d4b06a',
  '--dsw-alias-button-primary-hover': '#e0c07e',
  '--dsw-alias-button-tool-bar-fill': 'rgba(255, 255, 255, 0.08)',
  '--dsw-alias-button-tool-bar-fill-invisible': 'transparent',
  '--dsw-alias-button-tool-bar-hover': 'rgba(255, 255, 255, 0.12)',
  '--dsw-alias-interactive-bg-active': 'rgba(255, 255, 255, 0.1)',
  '--dsw-alias-interactive-bg-hover': 'rgba(255, 255, 255, 0.06)',
  '--dsw-alias-interactive-bg-hover-accent': 'rgba(212, 176, 106, 0.12)',
  '--dsw-alias-interactive-bg-hover-danger': 'rgba(193, 85, 74, 0.12)',
  '--dsw-alias-interactive-bg-hover-solid': '#221c16',
  '--dsw-alias-label-caption': '#8a7f6a',
  '--dsw-alias-label-dimmed': '#6b6352',
  '--dsw-alias-label-primary': '#e7ddc8',
  '--dsw-alias-label-primary-bluish': '#e7ddc8',
  '--dsw-alias-label-primary-dimmed': '#b5ab94',
  '--dsw-alias-label-primary-foreground': '#0b0a08',
  '--dsw-alias-label-primary-inverted': '#14110e',
  '--dsw-alias-label-secondary': '#a29780',
  '--dsw-alias-label-tertiary': '#8a7f6a',
  '--dsw-alias-markdown-citation': '#d4b06a',
  '--dsw-alias-markdown-code-block': '#1c1712',
  '--dsw-alias-markdown-code-block-banner': '#221c16',
  '--dsw-alias-markdown-code-segment-selected': 'rgba(212, 176, 106, 0.15)',
  '--dsw-alias-markdown-code-segment-unselected': 'transparent',
  '--dsw-alias-markdown-inline-code': '#1c1712',
  '--dsw-alias-markdown-placeholder': '#8a7f6a',
  '--dsw-alias-markdown-tag': 'rgba(212, 176, 106, 0.15)',
  '--dsw-alias-scrollbar-bg-l1': 'rgba(255, 255, 255, 0.08)',
  '--dsw-alias-scrollbar-bg-l2': 'rgba(255, 255, 255, 0.12)',
  '--dsw-alias-scrollbar-hover-l1': 'rgba(255, 255, 255, 0.15)',
  '--dsw-alias-scrollbar-hover-l2': 'rgba(255, 255, 255, 0.2)',
  '--dsw-alias-state-business-primary': '#d4b06a',
  '--dsw-alias-state-business-tertiary': 'rgba(212, 176, 106, 0.25)',
  '--dsw-alias-state-error-primary': '#c1554a',
  '--dsw-alias-state-error-secondary': 'rgba(193, 85, 74, 0.15)',
  '--dsw-alias-state-success-primary': '#5f9e78',
  '--dsw-alias-state-success-secondary': 'rgba(95, 158, 120, 0.15)',
  '--dsw-alias-state-success-tertiary': 'rgba(95, 158, 120, 0.25)',
  '--dsw-alias-state-warn-label': '#d4a24e',
  '--dsw-alias-state-warn-primary': '#d4a24e',
  '--dsw-alias-state-warn-secondary': 'rgba(212, 162, 78, 0.15)',
  '--dsw-alias-state-warn-tertiary': 'rgba(212, 162, 78, 0.25)',
  '--dsw-alias-toast-bg': '#1a1510',
  '--dsw-alias-tooltip-bg': '#1a1510',
  '--dsw-specific-bubble': 'rgba(255, 255, 255, 0.08)',
  '--dsw-specific-bubble-highlight': '#2a231b',
  '--dsw-specific-input-major': '#1c1712',
  '--dsw-specific-login-input': '#1c1712',
  '--dsw-specific-menu': '#1a1510',
  '--dsw-specific-selector': '#1a1510',
  '--dsw-specific-sidebar-fill': '#0e0b09',
  '--dsw-specific-sidebar-nav-item-active': 'rgba(212, 176, 106, 0.12)',
  '--dsw-specific-sidebar-nav-item-active-accent': '#d4b06a',
  '--dsw-specific-sidebar-nav-item-hover': 'rgba(255, 255, 255, 0.06)',
  '--dsw-specific-tip': '#1c1712',
}

/** 黑神话·悟空皮肤：毛玻璃 + 金边样式。 */
const WUKONG_CSS = [
  ':root { color-scheme: dark !important; }',
  "textarea, input:not([type='checkbox']):not([type='radio']):not([type='range']), button:not([role='tab']):not([class*='brand']) {",
  '  background: rgba(255, 255, 255, 0.08) !important;',
  '  backdrop-filter: blur(12px) saturate(150%);',
  '  border: 1px solid rgba(212, 176, 106, 0.7) !important;',
  '  color: #e7ddc8 !important;',
  '}',
  'textarea {',
  '  background: transparent !important;',
  '  border: none !important;',
  '  backdrop-filter: none !important;',
  '}',
  '[data-composer-card] {',
  '  background-color: rgba(30, 25, 20, 0.55) !important;',
  '  border: 1px solid rgba(212, 176, 106, 0.7) !important;',
  '  backdrop-filter: blur(10px);',
  '}',
  'pre, code {',
  '  background-color: rgba(255, 255, 255, 0.08) !important;',
  '  backdrop-filter: blur(12px);',
  '  color: #d4b06a !important;',
  '  border: 1px solid rgba(212, 176, 106, 0.7) !important;',
  '}',
  'pre code, pre code span, code span {',
  '  background-color: transparent !important;',
  '  color: #d4b06a !important;',
  '}',
  "[class*='bubble'] {",
  '  border: 1px solid rgba(212, 176, 106, 0.7) !important;',
  '}',
].join('\n')

/** 内置皮肤目录（顺序即列表展示顺序）。 */
const BUILTIN_SKINS = Object.freeze([
  Object.freeze({
    id: DEFAULT_SKIN_ID,
    name: '默认皮肤',
    builtin: true,
    version: '1.0.0',
    author: '系统',
    description: '系统原生外观，浅色/深色跟随系统与「外观」设置。',
    colorScheme: 'system',
    tokens: null,
    css: null,
    background: null,
  }),
  Object.freeze({
    id: WUKONG_SKIN_ID,
    name: '黑神话·悟空',
    builtin: true,
    version: '1.0.0',
    author: '社区皮肤',
    description: '黑金配色 + 毛玻璃金边 + 悟空官网视频底纹，参考《黑神话：悟空》。',
    colorScheme: 'dark',
    tokens: WUKONG_TOKENS,
    css: WUKONG_CSS,
    background: Object.freeze({ type: 'video', src: VIDEO_ROUTE, opacity: 0.26, brightness: 2 }),
  }),
  OCTACARBON_SKIN,
  GTRONTEC_SKIN,
])

// ---------------------------------------------------------------------------
// 皮肤文件校验 —— 定义「什么样的 .dshskin 文件可以导入」
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function fail(message) {
  throw new ApiError(400, message)
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value, max = 512) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

/**
 * 校验 tokens 里单个令牌值：只接受 CSS 颜色。
 * @param {string} value
 */
function isColorValue(value) {
  return typeof value === 'string' && value.length <= 128 && COLOR_RE.test(value.trim())
}

/**
 * 校验 background.value 是否匹配其 type。
 * @param {'color'|'gradient'|'image'|'url'|'video'} type
 * @param {unknown} value
 */
function isBackgroundValueValid(type, value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 16 * 1024 * 1024) return false
  switch (type) {
    case 'color':
      return isColorValue(value)
    case 'gradient':
      return /^(linear|radial|conic)-gradient\(/.test(value.trim())
    case 'image':
      return value.startsWith('data:image/')
    case 'url':
      return value.startsWith('https://') || value.startsWith('http://')
    case 'video':
      return value.startsWith('data:video/') || value.startsWith('https://') || value.startsWith('http://')
    default:
      return false
  }
}

/** 是否为「可接受」的 background 类型（用户可导入的；video 通过 data URI 或外部 URL 提供）。 */
const USER_BACKGROUND_TYPES = ['color', 'gradient', 'image', 'url', 'video']

/**
 * 校验一个皮肤文件对象（已 JSON.parse 之后的顶层对象）。
 * 通过则返回一个「净化后的皮肤定义」；否则抛出带中文说明的 ApiError。
 *
 * 规则（即「什么样的皮肤文件可以导入」）：
 * 1. 顶层必须是对象，且 schema === "dsh-skin"、schemaVersion === 1。
 * 2. id 必填且匹配 ^[a-z0-9][a-z0-9-]{0,63}$，且不得与内置/已安装皮肤冲突。
 * 3. name（1~64）、version（语义化 x.y.z）必填；author/description 可选。
 * 4. colorScheme 必填，取值 light 或 dark。
 * 5. tokens（可选）：键以 -- 开头，值必须是 CSS 颜色；不允许注入多值或 url()。
 * 6. css（可选）：字符串，≤ 64KB，且不含危险片段。
 * 7. background（可选）：type ∈ {color, gradient, image, url, video}，value 匹配，
 *    opacity ∈ [0,1]，brightness（可选，仅视频）为正数。
 *
 * @param {unknown} input
 * @param {readonly string[]} takenIds 已占用 id（内置 + 已安装）
 * @returns {object} 净化后的皮肤定义（不含 builtin 标记）
 */
function validateSkin(input, takenIds) {
  if (!isObject(input)) fail('皮肤文件必须是 JSON 对象')
  if (input.schema !== SCHEMA) fail(`schema 必须是 "${SCHEMA}"（当前：${JSON.stringify(input.schema)}）`)
  if (input.schemaVersion !== SCHEMA_VERSION) fail(`schemaVersion 必须是 ${SCHEMA_VERSION}`)

  const id = input.id
  if (typeof id !== 'string' || !ID_RE.test(id)) fail('id 必填，且只能由小写字母/数字开头，后续可含小写字母、数字、连字符，最长 64 字符')
  if (takenIds.includes(id)) fail(`皮肤 id "${id}" 已存在（内置皮肤或已安装皮肤），请更换 id`)

  const name = input.name
  if (!isNonEmptyString(name, 64)) fail('name 必填，为 1~64 字符的字符串')

  const version = input.version
  if (typeof version !== 'string' || !SEMVER_RE.test(version)) fail('version 必填，且必须是语义化版本号（如 1.0.0）')

  const colorScheme = input.colorScheme
  if (colorScheme !== 'light' && colorScheme !== 'dark') fail('colorScheme 必填，取值 light 或 dark')

  // tokens
  let tokens = null
  if (input.tokens !== undefined && input.tokens !== null) {
    if (!isObject(input.tokens)) fail('tokens 必须是对象（键为 --dsw-* 令牌，值为 CSS 颜色）')
    tokens = {}
    for (const [key, value] of Object.entries(input.tokens)) {
      if (typeof key !== 'string' || !key.startsWith('--')) fail(`tokens 的键必须以 "--" 开头（当前：${JSON.stringify(key)}）`)
      if (!isColorValue(value)) fail(`tokens["${key}"] 必须是 CSS 颜色（#hex / rgb() / rgba() / hsl() / hsla() / 颜色关键字），不允许 url() 或多值注入`)
      tokens[key] = value.trim()
    }
  }

  // css
  let css = null
  if (input.css !== undefined && input.css !== null) {
    if (typeof input.css !== 'string') fail('css 必须是字符串')
    if (input.css.length > 64 * 1024) fail('css 不能超过 64KB')
    for (const bad of FORBIDDEN_CSS) {
      if (input.css.toLowerCase().includes(bad)) fail(`css 包含被禁止的内容："${bad}"（禁止引入外部样式或执行脚本）`)
    }
    css = input.css
  }

  // background
  let background = null
  if (input.background !== undefined && input.background !== null) {
    if (!isObject(input.background)) fail('background 必须是对象')
    const type = input.background.type
    if (!USER_BACKGROUND_TYPES.includes(type)) fail(`background.type 必须是 ${USER_BACKGROUND_TYPES.join(' / ')} 之一（当前：${JSON.stringify(type)}）`)
    if (!isBackgroundValueValid(type, input.background.value)) {
      fail('background.value 与其 type 不匹配：color=颜色值；gradient=linear/radial/conic-gradient(...)；image=data:image/...；url=http(s)://...；video=data:video/... 或 http(s):// 视频地址')
    }
    let opacity = 0.3
    if (input.background.opacity !== undefined) {
      if (typeof input.background.opacity !== 'number' || input.background.opacity < 0 || input.background.opacity > 1) {
        fail('background.opacity 必须是 0~1 之间的数字')
      }
      opacity = input.background.opacity
    }
    let brightness
    if (input.background.brightness !== undefined) {
      if (typeof input.background.brightness !== 'number' || input.background.brightness <= 0) {
        fail('background.brightness 必须是正数')
      }
      brightness = input.background.brightness
    }
    background = { type, value: input.background.value, opacity, ...(brightness === undefined ? {} : { brightness }) }
  }

  return {
    id,
    name: name.trim(),
    version,
    author: typeof input.author === 'string' && input.author.length <= 64 ? input.author : '',
    description: typeof input.description === 'string' && input.description.length <= 512 ? input.description : '',
    colorScheme,
    tokens,
    css,
    background,
  }
}

// ---------------------------------------------------------------------------
// 存储（$DSH_HOME/profiles/skins/）
// ---------------------------------------------------------------------------

/** index.json 的默认形态。 */
function emptyIndex() {
  return { active: DEFAULT_SKIN_ID, installed: [] }
}

/** 读取 index.json（不存在则视为空）。 */
function readIndex() {
  try {
    if (!existsSync(INDEX_PATH)) return emptyIndex()
    const parsed = JSON.parse(readFileSync(INDEX_PATH, 'utf8'))
    const active = typeof parsed.active === 'string' ? parsed.active : DEFAULT_SKIN_ID
    const installed = Array.isArray(parsed.installed) ? parsed.installed.filter((x) => typeof x === 'string') : []
    return { active, installed }
  } catch {
    return emptyIndex()
  }
}

function writeIndex(index) {
  mkdirSync(SKINS_DIR, { recursive: true })
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8')
}

/** 读取某个已导入皮肤的 manifest。 */
function readInstalledManifest(id) {
  try {
    const raw = readFileSync(join(SKINS_DIR, id, 'manifest.json'), 'utf8')
    const parsed = JSON.parse(raw)
    return isObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** 已占用 id：内置 + 已安装。 */
function takenIds(index) {
  return [...BUILTIN_SKINS.map((s) => s.id), ...index.installed]
}

/** 合并出「给客户端的完整皮肤目录」。 */
function buildCatalog(index) {
  const installed = []
  for (const id of index.installed) {
    const manifest = readInstalledManifest(id)
    if (manifest !== null) installed.push({ ...manifest, builtin: false })
  }
  return { active: index.active, skins: [...BUILTIN_SKINS, ...installed] }
}

/** 判断一个皮肤 id 是否已知（内置或已安装）。 */
function isKnownSkinId(index, id) {
  return BUILTIN_SKINS.some((s) => s.id === id) || index.installed.includes(id)
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
        reject(new ApiError(413, '请求体过大（皮肤文件含资源时不超过 16MB）'))
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
// API 分发
// ---------------------------------------------------------------------------

async function dispatch(req, res) {
  const pathname = new URL(req.url ?? '/', 'http://x').pathname
  const sub = pathname.slice(API_PREFIX.length).replace(/^\/+/, '')
  const method = req.method ?? 'GET'

  if (method === 'GET' && (sub === '' || sub === 'state')) {
    sendJson(res, 200, { ok: true, ...buildCatalog(readIndex()) })
    return
  }

  const body = await readJsonBody(req)

  if (method === 'POST' && sub === 'install') {
    const index = readIndex()
    const skin = validateSkin(body.skin ?? body, takenIds(index))
    const dir = join(SKINS_DIR, skin.id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(skin, null, 2), 'utf8')
    const installed = index.installed.includes(skin.id) ? index.installed : [...index.installed, skin.id]
    writeIndex({ ...index, installed })
    sendJson(res, 200, { ok: true, ...buildCatalog(readIndex()) })
    return
  }

  if (method === 'POST' && sub === 'uninstall') {
    const id = body.id
    if (typeof id !== 'string' || id.length === 0) throw new ApiError(400, '缺少要卸载的皮肤 id')
    const index = readIndex()
    if (!index.installed.includes(id)) throw new ApiError(404, `皮肤 "${id}" 不是已导入皮肤（内置皮肤不可卸载）`)
    const installed = index.installed.filter((x) => x !== id)
    const next = { ...index, installed, ...(index.active === id ? { active: DEFAULT_SKIN_ID } : {}) }
    writeIndex(next)
    try {
      rmSync(join(SKINS_DIR, id), { recursive: true, force: true })
    } catch {
      // 目录删除失败不阻塞卸载记录。
    }
    sendJson(res, 200, { ok: true, ...buildCatalog(readIndex()) })
    return
  }

  if (method === 'POST' && sub === 'select') {
    const id = body.id
    if (typeof id !== 'string' || id.length === 0) throw new ApiError(400, '缺少要选择的皮肤 id')
    const index = readIndex()
    if (!isKnownSkinId(index, id)) throw new ApiError(404, `皮肤 "${id}" 不存在`)
    writeIndex({ ...index, active: id })
    sendJson(res, 200, { ok: true, ...buildCatalog(readIndex()) })
    return
  }

  throw new ApiError(404, `未知接口：${method} ${sub}`)
}

// ---------------------------------------------------------------------------
// 插件入口
// ---------------------------------------------------------------------------

function apply(ctx) {
  ctx.inject(['webServer'], (httpCtx) => {
    for (const [brand, assets] of [['octacarbon', OCTACARBON_ASSETS], ['gtrontec', GTRONTEC_ASSETS]]) {
      for (const [file, contentType] of Object.entries(assets)) {
        const assetPath = join(PLUGIN_ROOT, 'assets', brand, file)
        httpCtx.effect(() => httpCtx.webServer.register({
          kind: 'exact',
          path: `/dsh-skin-manager/${brand}/${file}`,
          handler: (req, res) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return
            }
            try {
              const bytes = readFileSync(assetPath)
              res.writeHead(200, {
                'Content-Type': contentType, 'Content-Length': bytes.length,
                'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
              })
              res.end(req.method === 'HEAD' ? undefined : bytes)
            } catch { res.writeHead(404); res.end() }
          },
        }), `skin-manager: ${brand} ${file}`)
      }
    }
    // 内置视频资源路由（黑神话·悟空背景）。
    httpCtx.effect(() => httpCtx.webServer.register({
      kind: 'exact',
      path: VIDEO_ROUTE,
      handler: (req, res) => {
        try {
          const stat = statSync(VIDEO_PATH)
          res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache',
          })
          createReadStream(VIDEO_PATH).pipe(res)
        } catch {
          res.writeHead(404)
          res.end()
        }
      },
    }), 'dsh-skin-manager: wukong video route')

    // 皮肤管理 HTTP API。
    httpCtx.effect(() => httpCtx.webServer.register({
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
          httpCtx.logger?.warn?.('dsh-skin-manager: %s', message)
          sendJson(res, 500, { ok: false, error: message })
        }
      },
    }), 'dsh-skin-manager: skin API')
  })
}

export { apply, validateSkin, WUKONG_TOKENS, WUKONG_CSS, BUILTIN_SKINS }
