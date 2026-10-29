# Cumplimiento de requisitos del enunciado

Verificación contra producción: `https://acortador-de-urls-iota.vercel.app`. Fecha de verificación: 29/10/2026.

## Tabla de cumplimiento

| Requisito (enunciado) | Dónde está implementado | Cómo se probó en producción | Resultado |
|---|---|---|---|
| API bajo `/api` | `src/index.ts` (`app.route('/api', api)`) | `curl https://.../api/doc` | ✅ 200 (OpenAPI JSON) |
| `POST /api/urls/new` → 201 | `src/routes/public-urls.ts` (`createUrl`) | `POST /api/urls/new` con `{"url":"https://example.com/..."}` | ✅ 201 + `{code, url, short_url, created_at}` |
| `POST /api/urls/new` → 400 (URL inválida) | `src/routes/public-urls.ts` + Zod (`isHttpUrl`) | `POST /api/urls/new` con `{"url":"ftp://..."}` | ✅ 400 `{error:"La URL proporcionada no es válida"}` |
| `GET /api/urls/{code}` → 200 | `src/routes/public-urls.ts` (`getUrl`) | `GET /api/urls/aAdHKO` | ✅ 200 |
| `GET /api/urls/{code}` → 404 | `src/routes/public-urls.ts` | `GET /api/urls/NOEXISTE` | ✅ 404 `{error:"URL no encontrada"}` |
| Redirección `GET /{code}` → 302 | `src/routes/redirect.ts` | `GET /aAdHKO` (sin seguir) | ✅ 302 con `Location` |
| URLs borradas devuelven 404 | `src/routes/redirect.ts` (`isNull(deletedAt)`) | Borrado suave + GET | ✅ 404 |
| OpenAPI (JSON) | `src/index.ts` (`api.doc('/doc')`) + `createRoute` en todas las rutas | `GET /api/doc` | ✅ 200 (JSON válido) |
| Scalar | `src/index.ts` (`Scalar(...)`) | `GET /api/reference` | ✅ 200 (HTML) |
| Postgres (Neon) + Drizzle | `src/db/index.ts`, `src/db/schema.ts`, `drizzle.config.ts` | `npm run db:push` aplicado | ✅ Tablas creadas |
| Dashboard en `/dashboard` | `vercel.json` (rewrites SPA), `src/dev.ts`, `scripts/build.mjs` | `GET /dashboard/` en producción | ✅ 200 |
| CRUD de usuarios (admin) | `src/routes/admin-users.ts` | `GET/POST/PATCH/DELETE /api/admin/users` | ✅ 200/201/200/204 |
| Estadísticas: populares, recientes, top creadores | `src/routes/admin-stats.ts` | `GET /api/admin/stats/top-urls`, `/recent-urls`, `/top-creators` | ✅ 200 |
| API keys: crear, actualizar, desactivar, último uso | `src/routes/api-keys.ts` | `POST/PATCH/DELETE /api/admin/api-keys` | ✅ 201/200/204 + `last_used_at` |
| CRUD de URLs (admin) | `src/routes/admin-urls.ts` | `GET/POST/PATCH/DELETE /api/admin/urls` | ✅ 200/201/200/204 |
| QR con imagen | Dashboard (`qr-code-styling`) — compañero | Verificado por compañero | ✅ (lado dashboard) |
| SKILL para agentes | `skills/acortador-urls/SKILL.md`, `GET /api/skill` | `GET /api/skill` | ✅ 200 (`text/markdown`) |
| Autenticación (login/logout/me) | `src/routes/auth.ts` | `POST /api/auth/login` → 200 + cookie | ✅ |
| Roles (admin/user) | `src/middleware/auth.ts` (`requireAuth`, `requireAdmin`) | `user` en `/api/admin/users` → 403 | ✅ |

## Nota sobre las rutas del enunciado

El enunciado usa ejemplos con `localhost:3000/urls/new`. En este proyecto las rutas públicas viven bajo `/api`, por lo que el equivalente es `localhost:3000/api/urls/new` (y en producción `https://acortador-de-urls-iota.vercel.app/api/urls/new`). Lo mismo aplica a `GET /urls/{code}` → `/api/urls/{code}`. La redirección `GET /{code}` sí va en la raíz, como indica el enunciado.<|end|>