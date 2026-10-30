---
name: acortador-urls
description: Use this skill when a project needs to shorten URLs, look up a URL by its short code, or generate short links using the Acortador de URLs API. Covers integration patterns, the required API key (x-api-key or Authorization Bearer), error handling (400, 401, 404, 429), rate limits, and best practices.
---

# Acortador de URLs — API

API REST para acortar URLs y obtener la URL original a partir de un código corto. Los endpoints `/api/urls/*` **requieren una API key**. Documentación interactiva (Scalar): https://acortador-de-urls-iota.vercel.app/api/reference. Especificación OpenAPI: https://acortador-de-urls-iota.vercel.app/api/doc. La especificación descargada está en `references/openapi.json`.

## URL base

Todas las rutas de la API viven bajo `/api`:

```
https://acortador-de-urls-iota.vercel.app/api
```

En local: `http://localhost:3000/api`.

## Obtener una API key (obligatoria)

1. Entra al dashboard: https://acortador-de-urls-iota.vercel.app/dashboard/
2. Inicia sesión con tu cuenta.
3. Ve a la sección **API keys** y crea una nueva clave con un nombre descriptivo.
4. Copia la clave completa (formato `sk_` + 32 caracteres). **Solo se muestra una vez.**
5. Guárdala en una variable de entorno (`ACORTADOR_API_KEY`). Nunca la pongas en el frontend ni en el repositorio.

## Autenticación

Envía la clave en **una** de estas cabeceras (si mandas las dos, deben llevar la misma clave):

```
x-api-key: sk_...
```

```
Authorization: Bearer sk_...
```

- Sin clave: `401 { "error": "API key requerida" }`.
- Clave inexistente o desactivada: `401 { "error": "API key inválida" }`.
- Cada uso válido actualiza `last_used_at` de la clave, y las URLs creadas quedan asociadas a tu cuenta.
- La clave se comprueba antes que el body: sin clave válida la respuesta siempre es 401.

## Endpoints

### 1. Crear una URL corta

`POST /api/urls/new` (requiere API key)

Body:
```json
{ "url": "https://example.com/pagina-larga" }
```

Solo se aceptan URLs `http` y `https`.

Respuesta `201 Created`:
```json
{
  "code": "EyvLMH",
  "url": "https://example.com/pagina-larga",
  "short_url": "https://acortador-de-urls-iota.vercel.app/EyvLMH",
  "created_at": "2026-10-29T15:42:10Z"
}
```

### 2. Obtener una URL por código

`GET /api/urls/{code}` (requiere API key)

Respuesta `200 OK`: mismo objeto que arriba.

### 3. Redirección

`GET /{code}` → `302 Found` con header `Location` apuntando a la URL original. **No requiere API key**: úsalo directamente como enlace corto para tus usuarios.

## Errores

| Código | Cuerpo | Cuándo |
|---|---|---|
| 400 | `{ "error": "La URL proporcionada no es válida" }` | URL no http/https o body inválido (con una clave válida) |
| 401 | `{ "error": "API key requerida" }` | No se envió `x-api-key` ni `Authorization` |
| 401 | `{ "error": "API key inválida" }` | La clave no existe, está desactivada, `Authorization` no usa `Bearer` o las dos cabeceras traen claves distintas |
| 404 | `{ "error": "URL no encontrada" }` | Código inexistente o URL borrada (`deleted_at` no nulo) |
| 429 | `{ "error": "Demasiados intentos. Intenta de nuevo en unos minutos" }` | Límite superado. Incluye `Retry-After` (segundos) |

## Límites de uso

- Crear URLs con una API key válida: **120 peticiones por minuto y API key**.
- Peticiones con una API key inválida: **30 por minuto e IP**; después responden 429 en lugar de 401.
- Login del dashboard: 5 intentos fallidos por IP + correo en 15 minutos bloquean 15 minutos.

## Buenas prácticas

- Guarda la API key en variables de entorno, nunca en el frontend ni en el repositorio.
- Valida la URL (http/https) antes de enviarla.
- Ante un 429, espera los segundos indicados en `Retry-After` y reintenta.
- Ante un 401, no reintentes en bucle: revisa que la variable de entorno exista y que la clave siga activa en el dashboard.
- No expongas la key en código cliente; si necesitas acortar desde el navegador, hazlo a través de tu propio backend.
- Reutiliza el `short_url` devuelto; no vuelvas a crear la misma URL si ya la tienes.

## Ejemplos de integración

### curl

Crear:
```bash
curl -s -X POST https://acortador-de-urls-iota.vercel.app/api/urls/new \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ACORTADOR_API_KEY" \
  -d '{"url":"https://example.com/pagina-larga"}'
```

