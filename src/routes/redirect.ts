import { waitUntil } from '@vercel/functions'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb, schema } from '../db'
import { shortLinkNotFound } from '../lib/not-found-page'
import { isReservedCode } from '../lib/utils'

export const redirectRouter = new Hono()

redirectRouter.get('/:code', async (c) => {
  const code = c.req.param('code')
  if (isReservedCode(code)) return shortLinkNotFound(c)

  const db = getDb()
  const [row] = await db
    .select({ id: schema.urls.id, url: schema.urls.url })
    .from(schema.urls)
    .where(and(eq(schema.urls.code, code), isNull(schema.urls.deletedAt)))
    .limit(1)
  if (!row) return shortLinkNotFound(c)

  // El clic se registra en segundo plano: el usuario no espera a la base de datos
  const referrer = c.req.header('referer') ?? null
  const userAgent = c.req.header('user-agent') ?? null
  waitUntil(
    Promise.all([
      db.insert(schema.clicks).values({ urlId: row.id, referrer, userAgent }),
      db
        .update(schema.urls)
        .set({ clickCount: sql`${schema.urls.clickCount} + 1` })
        .where(eq(schema.urls.id, row.id)),
    ]).catch((err: unknown) => console.error('No se pudo registrar el clic', err)),
  )

  return c.redirect(row.url, 302)
})
