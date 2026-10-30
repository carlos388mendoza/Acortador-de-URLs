// Pruebas de humo de la API pública contra un servidor en marcha (local o producción).
// Uso: SMOKE_BASE_URL=http://localhost:3000 SMOKE_API_KEY=sk_... npm run smoke:api
// Opcional: SMOKE_SESSION=<cookie session de un admin> para probar también JSON roto en /api/admin/*.
// Crea URLs de prueba con la clave indicada: úsala con una clave temporal y bórrala al terminar.

const base = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
const key = process.env.SMOKE_API_KEY
const session = process.env.SMOKE_SESSION
if (!key) {
  console.error('Falta SMOKE_API_KEY (una API key activa de prueba)')
  process.exit(1)
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const BROKEN_JSON = '{"url "https://www.google.com"}'
const INVALID_URL = { error: 'La URL proporcionada no es válida' }
const REQUIRED = { error: 'API key requerida' }
const INVALID_KEY = { error: 'API key inválida' }

let failures = 0
let createdCode = ''

async function check(name, path, init, expectedStatus, expectedBody) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual', ...init })
  const text = await response.text()
  let body = text
  try {
    body = JSON.parse(text)
  } catch {
    /* no es JSON (p. ej. la redirección) */
  }
  const bodyOk =
    expectedBody === undefined ||
    Object.entries(expectedBody).every(([field, value]) => body?.[field] === value)
  const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]
  const ok = statuses.includes(response.status) && bodyOk
  if (!ok) failures++
  console.log(
    `${ok ? '✓' : '✗'} ${name} | esperado ${statuses.join(' o ')} | obtenido ${response.status}${bodyOk ? '' : ` | cuerpo ${text.slice(0, 120)}`}`,
  )
  return body
}

const withKey = (headers = {}) => ({ ...headers, 'x-api-key': key })

// Sin clave: cabecera ausente, vacía o "Bearer" sin clave (lo que manda Scalar sin token)
await check('POST sin clave', '/api/urls/new', { method: 'POST', headers: JSON_HEADERS, body: '{"url":"https://example.com"}' }, 401, REQUIRED)
await check('GET sin clave', '/api/urls/demo-docs', {}, 401, REQUIRED)
await check('Authorization vacío', '/api/urls/demo-docs', { headers: { Authorization: '' } }, 401, REQUIRED)
await check('Authorization "Bearer " sin clave', '/api/urls/demo-docs', { headers: { Authorization: 'Bearer ' } }, 401, REQUIRED)
await check('x-api-key vacío', '/api/urls/demo-docs', { headers: { 'x-api-key': '' } }, 401, REQUIRED)
await check('JSON roto sin clave', '/api/urls/new', { method: 'POST', headers: JSON_HEADERS, body: BROKEN_JSON }, 401, REQUIRED)

// Clave inválida
await check('Clave inventada', '/api/urls/demo-docs', { headers: { 'x-api-key': 'sk_inventada' } }, 401, INVALID_KEY)
await check('Authorization sin "Bearer"', '/api/urls/demo-docs', { headers: { Authorization: key } }, 401, INVALID_KEY)

// Body roto o inválido con clave válida: siempre 400, nunca 500
await check('JSON roto + clave', '/api/urls/new', { method: 'POST', headers: withKey(JSON_HEADERS), body: BROKEN_JSON }, 400, INVALID_URL)
await check('Body vacío + clave', '/api/urls/new', { method: 'POST', headers: withKey(JSON_HEADERS), body: '' }, 400, INVALID_URL)
await check('JSON que no es objeto + clave', '/api/urls/new', { method: 'POST', headers: withKey(JSON_HEADERS), body: '"hola"' }, 400, INVALID_URL)
await check('URL no http + clave', '/api/urls/new', { method: 'POST', headers: withKey(JSON_HEADERS), body: '{"url":"ftp://x"}' }, 400, INVALID_URL)

// Casos válidos
const created = await check('POST válido (x-api-key)', '/api/urls/new', { method: 'POST', headers: withKey(JSON_HEADERS), body: '{"url":"https://example.com/smoke-api"}' }, 201)
createdCode = typeof created === 'object' && created ? created.code : ''
await check('GET válido (Bearer)', `/api/urls/${createdCode}`, { headers: { Authorization: `Bearer ${key}` } }, 200)
await check('GET código inexistente + clave', '/api/urls/no-existe-smoke', { headers: withKey() }, 404, { error: 'URL no encontrada' })
// En local responde la app (404); en Vercel la plataforma rechaza la URL antes con un 400. Nunca debe ser 500
await check('GET código con % mal codificado + clave', '/api/urls/%E0%A4%A', { headers: withKey() }, [400, 404])
await check('Redirección /{code} sin clave', `/${createdCode}`, {}, 302)

if (session) {
  const admin = (method, path) => ({
    method,
    headers: { ...JSON_HEADERS, Cookie: `session=${session}` },
    body: BROKEN_JSON,
  })
  const JSON_ERROR = { error: 'El cuerpo de la petición no es un JSON válido' }
  await check('Admin: POST /admin/urls con JSON roto', '/api/admin/urls', admin('POST', '/api/admin/urls'), 400, JSON_ERROR)
  await check('Admin: PATCH /admin/urls/1 con JSON roto', '/api/admin/urls/1', admin('PATCH'), 400, JSON_ERROR)
  await check('Admin: POST /admin/api-keys con JSON roto', '/api/admin/api-keys', admin('POST'), 400, JSON_ERROR)
  await check('Admin: POST /admin/users con JSON roto', '/api/admin/users', admin('POST'), 400, JSON_ERROR)
  await check('Admin: PATCH /auth/me con JSON roto', '/api/auth/me', admin('PATCH'), 400, JSON_ERROR)
  await check('Login con JSON roto', '/api/auth/login', { method: 'POST', headers: JSON_HEADERS, body: BROKEN_JSON }, 400, JSON_ERROR)
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodas las pruebas pasaron')
if (createdCode) console.log(`URL de prueba creada: /${createdCode} (bórrala si no la necesitas)`)
process.exit(failures ? 1 : 0)
