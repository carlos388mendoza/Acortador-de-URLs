import { secureHeaders } from 'hono/secure-headers'
import { env } from '../lib/env'

const isProduction = () => env.NODE_ENV === 'production' || env.VERCEL === '1'

/**
 * CSP compatible con Scalar (`/api/reference`) y con el dashboard:
 * - Scalar carga su módulo desde cdn.jsdelivr.net y usa un script y estilos en línea.
 * - Las fuentes de Scalar vienen de fonts.scalar.com.
 * - El dashboard carga solo assets propios, pero comparte la misma política.
 */
const contentSecurityPolicy = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
  fontSrc: ["'self'", 'data:', 'https://fonts.scalar.com', 'https://cdn.jsdelivr.net'],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  frameSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  manifestSrc: ["'self'"],
  mediaSrc: ["'self'"],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.scalar.com', 'https://cdn.jsdelivr.net'],
  workerSrc: ["'self'", 'blob:'],
  ...(isProduction() ? { upgradeInsecureRequests: [] } : {}),
}

export const securityHeaders = secureHeaders({
  contentSecurityPolicy,
  // En local el servidor es HTTP: HSTS solo tiene sentido en producción
  strictTransportSecurity: isProduction() ? 'max-age=63072000; includeSubDomains' : false,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: ['none'],
    geolocation: ['none'],
    microphone: ['none'],
    payment: ['none'],
    usb: ['none'],
  },
})
