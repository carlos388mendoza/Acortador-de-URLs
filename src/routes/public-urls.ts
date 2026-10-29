import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq, isNull } from 'drizzle-orm'
import { getDb, schema } from '../db'
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

const createUrl = createRoute({
  method: 'post',
  path: '/new',
  tags: ['API pública'],
  summary: 'Crear una URL corta',
  request: {
    body: { content: { 'application/json': { schema: CreateBodySchema } }, required: true },
  },
  responses: {
    201: { content: { 'application/json': { schema: PublicUrlSchema } }, description: 'URL creada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'URL no válida' },
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

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    // onConflictDoNothing: si el código aleatorio ya existe, no falla y reintentamos con otro
    const [row] = await db
      .insert(schema.urls)
      .values({ code: generateCode(), url })
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
