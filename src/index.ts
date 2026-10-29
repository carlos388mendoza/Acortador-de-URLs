import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { adminStatsRouter } from './routes/admin-stats'
import { adminUrlsRouter } from './routes/admin-urls'
import { adminUsersRouter } from './routes/admin-users'
import { apiKeysRouter } from './routes/api-keys'
import { authRouter } from './routes/auth'
import { publicUrlsRouter } from './routes/public-urls'
import { redirectRouter } from './routes/redirect'

const app = new OpenAPIHono()

const api = new OpenAPIHono()

api.openAPIRegistry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'session',
  description: 'Cookie de sesión que se crea con POST /auth/login',
})

api.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  description: 'API key con formato sk_...',
})

api.route('/urls', publicUrlsRouter)
api.route('/admin/api-keys', apiKeysRouter)
api.route('/admin/users', adminUsersRouter)
api.route('/admin/urls', adminUrlsRouter)
api.route('/admin/stats', adminStatsRouter)
api.route('/auth', authRouter)

api.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Acortador de URLs',
    version: '1.0.0',
    description: 'API REST del acortador de URLs',
  },
  servers: [{ url: '/api' }],
})
api.get('/reference', Scalar({ url: '/api/doc', pageTitle: 'Acortador de URLs - API' }))

api.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))
api.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Error interno del servidor' }, 500)
})

app.route('/api', api)
// La redirección va siempre al final para no tapar las demás rutas
app.route('/', redirectRouter)

export default app
