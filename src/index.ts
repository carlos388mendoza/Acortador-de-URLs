import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { FAVICON_ICO, LOGO_PNG } from './lib/branding'
import { adminSearchRouter } from './routes/admin-search'
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
api.route('/admin/search', adminSearchRouter)
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
/** Configuración de Scalar: favicon propio y el logo de la marca en la barra lateral. */
const scalarOptions = {
  url: '/api/doc',
  pageTitle: 'Acortador de URLs - API',
  favicon: '/favicon.ico',
  metaData: {
    title: 'Acortador de URLs - API',
    description: 'Documentación interactiva de la API del acortador de URLs',
    ogImage: '/branding/logo.png',
  },
  customCss: `
    /* Logo de la marca en la parte superior de la barra lateral */
    #app .t-doc__sidebar { position: relative; padding-top: 68px; }
    #app .t-doc__sidebar::before {
      content: '';
      position: absolute;
      top: 14px;
      left: 18px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: url('/branding/logo.png') center / contain no-repeat;
    }
    #app .t-doc__sidebar::after {
      content: 'Acortador de URLs';
      position: absolute;
      top: 26px;
      left: 68px;
      font-weight: 600;
      color: var(--scalar-color-1);
    }
    /* En móvil el logo va en la cabecera */
    #app .t-doc__header { background: url('/branding/logo.png') no-repeat 12px center / 28px 28px; }
    #app .t-doc__header > * { padding-left: 36px; }
  `,
} satisfies Parameters<typeof Scalar>[0] & { favicon: string; metaData: Record<string, string> }

api.get('/reference', Scalar(scalarOptions))

// Favicon y logo servidos por el backend: no dependen de archivos estáticos ni chocan con /{code}
app.get('/favicon.ico', (c) =>
  c.body(FAVICON_ICO, 200, {
    'Content-Type': 'image/x-icon',
    'Cache-Control': 'public, max-age=86400',
  }),
)
app.get('/branding/logo.png', (c) =>
  c.body(LOGO_PNG, 200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400',
  }),
)

api.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))
api.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Error interno del servidor' }, 500)
})

app.route('/api', api)
// La redirección va siempre al final para no tapar las demás rutas
app.route('/', redirectRouter)

export default app
