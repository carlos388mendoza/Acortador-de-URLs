import { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from 'hono'

/** Si la validación de Zod falla, respondemos siempre con la forma { error } del contrato. */
export function createRouter<E extends Env = Env>() {
  return new OpenAPIHono<E>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? 'Datos no válidos'
        return c.json({ error: message }, 400)
      }
    },
  })
}
