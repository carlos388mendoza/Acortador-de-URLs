import { getDb, schema } from '../src/db'
import { hashPassword } from '../src/lib/auth'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  console.error('Faltan ADMIN_EMAIL o ADMIN_PASSWORD en .env')
  process.exit(1)
}

// Crea el admin o, si el correo ya existe, actualiza su contraseña y lo deja como admin
const [admin] = await getDb()
  .insert(schema.users)
  .values({ name: 'Administrador', email, passwordHash: await hashPassword(password), role: 'admin' })
  .onConflictDoUpdate({
    target: schema.users.email,
    set: { passwordHash: await hashPassword(password), role: 'admin', updatedAt: new Date() },
  })
  .returning({ id: schema.users.id })

console.log(`Admin listo (id ${admin?.id ?? '?'})`)
