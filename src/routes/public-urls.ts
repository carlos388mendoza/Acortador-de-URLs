import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq, isNull } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { apiKeyUrlLimit, checkRateLimit, sendRateLimited } from '../lib/rate-limit'
import { ErrorSchema } from '../lib/schemas'
import { buildShortUrl, generateCode, isHttpUrl, toIso } from '../lib/utils'
import { requireApiKey, type ApiKeyEnv } from '../middleware/api-key'

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

// Cada objeto es una alternativa: basta con una de las dos cabeceras
const apiKeySecurity: Record<string, string[]>[] = [{ bearerAuth: [] }, { apiKeyHeader: [] }]

const API_KEY_HELP =
  'Requiere una API key activa en `x-api-key: sk_...` o en `Authorization: Bearer sk_...`. Sin clave: 401 `API key requerida`; clave inválida o desactivada: 401 `API key inválida`. Las claves inválidas cuentan para un límite de 30 intentos por minuto e IP.'

const unauthorized = {
  content: {
    'application/json': {
      schema: ErrorSchema,
      examples: {
        requerida: { summary: 'Sin API key', value: { error: 'API key requerida' } },
        invalida: { summary: 'API key inválida o desactivada', value: { error: 'API key inválida' } },
      },
    },
  },
  description: 'Falta la API key, o es inválida o está desactivada',
}

const tooManyRequests = {
  content: { 'application/json': { schema: ErrorSchema } },
  description: 'Demasiadas solicitudes',
  headers: z.object({
    'Retry-After': z.string().openapi({ description: 'Segundos que faltan para poder reintentar' }),
  }),
}

const createUrl = createRoute({
  method: 'post',
  path: '/new',
  tags: ['API pública'],
  summary: 'Crear una URL corta',
  description: `${API_KEY_HELP} La URL queda asociada al dueño de la clave. Límite: 120 creaciones por minuto y API key; al superarlo devuelve 429 con \`Retry-After\`.`,
  security: apiKeySecurity,
  middleware: [requireApiKey] as const,
  request: {
    body: { content: { 'application/json': { schema: CreateBodySchema } }, required: true },
  },
  responses: {
    201: { content: { 'application/json': { schema: PublicUrlSchema } }, description: 'URL creada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'URL no válida' },
    401: unauthorized,
    429: tooManyRequests,
  },
})

const getUrl = createRoute({
  method: 'get',
  path: '/{code}',
  tags: ['API pública'],
  summary: 'Obtener una URL por su código',
  description: API_KEY_HELP,
  security: apiKeySecurity,
  middleware: [requireApiKey] as const,
  request: { params: z.object({ code: z.string().openapi({ example: 'aB3dE9' }) }) },
  responses: {
    200: { content: { 'application/json': { schema: PublicUrlSchema } }, description: 'URL encontrada' },
    401: unauthorized,
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'No existe' },
    429: tooManyRequests,
  },
})

const MAX_CODE_ATTEMPTS = 5

export const publicUrlsRouter = new OpenAPIHono<ApiKeyEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: INVALID_URL }, 400)
  },
})

publicUrlsRouter.openapi(createUrl, async (c) => {
  const { url } = c.req.valid('json')
  const apiKey = c.get('apiKey')

  const limited = await checkRateLimit(`url:key:${apiKey.id}`, apiKeyUrlLimit())
  if (!limited.allowed) return sendRateLimited(c, limited.retryAfter)

  const db = getDb()
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    // onConflictDoNothing: si el código aleatorio ya existe, no falla y reintentamos con otro
    const [row] = await db
      .insert(schema.urls)
      .values({ code: generateCode(), url, userId: apiKey.userId, apiKeyId: apiKey.id })
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
