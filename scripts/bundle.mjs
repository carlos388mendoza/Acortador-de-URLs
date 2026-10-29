import { build } from 'esbuild'
import { execSync } from 'node:child_process'

// Regenerar el contenido embebido del SKILL a partir del archivo fuente
execSync('node scripts/gen-skill-content.cjs', { stdio: 'inherit' })

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
