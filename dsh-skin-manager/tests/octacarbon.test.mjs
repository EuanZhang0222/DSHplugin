import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validateSkin, BUILTIN_SKINS, apply } from '../lib/index.js'
import { OCTACARBON_TOKENS } from '../lib/octacarbon.js'
import { GTRONTEC_TOKENS } from '../lib/gtrontec.js'

const requireRuntime = createRequire(pathToFileURL(process.env.HARNESS_ROOT || 'C:/APP/deepseek/deepseek-harness/package.json'))
const { JSDOM } = requireRuntime('jsdom')
const React = createRequire(requireRuntime.resolve('./apps/web/package.json'))('react')
const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
function runtime() {
  const dom = new JSDOM('<!doctype html><html><head><title>DeepSeek Harness</title><link rel="icon" type="image/png" href="/old.png"></head><body><div data-phase="hero"><span class="headlineText_a">探索未至之境</span><span class="previewBadge_a">预览版</span></div><p id="message">DeepSeek Harness DSH 探索未知之境</p><textarea>DSH</textarea></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' })
  let exported
  dom.window.__ModuleLoader__ = { load: ({ factory }) => { exported = factory(() => React) } }
  dom.window.eval(source.replace('exports.apply = apply;', 'exports.applyBrand = applyBrand; exports.BRANDS = BRANDS; exports.replaceProductTitle = replaceProductTitle; exports.createManager = createManager; exports.apply = apply;'))
  const entries = new Map(), subscribers = new Map(), tokens = new Map()
  const ctx = { slots: {
    spec: () => ({}),
    subscribe: (name, fn) => { subscribers.set(name, fn); return () => subscribers.delete(name) },
    register: (options, component) => { assert.ok(!entries.has(options.name)); entries.set(options.name, { options, component }); return () => entries.delete(options.name) },
  }, theme: { overrideTokens: (id, values) => { tokens.set(id, values); return () => tokens.delete(id) } } }
  return { dom, api: exported, ctx, entries, subscribers, tokens, document: dom.window.document }
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

