export const SKILL_CONTENT = `---
name: acortador-urls
description: Use this skill when a project needs to shorten URLs, look up a URL by its short code, or generate short links using the Acortador de URLs API. Covers integration patterns, authentication with API keys, error handling (400, 401, 404, 429), rate limits, and best practices.
---

# Acortador de URLs — API

API REST pública para acortar URLs y obtener la URL original a partir de un código corto. Documentación interactiva (Scalar): https://acortador-de-urls-iota.vercel.app/api/reference. Especificación OpenAPI: https://acortador-de-urls-iota.vercel.app/api/doc. La especificación descargada está en \`references/openapi.json\`.

## URL base

Todas las rutas públicas viven bajo \`/api\`:

\`\`\`
https://acortador-de-urls-iota.vercel.app/api
\`\`\`

En local: \`http://localhost:3000/api\`.

## Obtener una API key (opcional)

1. Entra al dashboard: https://acortador-de-urls-iota.vercel.app/dashboard/
2. Inicia sesión con tu cuenta.
3. Ve a la sección **API keys** y crea una nueva clave con un nombre descriptivo.
4. Copia la clave completa (formato \`sk_\` + 32 caracteres). **Solo se muestra una vez.**
5. Guárdala en una variable de entorno (\`ACORTADOR_API_KEY\`). Nunca la pongas en el frontend ni en el repositorio.

Sin API key las URLs se crean de forma anónima. Con una clave válida la URL queda asociada a tu cuenta y se actualiza \`last_used_at\`.

## Endpoints públicos

### 1. Crear una URL corta

\`POST /api/urls/new\`

Body:
\`\`\`json
{ "url": "https://example.com/pagina-larga" }
\`\`\`

Solo se aceptan URLs \`http\` y \`https\`.

Header opcional:
\`\`\`
Authorization: Bearer sk_...
\`\`\`

Respuesta \`201 Created\`:
\`\`\`json
{
  "code": "EyvLMH",
  "url": "https://example.com/pagina-larga",
  "short_url": "https://acortador-de-urls-iota.vercel.app/EyvLMH",
  "created_at": "2026-10-29T15:42:10Z"
}
\`\`\`

### 2. Obtener una URL por código

\`GET /api/urls/{code}\`

Respuesta \`200 OK\`: mismo objeto que arriba.

### 3. Redirección

\`GET /{code}\` → \`302 Found\` con header \`Location\` apuntando a la URL original. Úsalo directamente como enlace corto.

## Errores

| Código | Cuerpo | Cuándo |
|---|---|---|
| 400 | \`{ "error": "La URL proporcionada no es válida" }\` | URL no http/https o body inválido |
| 401 | \`{ "error": "API key inválida" }\` | \`Authorization\` presente pero la key no existe o está desactivada |
| 404 | \`{ "error": "URL no encontrada" }\` | Código inexistente o URL borrada (\`deleted_at\` no nulo) |
| 429 | \`{ "error": "Demasiados intentos. Intenta de nuevo en unos minutos" }\` | Límite superado. Incluye \`Retry-After\` (segundos) |

## Límites de uso

- Sin API key válida: **30 peticiones por minuto e IP**.
- Con API key válida: **120 peticiones por minuto y API key** (independiente del cupo de la IP).
- Login: 5 intentos fallidos por IP + correo en 15 minutos bloquean 15 minutos.

## Buenas prácticas

- Guarda la API key en variables de entorno, nunca en el frontend ni en el repositorio.
- Valida la URL (http/https) antes de enviarla.
- Ante un 429, espera los segundos indicados en \`Retry-After\` y reintenta.
- No expongas la key en código cliente; si necesitas acortar desde el navegador, hazlo a través de tu propio backend.
- Reutiliza el \`short_url\` devuelto; no vuelvas a crear la misma URL si ya la tienes.

## Ejemplos de integración

### curl

Crear:
\`\`\`bash
curl -s -X POST https://acortador-de-urls-iota.vercel.app/api/urls/new \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \$ACORTADOR_API_KEY" \\
  -d '{"url":"https://example.com/pagina-larga"}'
\`\`\`

Consultar:
\`\`\`bash
curl -s https://acortador-de-urls-iota.vercel.app/api/urls/EyvLMH
\`\`\`

### TypeScript (fetch, función reutilizable)

\`\`\`ts
type ShortUrl = {
  code: string
  url: string
  short_url: string
  created_at: string
}

type AcortadorError = { error: string }

const BASE = 'https://acortador-de-urls-iota.vercel.app/api'

export async function acortarUrl(url: string, apiKey?: string): Promise<ShortUrl> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = \`Bearer \${apiKey}\`

  const res = await fetch(\`\${BASE}/urls/new\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  })

  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After') ?? '0')
    throw new Error(\`Rate limited. Reintenta en \${retry}s\`)
  }

  const data = (await res.json()) as ShortUrl | AcortadorError
  if (!res.ok) throw new Error((data as AcortadorError).error ?? 'Error desconocido')
  return data as ShortUrl
}

// Uso:
// const { short_url } = await acortarUrl('https://example.com', process.env.ACORTADOR_API_KEY)
\`\`\`

### Python (requests)

\`\`\`python
import os
import requests

BASE = "https://acortador-de-urls-iota.vercel.app/api"

def acortar_url(url: str, api_key: str | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    r = requests.post(f"{BASE}/urls/new", json={"url": url}, headers=headers, timeout=10)
    if r.status_code == 429:
        raise RuntimeError(f"Rate limited. Reintenta en {r.headers.get('Retry-After')}s")
    r.raise_for_status()
    return r.json()

# uso:
# data = acortar_url("https://example.com", os.getenv("ACORTADOR_API_KEY"))
# print(data["short_url"])
\`\`\`

### Endpoint de servidor (Hono) sin exponer la key

\`\`\`ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/shorten', async (c) => {
  const { url } = await c.req.json<{ url: string }>()
  const upstream = await fetch('https://acortador-de-urls-iota.vercel.app/api/urls/new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${process.env.ACORTADOR_API_KEY}\`,
    },
    body: JSON.stringify({ url }),
  })
  const data = await upstream.json()
  return c.json(data, upstream.status as 200 | 201 | 400 | 401 | 429)
})

export default app
\`\`\`

## Pasos para el agente

Checklist para integrar la API en un proyecto nuevo:

1. Confirmar que el proyecto necesita acortar URLs o resolver códigos cortos.
2. Decidir si se usará API key (recomendado para asociar URLs a una cuenta y tener mayor límite).
3. Si se usa key, indicar al usuario que la cree en el dashboard y la guarde en una variable de entorno (\`ACORTADOR_API_KEY\`).
4. Verificar que la URL a acortar sea \`http\` o \`https\` antes de enviarla.
5. Implementar la llamada a \`POST /api/urls/new\` con \`Content-Type: application/json\` y, si aplica, \`Authorization: Bearer <key>\`.
6. Manejar respuestas: 201 (éxito), 400 (URL inválida), 401 (key inválida), 429 (rate limit, usar \`Retry-After\`).
7. Guardar y reutilizar el \`short_url\` devuelto; no recrear la misma URL.
8. Si se necesita la URL original, llamar a \`GET /api/urls/{code}\`.
9. Para redirigir usuarios, usar directamente \`GET /{code}\` (302).
10. Si la integración es desde el frontend, mover la llamada a un backend propio para no exponer la key.
11. Probar contra producción con un caso válido y uno inválido (URL no http) antes de dar la tarea por terminada.`
