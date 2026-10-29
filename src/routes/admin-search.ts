import { createRoute, z } from '@hono/zod-openapi'
import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { likePattern } from '../lib/pagination'
import { createRouter } from '../lib/router'
import { AdminUrlSchema, ApiKeySchema, errorResponse, UserSchema } from '../lib/schemas'
import { creatorColumns, toAdminUrl, toApiKey, toCreator, toUser } from '../lib/serializers'
import { requireAuth, type AuthEnv } from '../middleware/auth'

const SearchQuery = z.object({
  q: z
    .string({ error: 'El término de búsqueda es obligatorio' })
    .trim()
    .min(1, 'El término de búsqueda es obligatorio')
    .max(100, 'El término de búsqueda no puede superar 100 caracteres')
    .openapi({ example: 'ejemplo' }),
  limit: z.coerce
    .number({ error: 'limit debe ser un número' })
    .int('limit debe ser un entero')
    .min(1, 'limit debe ser mayor o igual a 1')
    .max(10, 'limit no puede ser mayor a 10')
    .default(5)
    .openapi({ example: 5, description: 'Máximo 10' }),
})

const search = createRoute({
  method: 'get',
  path: '/',
  tags: ['Búsqueda'],
  security: [{ cookieAuth: [] }],
  summary: 'Búsqueda global de URLs, usuarios y API keys (Ctrl+K del dashboard)',
  description:
    'Un `user` normal solo recibe sus propias URLs y API keys; `users` siempre viene vacío para él.',
  request: { query: SearchQuery },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            urls: z.array(AdminUrlSchema),
            users: z.array(UserSchema),
            api_keys: z.array(ApiKeySchema),
          }),
        },
      },
      description: 'Resultados de la búsqueda',
    },
    400: errorResponse('Parámetros no válidos'),
    401: errorResponse('No autenticado'),
  },
})

export const adminSearchRouter = createRouter<AuthEnv>()
adminSearchRouter.use('*', requireAuth)

adminSearchRouter.openapi(search, async (c) => {
  const { q, limit } = c.req.valid('query')
  const user = c.get('user')
  const db = getDb()
  const pattern = likePattern(q)
  const isAdmin = user.role === 'admin'

  const [urlRows, keyRows, userRows] = await Promise.all([
    db
      .select({ url: schema.urls, creator: creatorColumns })
      .from(schema.urls)
      .leftJoin(schema.users, eq(schema.urls.userId, schema.users.id))
      .where(
        and(
          isNull(schema.urls.deletedAt),
          isAdmin ? undefined : eq(schema.urls.userId, user.id),
          or(ilike(schema.urls.code, pattern), ilike(schema.urls.url, pattern)),
        ),
      )
      .orderBy(desc(schema.urls.createdAt), desc(schema.urls.id))
      .limit(limit),
    db
      .select({ key: schema.apiKeys, owner: { id: schema.users.id, name: schema.users.name } })
      .from(schema.apiKeys)
      .innerJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
      .where(
        and(
          isAdmin ? undefined : eq(schema.apiKeys.userId, user.id),
          or(ilike(schema.apiKeys.name, pattern), ilike(schema.apiKeys.keyPrefix, pattern)),
        ),
      )
      .orderBy(desc(schema.apiKeys.createdAt))
      .limit(limit),
    isAdmin
      ? db
          .select()
          .from(schema.users)
          .where(or(ilike(schema.users.name, pattern), ilike(schema.users.email, pattern)))
          .orderBy(desc(schema.users.createdAt), desc(schema.users.id))
          .limit(limit)
      : Promise.resolve([] as (typeof schema.users.$inferSelect)[]),
  ])

  return c.json(
    {
      urls: urlRows.map((r) => toAdminUrl(r.url, toCreator(r.creator), c.req.url)),
      users: userRows.map(toUser),
      api_keys: keyRows.map((r) => toApiKey(r.key, r.owner)),
    },
    200,
  )
})
