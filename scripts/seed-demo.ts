import { eq, like } from 'drizzle-orm'
import { getDb, schema } from '../src/db'
import { hashPassword } from '../src/lib/auth'

const db = getDb()

// Datos de ejemplo para que las gráficas del dashboard tengan algo que mostrar. Se puede ejecutar varias veces:
// borra las URLs "demo-*" anteriores (sus clics se borran en cascada) y las vuelve a crear.
const DEMO_PREFIX = 'demo-'
const DAYS = 30

const REFERRERS = [
  'https://www.google.com/',
  'https://twitter.com/',
  'https://www.facebook.com/',
  'https://www.linkedin.com/',
  'https://news.ycombinator.com/',
  null,
  null,
]
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
]

const DEMO_USERS = [
  { name: 'Ana Demo', email: 'ana.demo@example.com' },
  { name: 'Luis Demo', email: 'luis.demo@example.com' },
]

const DEMO_URLS = [
  ['docs', 'https://developer.mozilla.org/es/docs/Web'],
  ['blog', 'https://example.com/blog/como-acortar-urls'],
  ['promo', 'https://example.com/promociones/verano'],
  ['curso', 'https://example.com/cursos/typescript'],
  ['repo', 'https://github.com/honojs/hono'],
  ['video', 'https://example.com/videos/presentacion'],
  ['menu', 'https://example.com/restaurante/menu'],
  ['form', 'https://example.com/formulario/contacto'],
  ['noticia', 'https://example.com/noticias/lanzamiento'],
  ['tienda', 'https://example.com/tienda/ofertas'],
  ['cv', 'https://example.com/portafolio/cv'],
  ['mapa', 'https://example.com/ubicacion/mapa'],
] as const

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T

// Los usuarios demo reciben una contraseña aleatoria que no se muestra: no están pensados para iniciar sesión
async function ensureUser(name: string, email: string): Promise<number> {
  const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  await db
    .insert(schema.users)
    .values({ name, email, passwordHash: await hashPassword(randomPassword), role: 'user' })
    .onConflictDoNothing({ target: schema.users.email })
  const [row] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1)
  if (!row) throw new Error(`No se pudo crear el usuario ${email}`)
  return row.id
}

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const [admin] = adminEmail
  ? await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, adminEmail)).limit(1)
  : []
if (!admin) {
  console.error('No existe el admin. Ejecuta primero: npm run seed:admin')
  process.exit(1)
}

const ownerIds = [admin.id, ...(await Promise.all(DEMO_USERS.map((u) => ensureUser(u.name, u.email))))]

await db.delete(schema.urls).where(like(schema.urls.code, `${DEMO_PREFIX}%`))

let totalClicks = 0
for (const [index, [slug, url]] of DEMO_URLS.entries()) {
  const [created] = await db
    .insert(schema.urls)
    .values({
      code: `${DEMO_PREFIX}${slug}`,
      url,
      userId: ownerIds[index % ownerIds.length] ?? admin.id,
      // Se reparten las fechas de creación en el último mes
      createdAt: new Date(Date.now() - Math.floor(Math.random() * DAYS) * 86_400_000),
    })
    .returning({ id: schema.urls.id })
  if (!created) continue

  // Las primeras URLs tienen más tráfico, para que "top URLs" tenga un ranking interesante
  const clickCount = Math.max(5, Math.floor(Math.random() * 40) + (DEMO_URLS.length - index) * 8)
  const rows = Array.from({ length: clickCount }, () => ({
    urlId: created.id,
    clickedAt: new Date(Date.now() - Math.floor(Math.random() * DAYS * 86_400_000)),
    referrer: pick(REFERRERS),
    userAgent: pick(USER_AGENTS),
  }))
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(schema.clicks).values(rows.slice(i, i + 200))
  }
  await db.update(schema.urls).set({ clickCount }).where(eq(schema.urls.id, created.id))
  totalClicks += clickCount
}

console.log(`Datos de prueba listos: ${DEMO_URLS.length} URLs, ${totalClicks} clics, ${DEMO_USERS.length} usuarios demo`)
