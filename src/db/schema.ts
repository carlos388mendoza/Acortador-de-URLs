import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 10, enum: ['admin', 'user'] })
    .notNull()
    .default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyPrefix: varchar('key_prefix', { length: 8 }).notNull(),
  keyHash: text('key_hash').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const urls = pgTable(
  'urls',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 16 }).notNull().unique(),
    url: text('url').notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    apiKeyId: integer('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
    clickCount: integer('click_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('urls_user_id_idx').on(t.userId)],
)

export const clicks = pgTable(
  'clicks',
  {
    id: serial('id').primaryKey(),
    urlId: integer('url_id')
      .notNull()
      .references(() => urls.id, { onDelete: 'cascade' }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
  },
  (t) => [index('clicks_url_id_idx').on(t.urlId), index('clicks_clicked_at_idx').on(t.clickedAt)],
)

/**
 * Intentos de login fallidos por combinación IP + correo.
 * Al llegar al máximo se guarda `blocked_until` y no se vuelve a comprobar la contraseña hasta que expire.
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    ip: varchar('ip', { length: 45 }).notNull(),
    email: text('email').notNull(),
    failedCount: integer('failed_count').notNull().default(0),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull().defaultNow(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('login_attempts_ip_email_idx').on(t.ip, t.email),
    index('login_attempts_updated_at_idx').on(t.updatedAt),
  ],
)

/** Contadores de límite de peticiones: una fila por clave y ventana. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 200 }).notNull(),
    count: integer('count').notNull().default(0),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('rate_limits_key_idx').on(t.key),
    index('rate_limits_window_started_at_idx').on(t.windowStartedAt),
  ],
)
