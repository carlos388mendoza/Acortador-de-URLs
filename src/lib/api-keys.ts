const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const KEY_RANDOM_LENGTH = 32

/** sk_ + 32 caracteres aleatorios (Web Crypto, sin sesgo de módulo). */
export function generateApiKey(): string {
  let out = ''
  // 248 = múltiplo de 62 más grande que cabe en un byte; descartar bytes >= 248 evita sesgo
  while (out.length < KEY_RANDOM_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(KEY_RANDOM_LENGTH))
    for (const b of bytes) {
      if (b < 248 && out.length < KEY_RANDOM_LENGTH) out += ALPHABET.charAt(b % 62)
    }
  }
  return `sk_${out}`
}

/** SHA-256 en hexadecimal. De la clave solo se guarda este hash. */
export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const keyPrefix = (key: string) => key.slice(0, 8)
