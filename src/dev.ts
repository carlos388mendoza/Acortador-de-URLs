import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import app from './index'

// En producción Vercel sirve public/dashboard y aplica los rewrites de vercel.json.
// En local hacemos lo mismo aquí: archivos estáticos primero y, si no existe el archivo, index.html (fallback SPA).
const dev = new Hono()
dev.get('/dashboard', (c) => c.redirect('/dashboard/', 301))
dev.use('/dashboard/*', serveStatic({ root: './public' }))
dev.get('/dashboard/*', serveStatic({ path: './public/dashboard/index.html' }))
dev.route('/', app)

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: dev.fetch, port }, () => {
  console.log(`Servidor en http://localhost:${port}  (docs: /api/reference, dashboard: /dashboard/)`)
})
