import { z } from '@hono/zod-openapi'

export const ErrorSchema = z.object({ error: z.string() }).openapi('Error')

export const UserSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['admin', 'user']),
    created_at: z.string().openapi({ example: '2026-10-28T15:42:10Z' }),
    updated_at: z.string().openapi({ example: '2026-10-28T15:42:10Z' }),
  })
  .openapi('User')

export const errorResponse = (description: string) => ({
  content: { 'application/json': { schema: ErrorSchema } },
  description,
})

export const ApiKeySchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    key_prefix: z.string().openapi({ example: 'sk_aB3dE' }),
    is_active: z.boolean(),
    last_used_at: z.string().nullable(),
    created_at: z.string(),
    owner: z.object({ id: z.number().int(), name: z.string() }),
  })
  .openapi('ApiKey')

export const AdminUrlSchema = z
  .object({
    id: z.number().int(),
    code: z.string(),
    url: z.string(),
    short_url: z.string(),
    click_count: z.number().int(),
    created_at: z.string().openapi({ example: '2026-10-28T15:42:10Z' }),
    updated_at: z.string().openapi({ example: '2026-10-28T15:42:10Z' }),
    creator: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  })
  .openapi('AdminUrl')
