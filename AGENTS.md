# Acortador de URLs

Proyecto en equipo: un acortador de URLs de uso general (estilo dub.co) con una API REST documentada y un dashboard administrativo.

- **Carlos** (carlos388mendoza): backend, base de datos, autenticación, API keys, estadísticas e infraestructura. Herramientas: Claude Code / OpenCode.
- **Compañero**: dashboard en React (interfaz, formularios, gráficas, QR). Herramienta: Codex.

Lee este archivo completo antes de escribir código. Si algo aquí contradice una instrucción del chat, pregunta antes de actuar.

## Stack

- TypeScript estricto en todo el proyecto (sin `any`).
- Backend: Hono + `@hono/zod-openapi` + Zod. Documentación con `@scalar/hono-api-reference`.
- Base de datos: Postgres en Neon, con Drizzle ORM (`drizzle-orm/neon-http` + `@neondatabase/serverless`).
- Códigos cortos: `nanoid` con alfabeto base62, 6 caracteres.
- Dashboard: React + Vite + React Router + TanStack Query + Tailwind (shadcn/ui opcional) + Recharts + `qr-code-styling`.
- Despliegue: Vercel (detecta Hono automáticamente desde `src/index.ts`).

## Estructura del repositorio

```
/
├─ src/                  Backend Hono (Carlos)
│  ├─ index.ts           App principal, export default (Vercel la detecta)
│  ├─ dev.ts             Servidor local en el puerto 3000 (carga .env)
│  ├─ db/                schema.ts e index.ts
│  ├─ routes/            Un router por recurso
│  ├─ middleware/        Sesión, roles y API keys
│  └─ lib/               Utilidades
├─ dashboard/            App React + Vite (compañero)
├─ public/dashboard/     Build del dashboard: generado, nunca se edita a mano y está en .gitignore
├─ drizzle.config.ts
├─ AGENTS.md             Este archivo
└─ CLAUDE.md             Contiene solo: @AGENTS.md
```

## Rutas de la aplicación

| Ruta | Qué hace |
|---|---|
| `POST /api/urls/new` | API pública: crear URL corta (requiere API key) |
| `GET /api/urls/{code}` | API pública: obtener URL (requiere API key) |
| `/api/auth/*` | Login, logout y sesión actual |
| `/api/admin/*` | Endpoints que consume el dashboard (requieren sesión) |
| `GET /api/doc` | Especificación OpenAPI en JSON |
| `GET /api/reference` | Interfaz de Scalar |
| `/dashboard/*` | Dashboard (SPA). Cualquier subruta devuelve el index.html |
| `GET /{code}` | Redirección 302 a la URL original (sin API key). Se registra al final |

Códigos reservados que nunca se pueden usar como código corto: `api`, `dashboard`, `docs`, `favicon.ico`, `robots.txt`, `assets`.

## Convenciones

- Todo el JSON de la API usa `snake_case` (`short_url`, `created_at`, `is_active`, `last_used_at`).
- Fechas en ISO 8601 UTC sin milisegundos: `2026-10-28T15:42:10Z`.
- Errores siempre con la forma `{ "error": "Mensaje en español" }`.
- Listados paginados devuelven `{ "data": [...], "total": 0, "page": 1, "limit": 20 }` y aceptan `?page=1&limit=20`.
- Todas las rutas de `/api` se definen con `createRoute` para que aparezcan en Scalar.
- Mensajes de commit en español con prefijo: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

## API pública (definida por los requisitos del proyecto)

Los dos endpoints `/api/urls/*` son para apps externas y **exigen una API key activa** en `x-api-key: <api_key>` o en `Authorization: Bearer <api_key>` (basta una de las dos; si vienen ambas deben traer la misma clave):
- Sin clave → `401 { "error": "API key requerida" }`. También cuenta como "sin clave" una cabecera vacía o `Authorization: Bearer` sin nada detrás (lo que envía Scalar sin token).
- Clave inexistente, desactivada, `Authorization` sin formato Bearer o dos claves distintas → `401 { "error": "API key inválida" }`.
- Cada uso válido actualiza `last_used_at`. La clave se comprueba antes que el body: sin clave válida siempre es `401`, aunque el body sea inválido.

`POST /api/urls/new` con `{ "url": "https://..." }`:
- `201` → `{ "code", "url", "short_url", "created_at" }`
- `400` → `{ "error": "La URL proporcionada no es válida" }` (solo se aceptan http y https)
- La URL queda asociada al dueño de la API key.

`GET /api/urls/{code}`:
- `200` → mismo objeto que arriba
- `404` → `{ "error": "URL no encontrada" }`

