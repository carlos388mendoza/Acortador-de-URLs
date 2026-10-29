// Build de la raíz: bundle del backend, compila el dashboard y revisa tipos del backend.
// Portable: no usa rutas como ./node_modules/.bin/... ni sintaxis propia de un shell concreto,
// así funciona igual en Windows (PowerShell y cmd), macOS, Linux y Vercel.
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

function exec(label, file, args, options = {}) {
  console.log(`\n> ${label}`)
  const result = spawnSync(file, args, { stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// Ejecuta un script de Node con el mismo Node que corre este archivo
const node = (label, args, options) => exec(label, process.execPath, args, options)

// npm es un .cmd en Windows, por eso necesita shell; los argumentos son fijos, sin datos externos
const npm = (label, args, options) => exec(label, 'npm', args, { shell: true, ...options })

// Bundle del backend en un solo archivo para Vercel (evita problemas de resolución de módulos)
node('node scripts/bundle.mjs', ['scripts/bundle.mjs'])

if (existsSync('dashboard/package.json')) {
  rmSync('public', { recursive: true, force: true })
  npm('npm install --prefix dashboard --include=dev --no-save', [
    'install',
    '--prefix',
    'dashboard',
    '--include=dev',
    '--no-save',
  ])
  // Vite se localiza con la resolución de Node desde dashboard/ y se ejecuta con process.execPath
  const require = createRequire(`${process.cwd()}/dashboard/package.json`)
  const vitePackagePath = require.resolve('vite/package.json')
  const viteBinField = require(vitePackagePath).bin
  const viteBin = join(dirname(vitePackagePath), typeof viteBinField === 'string' ? viteBinField : viteBinField.vite)
  node('vite build --outDir ../public/dashboard (en dashboard/)', [viteBin, 'build', '--outDir', '../public/dashboard'], {
    cwd: 'dashboard',
  })
} else {
  console.log('dashboard/ todavía no existe: se omite la compilación del dashboard')
}

if (process.env.VERCEL !== '1' && process.env.SKIP_TYPECHECK !== '1') {
  npm('npm run typecheck', ['run', 'typecheck'])
} else {
  console.log('Omitiendo typecheck en Vercel (se ejecuta en CI)')
}
