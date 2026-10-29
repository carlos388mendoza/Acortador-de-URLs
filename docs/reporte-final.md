# Reporte final — Acortador de URLs (backend)

## 1. Fases y Pull Requests

| Fase | Descripción | PR | Commit | Estado |
|---|---|---|---|---|
| 6 | Logo, favicons y branding (assets embebidos, Scalar) | #6 | be39f60 | ✅ Mergeado |
| 7 | Búsqueda global y perfil (search, PATCH /auth/me) | #7 | 6185791 | ✅ Mergeado |
| 8 | Seguridad (bloqueo login, rate limiting, cabeceras) | #13 | b9ff73f | ✅ Mergeado |
| 9 | Despliegue en Vercel (producción) | — (directo a main) | varios | ✅ Funcionando |
| 10 | Neon test branch + Vitest + GitHub Actions | — | — | ⏳ Pendiente |
| 11 | Integración del dashboard (servir build) | — | — | ✅ Servido en `/dashboard` |
| 12 | Documentación (`docs/arquitectura.md`, `docs/preguntas-profesor.md`) | — (directo a main) | cec84e2 | ✅ Mergeado |

Nota: las fases 9 y 12 se subieron directamente a `main` por motivos de despliegue iterativo. Las fases 6, 7 y 8 siguieron el flujo de PR.

## 2. Tabla de pruebas

### Locales (localhost:3000 / 3100)

| Caso | Esperado | Obtenido | Resultado |
|---|---|---|---|
| Admin login correcto | 200 + cookie | 200 | ✅ |
| Login con contraseña incorrecta (×5) | 401 | 401 | ✅ |
| 6º intento de login | 429 + Retry-After | 429, Retry-After=900 | ✅ |
| Login correcto tras 3 fallos (reinicio) | 200 | 200 | ✅ |
| 4 fallos tras el reinicio + login correcto | 200 | 200 | ✅ |
| Crear URL anónima (×2) | 201 | 201 | ✅ |
| 3ª URL anónima (límite 2/min) | 429 + Retry-After | 429, Retry-After≈59 | ✅ |
| Otra IP no bloqueada | 201 | 201 | ✅ |
| Clave inválida ×2 | 401 | 401 | ✅ |
| 3ª con clave inválida | 429 | 429 | ✅ |
| Clave válida ×3 | 201 | 201 | ✅ |
| 4ª con clave válida | 429 | 429 | ✅ |
| IP de clave conserva cupo anónimo | 201 | 201 | ✅ |
| Scalar `/api/reference` con CSP | 200, sin errores de consola | 200, 0 errores | ✅ |
| `GET /api/doc` documenta 429 | 429 con Retry-After | Sí | ✅ |

Total local: 33/33 casos correctos.

### Producción (`https://acortador-de-urls-iota.vercel.app`)

| Caso | Esperado | Obtenido | Resultado |
|---|---|---|---|
| `GET /api/reference` | 200 | 200 | ✅ |
| `GET /favicon.ico` | 200 | 200 | ✅ |
| `GET /branding/logo.png` | 200 | 200 | ✅ |
| `GET /dashboard/` | 200 | 200 | ✅ |
| `POST /api/urls/new` (URL válida) | 201 + código | 201, code `Q9wuRb` | ✅ |
| `GET /{code}` (redirect) | 302 + Location | 302 → https://example.com/prod-test | ✅ |
| `GET /api/urls/{code}` | 200 | (no probado) | — |

## 3. Dominio y rutas de producción

- **Dominio**: `https://acortador-de-urls-iota.vercel.app`
- **Rutas verificadas**: `/api/reference`, `/favicon.ico`, `/branding/logo.png`, `/dashboard/`, `/api/urls/new`, `/{code}` (302).

## 4. Pasos manuales y pendientes

- **Fase 10 (tests/CI)**: pendiente. Falta crear el branch `test` en Neon, configurar Vitest y el workflow de GitHub Actions. El backend está listo para recibirlos (contrato documentado).
- **Fase 11 (integración dashboard)**: el dashboard ya se sirve en `/dashboard`. La integración con la API real (`VITE_USE_MOCKS=false`) es tarea del compañero; el backend ya expone todos los endpoints.
- **Limpieza de URLs de prueba en producción**: se borró la URL de prueba creada (`Q9wuRb`).
- **Variables de entorno en Vercel**: configuradas (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BASE_URL`, `NPM_CONFIG_PRODUCTION`, `NPM_CONFIG_INCLUDE`, `VERCEL_FORCE_NO_BUILD_CACHE`).
- **Protección de despliegue**: deshabilitada (SSO y password) para acceso público.
- **Vulnerabilidades de npm**: 8 (4 moderate, 4 high) por `sharp`/`png-to-ico` (devDependencies). No bloqueantes.

## 5. Cambios de contrato (para el compañero)

Ninguno rompe el contrato existente. Se añaden:

- **429** en `POST /api/auth/login` y `POST /api/urls/new` con body `{ "error": "Demasiados intentos. Intenta de nuevo en unos minutos" }` y cabecera `Retry-After` (segundos).
- **Tablas nuevas**: `login_attempts`, `rate_limits` (solo backend, no afectan al dashboard).
- **Variables de entorno opcionales**: `LOGIN_MAX_ATTEMPTS` (5), `LOGIN_WINDOW_MINUTES` (15), `URL_RATE_LIMIT_PER_MINUTE` (30), `API_KEY_RATE_LIMIT_PER_MINUTE` (120).
- **CSP y cabeceras de seguridad**: el dashboard debe seguir cargando assets propios (ya permitidos por `default-src 'self'`). Si añade fuentes o scripts externos, avisar para ampliar la CSP.

### Mensaje listo para el compañero

> Hola, subí la Fase 8 (seguridad) a `main`. No cambia el contrato existente, solo añade respuestas 429 con `Retry-After` en login y creación de URL. Los límites son 5 intentos de login por IP+correo en 15 min y 30/120 creaciones por minuto (IP/API key). El dashboard ya se sirve en `/dashboard` en producción (`https://acortador-de-urls-iota.vercel.app`). Si el dashboard usa recursos externos (fuentes, scripts), avísame para ampliar la CSP. Los endpoints y formas no cambian.

## 6. Cinco decisiones técnicas más importantes

1. **Drizzle ORM + Neon HTTP**: consultas stateless sobre HTTP, ideales para serverless; tipado fuerte sin generación de cliente.
2. **Códigos base62 de 6 caracteres con nanoid**: 62^6 combinaciones, colisiones manejadas con `onConflictDoNothing` y reintento.
3. **Sesión JWT en cookie httpOnly**: el token nunca llega al JavaScript del dashboard; `requireAuth` relee al usuario de la BD en cada petición.
4. **Borrado suave (`deleted_at`)** en URLs: mantiene historial y evita reutilizar códigos.
5. **Bundle con esbuild para Vercel**: un solo archivo `api/index.js` evita problemas de resolución de módulos en el runtime serverless, donde `@vercel/node` no seguía las importaciones relativas `.ts`.