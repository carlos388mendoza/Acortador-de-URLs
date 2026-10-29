import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: 'api/index.js',
  external: [],
  sourcemap: false,
  logLevel: 'info',
})
console.log('Bundle generado en api/index.js')
