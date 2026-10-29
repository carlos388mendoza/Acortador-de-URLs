import type { schema } from '../db'
import { buildShortUrl, toIso } from './utils'

type UserRow = typeof schema.users.$inferSelect
type ApiKeyRow = typeof schema.apiKeys.$inferSelect

/** Forma pública de un usuario: nunca incluye password_hash. */
export function toUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  }
}

export type PublicUser = ReturnType<typeof toUser>

/** Forma pública de una API key: nunca incluye key_hash. */
export function toApiKey(row: ApiKeyRow, owner: { id: number; name: string }) {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.keyPrefix,
    is_active: row.isActive,
    last_used_at: row.lastUsedAt ? toIso(row.lastUsedAt) : null,
    created_at: toIso(row.createdAt),
    owner: { id: owner.id, name: owner.name },
  }
}

type UrlRow = typeof schema.urls.$inferSelect

/** Forma admin_url del contrato. `creator` es null si la URL es anónima o su dueño fue borrado. */
export function toAdminUrl(row: UrlRow, creator: { id: number; name: string } | null, requestUrl: string) {
  return {
    id: row.id,
    code: row.code,
    url: row.url,
    short_url: buildShortUrl(requestUrl, row.code),
    click_count: row.clickCount,
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
    creator: creator ? { id: creator.id, name: creator.name } : null,
  }
}
