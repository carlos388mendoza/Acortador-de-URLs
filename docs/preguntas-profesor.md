# Preguntas probables del profesor

Preguntas que puede hacer el profesor sobre el backend y las respuestas preparadas.

## Autenticación y sesiones

**¿Cómo se gestiona la sesión?**
Cookie `httpOnly`, `sameSite=Lax`, `secure` en producción, firmada con JWT (`JWT_SECRET`). El dashboard llama con `credentials: 'include'`. El middleware `requireAuth` relee al usuario de la BD en cada petición para que un borrado o cambio de rol surta efecto de inmediato.

**¿Cómo se evita revelar qué correos existen?**
En el login, si el correo no existe se ejecuta `burnPasswordCheck`, que compara contra un hash falso con el mismo coste. Así el tiempo de respuesta no delata la existencia del correo.

**¿Un admin puede borrarse a sí mismo?**
No. `DELETE /api/admin/users/{id}` devuelve 400 si el id es el del usuario de la sesión. Igual al intentar quitarse el rol admin.

## Base de datos y ORM

**¿Por qué Drizzle y no Prisma?**
Drizzle es más ligero, genera SQL tipado y funciona bien con el driver HTTP de Neon, que es stateless y adecuado para serverless.

**¿Cómo se evitan colisiones de códigos?**
`nanoid` con alfabeto base62 y 6 caracteres. La inserción usa `onConflictDoNothing` sobre la columna única `code`; si colisiona, se reintenta hasta 5 veces.

**¿Borrado físico o lógico?**
Lógico: `deleted_at` no nulo. Las URLs borradas devuelven 404 en la redirección y en `GET /api/urls/{code}`.

## Seguridad

**¿Cómo se protege el login contra fuerza bruta?**
Tabla `login_attempts` por IP + correo. 5 fallos en 15 minutos bloquean 15 minutos con respuesta 429 y `Retry-After`. Un login correcto borra el contador.

**¿Cómo se limita la creación de URLs?**
30 peticiones por minuto e IP sin clave válida (las claves inválidas consumen ese cupo) y 120 por minuto y API key válida. Tabla `rate_limits` con una fila por clave. Respuesta 429 con `Retry-After`.

**¿Qué cabeceras de seguridad se envían?**
CSP (que permite `cdn.jsdelivr.net`, `fonts.scalar.com` y estilos/scripts en línea para Scalar y el dashboard), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, políticas de origen y HSTS solo en producción.

**¿Dónde se guardan las API keys?**
Solo se guarda el hash SHA-256. La clave completa se devuelve una sola vez al crearla. `key_prefix` son los primeros 8 caracteres.

## Estadísticas y rendimiento

**¿Cómo se registran los clics sin frenar la redirección?**
`waitUntil` de `@vercel/functions`: la respuesta 302 se envía de inmediato y la inserción en `clicks` y el incremento de `click_count` ocurren en segundo plano.

**¿Las estadísticas son globales o por usuario?**
Para un `user` normal se calculan solo con sus propias URLs. Para un `admin`, sobre todas.

## Despliegue

**¿Cómo se despliega?**
Vercel detecta Hono desde `src/index.ts`. El dashboard se compila a `public/dashboard` con `npm run build`. La función serverless se genera como bundle con esbuild (`api/index.js`). Las variables de entorno se configuran en Vercel.

**¿Cómo se sirve el dashboard?**
Como SPA: Vercel sirve los archivos estáticos de `public/dashboard` y aplica el fallback a `index.html` mediante los rewrites de `vercel.json`. En local lo hace `src/dev.ts`.

## Contrato con el dashboard

**¿Cómo se coordina backend y dashboard?**
Mediante el contrato documentado en `AGENTS.md`: rutas, cuerpos, respuestas y códigos de error. Todo el JSON usa `snake_case`, fechas en ISO 8601 UTC sin milisegundos y errores con la forma `{ "error": "Mensaje en español" }`. Los listados paginados devuelven `{ data, total, page, limit }`.

**¿Qué pasa si el dashboard llama a un endpoint que no existe?**
Se usan datos simulados activados con `VITE_USE_MOCKS=true`, con la forma exacta del contrato. Cuando el endpoint existe, se desactivan los mocks.