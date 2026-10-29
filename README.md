# Acortador de URLs

Acortador de URLs con API REST documentada y dashboard administrativo. El contrato entre backend y dashboard está en [AGENTS.md](AGENTS.md).

## Backend

API en **Hono** con `@hono/zod-openapi` (validación con Zod y documentación automática), base de datos **Postgres en Neon** con **Drizzle ORM**, desplegada en **Vercel**.

### Puesta en marcha

```bash
npm install
cp .env.example .env        # completa los valores (ver abajo)
npm run db:push             # crea las tablas en Neon
npm run seed:admin          # crea o actualiza el administrador
npm run seed:demo           # (opcional) URLs y clics de ejemplo para las gráficas
npm run dev                 # http://localhost:3000
```

- Documentación interactiva (Scalar): `http://localhost:3000/api/reference`
- Especificación OpenAPI: `http://localhost:3000/api/doc`
- SKILL para agentes: `http://localhost:3000/api/skill` (o `skills/acortador-urls/SKILL.md` en el repo)
- Dashboard (si ya está compilado en `public/dashboard`): `http://localhost:3000/dashboard/`

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Cadena de conexión *pooled* de Neon |
| `JWT_SECRET` | Firma la cookie de sesión (cadena aleatoria larga) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Solo para `npm run seed:admin` |
| `BASE_URL` | Dominio público para construir `short_url` (en local se deduce de la petición) |

En Vercel se configuran en *Settings → Environment Variables*; después hay que volver a desplegar.

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor local en el puerto 3000 (también sirve `public/dashboard`) |
| `npm run branding` | Genera logo, favicons y el `.ico` en `branding/` a partir de `branding/logo-original.*` |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run build` | Instala y compila `dashboard/` hacia `public/dashboard` (si existe) y luego hace typecheck |
| `npm run db:push` / `db:studio` | Sincroniza el esquema con Neon / abre Drizzle Studio |
| `npm run seed:admin` | Crea o actualiza el administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD` |
| `npm run seed:demo` | Crea 12 URLs `demo-*` con ~900 clics repartidos en 30 días |

### Estructura

```
src/index.ts          App principal (export default, la detecta Vercel)
src/dev.ts            Servidor local + servido del dashboard
src/db/               Esquema Drizzle y conexión perezosa a Neon
src/routes/           Un router por recurso (auth, api-keys, admin-users, admin-urls, admin-stats, public-urls, redirect)
src/middleware/       requireAuth y requireAdmin
src/lib/              Utilidades: sesión, API keys, paginación, serializadores
scripts/              build, seed:admin, seed:demo
vercel.json           Rewrites del fallback SPA de /dashboard
```

### Endpoints

- **Públicos:** `POST /api/urls/new` (acepta `Authorization: Bearer sk_...` opcional), `GET /api/urls/{code}`, `GET /{code}` (redirección 302).
- **Sesión:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- **Administración** (requieren sesión): `/api/admin/users` (solo admin), `/api/admin/urls`, `/api/admin/api-keys`, `/api/admin/stats/*`.

### Decisiones de diseño y seguridad

- **Sesión:** JWT firmado (HS256) en una cookie `httpOnly`, `sameSite=Lax`, `secure` en producción, 7 días. `requireAuth` vuelve a leer al usuario en la base de datos, así que borrar a alguien o cambiarle el rol surte efecto de inmediato.
- **Contraseñas:** bcryptjs. En el login se compara contra un hash falso cuando el correo no existe, para no revelar qué correos están registrados.
- **API keys:** `sk_` + 32 caracteres aleatorios (Web Crypto). Solo se guarda el hash SHA-256 y los primeros 8 caracteres; la clave completa se muestra una única vez. `DELETE` desactiva, no borra.
- **Permisos:** `admin` puede todo; `user` solo ve y edita sus URLs y keys, y recibe 403 en `/api/admin/users`. Un admin no puede borrarse a sí mismo ni quitarse su propio rol.
- **Respuestas:** siempre pasan por serializadores (`toUser`, `toApiKey`, `toAdminUrl`), por lo que `password_hash` y `key_hash` nunca salen de la API.
- **Borrado suave:** las URLs se marcan con `deleted_at`; dejan de redirigir pero su código sigue ocupado.
- **Clics:** se registran con `waitUntil` de `@vercel/functions`, sin hacer esperar a quien visita el enlace.
- **Estadísticas:** `clicks-per-day` usa `generate_series` para que los días sin clics salgan con 0.
- **Rate limiting:** login (5 intentos por IP+correo en 15 min) y creación de URLs (30/min por IP sin key, 120/min por key válida). Respuesta 429 con `Retry-After`.
