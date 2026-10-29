// Build de la raíz: compila el dashboard (si existe) hacia public/dashboard y luego revisa los tipos del backend.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

function run(command) {
  console.log(`\n> ${command}`)
  const result = spawnSync(command, { stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (existsSync('dashboard/package.json')) {
  run('npm install --prefix dashboard')
  // El destino se fuerza desde aquí para no depender de la configuración de Vite del dashboard
  run('npm run build --prefix dashboard -- --outDir ../public/dashboard --emptyOutDir')
} else {
  console.log('dashboard/ todavía no existe: se omite la compilación del dashboard')
}

run('npm run typecheck')
