import type { Context } from 'hono'

/** Página para navegadores cuando un enlace corto no existe o fue eliminado. No incluye datos de la petición. */
export const NOT_FOUND_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>Enlace no encontrado | Acortador de URLs</title>
<link rel="icon" href="/favicon.ico">
<style>
  :root {
    --background: #f6f5f3;
    --card: #ffffff;
    --border: #e7e5e4;
    --foreground: #1c1917;
    --muted: #78716c;
    --brand: #e30613;
    --button: #1c1917;
    --button-foreground: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --background: #1c1b1a;
      --card: #262423;
      --border: #3a3735;
      --foreground: #f5f5f4;
      --muted: #a8a29e;
      --brand: #ff4d55;
      --button: #f5f5f4;
      --button-foreground: #1c1917;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 16px;
    background: var(--background);
    color: var(--foreground);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main {
    width: 100%;
    max-width: 420px;
    padding: 32px 24px;
    text-align: center;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
  }
  img { width: 72px; height: 72px; border-radius: 50%; }
  .label {
    margin: 20px 0 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--brand);
  }
  h1 { margin: 4px 0 0; font-size: 28px; line-height: 1.2; }
  p.text { margin: 12px 0 0; font-size: 15px; line-height: 1.5; color: var(--muted); }
  a.button {
    display: inline-block;
    margin-top: 24px;
    padding: 12px 24px;
    border-radius: 12px;
    background: var(--button);
    color: var(--button-foreground);
    font-weight: 600;
    text-decoration: none;
  }
  a.button:hover { opacity: 0.9; }
  a.button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
</style>
</head>
<body>
<main>
  <img src="/branding/logo.png" alt="Acortador de URLs" width="72" height="72">
  <p class="label">Error 404</p>
  <h1>Enlace no encontrado</h1>
  <p class="text">Este enlace corto no existe o fue eliminado.</p>
  <a class="button" href="/dashboard">Ir al dashboard</a>
</main>
</body>
</html>`

/** Solo los navegadores piden text/html; el resto de clientes recibe JSON. */
export const wantsHtml = (c: Context): boolean => (c.req.header('accept') ?? '').toLowerCase().includes('text/html')

/** 404 de un enlace corto: HTML para navegadores y { error } para cualquier otro cliente. */
export function shortLinkNotFound(c: Context) {
  if (wantsHtml(c)) return c.html(NOT_FOUND_HTML, 404)
  return c.json({ error: 'URL no encontrada' }, 404)
}