`GET /{code}` (sin API key, abierto para cualquiera) → `302` con header `Location`. El clic se registra en segundo plano con `waitUntil` de `@vercel/functions`. URLs borradas (`deleted_at` no nulo) devuelven 404.

## Contrato de autenticación y administración

Este contrato es el acuerdo entre backend y dashboard. Ninguno de los dos lo cambia sin avisar al otro y actualizar este archivo.

Sesión: cookie `httpOnly`, `sameSite=Lax`, `secure` en producción, firmada con `JWT_SECRET`. El dashboard hace todas sus peticiones con `credentials: 'include'`. Sin sesión → `401 { "error": "No autenticado" }`. Sin permiso → `403 { "error": "No autorizado" }`.

Roles: `admin` puede todo. `user` solo ve y maneja sus propias URLs y API keys, y no puede administrar usuarios.

### Auth
| Método y ruta | Body | Respuesta |
|---|---|---|
| `POST /api/auth/login` | `{ email, password }` | `200 { user }` y crea la cookie. `401` si las credenciales son incorrectas |
| `POST /api/auth/logout` | | `204` |
| `GET /api/auth/me` | | `200 { user }` o `401` |
| `PATCH /api/auth/me` | `{ name?, email?, current_password?, new_password? }` | `200 { user }`. Cambiar el correo o la contraseña exige `current_password` correcto (`401` si no). `409` si el correo ya existe |

Objeto `user`: `{ id, name, email, role, created_at, updated_at }` (nunca incluye el hash).

- `PATCH /api/auth/me`: si solo cambia `name`, no hace falta `current_password`. Si `email` es igual al actual (comparado en minúsculas), tampoco cuenta como cambio. `new_password` debe tener entre 8 y 72 caracteres. El cambio de correo no cierra la sesión.

### Usuarios (solo admin)
| Método y ruta | Body | Respuesta |
|---|---|---|
| `GET /api/admin/users?page&limit&search` | | Listado paginado de `user` |
| `POST /api/admin/users` | `{ name, email, password, role }` | `201 { user }`. `409` si el email ya existe |
| `PATCH /api/admin/users/{id}` | Cualquiera de `{ name, email, password, role }` | `200 { user }` |
| `DELETE /api/admin/users/{id}` | | `204`. Un admin no puede borrarse a sí mismo |

### URLs
| Método y ruta | Body | Respuesta |
|---|---|---|
| `GET /api/admin/urls?page&limit&search` | | Listado paginado de `admin_url` |
| `POST /api/admin/urls` | `{ url, code? }` | `201 { admin_url }`. `409` si el código existe o es reservado |
| `PATCH /api/admin/urls/{id}` | `{ url?, code? }` | `200 { admin_url }` |
| `DELETE /api/admin/urls/{id}` | | `204` (borrado suave con `deleted_at`) |

Objeto `admin_url`: `{ id, code, url, short_url, click_count, created_at, updated_at, creator: { id, name } | null }`.

### API keys
| Método y ruta | Body | Respuesta |
|---|---|---|
| `GET /api/admin/api-keys` | | `{ data: [api_key] }` |
| `POST /api/admin/api-keys` | `{ name }` | `201 { api_key, key }`. `key` es la clave completa y solo se devuelve aquí |
| `PATCH /api/admin/api-keys/{id}` | `{ name?, is_active? }` | `200 { api_key }` |
| `DELETE /api/admin/api-keys/{id}` | | `204` (pone `is_active = false`, no borra la fila) |

Objeto `api_key`: `{ id, name, key_prefix, is_active, last_used_at, created_at, owner: { id, name } }`.
Formato de la clave: `sk_` + 32 caracteres aleatorios. Se guarda solo su hash SHA-256. `key_prefix` son los primeros 8 caracteres.

### Búsqueda global (Ctrl+K del dashboard)
| Método y ruta | Respuesta |
|---|---|
| `GET /api/admin/search?q=texto&limit=5` | `{ "urls": [admin_url], "users": [user], "api_keys": [api_key] }` |

- `q` es obligatorio (1 a 100 caracteres, sin distinguir mayúsculas) y `limit` va de 1 a 10 (por defecto 5). Cada lista trae como máximo `limit` resultados.
- Busca en `code` y `url` de las URLs, en `name` y `email` de los usuarios, y en `name` y `key_prefix` de las API keys. Nunca devuelve `password_hash` ni `key_hash`.
- Un `user` normal solo recibe sus propias URLs y API keys; `users` siempre viene vacío. Un `admin` recibe todo.

