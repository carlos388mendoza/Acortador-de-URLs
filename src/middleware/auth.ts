import { eq } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { getDb, schema } from '../db'
import { readSessionUserId, SESSION_COOKIE } from '../lib/auth'
import { toUser, type PublicUser } from '../lib/serializers'

export type AuthEnv = { Variables: { user: PublicUser } }

/** Exige sesión válida. Vuelve a leer al usuario de la BD para que borrarlo o cambiarle el rol surta efecto de inmediato. */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  const userId = token ? await readSessionUserId(token) : null
  if (userId === null) return c.json({ error: 'No autenticado' }, 401)

  const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  if (!row) return c.json({ error: 'No autenticado' }, 401)

  c.set('user', toUser(row))
  await next()
})

/** Debe usarse después de requireAuth. */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.get('user').role !== 'admin') return c.json({ error: 'No autorizado' }, 403)
  await next()
})
