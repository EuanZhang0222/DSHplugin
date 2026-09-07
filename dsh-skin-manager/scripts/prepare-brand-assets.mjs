import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = process.argv[2]
if (!source) throw new Error('请提供能碳章鱼原始 PNG 文件夹路径')
const target = fileURLToPath(new URL('../assets/octacarbon/', import.meta.url))
mkdirSync(target, { recursive: true })
for (const [original, filename] of [
  ['蓝色能碳章鱼英文logo.png', 'logo-en.png'],
  ['蓝色能碳章鱼中文logo.png', 'logo-zh.png'],
  ['蓝色组合logo（上中下英）.png', 'logo-combined.png'],
]) copyFileSync(resolve(source, original), resolve(target, filename))
const png = readFileSync(resolve(target, 'logo-en.png')).toString('base64')
// SVG 仅封装原始图片及裁切视窗，未重新绘制或修改品牌像素。
writeFileSync(resolve(target, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 0 260 260"><svg width="210" height="260" overflow="hidden"><image width="1847" height="260" href="data:image/png;base64,${png}"/></svg></svg>\n`)
console.log('已复制 3 张原始 PNG，生成自包含浏览器标签图标。')
