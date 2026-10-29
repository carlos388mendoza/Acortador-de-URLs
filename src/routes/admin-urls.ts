import { createRoute, z } from '@hono/zod-openapi'
import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { likePattern, paginated, PaginationQuery } from '../lib/pagination'
import { createRouter } from '../lib/router'
import { AdminUrlSchema, errorResponse } from '../lib/schemas'
import { creatorColumns, toAdminUrl, toCreator } from '../lib/serializers'
import { CODE_REGEX, generateCode, isHttpUrl, isReservedCode } from '../lib/utils'
import { requireAuth, type AuthEnv } from '../middleware/auth'

const tags = ['URLs (admin)']
const security = [{ cookieAuth: [] }]

const INVALID_URL = 'La URL proporcionada no es válida'
const INVALID_CODE = 'El código debe tener entre 3 y 16 caracteres: letras, números, guion o guion bajo'

const IdParam = z.object({
  id: z.coerce.number().int().positive({ error: 'El id no es válido' }).openapi({ example: 1 }),
})

const urlField = z.string({ error: INVALID_URL }).trim().refine(isHttpUrl, { error: INVALID_URL })
const codeField = z.string({ error: INVALID_CODE }).regex(CODE_REGEX, INVALID_CODE)

const commonErrors = {
  401: errorResponse('No autenticado'),
  403: errorResponse('No autorizado'),
}
const AdminUrlResponse = z.object({ admin_url: AdminUrlSchema })

const listUrls = createRoute({
  method: 'get',
  path: '/',
  tags,
  security,
  summary: 'Listar URLs (admin: todas; user: las suyas). Búsqueda por código o URL',
  request: { query: PaginationQuery },
  responses: {
    200: { content: { 'application/json': { schema: paginated(AdminUrlSchema) } }, description: 'Listado' },
    400: errorResponse('Parámetros no válidos'),
    ...commonErrors,
  },
})

const createUrl = createRoute({
  method: 'post',
  path: '/',
  tags,
  security,
  summary: 'Crear una URL (con código personalizado opcional)',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: z.object({ url: urlField, code: codeField.optional() }) } },
    },
  },
  responses: {
    201: { content: { 'application/json': { schema: AdminUrlResponse } }, description: 'Creada' },
    400: errorResponse('Datos no válidos'),
    409: errorResponse('El código ya existe o está reservado'),
    ...commonErrors,
  },
})

const updateUrl = createRoute({
  method: 'patch',
  path: '/{id}',
  tags,
  security,
  summary: 'Editar una URL',
  request: {
    params: IdParam,
    body: {
      required: true,
      content: { 'application/json': { schema: z.object({ url: urlField.optional(), code: codeField.optional() }) } },
    },
  },
  responses: {
    200: { content: { 'application/json': { schema: AdminUrlResponse } }, description: 'Actualizada' },
    400: errorResponse('Datos no válidos'),
    404: errorResponse('No existe'),
    409: errorResponse('El código ya existe o está reservado'),
    ...commonErrors,
  },
})

const deleteUrl = createRoute({
  method: 'delete',
  path: '/{id}',
  tags,
  security,
  summary: 'Borrar una URL (borrado suave con deleted_at)',
  request: { params: IdParam },
  responses: {
    204: { description: 'Borrada' },
    404: errorResponse('No existe'),
    ...commonErrors,
  },
})

export const adminUrlsRouter = createRouter<AuthEnv>()
adminUrlsRouter.use('*', requireAuth)