Consultar (también vale `Authorization: Bearer`):
```bash
curl -s https://acortador-de-urls-iota.vercel.app/api/urls/EyvLMH \
  -H "Authorization: Bearer $ACORTADOR_API_KEY"
```

### TypeScript (fetch, función reutilizable)

```ts
type ShortUrl = {
  code: string
  url: string
  short_url: string
  created_at: string
}

type AcortadorError = { error: string }

const BASE = 'https://acortador-de-urls-iota.vercel.app/api'

async function request(path: string, apiKey: string, init: RequestInit = {}): Promise<ShortUrl> {
  if (!apiKey) throw new Error('Falta la API key (ACORTADOR_API_KEY)')

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, ...init.headers },
  })

  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After') ?? '0')
    throw new Error(`Rate limited. Reintenta en ${retry}s`)
  }

  const data = (await res.json()) as ShortUrl | AcortadorError
  if (!res.ok) throw new Error((data as AcortadorError).error ?? 'Error desconocido')
  return data as ShortUrl
}

export const acortarUrl = (url: string, apiKey: string) =>
  request('/urls/new', apiKey, { method: 'POST', body: JSON.stringify({ url }) })

export const obtenerUrl = (code: string, apiKey: string) =>
  request(`/urls/${encodeURIComponent(code)}`, apiKey)

// Uso:
// const { short_url } = await acortarUrl('https://example.com', process.env.ACORTADOR_API_KEY ?? '')
```

### Python (requests)

```python
import os
import requests

BASE = "https://acortador-de-urls-iota.vercel.app/api"

def _headers(api_key: str) -> dict:
    if not api_key:
        raise ValueError("Falta la API key (ACORTADOR_API_KEY)")
    return {"Content-Type": "application/json", "x-api-key": api_key}

def _check(r: requests.Response) -> dict:
    if r.status_code == 429:
        raise RuntimeError(f"Rate limited. Reintenta en {r.headers.get('Retry-After')}s")
    if not r.ok:
        raise RuntimeError(r.json().get("error", f"Error {r.status_code}"))
    return r.json()

def acortar_url(url: str, api_key: str) -> dict:
    return _check(requests.post(f"{BASE}/urls/new", json={"url": url}, headers=_headers(api_key), timeout=10))

def obtener_url(code: str, api_key: str) -> dict:
    return _check(requests.get(f"{BASE}/urls/{code}", headers=_headers(api_key), timeout=10))

# uso:
# data = acortar_url("https://example.com", os.environ["ACORTADOR_API_KEY"])
# print(data["short_url"])
```

### Endpoint de servidor (Hono) sin exponer la key

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/shorten', async (c) => {
  const apiKey = process.env.ACORTADOR_API_KEY
  if (!apiKey) return c.json({ error: 'Falta ACORTADOR_API_KEY en el servidor' }, 500)

  const { url } = await c.req.json<{ url: string }>()
  const upstream = await fetch('https://acortador-de-urls-iota.vercel.app/api/urls/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ url }),
  })
  const data = await upstream.json()
  return c.json(data, upstream.status as 201 | 400 | 401 | 429)
})

export default app
```

## Pasos para el agente

Checklist para integrar la API en un proyecto nuevo:

1. Confirmar que el proyecto necesita acortar URLs o resolver códigos cortos.
2. La API key es obligatoria: pedir al usuario que la cree en el dashboard (**API keys**) y la guarde en una variable de entorno (`ACORTADOR_API_KEY`). No continuar con valores inventados.
3. Leer la clave solo en el servidor y fallar con un mensaje claro si falta la variable de entorno.
4. Verificar que la URL a acortar sea `http` o `https` antes de enviarla.
5. Implementar `POST /api/urls/new` con `Content-Type: application/json` y la cabecera `x-api-key: <key>` (o `Authorization: Bearer <key>`).
6. Manejar respuestas: 201 (éxito), 400 (URL inválida), 401 (`API key requerida` o `API key inválida`: revisar la configuración, no reintentar), 429 (rate limit, usar `Retry-After`).
7. Guardar y reutilizar el `short_url` devuelto; no recrear la misma URL.
8. Si se necesita la URL original, llamar a `GET /api/urls/{code}` con la misma cabecera de API key.
9. Para redirigir usuarios, usar directamente `GET /{code}` (302), que no requiere clave.
10. Si la integración es desde el frontend, mover la llamada a un backend propio para no exponer la key.
11. Probar contra producción un caso válido, uno sin clave (401) y uno con URL no http (400) antes de dar la tarea por terminada.
