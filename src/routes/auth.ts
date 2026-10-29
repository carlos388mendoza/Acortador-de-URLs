import { createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { burnPasswordCheck, clearSession, createSession, verifyPassword } from '../lib/auth'
import { createRouter } from '../lib/router'
import { errorResponse, UserSchema } from '../lib/schemas'
import { toUser } from '../lib/serializers'
import { requireAuth, type AuthEnv } from '../middleware/auth'

const LoginBodySchema = z.object({
  email: z.string({ error: 'El correo es obligatorio' }).trim().min(1, 'El correo es obligatorio'),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
})

const UserResponse = z.object({ user: UserSchema })

const login = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Iniciar sesión (crea la cookie de sesión)',
  request: { body: { content: { 'application/json': { schema: LoginBodySchema } }, required: true } },
  responses: {
    200: { content: { 'application/json': { schema: UserResponse } }, description: 'Sesión iniciada' },
    400: errorResponse('Datos incompletos'),
    401: errorResponse('Credenciales incorrectas'),
  },
})

const logout = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Auth'],
  summary: 'Cerrar sesión',
  responses: { 204: { description: 'Sesión cerrada' } },
})

const me = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  summary: 'Usuario de la sesión actual',
  security: [{ cookieAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: { content: { 'application/json': { schema: UserResponse } }, description: 'Usuario actual' },
    401: errorResponse('No autenticado'),
  },
})

export const authRouter = createRouter<AuthEnv>()

authRouter.openapi(login, async (c) => {
  const { email, password } = c.req.valid('json')
  const [row] = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1)

  const valid = row ? await verifyPassword(password, row.passwordHash) : await burnPasswordCheck(password)
  if (!row || !valid) return c.json({ error: 'Credenciales incorrectas' }, 401)

  await createSession(c, row.id)
  return c.json({ user: toUser(row) }, 200)
})

authRouter.openapi(logout, (c) => {
  clearSession(c)
  return c.body(null, 204)
})

authRouter.openapi(me, (c) => c.json({ user: c.get('user') }, 200))