### Estadísticas
| Método y ruta | Respuesta |
|---|---|
| `GET /api/admin/stats/summary` | `{ total_urls, total_clicks, total_users, active_api_keys }` |
| `GET /api/admin/stats/top-urls?limit=10` | `{ data: [admin_url] }` ordenado por `click_count` |
| `GET /api/admin/stats/recent-urls?limit=10` | `{ data: [admin_url] }` ordenado por `created_at` |
| `GET /api/admin/stats/top-creators?limit=10` | `{ data: [{ user: { id, name, email }, url_count, click_count }] }` |
| `GET /api/admin/stats/clicks-per-day?days=30` | `{ data: [{ date: "2026-10-28", clicks }] }` con días sin clics en 0 |

Para un `user` normal, las estadísticas se calculan solo con sus propias URLs.

## Modelo de datos

- `users`: id, name, email (único), password_hash (bcryptjs), role (`admin`/`user`), created_at, updated_at
- `api_keys`: id, user_id, name, key_prefix, key_hash (único), is_active, last_used_at, created_at
- `urls`: id, code (único), url, user_id, api_key_id, click_count, created_at, updated_at, deleted_at
- `clicks`: id, url_id, clicked_at, referrer, user_agent
- `login_attempts`: id, ip, email, failed_count, window_started_at, blocked_until, updated_at (único por ip + email)
- `rate_limits`: id, key, count, window_started_at (único por key; una fila por IP o API key)

## Variables de entorno

`.env` nunca se sube al repositorio y su contenido nunca se muestra en el chat ni en logs. Mantener `.env.example` actualizado sin valores reales.

- `DATABASE_URL`: cadena de conexión pooled de Neon
- `BASE_URL`: dominio público (en local se deduce de la petición)
- `JWT_SECRET`: cadena aleatoria larga
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: solo para el script que crea el primer admin
- `LOGIN_MAX_ATTEMPTS` (5), `LOGIN_WINDOW_MINUTES` (15): bloqueo de login
- `URL_RATE_LIMIT_PER_MINUTE` (30): intentos por minuto e IP con API key inválida en `/api/urls/*`
- `API_KEY_RATE_LIMIT_PER_MINUTE` (120): creaciones de URL por minuto y API key válida

## Branding

La carpeta `branding/` es la fuente de verdad de la imagen del proyecto:

| Archivo | Uso |
|---|---|
| `logo-original.png` | Original del que se generan los demás (puede ser `.png`, `.jpg`, `.webp` o `.svg`) |
| `logo.png` | Logo 512x512 con fondo transparente |
| `logo-192.png` | Logo 192x192 (PWA y QR) |
| `apple-touch-icon.png` | 180x180 para iOS |
| `favicon-32.png`, `favicon-16.png` | Favicons PNG |
| `favicon.ico` | Icono multi-resolución (16, 32 y 48) |
| `logo.svg` | Solo si el original es SVG |

- `npm run branding` regenera todo a partir de `branding/logo-original.*` (usa `sharp` y `png-to-ico`, dependencias de desarrollo) y también `src/lib/branding-assets.ts`, que embebe el favicon y el logo para que el backend los sirva en Vercel.
- El backend sirve `GET /favicon.ico` y `GET /branding/logo.png`. `/api/reference` (Scalar) usa el favicon y muestra el logo en la barra lateral.
- El dashboard debe copiar los archivos de `branding/` a `dashboard/public/` para sus propios iconos y para el logo de los códigos QR.

## Seguridad

Los límites se aplican por IP (primera entrada de `x-forwarded-for`; si no hay, `x-real-ip`, `cf-connecting-ip` o el socket). En Vercel el proxy de la plataforma rellena esas cabeceras.

- **Login**: 5 intentos fallidos para la misma pareja IP + correo dentro de 15 minutos bloquean nuevos intentos durante 15 minutos. Un login correcto borra el contador de esa pareja. Mientras está bloqueado se responde antes de comprobar la contraseña.
- **API pública** (`/api/urls/*`): las peticiones con API key inválida consumen un cupo de 30 por minuto e IP (contra quien prueba claves al azar); al agotarlo responden `429` en lugar de `401`. Sin cabecera de clave responden `401` sin consumir cupo.
- **Crear URL** (`POST /api/urls/new`) con clave válida: 120 por minuto y API key. Es independiente del cupo por IP.
- Cualquier límite superado devuelve `429 { "error": "Demasiados intentos. Intenta de nuevo en unos minutos" }` con la cabecera `Retry-After` en segundos.
- Los contadores viven en `login_attempts` y `rate_limits`; se limpian solos (de forma probabilística, dentro de una petición) pasados 24 h y 1 h respectivamente.
- `hono/secure-headers` añade CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, políticas de origen y HSTS solo en producción. La CSP permite explícitamente `cdn.jsdelivr.net`, `fonts.scalar.com` y estilos/scripts en línea para que Scalar siga funcionando.
- El dashboard se sirve como archivo estático desde Vercel, así que su CSP y sus cabeceras están en `vercel.json` (misma política que la del backend). En local las aplica `src/dev.ts`.
- Los cuatro límites son configurables con `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MINUTES`, `URL_RATE_LIMIT_PER_MINUTE` y `API_KEY_RATE_LIMIT_PER_MINUTE`.

