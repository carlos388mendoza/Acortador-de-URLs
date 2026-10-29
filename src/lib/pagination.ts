import { z } from '@hono/zod-openapi'

export const MAX_LIMIT = 100

/** ?page=1&limit=20&search=texto. Un limit mayor a 100 se recorta a 100. */
export const PaginationQuery = z.object({
  page: z.coerce
    .number({ error: 'page debe ser un número' })
    .int('page debe ser un entero')
    .min(1, 'page debe ser mayor o igual a 1')
    .default(1)
    .openapi({ example: 1 }),
  limit: z.coerce
    .number({ error: 'limit debe ser un número' })
    .int('limit debe ser un entero')
    .min(1, 'limit debe ser mayor o igual a 1')
    .default(20)
    .transform((n) => Math.min(n, MAX_LIMIT))
    .openapi({ example: 20, description: `Máximo ${MAX_LIMIT}` }),
  search: z.string().trim().optional().openapi({ description: 'Búsqueda por texto (sin distinguir mayúsculas)' }),
})

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
  })

/** Patrón para ilike: escapa % _ \ para que el texto buscado se tome literal. */
export const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, '\\$&')}%`
