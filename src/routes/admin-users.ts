import { createRoute, z } from '@hono/zod-openapi'
import { count, desc, eq, ilike, or } from 'drizzle-orm'
import { getDb, schema } from '../db'
import { hashPassword } from '../lib/auth'
import { likePattern, paginated, PaginationQuery } from '../lib/pagination'
import { createRouter } from '../lib/router'
import { errorResponse, UserSchema } from '../lib/schemas'
import { toUser } from '../lib/serializers'
import { requireAdmin, requireAuth, type AuthEnv } from '../middleware/auth'

const tags = ['Usuarios (admin)']
const security = [{ cookieAuth: [] }]

const IdParam = z.object({
  id: z.coerce.number().int().positive({ error: 'El id no es válido' }).openapi({ example: 1 }),
})

const nameField = z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(100)
const emailField = z
  .string({ error: 'El correo es obligatorio' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'El correo no es válido' }))
const passwordField = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')
const roleField = z.enum(['admin', 'user'], { error: 'El rol debe ser admin o user' })

const commonErrors = {
  401: errorResponse('No autenticado'),
  403: errorResponse('No autorizado'),
}

const listUsers = createRoute({
  method: 'get',
  path: '/',
  tags,
  security,
  summary: 'Listar usuarios (paginado, búsqueda por nombre o correo)',
  request: { query: PaginationQuery },
  responses: {
    200: { content: { 'application/json': { schema: paginated(UserSchema) } }, description: 'Listado' },
    400: errorResponse('Parámetros no válidos'),
    ...commonErrors,
  },
})

const createUser = createRoute({
  method: 'post',
  path: '/',
  tags,
  security,
  summary: 'Crear un usuario',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({ name: nameField, email: emailField, password: passwordField, role: roleField }),
        },
      },
    },
  },
  responses: {
    201: { content: { 'application/json': { schema: z.object({ user: UserSchema }) } }, description: 'Creado' },
    400: errorResponse('Datos no válidos'),
    409: errorResponse('El correo ya existe'),
    ...commonErrors,
  },
})

const updateUser = createRoute({
  method: 'patch',
  path: '/{id}',
  tags,
  security,
  summary: 'Actualizar un usuario',
  request: {
    params: IdParam,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            name: nameField.optional(),
            email: emailField.optional(),
            password: passwordField.optional(),
            role: roleField.optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ user: UserSchema }) } }, description: 'Actualizado' },
    400: errorResponse('Datos no válidos'),
    404: errorResponse('No existe'),
    409: errorResponse('El correo ya existe'),
    ...commonErrors,
  },
})

const deleteUser = createRoute({
  method: 'delete',
  path: '/{id}',
  tags,
  security,
  summary: 'Eliminar un usuario (un admin no puede borrarse a sí mismo)',
  request: { params: IdParam },
  responses: {
    204: { description: 'Eliminado' },
    400: errorResponse('No puedes eliminar tu propia cuenta'),
    404: errorResponse('No existe'),
    ...commonErrors,
  },
})

export const adminUsersRouter = createRouter<AuthEnv>()
adminUsersRouter.use('*', requireAuth, requireAdmin)

adminUsersRouter.openapi(listUsers, async (c) => {
  const { page, limit, search } = c.req.valid('query')
  const db = getDb()
  const where = search
    ? or(ilike(schema.users.name, likePattern(search)), ilike(schema.users.email, likePattern(search)))
    : undefined

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt), desc(schema.users.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(schema.users).where(where),
  ])
  return c.json({ data: rows.map(toUser), total: totals[0]?.total ?? 0, page, limit }, 200)
})

adminUsersRouter.openapi(createUser, async (c) => {
  const { name, email, password, role } = c.req.valid('json')
  const [row] = await getDb()
    .insert(schema.users)
    .values({ name, email, passwordHash: await hashPassword(password), role })
    .onConflictDoNothing({ target: schema.users.email })
    .returning()
  if (!row) return c.json({ error: 'El correo ya está registrado' }, 409)
  return c.json({ user: toUser(row) }, 201)
})

adminUsersRouter.openapi(updateUser, async (c) => {
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')
  const db = getDb()

  const [current] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
  if (!current) return c.json({ error: 'Usuario no encontrado' }, 404)

  // Evita que el único admin se deje a sí mismo sin permisos
  if (id === c.get('user').id && body.role === 'user') {
    return c.json({ error: 'No puedes quitarte el rol de administrador a ti mismo' }, 400)
  }

  if (body.email !== undefined && body.email !== current.email) {
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, body.email)).limit(1)
    if (taken) return c.json({ error: 'El correo ya está registrado' }, 409)
  }

  const changes: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() }
  if (body.name !== undefined) changes.name = body.name
  if (body.email !== undefined) changes.email = body.email
  if (body.role !== undefined) changes.role = body.role
  if (body.password !== undefined) changes.passwordHash = await hashPassword(body.password)

  const [row] = await db.update(schema.users).set(changes).where(eq(schema.users.id, id)).returning()
  if (!row) return c.json({ error: 'Usuario no encontrado' }, 404)
  return c.json({ user: toUser(row) }, 200)
})

adminUsersRouter.openapi(deleteUser, async (c) => {
  const { id } = c.req.valid('param')
  if (id === c.get('user').id) return c.json({ error: 'No puedes eliminar tu propia cuenta' }, 400)

  const deleted = await getDb().delete(schema.users).where(eq(schema.users.id, id)).returning({ id: schema.users.id })
  if (deleted.length === 0) return c.json({ error: 'Usuario no encontrado' }, 404)
  return c.body(null, 204)
})
