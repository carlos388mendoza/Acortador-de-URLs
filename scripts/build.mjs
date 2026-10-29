// Build de la raíz: bundle del backend, compila el dashboard y revisa tipos del backend.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

function run(command) {
  console.log(`\n> ${command}`)
  const result = spawnSync(command, { stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// Bundle del backend en un solo archivo para Vercel (evita problemas de resolución de módulos)
run('node scripts/bundle.mjs')

if (existsSync('dashboard/package.json')) {
  run('node -e "require(\'fs\').rmSync(\'public\',{recursive:true,force:true})"')
  run('npm install --prefix dashboard --include=dev --no-save')
  run('cd dashboard && ./node_modules/.bin/vite build --outDir ../public/dashboard')
} else {
  console.log('dashboard/ todavía no existe: se omite la compilación del dashboard')
}

if (process.env.VERCEL !== '1' && process.env.SKIP_TYPECHECK !== '1') {
  run('npm run typecheck')
} else {
  console.log('Omitiendo typecheck en Vercel (se ejecuta en CI)')
}
