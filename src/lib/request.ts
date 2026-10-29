import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'
import { isIP } from 'node:net'

const IP_MAX_LENGTH = 45
const UNKNOWN_IP = 'desconocida'

/** Acepta "203.0.113.7", "203.0.113.7:443", "2001:db8::1" o "[2001:db8::1]:443". */
function parseIp(raw: string | undefined): string | null {
  const first = raw?.split(',')[0]?.trim()
  if (!first) return null
  if (isIP(first)) return first

  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(first)
  if (ipv4WithPort?.[1] && isIP(ipv4WithPort[1]) === 4) return ipv4WithPort[1]

  const ipv6WithPort = /^\[([0-9a-fA-F:]+)\]:\d+$/.exec(first)
  if (ipv6WithPort?.[1] && isIP(ipv6WithPort[1]) === 6) return ipv6WithPort[1]

  return null
}

/**
 * IP del cliente. En Vercel y detrás de un proxy la primera entrada de `x-forwarded-for`
 * es la del cliente; en local se usa el socket como último recurso.
 */
export function getClientIp(c: Context): string {
  const candidates = [
    c.req.header('x-forwarded-for'),
    c.req.header('x-real-ip'),
    c.req.header('cf-connecting-ip'),
  ]
  for (const candidate of candidates) {
    const ip = parseIp(candidate)
    if (ip) return ip
  }

  try {
    const address = getConnInfo(c).remote.address
    if (address && isIP(address)) return address
  } catch {
    // En runtimes sin socket (por ejemplo, pruebas con app.request) no hay conninfo
  }

  return UNKNOWN_IP.slice(0, IP_MAX_LENGTH)
}
