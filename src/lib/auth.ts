import bcrypt from 'bcryptjs'
import type { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { env } from './env'

export const SESSION_COOKIE = 'session'
const SESSION_SECONDS = 60 * 60 * 24 * 7 // 7 días

function getSecret(): string {
  const secret = env.JWT_SECRET
  if (!secret) throw new Error('Falta la variable JWT_SECRET')
  return secret
}

const isProduction = () => env.NODE_ENV === 'production' || env.VERCEL === '1'

export const hashPassword = (password: string) => bcrypt.hash(password, 10)
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

// Hash falso para comparar cuando el email no existe y así no revelar (por tiempo de respuesta) qué correos están registrados
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente', 10)
export const burnPasswordCheck = (password: string) => bcrypt.compare(password, DUMMY_HASH)

export async function createSession(c: Context, userId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const token = await sign({ sub: String(userId), exp }, getSecret(), 'HS256')
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProduction(),
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export function clearSession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

/** Devuelve el id del usuario del token, o null si es inválido o expiró. */
export async function readSessionUserId(token: string): Promise<number | null> {
  try {
    const payload = await verify(token, getSecret(), 'HS256')
    const id = Number(payload.sub)
    return Number.isInteger(id) ? id : null
  } catch {
    return null
  }
}
