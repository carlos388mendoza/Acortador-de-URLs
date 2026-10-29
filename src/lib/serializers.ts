import type { schema } from '../db'
import { toIso } from './utils'

type UserRow = typeof schema.users.$inferSelect

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
