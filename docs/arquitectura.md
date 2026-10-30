# Arquitectura del acortador de URLs

## Visión general

Aplicación web de uso general (estilo dub.co) que acorta URLs y ofrece un dashboard administrativo. Se despliega en Vercel y usa Neon (Postgres) como base de datos.

- **Backend**: Hono + `@hono/zod-openapi` + Zod, con documentación OpenAPI/Scalar.
- **Base de datos**: Postgres en Neon, acceso con Drizzle ORM (`drizzle-orm/neon-http`).
- **Dashboard**: React + Vite + React Router + TanStack Query + Tailwind + Recharts + `qr-code-styling`.
- **Despliegue**: Vercel. El backend se exporta desde `src/index.ts` y se sirve como función serverless; el dashboard se compila a `public/dashboard` y se sirve como estático.

## Estructura del repositorio

```
/
├─ src/                  Backend Hono
│  ├─ index.ts           App principal (export default)
│  ├─ dev.ts             Servidor local (puerto 3000)
│  ├─ db/                schema.ts e index.ts (Drizzle)
│  ├─ routes/            Un router por recurso
│  ├─ middleware/        Sesión, roles, API keys, seguridad
│  └─ lib/               Utilidades, esquemas, serializadores
├─ dashboard/            App React + Vite (compañero)
├─ public/               Build del dashboard (generado, gitignored)
├─ api/                  Función serverless para Vercel (bundle)
├─ scripts/              build, branding, seeds
├─ drizzle.config.ts
└─ AGENTS.md             Contrato backend-dashboard
```

## Flujo de una petición

1. Vercel recibe la petición y la enruta a la función serverless (`api/index.js`, bundle de `src/index.ts`) o a los archivos estáticos de `public/`.
2. Hono monta los routers por recurso bajo `/api` (`/api/urls`, `/api/auth`, `/api/admin/*`).
3. El middleware de seguridad (`hono/secure-headers`) añade CSP y cabeceras en todas las respuestas.
4. La autenticación se basa en una cookie `session` firmada con JWT (`JWT_SECRET`).
5. Las rutas de administración exigen sesión (`requireAuth`) y, cuando aplica, rol admin (`requireAdmin`). La API pública `/api/urls/*` exige una API key (`requireApiKey`) en `x-api-key` o `Authorization: Bearer`; se comprueba antes que el body.
6. La redirección `GET /{code}` es pública (sin API key) y va al final para no tapar otras rutas; el clic se registra con `waitUntil` de `@vercel/functions`.

## Modelo de datos

- `users`: id, name, email (único), password_hash (bcryptjs), role (`admin`/`user`), created_at, updated_at.
- `api_keys`: id, user_id, name, key_prefix, key_hash (único), is_active, last_used_at, created_at.
- `urls`: id, code (único), url, user_id, api_key_id, click_count, created_at, updated_at, deleted_at (borrado suave).
- `clicks`: id, url_id, clicked_at, referrer, user_agent.
- `login_attempts`: id, ip, email, failed_count, window_started_at, blocked_until, updated_at (único por ip + email).
- `rate_limits`: id, key, count, window_started_at (único por key; una fila por IP o API key).

## Seguridad

- **Login**: 5 fallos para la misma pareja IP + correo en 15 minutos bloquean 15 minutos. Un login correcto borra el contador. Respuesta 429 con `Retry-After`.
- **API pública** (`/api/urls/*`): sin API key → 401 `API key requerida`; clave inválida o desactivada → 401 `API key inválida`. Las claves inválidas consumen un cupo de 30 por minuto e IP (luego 429). Crear URL con clave válida: 120 por minuto y API key. Respuesta 429 con `Retry-After`.
- **IP**: primera entrada de `x-forwarded-for`, con fallback a `x-real-ip`, `cf-connecting-ip` o el socket.
- **Cabeceras**: `hono/secure-headers` con CSP que permite `cdn.jsdelivr.net`, `fonts.scalar.com` y estilos/scripts en línea (Scalar y dashboard). HSTS solo en producción.
- **Limpieza inline**: las filas viejas se borran probabilísticamente dentro de la misma petición.
- **Vercel**: la CSP y cabeceras del dashboard están en `vercel.json` porque Vercel sirve los estáticos antes del backend.

## Despliegue

- Producción: `https://acortador-de-urls-iota.vercel.app`.
- Variables de entorno en Vercel: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BASE_URL`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MINUTES`, `URL_RATE_LIMIT_PER_MINUTE`, `API_KEY_RATE_LIMIT_PER_MINUTE`, `NPM_CONFIG_PRODUCTION`, `NPM_CONFIG_INCLUDE`.
- Build: `npm run build` compila el dashboard a `public/dashboard`, genera el bundle `api/index.js` y ejecuta el typecheck (solo en local/CI).
- El dashboard se sirve como SPA desde `/dashboard/*` con fallback a `index.html`.
- Cada merge a `main` debe dejar en GitHub el estado **Vercel = success** en su commit. Si falta (Vercel no recibió el push y no aparece ningún despliegue, ni siquiera cancelado), se vuelve a desplegar con **Redeploy** del último despliegue de producción en el panel de Vercel o con un commit nuevo en `main` vía PR.

## Decisiones técnicas clave

1. **Drizzle + Neon HTTP**: consultas stateless sobre HTTP, ideales para serverless.
2. **Códigos base62 de 6 caracteres con nanoid**: 62^6 combinaciones, colisiones manejadas con `onConflictDoNothing`.
3. **Sesión JWT en cookie httpOnly**: no se expone el token al JavaScript del dashboard.
4. **Borrado suave (`deleted_at`)** en URLs: mantiene el historial y evita reutilizar códigos.
5. **Bundle con esbuild para Vercel**: un solo archivo `api/index.js` evita problemas de resolución de módulos en el runtime serverless.