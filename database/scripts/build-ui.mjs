import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import config from '../tsdown.ui.config.mjs'

const harnessRoot = process.env.DSH_HARNESS_ROOT || 'C:\\APP\\deepseek\\deepseek-harness'
const tsdownUrl = pathToFileURL(join(harnessRoot, 'node_modules', 'tsdown', 'dist', 'index.mjs')).href
const { buildWithConfigs, resolveUserConfig } = await import(tsdownUrl)

const deps = new Set()
const resolved = await resolveUserConfig(config, { cwd: process.cwd() }, deps)
await buildWithConfigs(resolved, deps, () => {})