## Dashboard

- Vive en `dashboard/` con su propio `package.json`.
- Vite con `base: '/dashboard/'` y proxy de `/api` hacia `http://localhost:3000` en desarrollo.
- React Router con `basename="/dashboard"`.
- Todas las llamadas a la API pasan por un solo cliente en `dashboard/src/api/`, que usa `credentials: 'include'`.
- Mientras un endpoint no exista todavía, se usan datos simulados activados con `VITE_USE_MOCKS=true`, con la forma exacta del contrato de arriba.
- Páginas: Login, Inicio (estadísticas), URLs, API keys, Usuarios (solo visible para admin).
- Debe verse bien en el celular.

## Fases

**Carlos**
- Fase 0: base del proyecto, API pública, OpenAPI y Scalar, redirección, despliegue.
- Fase 1: usuarios, login, sesión, roles y script para crear el primer admin.
- Fase 2: API keys y su uso en `POST /api/urls/new`.
- Fase 3: CRUD de administración de usuarios y URLs.
- Fase 4: estadísticas.
- Fase 5: servir el dashboard en `/dashboard` (build de Vite a `public/dashboard`, fallback SPA, script `build` de la raíz) y verificar en Vercel.

**Compañero**
- Fase A: proyecto Vite, estructura, layout, rutas, cliente de API, mocks y pantalla de login.
- Fase B: pantallas de URLs, API keys y usuarios.
- Fase C: panel de estadísticas con gráficas.
- Fase D: códigos QR con logo opcional y descarga en PNG.
- Fase E: pulido (carga, errores, móvil) y README.

## Flujo de Git

- Una rama por fase: `feature/fase-1-auth`, `feature/dashboard-login`, etc.
- Nunca push directo a `main` (excepto la Fase 0). Se trabaja con Pull Requests usando `gh pr create`.
- Antes de abrir un PR: `git pull origin main`, resolver conflictos, y que pasen `npm run typecheck` y el build.
- El backend no toca `dashboard/` y el dashboard no toca `src/`, salvo acuerdo explícito.
- Al terminar cada fase, detenerse y mostrar un resumen de lo hecho, cómo probarlo y el enlace al PR.

## Notas de implementación del backend

Detalles que el contrato no fija y que el backend resolvió así (el dashboard puede depender de ellos):

- Validación fallida → `400 { "error": "Mensaje en español" }` (primer error de validación).
- Body con JSON mal escrito → `400`, nunca `500`: en `/api/urls/*` con `{ "error": "La URL proporcionada no es válida" }` y en el resto con `{ "error": "El cuerpo de la petición no es un JSON válido" }`.
- `limit` mayor a 100 se recorta a 100 (no da error). `page` o `limit` menores a 1 → 400. `days` en clicks-per-day: por defecto 30, máximo 365.
- Un admin que intenta borrarse a sí mismo o quitarse su propio rol → `400`.
- API keys: una key ajena (para un `user`) → `403`; una URL ajena o borrada → `404`.
- `POST /api/admin/urls` con código existente (incluso de una URL borrada) o reservado → `409`; con formato inválido → `400`.
- `clicks-per-day` agrupa por día en UTC. `total_users` para un `user` normal es siempre 1.
- Los correos se guardan y comparan en minúsculas. Las contraseñas deben tener entre 8 y 72 caracteres.
- Cookie de sesión: se llama `session`.
- `GET /api/admin/search`: `q` vacío o solo espacios → `400`; `limit` mayor a 10 → `400` (no se recorta). El orden es por fecha de creación descendente.
- `PATCH /api/auth/me`: si se intenta cambiar el correo o la contraseña sin `current_password` o con una incorrecta → `401 { "error": "La contraseña actual es incorrecta" }`. Un body vacío o sin cambios devuelve `200` con el usuario actual.
- Login: los 5 primeros fallos devuelven `401`; el sexto y los siguientes devuelven `429` hasta que expire el bloqueo. `Retry-After` siempre son segundos enteros.
- API pública: la clave se lee de `x-api-key` o de `Authorization: Bearer`. Las peticiones con clave inválida consumen el cupo de 30/min de la IP y devuelven `401` mientras quede cupo (luego `429`). Una clave válida usa su propio cupo de 120/min solo al crear URLs; `GET /api/urls/{code}` con clave válida no tiene límite.
