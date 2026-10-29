import { createRoute, z } from '@hono/zod-openapi'
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { createRouter } from '../lib/router'
import { AdminUrlSchema, errorResponse } from '../lib/schemas'
import { creatorColumns, toAdminUrl, toCreator } from '../lib/serializers'
import { requireAuth, type AuthEnv } from '../middleware/auth'

const tags = ['Estadísticas']
const security = [{ cookieAuth: [] }]
const commonErrors = { 401: errorResponse('No autenticado') }

const limitQuery = z.object({
  limit: z.coerce
    .number({ error: 'limit debe ser un número' })
    .int('limit debe ser un entero')
    .min(1, 'limit debe ser mayor o igual a 1')
    .default(10)
    .transform((n) => Math.min(n, 100))
    .openapi({ example: 10, description: 'Máximo 100' }),
})

const daysQuery = z.object({
  days: z.coerce
    .number({ error: 'days debe ser un número' })
    .int('days debe ser un entero')
    .min(1, 'days debe ser mayor o igual a 1')
    .default(30)
    .transform((n) => Math.min(n, 365))
    .openapi({ example: 30, description: 'Máximo 365' }),
})

const summary = createRoute({
  method: 'get',
  path: '/summary',
  tags,
  security,
  summary: 'Totales generales',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            total_urls: z.number().int(),
            total_clicks: z.number().int(),
            total_users: z.number().int(),
            active_api_keys: z.number().int(),
          }),
        },
      },
      description: 'Totales',
    },
    ...commonErrors,
  },
})

const urlListResponse = {
  200: { content: { 'application/json': { schema: z.object({ data: z.array(AdminUrlSchema) }) } }, description: 'Listado' },
  400: errorResponse('Parámetros no válidos'),
  ...commonErrors,
}

const topUrls = createRoute({
  method: 'get',
  path: '/top-urls',
  tags,
  security,
  summary: 'URLs con más clics',
  request: { query: limitQuery },
  responses: urlListResponse,
})

const recentUrls = createRoute({
  method: 'get',
  path: '/recent-urls',
  tags,
  security,
  summary: 'URLs creadas más recientemente',
  request: { query: limitQuery },
  responses: urlListResponse,
})

const topCreators = createRoute({
  method: 'get',
  path: '/top-creators',
  tags,
  security,
  summary: 'Usuarios con más clics en sus URLs',
  request: { query: limitQuery },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                user: z.object({ id: z.number().int(), name: z.string(), email: z.string() }),
                url_count: z.number().int(),
                click_count: z.number().int(),
              }),
            ),
          }),
        },
      },
      description: 'Ranking',
    },
    400: errorResponse('Parámetros no válidos'),
    ...commonErrors,
  },
})

const clicksPerDay = createRoute({
  method: 'get',
  path: '/clicks-per-day',
  tags,
  security,
  summary: 'Clics por día (los días sin clics salen con 0)',
  request: { query: daysQuery },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.object({ date: z.string().openapi({ example: '2026-10-28' }), clicks: z.number().int() })),
          }),
        },
      },
      description: 'Serie diaria',
    },
    400: errorResponse('Parámetros no válidos'),
    ...commonErrors,
  },
})

export const adminStatsRouter = createRouter<AuthEnv>()
adminStatsRouter.use('*', requireAuth)

/** Para un user todo se calcula solo con sus URLs; el admin ve el total. URLs borradas nunca cuentan. */
function urlScope(user: { id: number; role: 'admin' | 'user' }) {
  return and(isNull(schema.urls.deletedAt), user.role === 'admin' ? undefined : eq(schema.urls.userId, user.id))
}