adminUrlsRouter.openapi(listUrls, async (c) => {
  const { page, limit, search } = c.req.valid('query')
  const user = c.get('user')
  const db = getDb()

  const where = and(
    isNull(schema.urls.deletedAt),
    user.role === 'admin' ? undefined : eq(schema.urls.userId, user.id),
    search
      ? or(ilike(schema.urls.code, likePattern(search)), ilike(schema.urls.url, likePattern(search)))
      : undefined,
  )

  const [rows, totals] = await Promise.all([
    db
      .select({ url: schema.urls, creator: creatorColumns })
      .from(schema.urls)
      .leftJoin(schema.users, eq(schema.urls.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.urls.createdAt), desc(schema.urls.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(schema.urls).where(where),
  ])

  const data = rows.map((r) => toAdminUrl(r.url, toCreator(r.creator), c.req.url))
  return c.json({ data, total: totals[0]?.total ?? 0, page, limit }, 200)
})

adminUrlsRouter.openapi(createUrl, async (c) => {
  const { url, code } = c.req.valid('json')
  const user = c.get('user')
  const db = getDb()
  const creator = { id: user.id, name: user.name }

  if (code !== undefined) {
    if (isReservedCode(code)) return c.json({ error: 'Ese código está reservado' }, 409)
    const [row] = await db
      .insert(schema.urls)
      .values({ code, url, userId: user.id })
      .onConflictDoNothing({ target: schema.urls.code })
      .returning()
    if (!row) return c.json({ error: 'Ese código ya está en uso' }, 409)
    return c.json({ admin_url: toAdminUrl(row, creator, c.req.url) }, 201)
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db
      .insert(schema.urls)
      .values({ code: generateCode(), url, userId: user.id })
      .onConflictDoNothing({ target: schema.urls.code })
      .returning()
    if (row) return c.json({ admin_url: toAdminUrl(row, creator, c.req.url) }, 201)
  }
  throw new Error('No se pudo generar un código único')
})

/** Una URL borrada no existe para nadie. Un user solo accede a las suyas; las ajenas se tratan como inexistentes. */
async function findOwnedUrl(id: number, user: { id: number; role: 'admin' | 'user' }) {
  const [found] = await getDb()
    .select({ url: schema.urls, creator: creatorColumns })
    .from(schema.urls)
    .leftJoin(schema.users, eq(schema.urls.userId, schema.users.id))
    .where(
      and(
        eq(schema.urls.id, id),
        isNull(schema.urls.deletedAt),
        user.role === 'admin' ? undefined : eq(schema.urls.userId, user.id),
      ),
    )
    .limit(1)
  return found ?? null
}

adminUrlsRouter.openapi(updateUrl, async (c) => {
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')
  const found = await findOwnedUrl(id, c.get('user'))
  if (!found) return c.json({ error: 'URL no encontrada' }, 404)

  const changes: Partial<typeof schema.urls.$inferInsert> = { updatedAt: new Date() }
  if (body.url !== undefined) changes.url = body.url
  if (body.code !== undefined && body.code !== found.url.code) {
    if (isReservedCode(body.code)) return c.json({ error: 'Ese código está reservado' }, 409)
    const [taken] = await getDb().select({ id: schema.urls.id }).from(schema.urls).where(eq(schema.urls.code, body.code)).limit(1)
    if (taken) return c.json({ error: 'Ese código ya está en uso' }, 409)
    changes.code = body.code
  }

  const creator = toCreator(found.creator)
  try {
    const [row] = await getDb().update(schema.urls).set(changes).where(eq(schema.urls.id, id)).returning()
    if (!row) return c.json({ error: 'URL no encontrada' }, 404)
    return c.json({ admin_url: toAdminUrl(row, creator, c.req.url) }, 200)
  } catch (err) {
    // Carrera: otro usuario tomó el código entre la comprobación y el UPDATE (error 23505 = unique_violation)
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
      return c.json({ error: 'Ese código ya está en uso' }, 409)
    }
    throw err
  }
})

adminUrlsRouter.openapi(deleteUrl, async (c) => {
  const { id } = c.req.valid('param')
  const found = await findOwnedUrl(id, c.get('user'))
  if (!found) return c.json({ error: 'URL no encontrada' }, 404)

  await getDb().update(schema.urls).set({ deletedAt: new Date() }).where(eq(schema.urls.id, id))
  return c.body(null, 204)
})
