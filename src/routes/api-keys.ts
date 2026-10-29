import { createRoute, z } from '@hono/zod-openapi'
import { desc, eq } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { generateApiKey, hashApiKey, keyPrefix } from '../lib/api-keys'
import { createRouter } from '../lib/router'
import { ApiKeySchema, errorResponse } from '../lib/schemas'
import { toApiKey } from '../lib/serializers'
import { requireAuth, type AuthEnv } from '../middleware/auth'

const IdParam = z.object({
  id: z.coerce.number().int().positive({ error: 'El id no es válido' }).openapi({ example: 1 }),
})

const security = [{ cookieAuth: [] }]
const tags = ['API keys']

const listKeys = createRoute({
  method: 'get',
  path: '/',
  tags,
  security,
  summary: 'Listar API keys (admin: todas; user: las suyas)',
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ data: z.array(ApiKeySchema) }) } },
      description: 'Listado',
    },
    401: errorResponse('No autenticado'),
  },
})

const createKey = createRoute({
  method: 'post',
  path: '/',
  tags,
  security,
  summary: 'Crear una API key (la clave completa solo se muestra aquí)',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            name: z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(100),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            api_key: ApiKeySchema,
            key: z.string().openapi({ example: 'sk_...' }),
          }),
        },
      },
      description: 'API key creada',
    },
    400: errorResponse('Datos no válidos'),
    401: errorResponse('No autenticado'),
  },
})

const updateKey = createRoute({
  method: 'patch',
  path: '/{id}',
  tags,
  security,
  summary: 'Renombrar o activar/desactivar una API key',
  request: {
    params: IdParam,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().trim().min(1, 'El nombre no puede estar vacío').max(100).optional(),
            is_active: z.boolean({ error: 'is_active debe ser verdadero o falso' }).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ api_key: ApiKeySchema }) } }, description: 'Actualizada' },
    400: errorResponse('Datos no válidos'),
    401: errorResponse('No autenticado'),
    403: errorResponse('No autorizado'),
    404: errorResponse('No existe'),
  },
})

const deleteKey = createRoute({
  method: 'delete',
  path: '/{id}',
  tags,
  security,
  summary: 'Desactivar una API key (no borra la fila)',
  request: { params: IdParam },
  responses: {
    204: { description: 'Desactivada' },
    401: errorResponse('No autenticado'),
    403: errorResponse('No autorizado'),
    404: errorResponse('No existe'),
  },
})

export const apiKeysRouter = createRouter<AuthEnv>()
apiKeysRouter.use('*', requireAuth)

apiKeysRouter.openapi(listKeys, async (c) => {
  const user = c.get('user')
  const rows = await getDb()
    .select({ key: schema.apiKeys, owner: { id: schema.users.id, name: schema.users.name } })
    .from(schema.apiKeys)
    .innerJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
    .where(user.role === 'admin' ? undefined : eq(schema.apiKeys.userId, user.id))
    .orderBy(desc(schema.apiKeys.createdAt))
  return c.json({ data: rows.map((r) => toApiKey(r.key, r.owner)) }, 200)
})

apiKeysRouter.openapi(createKey, async (c) => {
  const user = c.get('user')
  const { name } = c.req.valid('json')
  const key = generateApiKey()
  const [row] = await getDb()
    .insert(schema.apiKeys)
    .values({ userId: user.id, name, keyPrefix: keyPrefix(key), keyHash: await hashApiKey(key) })
    .returning()
  if (!row) throw new Error('No se pudo crear la API key')
  return c.json({ api_key: toApiKey(row, { id: user.id, name: user.name }), key }, 201)
})

/** Busca la key con su dueño y comprueba permisos: admin todas, user solo las suyas. */
async function findAccessibleKey(id: number, user: { id: number; role: 'admin' | 'user' }) {
  const [found] = await getDb()
    .select({ key: schema.apiKeys, owner: { id: schema.users.id, name: schema.users.name } })
    .from(schema.apiKeys)
    .innerJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
    .where(eq(schema.apiKeys.id, id))
    .limit(1)
  if (!found) return { status: 404 as const }
  if (user.role !== 'admin' && found.key.userId !== user.id) return { status: 403 as const }
  return { status: 200 as const, found }
}

apiKeysRouter.openapi(updateKey, async (c) => {
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')
  const access = await findAccessibleKey(id, c.get('user'))
  if (access.status === 404) return c.json({ error: 'API key no encontrada' }, 404)
  if (access.status === 403) return c.json({ error: 'No autorizado' }, 403)

  const changes: { name?: string; isActive?: boolean } = {}
  if (body.name !== undefined) changes.name = body.name
  if (body.is_active !== undefined) changes.isActive = body.is_active

  const { key, owner } = access.found
  if (Object.keys(changes).length === 0) return c.json({ api_key: toApiKey(key, owner) }, 200)

  const [updated] = await getDb().update(schema.apiKeys).set(changes).where(eq(schema.apiKeys.id, id)).returning()
  if (!updated) return c.json({ error: 'API key no encontrada' }, 404)
  return c.json({ api_key: toApiKey(updated, owner) }, 200)
})

apiKeysRouter.openapi(deleteKey, async (c) => {
  const { id } = c.req.valid('param')
  const access = await findAccessibleKey(id, c.get('user'))
  if (access.status === 404) return c.json({ error: 'API key no encontrada' }, 404)
  if (access.status === 403) return c.json({ error: 'No autorizado' }, 403)

  await getDb().update(schema.apiKeys).set({ isActive: false }).where(eq(schema.apiKeys.id, id))
  return c.body(null, 204)
})
