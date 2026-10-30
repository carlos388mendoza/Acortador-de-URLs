import { and, eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import { getDb, schema } from '../db'
import { hashApiKey } from '../lib/api-keys'
import { checkRateLimit, invalidApiKeyLimit, sendRateLimited } from '../lib/rate-limit'
import { getClientIp } from '../lib/request'

export type ApiKeyEnv = { Variables: { apiKey: { id: number; userId: number } } }

/** null = la cabecera no vino; '' = vino pero sin una clave utilizable. */
function keyFromAuthorization(header: string | undefined): string | null {
  if (header === undefined || header.trim() === '') return null
  return /^Bearer\s+(\S+)$/i.exec(header.trim())?.[1] ?? ''
}

/**
 * Exige una API key activa en `x-api-key: sk_...` o `Authorization: Bearer sk_...`.
 * Va antes de los validadores, así una petición sin clave recibe 401 aunque el body sea inválido.
 */
export const requireApiKey = createMiddleware<ApiKeyEnv>(async (c, next) => {
  const fromHeader = c.req.header('x-api-key')?.trim() || null
  const fromAuthorization = keyFromAuthorization(c.req.header('authorization'))
  if (fromHeader === null && fromAuthorization === null) {
    return c.json({ error: 'API key requerida' }, 401)
  }

  // Si vienen las dos cabeceras deben traer la misma clave; si no, la petición es ambigua
  const key = fromHeader ?? fromAuthorization
  const consistent = fromHeader === null || fromAuthorization === null || fromHeader === fromAuthorization

  const db = getDb()
  const [found] =
    key && consistent
      ? await db
          .select({ id: schema.apiKeys.id, userId: schema.apiKeys.userId })
          .from(schema.apiKeys)
          .where(and(eq(schema.apiKeys.keyHash, await hashApiKey(key)), eq(schema.apiKeys.isActive, true)))
          .limit(1)
      : []

  if (!found) {
    // Las claves inválidas consumen un cupo por IP: así no se pueden probar claves al azar sin límite
    const limited = await checkRateLimit(`apikey:invalid:ip:${getClientIp(c)}`, invalidApiKeyLimit())
    if (!limited.allowed) return sendRateLimited(c, limited.retryAfter)
    return c.json({ error: 'API key inválida' }, 401)
  }

  await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, found.id))
  c.set('apiKey', found)
  await next()
})
