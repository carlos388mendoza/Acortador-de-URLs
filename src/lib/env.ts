/** Lectura de variables de entorno sin depender de `@types/node` (compatible con el typecheck de Vercel). */
const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
export const env: Record<string, string | undefined> = proc?.env ?? {}
