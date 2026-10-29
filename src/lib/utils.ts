import { customAlphabet } from 'nanoid'
import { env } from './env'

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export const generateCode = customAlphabet(BASE62, 6)

export const RESERVED_CODES = new Set([
  'api',
  'dashboard',
  'docs',
  'favicon.ico',
  'robots.txt',
  'assets',
])

export const CODE_REGEX = /^[a-zA-Z0-9_-]{3,16}$/

export function isReservedCode(code: string): boolean {
  return RESERVED_CODES.has(code.toLowerCase())
}

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Dominio público: BASE_URL si existe; si no, el origen de la petición. */
export function buildShortUrl(requestUrl: string, code: string): string {
  const base = env.BASE_URL?.trim() || new URL(requestUrl).origin
  return `${base.replace(/\/+$/, '')}/${code}`
}

/** ISO 8601 UTC sin milisegundos: 2026-10-28T15:42:10Z */
export function toIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