adminStatsRouter.openapi(summary, async (c) => {
  const user = c.get('user')
  const db = getDb()
  const isAdmin = user.role === 'admin'

  const [urlTotals, keyTotals, userTotals] = await Promise.all([
    db
      .select({
        total_urls: count(),
        total_clicks: sql<number>`coalesce(sum(${schema.urls.clickCount}), 0)::int`,
      })
      .from(schema.urls)
      .where(urlScope(user)),
    db
      .select({ total: count() })
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.isActive, true), isAdmin ? undefined : eq(schema.apiKeys.userId, user.id))),
    isAdmin ? db.select({ total: count() }).from(schema.users) : Promise.resolve([{ total: 1 }]),
  ])

  return c.json(
    {
      total_urls: urlTotals[0]?.total_urls ?? 0,
      total_clicks: urlTotals[0]?.total_clicks ?? 0,
      total_users: userTotals[0]?.total ?? 0,
      active_api_keys: keyTotals[0]?.total ?? 0,
    },
    200,
  )
})

async function listUrls(
  user: { id: number; role: 'admin' | 'user' },
  limit: number,
  order: 'clicks' | 'recent',
  requestUrl: string,
) {
  const rows = await getDb()
    .select({ url: schema.urls, creator: creatorColumns })
    .from(schema.urls)
    .leftJoin(schema.users, eq(schema.urls.userId, schema.users.id))
    .where(urlScope(user))
    .orderBy(
      ...(order === 'clicks'
        ? [desc(schema.urls.clickCount), desc(schema.urls.id)]
        : [desc(schema.urls.createdAt), desc(schema.urls.id)]),
    )
    .limit(limit)
  return rows.map((r) => toAdminUrl(r.url, toCreator(r.creator), requestUrl))
}

adminStatsRouter.openapi(topUrls, async (c) => {
  const { limit } = c.req.valid('query')
  return c.json({ data: await listUrls(c.get('user'), limit, 'clicks', c.req.url) }, 200)
})

adminStatsRouter.openapi(recentUrls, async (c) => {
  const { limit } = c.req.valid('query')
  return c.json({ data: await listUrls(c.get('user'), limit, 'recent', c.req.url) }, 200)
})

adminStatsRouter.openapi(topCreators, async (c) => {
  const { limit } = c.req.valid('query')
  const rows = await getDb()
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      url_count: count(),
      click_count: sql<number>`coalesce(sum(${schema.urls.clickCount}), 0)::int`,
    })
    .from(schema.urls)
    .innerJoin(schema.users, eq(schema.urls.userId, schema.users.id))
    .where(urlScope(c.get('user')))
    .groupBy(schema.users.id, schema.users.name, schema.users.email)
    .orderBy(desc(sql`coalesce(sum(${schema.urls.clickCount}), 0)`), desc(count()), schema.users.id)
    .limit(limit)

  return c.json(
    {
      data: rows.map((r) => ({
        user: { id: r.id, name: r.name, email: r.email },
        url_count: r.url_count,
        click_count: r.click_count,
      })),
    },
    200,
  )
})

adminStatsRouter.openapi(clicksPerDay, async (c) => {
  const { days } = c.req.valid('query')
  const user = c.get('user')

  // generate_series crea una fila por cada día (en UTC); el LEFT JOIN deja los días sin clics con 0
  const scope = user.role === 'admin' ? sql`` : sql`and u.user_id = ${user.id}`
  const result = await getDb().execute<{ date: string; clicks: number }>(sql`
    select to_char(d::date, 'YYYY-MM-DD') as date, count(k.id)::int as clicks
    from generate_series(
      (now() at time zone 'utc')::date - (${days}::int - 1),
      (now() at time zone 'utc')::date,
      interval '1 day'
    ) as d
    left join (
      select cl.id, (cl.clicked_at at time zone 'utc')::date as day
      from clicks cl
      join urls u on u.id = cl.url_id
      where u.deleted_at is null ${scope}
    ) k on k.day = d::date
    group by d
    order by d
  `)

  return c.json({ data: result.rows.map((r) => ({ date: r.date, clicks: Number(r.clicks) })) }, 200)
})
