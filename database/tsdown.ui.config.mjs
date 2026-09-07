import { fileURLToPath } from 'node:url'

const packageRoot = fileURLToPath(new URL('.', import.meta.url))

export default {
  name: '@deepseek-ai/dsh-database-connections/client',
  entry: { client: `${packageRoot}src/client/index.tsx` },
  outDir: `${packageRoot}lib`,
  format: ['cjs'],
  platform: 'browser',
  target: ['es2022'],
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: (specifier) => [
      'react',
      'react/jsx-runtime',
      '@deepseek-ai/dsh-client-ui-primitives',
    ].includes(specifier),
    alwaysBundle: (specifier) => ![
      'react',
      'react/jsx-runtime',
      '@deepseek-ai/dsh-client-ui-primitives',
    ].includes(specifier),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "@deepseek-ai/dsh-database-connections", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}
