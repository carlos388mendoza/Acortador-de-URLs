import { FAVICON_ICO_BASE64, LOGO_PNG_BASE64 } from './branding-assets'

declare const atob: (data: string) => string

/** Decodifica base64 sin depender de Buffer (funciona en Node y en edge). */
function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export const FAVICON_ICO = decodeBase64(FAVICON_ICO_BASE64)
export const LOGO_PNG = decodeBase64(LOGO_PNG_BASE64)
