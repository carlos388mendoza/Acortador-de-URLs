// Build de la raíz: compila el dashboard (si existe) hacia public/dashboard y luego revisa los tipos del backend.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

function run(command) {
  console.log(`\n> ${command}`)
  const result = spawnSync(command, { stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (existsSync('dashboard/package.json')) {
  run('npm install --prefix dashboard --include=dev --no-save')
  // Se invoca vite directamente para no depender de tsc (los tipos se validan en CI/local)
  run('rm -rf public/dashboard')
  run('cd dashboard && ./node_modules/.bin/vite build --outDir ../public/dashboard')
} else {
  console.log('dashboard/ todavía no existe: se omite la compilación del dashboard')
}

if (process.env.VERCEL !== '1' && process.env.SKIP_TYPECHECK !== '1') {
  run('npm run typecheck')
} else {
  console.log('Omitiendo typecheck en Vercel (se ejecuta en CI)')
}