test('保留原有三款皮肤并新增格创东智，所有标识唯一', () => {
  assert.deepEqual(BUILTIN_SKINS.map(s => s.id), ['default', 'wukong', 'octacarbon', 'gtrontec'])
  for (const skin of BUILTIN_SKINS.slice(2)) {
    assert.equal(skin.colorScheme, 'light')
    assert.equal(skin.background, null)
    assert.throws(() => validateSkin({ schema: 'dsh-skin', schemaVersion: 1, id: skin.id }, BUILTIN_SKINS.map(s => s.id)), /已存在/)
  }
})
test('原有皮肤导入格式保持兼容，品牌字段不能由导入文件注入', () => {
  const ocean = JSON.parse(readFileSync(new URL('../examples/ocean-blue.dshskin', import.meta.url)))
  const result = validateSkin({ ...ocean, branding: { script: 'unsafe' }, builtin: true }, [])
  assert.equal(result.id, 'ocean-blue')
  assert.equal(result.builtin, undefined)
  assert.equal(result.branding, undefined)
  assert.throws(() => validateSkin({ ...ocean, css: '@import "https://x"' }, []), /禁止/)
})
test('两套品牌令牌通过原校验器，主色和白色按钮文字对比度达标', () => {
  const lum = hex => { const a = hex.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return a[0] * .2126 + a[1] * .7152 + a[2] * .0722 }
  for (const [tokens, primary] of [[OCTACARBON_TOKENS, '#0e1adf'], [GTRONTEC_TOKENS, '#292dcd']]) {
    validateSkin({ schema: 'dsh-skin', schemaVersion: 1, id: 'blue-test', name: '测试', version: '1.0.0', colorScheme: 'light', tokens }, [])
    assert.equal(tokens['--dsw-alias-brand-primary'], primary)
    for (const [fg, bg] of [['#ffffff', primary], ['#17254b', '#f8faff'], ['#526185', '#f0f4ff']]) {
      const values = [lum(fg), lum(bg)].sort((a, b) => b - a)
      assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5)
    }
  }
})
test('资源路由固定路径，支持 GET/HEAD，拒绝写操作', () => {
  const routes = []
  const ctx = { inject: (_, fn) => fn({ effect: fn => fn(), webServer: { register: route => { routes.push(route); return () => {} } } }) }
  apply(ctx)
  const assets = routes.filter(r => r.path.includes('/octacarbon/') || r.path.includes('/gtrontec/'))
  assert.equal(assets.length, 7)
  assert.equal(new Set(assets.map(r => r.path)).size, 7)
  for (const route of assets) {
    const res = { writeHead(status, headers) { this.status = status; this.headers = headers }, end(body) { this.body = body } }
    route.handler({ method: 'GET' }, res)
    assert.equal(res.status, 200); assert.ok(res.body.length > 100)
    assert.equal(res.headers['X-Content-Type-Options'], 'nosniff')
    route.handler({ method: 'HEAD' }, res); assert.equal(res.status, 200); assert.equal(res.body, undefined)
    route.handler({ method: 'POST' }, res); assert.equal(res.status, 405)
  }
})
for (const brandId of ['octacarbon', 'gtrontec']) {
const productName = brandId === 'gtrontec' ? 'Gtrontec Harness' : 'OCTACARBON Harness'
const welcomeText = brandId === 'gtrontec' ? '欢迎使用能碳大脑' : '欢迎使用章鱼AI能碳大脑'
test(`${brandId} 底纹在正文下方，不捕获鼠标，不在全页浮层上绘制`, () => {
  const css = BUILTIN_SKINS.find(s => s.id === brandId).css
  assert.match(css, /background-image: linear-gradient/)
  assert.match(css, /\[data-phase\]:has\(> \[data-conversation-scroll\]\)/)
  assert.match(css, /0\.955/)
  assert.ok(!/isolation:|z-index:|position: (fixed|absolute|relative)/.test(css))
  assert.match(css, /\[data-composer-card\][\s\S]*?background: #fff/)
  assert.ok(!/https?:\/\//.test(css))
})
test(`${brandId} 品牌插槽、欢迎语、标签页图标同步启用，撤销完整恢复`, async () => {
  const r = runtime(), before = r.document.body.innerHTML
  const off = r.api.applyBrand(r.ctx, r.api.BRANDS[brandId])
  assert.equal(r.entries.size, 4)
  assert.ok([...r.entries.values()].every(e => e.options.priority === -1000))
  assert.equal(r.document.title, productName)
  assert.equal(r.document.querySelector('[class*=headlineText]').textContent, welcomeText)
  assert.ok(r.document.querySelector('link').href.endsWith(`${brandId}/favicon.svg`))
  off(); await tick()
  assert.equal(r.document.title, 'DeepSeek Harness')
  assert.equal(r.document.body.innerHTML, before)
  assert.equal(r.document.querySelector('link').getAttribute('href'), '/old.png')
  assert.equal(r.document.querySelector('link').type, 'image/png')
  assert.equal(r.entries.size, 0); assert.equal(r.subscribers.size, 0)
  assert.equal(r.document.documentElement.hasAttribute(`data-${brandId}`), false)
  r.dom.window.close()
})
test(`${brandId} 语言和会话变化后持续替换，保留真实消息与模型相关文字`, async () => {
  const r = runtime(), off = r.api.applyBrand(r.ctx, r.api.BRANDS[brandId])
  const el = r.document.querySelector('[class*=headlineText]')
  el.firstChild.nodeValue = 'Explore the unknown'
  r.document.title = '测试会话 — DSH Local Build'
  await tick()
  assert.equal(el.textContent, welcomeText)
  assert.equal(r.document.title, '测试会话 — ' + productName)
  assert.equal(r.document.getElementById('message').textContent, 'DeepSeek Harness DSH 探索未知之境')
  assert.equal(r.document.querySelector('textarea').value, 'DSH')
  off(); assert.equal(el.textContent, 'Explore the unknown'); assert.equal(r.document.title, '测试会话 — DSH Local Build')
  r.dom.window.close()
})
test(`${brandId} 新增欢迎节点和反复启停均无残留`, async () => {
  const r = runtime()
  for (let i = 0; i < 3; i++) {
    const off = r.api.applyBrand(r.ctx, r.api.BRANDS[brandId])
    const span = r.document.createElement('span'); span.className = 'headlineText_new'; span.textContent = '探索未知之境'
    r.document.querySelector('[data-phase]').append(span)
    await tick(); assert.equal(span.textContent, welcomeText)
    off(); assert.equal(span.textContent, '探索未知之境'); span.remove()
    assert.equal(r.entries.size, 0)
  }
  r.dom.window.close()
})
}
test('标题只替换产品后缀，不篡改会话名称', () => {
  const r = runtime()
  assert.equal(r.api.replaceProductTitle('关于 DSH — DeepSeek Harness'), '关于 DSH — OCTACARBON Harness')
  assert.equal(r.api.replaceProductTitle('关于 OCTACARBON Harness — DSH', 'Gtrontec Harness'), '关于 OCTACARBON Harness — Gtrontec Harness')
  assert.equal(r.api.replaceProductTitle('业务标题含 Gtrontec Harness', 'Gtrontec Harness'), '业务标题含 Gtrontec Harness')
  assert.equal(r.api.replaceProductTitle('普通业务文档'), '普通业务文档')
  r.dom.window.close()
})
test('管理器销毁后未完成的加载不能重新启用皮肤', async () => {
  const r = runtime(); let resolve
  r.dom.window.fetch = () => new Promise(done => { resolve = done })
  const manager = r.api.createManager(r.ctx), pending = manager.load()
  manager.dispose(); resolve({ json: async () => ({ ok: true, skins: BUILTIN_SKINS, active: 'octacarbon' }) })
  await pending; assert.equal(r.entries.size, 0); assert.equal(r.tokens.size, 0)
  r.dom.window.close()
})
test('管理器反复切换释放品牌和颜色覆盖，晚到响应不会复活已销毁实例', async () => {
  const r = runtime()
  r.dom.window.fetch = async (_, options) => ({ json: async () => ({ ok: true, skins: BUILTIN_SKINS, active: options ? JSON.parse(options.body).id : 'octacarbon' }) })
  const manager = r.api.createManager(r.ctx)
  await manager.load(); assert.equal(r.entries.size, 4); assert.equal(r.tokens.size, 1)
  await manager.select('default'); assert.equal(r.entries.size, 0); assert.equal(r.tokens.size, 0)
  await manager.select('wukong'); assert.equal(r.entries.size, 0); assert.equal(r.tokens.size, 1)
  await manager.select('octacarbon'); assert.equal(r.entries.size, 4)
  for (const [id, title] of [['gtrontec', 'Gtrontec Harness'], ['octacarbon', 'OCTACARBON Harness'], ['gtrontec', 'Gtrontec Harness']]) {
    await manager.select(id); await tick()
    assert.equal(r.entries.size, 4); assert.equal(r.tokens.size, 1)
    assert.equal(r.document.title, title)
    assert.equal(r.document.querySelector('[class*=headlineText]').textContent, id === 'octacarbon' ? '欢迎使用章鱼AI能碳大脑' : '欢迎使用能碳大脑')
    assert.equal(r.document.documentElement.hasAttribute('data-' + id), true)
    assert.equal(r.document.documentElement.hasAttribute('data-' + (id === 'gtrontec' ? 'octacarbon' : 'gtrontec')), false)
    assert.ok(r.document.querySelector('link').href.endsWith(id + '/favicon.svg'))
    assert.equal(r.document.querySelectorAll('style[data-dsh-skin]').length, 1)
  }
  let resolve
  r.dom.window.fetch = () => new Promise(done => { resolve = done })
  const pending = manager.select('octacarbon')
  manager.dispose(); resolve({ json: async () => ({ ok: true, skins: BUILTIN_SKINS, active: 'octacarbon' }) })
  await pending; assert.equal(r.entries.size, 0); assert.equal(r.tokens.size, 0)
  assert.equal(r.document.querySelectorAll('style[data-dsh-skin]').length, 0)
  r.dom.window.close()
})
test('打包白名单包含新增模块、所有图片、样式和文档', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
  assert.ok(pkg.files.includes('lib/*.js')); assert.ok(pkg.files.includes('assets/'))
  for (const file of ['logo-en.png', 'logo-zh.png', 'logo-combined.png', 'favicon.svg', 'theme.css']) assert.ok(existsSync(fileURLToPath(new URL('../assets/octacarbon/' + file, import.meta.url))))
  for (const file of ['logo-en.png', 'logo-zh.png', 'favicon.svg', 'theme.css']) assert.ok(existsSync(fileURLToPath(new URL('../assets/gtrontec/' + file, import.meta.url))))
  const favicon = readFileSync(new URL('../assets/gtrontec/favicon.svg', import.meta.url), 'utf8')
  const embedded = favicon.match(/data:image\/png;base64,([^"\s]+)/)[1]
  assert.deepEqual(Buffer.from(embedded, 'base64'), readFileSync(new URL('../assets/gtrontec/logo-zh.png', import.meta.url)))
  assert.match(favicon, /viewBox="0 225 184 184"/)
})
