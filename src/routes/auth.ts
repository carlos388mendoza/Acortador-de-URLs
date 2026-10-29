import { createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { burnPasswordCheck, clearSession, createSession, hashPassword, verifyPassword } from '../lib/auth'
import {
  clearFailedLogins,
  loginBlockSeconds,
  recordFailedLogin,
  sendRateLimited,
} from '../lib/rate-limit'
import { getClientIp } from '../lib/request'
import { createRouter } from '../lib/router'
import { errorResponse, ErrorSchema, UserSchema } from '../lib/schemas'
import { toUser } from '../lib/serializers'
import { requireAuth, type AuthEnv } from '../middleware/auth'

const LoginBodySchema = z.object({
  email: z.string({ error: 'El correo es obligatorio' }).trim().min(1, 'El correo es obligatorio'),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
})

const UserResponse = z.object({ user: UserSchema })

const UpdateMeBodySchema = z.object({
  name: z.string({ error: 'El nombre no es válido' }).trim().min(1, 'El nombre no puede estar vacío').max(100).optional(),
  email: z
    .string({ error: 'El correo no es válido' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'El correo no es válido' }))
    .optional(),
  current_password: z
    .string({ error: 'La contraseña actual no es válida' })
    .min(1, 'La contraseña actual no es válida')
    .optional(),
  new_password: z
    .string({ error: 'La contraseña no es válida' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres')
    .optional(),
})

const login = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Iniciar sesión (crea la cookie de sesión)',
  description:
    'Tras 5 intentos fallidos para la misma IP y correo, la cuenta queda bloqueada 15 minutos (429 con `Retry-After`). Un login correcto reinicia el contador.',
  request: { body: { content: { 'application/json': { schema: LoginBodySchema } }, required: true } },
  responses: {
    200: { content: { 'application/json': { schema: UserResponse } }, description: 'Sesión iniciada' },
    400: errorResponse('Datos incompletos'),
    401: errorResponse('Credenciales incorrectas'),
    429: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Demasiados intentos fallidos',
      headers: z.object({
        'Retry-After': z.string().openapi({ description: 'Segundos que faltan para poder reintentar' }),
      }),
    },
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

const updateMe = createRoute({
  method: 'patch',
  path: '/me',
  tags: ['Auth'],
  summary: 'Actualizar el perfil propio (nombre, correo o contraseña)',
  description:
    'Cambiar el correo o la contraseña exige `current_password` correcto (401 si no). Si el correo ya existe, 409.',
  security: [{ cookieAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: { content: { 'application/json': { schema: UpdateMeBodySchema } }, required: true },
  },
  responses: {
    200: { content: { 'application/json': { schema: UserResponse } }, description: 'Perfil actualizado' },
    400: errorResponse('Datos no válidos'),
    401: errorResponse('No autenticado o contraseña actual incorrecta'),
    409: errorResponse('El correo ya está registrado'),
  },
})

export const authRouter = createRouter<AuthEnv>()

authRouter.openapi(login, async (c) => {
  const { email, password } = c.req.valid('json')
  const normalizedEmail = email.toLowerCase()
  const ip = getClientIp(c)

  const blockedFor = await loginBlockSeconds(ip, normalizedEmail)
  if (blockedFor > 0) return sendRateLimited(c, blockedFor)

  const [row] = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1)

  const valid = row ? await verifyPassword(password, row.passwordHash) : await burnPasswordCheck(password)
  if (!row || !valid) {
    await recordFailedLogin(ip, normalizedEmail)
    return c.json({ error: 'Credenciales incorrectas' }, 401)
  }

  await clearFailedLogins(ip, normalizedEmail)
  await createSession(c, row.id)
  return c.json({ user: toUser(row) }, 200)
})

authRouter.openapi(logout, (c) => {
  clearSession(c)
  return c.body(null, 204)
})

authRouter.openapi(me, (c) => c.json({ user: c.get('user') }, 200))

authRouter.openapi(updateMe, async (c) => {
  const body = c.req.valid('json')
  const sessionUser = c.get('user')
  const db = getDb()

  const [current] = await db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).limit(1)
  if (!current) return c.json({ error: 'No autenticado' }, 401)

  const nextEmail = body.email
  const nextPassword = body.new_password
  const emailChanged = nextEmail !== undefined && nextEmail !== current.email
  const passwordChanged = nextPassword !== undefined

  // El correo y la contraseña son datos sensibles: exigen la contraseña actual
  if (emailChanged || passwordChanged) {
    const valid = body.current_password
      ? await verifyPassword(body.current_password, current.passwordHash)
      : false
    if (!valid) return c.json({ error: 'La contraseña actual es incorrecta' }, 401)
  }

  const changes: Partial<typeof schema.users.$inferInsert> = {}
  if (body.name !== undefined) changes.name = body.name

  if (emailChanged && nextEmail !== undefined) {
    const [taken] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, nextEmail))
      .limit(1)
    if (taken) return c.json({ error: 'El correo ya está registrado' }, 409)
    changes.email = nextEmail
  }

  if (passwordChanged && nextPassword !== undefined) {
    changes.passwordHash = await hashPassword(nextPassword)
  }

  if (Object.keys(changes).length === 0) return c.json({ user: toUser(current) }, 200)
  changes.updatedAt = new Date()

  const [updated] = await db
    .update(schema.users)
    .set(changes)
    .where(eq(schema.users.id, current.id))
    .returning()
  if (!updated) return c.json({ error: 'No autenticado' }, 401)
  return c.json({ user: toUser(updated) }, 200)
})
