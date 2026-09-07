import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = process.argv[2]
if (!source) throw new Error('请提供 2026 格创东智 LOGO 文件夹路径')
const target = fileURLToPath(new URL('../assets/gtrontec/', import.meta.url))
mkdirSync(target, { recursive: true })
for (const [original, filename] of [
  ['2026LOGO 海外版/Gtrontec.png', 'logo-en.png'],
  ['2026LOGO 中国版/格创东智LOGO 2026.png', 'logo-zh.png'],
]) copyFileSync(resolve(source, original), resolve(target, filename))
const png = readFileSync(resolve(target, 'logo-zh.png')).toString('base64')
// 884×409 原图的 G 图形位于左下方；SVG 视窗截取图形，不更改 PNG 字节。
// 右边界 184 在下一个字母 t（x=201）之前，顶部 225 位于中文字下方。
writeFileSync(resolve(target, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 200 200"><svg width="184" height="184" viewBox="0 225 184 184" overflow="hidden"><image width="884" height="409" href="data:image/png;base64,${png}"/></svg></svg>\n`)
console.log('已复制 2 张原始 PNG，生成自包含 G 图形标签图标；原始图片未改动。')
