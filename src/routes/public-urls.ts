import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq, isNull } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { hashApiKey } from '../lib/api-keys'
import {
  anonymousUrlLimit,
  apiKeyUrlLimit,
  checkRateLimit,
  sendRateLimited,
} from '../lib/rate-limit'
import { getClientIp } from '../lib/request'
import { ErrorSchema } from '../lib/schemas'
import { buildShortUrl, generateCode, isHttpUrl, toIso } from '../lib/utils'

const INVALID_URL = 'La URL proporcionada no es válida'

const PublicUrlSchema = z
  .object({
    code: z.string().openapi({ example: 'aB3dE9' }),
    url: z.string().openapi({ example: 'https://example.com/pagina-larga' }),
    short_url: z.string().openapi({ example: 'https://sho.rt/aB3dE9' }),
    created_at: z.string().openapi({ example: '2026-10-28T15:42:10Z' }),
  })
  .openapi('PublicUrl')

const CreateBodySchema = z.object({
  url: z
    .string({ error: INVALID_URL })
    .refine(isHttpUrl, { error: INVALID_URL })
    .openapi({ example: 'https://example.com/pagina-larga' }),
})

type UrlRow = typeof schema.urls.$inferSelect

function toPublic(row: UrlRow, requestUrl: string) {
  return {
    code: row.code,
    url: row.url,
    short_url: buildShortUrl(requestUrl, row.code),
    created_at: toIso(row.createdAt),
  }
}

// `{}` significa "sin autenticación también es válido": el Bearer es opcional
const optionalBearer: Record<string, string[]>[] = [{}, { bearerAuth: [] }]

const createUrl = createRoute({
  method: 'post',
  path: '/new',
  tags: ['API pública'],
  summary: 'Crear una URL corta',
  description:
    'Opcional: con `Authorization: Bearer <api_key>` la URL queda asociada al dueño de la clave. Límites: 30 peticiones por minuto e IP sin clave válida y 120 por minuto y API key. Al superarlos devuelve 429 con `Retry-After`.',

  security: optionalBearer,
  request: {
    body: { content: { 'application/json': { schema: CreateBodySchema } }, required: true },
  },
  responses: {
    201: { content: { 'application/json': { schema: PublicUrlSchema } }, description: 'URL creada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'URL no válida' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'API key inválida o desactivada' },
    429: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Demasiadas solicitudes',
      headers: z.object({
        'Retry-After': z.string().openapi({ description: 'Segundos que faltan para poder reintentar' }),
      }),
    },
  },
})

const getUrl = createRoute({
  method: 'get',
  path: '/{code}',
  tags: ['API pública'],
  summary: 'Obtener una URL por su código',
  request: { params: z.object({ code: z.string().openapi({ example: 'aB3dE9' }) }) },
  responses: {
    200: { content: { 'application/json': { schema: PublicUrlSchema } }, description: 'URL encontrada' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'No existe' },
  },
})

const MAX_CODE_ATTEMPTS = 5

export const publicUrlsRouter = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: INVALID_URL }, 400)
  },
})

publicUrlsRouter.openapi(createUrl, async (c) => {
  const { url } = c.req.valid('json')
  const db = getDb()
  const ip = getClientIp(c)

  // Sin header: URL anónima. Con header: debe ser una key activa, si no, 401
  let owner: { userId: number; apiKeyId: number } | null = null
  let rateLimitKey = `url:ip:${ip}`
  let rateLimit = anonymousUrlLimit()
  const authorization = c.req.header('authorization')

  if (authorization !== undefined) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim())
    const [found] = match?.[1]
      ? await db
          .select({ id: schema.apiKeys.id, userId: schema.apiKeys.userId })
          .from(schema.apiKeys)
          .where(and(eq(schema.apiKeys.keyHash, await hashApiKey(match[1])), eq(schema.apiKeys.isActive, true)))
          .limit(1)
      : []

    if (!found) {
      // Una key inválida consume el cupo anónimo de la IP: no sirve para saltarse el límite
      const limited = await checkRateLimit(rateLimitKey, rateLimit)
      if (!limited.allowed) return sendRateLimited(c, limited.retryAfter)
      return c.json({ error: 'API key inválida' }, 401)
    }

    owner = { userId: found.userId, apiKeyId: found.id }
    rateLimitKey = `url:key:${found.id}`
    rateLimit = apiKeyUrlLimit()
    await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, found.id))
  }

  const limited = await checkRateLimit(rateLimitKey, rateLimit)
  if (!limited.allowed) return sendRateLimited(c, limited.retryAfter)

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    // onConflictDoNothing: si el código aleatorio ya existe, no falla y reintentamos con otro
    const [row] = await db
      .insert(schema.urls)
      .values({ code: generateCode(), url, userId: owner?.userId ?? null, apiKeyId: owner?.apiKeyId ?? null })
      .onConflictDoNothing({ target: schema.urls.code })
      .returning()
    if (row) return c.json(toPublic(row, c.req.url), 201)
  }
  throw new Error('No se pudo generar un código único')
})

publicUrlsRouter.openapi(getUrl, async (c) => {
  const { code } = c.req.valid('param')
  const [row] = await getDb()
    .select()
    .from(schema.urls)
    .where(and(eq(schema.urls.code, code), isNull(schema.urls.deletedAt)))
    .limit(1)
  if (!row) return c.json({ error: 'URL no encontrada' }, 404)
  return c.json(toPublic(row, c.req.url), 200)
})
