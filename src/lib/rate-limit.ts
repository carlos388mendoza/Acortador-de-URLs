import { waitUntil } from '@vercel/functions'
import { and, eq, lt, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { getDb, schema } from '../db'
import { env } from './env'

export const RATE_LIMIT_MESSAGE = 'Demasiados intentos. Intenta de nuevo en unos minutos'

const RATE_WINDOW_MS = 60_000
const CLEANUP_CHANCE = 0.02
const RATE_LIMIT_RETENTION_MS = 60 * 60_000
const LOGIN_ATTEMPT_RETENTION_MS = 24 * 60 * 60_000

function positiveInt(name: string, fallback: number): number {
  const raw = env[name]
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

export function loginLimits(): { maxAttempts: number; windowMinutes: number } {
  return {
    maxAttempts: positiveInt('LOGIN_MAX_ATTEMPTS', 5),
    windowMinutes: positiveInt('LOGIN_WINDOW_MINUTES', 15),
  }
}

/** Intentos por minuto e IP con una API key inválida (en los endpoints públicos). */
export function invalidApiKeyLimit(): number {
  return positiveInt('URL_RATE_LIMIT_PER_MINUTE', 30)
}

export function apiKeyUrlLimit(): number {
  return positiveInt('API_KEY_RATE_LIMIT_PER_MINUTE', 120)
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfter: number }

/** Borra registros viejos de vez en cuando, sin depender de un cron externo. */
function scheduleCleanup(): void {
  if (Math.random() >= CLEANUP_CHANCE) return
  const now = Date.now()
  const db = getDb()
  waitUntil(
    Promise.all([
      db.delete(schema.rateLimits).where(lt(schema.rateLimits.windowStartedAt, new Date(now - RATE_LIMIT_RETENTION_MS))),
      db
        .delete(schema.loginAttempts)
        .where(lt(schema.loginAttempts.updatedAt, new Date(now - LOGIN_ATTEMPT_RETENTION_MS))),
    ])
      .then(() => undefined)
      .catch((err: unknown) => console.error('No se pudieron limpiar los registros de seguridad', err)),
  )
}

/** Ventana fija de un minuto por clave (IP o API key). */
export async function checkRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  scheduleCleanup()
  const now = new Date()
  const threshold = new Date(now.getTime() - RATE_WINDOW_MS)

  // Un solo UPSERT atómico: reinicia la ventana si expiró o suma uno si sigue vigente
  const [row] = await getDb()
    .insert(schema.rateLimits)
    .values({ key, count: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.windowStartedAt} <= ${threshold} THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${schema.rateLimits.windowStartedAt} <= ${threshold} THEN ${now} ELSE ${schema.rateLimits.windowStartedAt} END`,
      },
    })
    .returning({ count: schema.rateLimits.count, windowStartedAt: schema.rateLimits.windowStartedAt })

  if (!row) throw new Error('No se pudo actualizar el límite de peticiones')

  if (row.count > limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((row.windowStartedAt.getTime() + RATE_WINDOW_MS - now.getTime()) / 1000),
    )
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

/** Segundos que faltan para que termine el bloqueo de login, o 0 si no está bloqueado. */
export async function loginBlockSeconds(ip: string, email: string): Promise<number> {
  const [row] = await getDb()
    .select({ blockedUntil: schema.loginAttempts.blockedUntil })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ip, ip), eq(schema.loginAttempts.email, email)))
    .limit(1)

  if (!row?.blockedUntil) return 0
  const remaining = row.blockedUntil.getTime() - Date.now()
  return remaining > 0 ? Math.max(1, Math.ceil(remaining / 1000)) : 0
}

/** Suma un fallo. Al llegar al máximo bloquea la ventana completa. */
export async function recordFailedLogin(ip: string, email: string): Promise<void> {
  scheduleCleanup()
  const { maxAttempts, windowMinutes } = loginLimits()
  const windowMs = windowMinutes * 60_000
  const now = new Date()
  const threshold = new Date(now.getTime() - windowMs)
  const blockUntil = new Date(now.getTime() + windowMs)
  const nextCount = sql`CASE WHEN ${schema.loginAttempts.windowStartedAt} <= ${threshold} THEN 1 ELSE ${schema.loginAttempts.failedCount} + 1 END`

  // UPSERT atómico por (ip, email): no hay carrera entre dos fallos simultáneos
  await getDb()
    .insert(schema.loginAttempts)
    .values({
      ip,
      email,
      failedCount: 1,
      windowStartedAt: now,
      blockedUntil: maxAttempts <= 1 ? blockUntil : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.loginAttempts.ip, schema.loginAttempts.email],
      set: {
        failedCount: nextCount,
        windowStartedAt: sql`CASE WHEN ${schema.loginAttempts.windowStartedAt} <= ${threshold} THEN ${now} ELSE ${schema.loginAttempts.windowStartedAt} END`,
        blockedUntil: sql`CASE WHEN (${nextCount}) >= ${maxAttempts} THEN ${blockUntil}::timestamptz ELSE NULL END`,
        updatedAt: now,
      },
    })
}

/** Un login correcto reinicia el contador de esa combinación IP + correo. */
export async function clearFailedLogins(ip: string, email: string): Promise<void> {
  await getDb()
    .delete(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ip, ip), eq(schema.loginAttempts.email, email)))
}

export function sendRateLimited(c: Context, retryAfter: number) {
  c.header('Retry-After', String(retryAfter))
  return c.json({ error: RATE_LIMIT_MESSAGE }, 429)
}
