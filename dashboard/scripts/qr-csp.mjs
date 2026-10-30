// Prueba el QR contra un build de producción servido con las mismas cabeceras (CSP) que Vercel.
// En desarrollo Vite no envía CSP, por eso esta prueba existe: un bloqueo de la CSP solo se ve así.
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const buildDir = ".qr-csp-build";
const port = 5176;
const baseUrl = `http://127.0.0.1:${port}/dashboard/`;

const build = spawnSync(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "build",
    "--outDir",
    buildDir,
    "--emptyOutDir",
  ],
  { stdio: "ignore" },
);
if (build.status !== 0) throw new Error("No se pudo compilar el dashboard");

// Cabeceras del dashboard tal como las aplica Vercel
const vercel = JSON.parse(await readFile("../vercel.json", "utf8"));
const dashboardHeaders = vercel.headers.find(
  (entry) => entry.source === "/dashboard/:path*",
).headers;
if (!dashboardHeaders.some((h) => h.key === "Content-Security-Policy"))
  throw new Error("vercel.json no define la CSP del dashboard");

// API mínima: lo justo para que la página de URLs cargue con una URL
const now = "2026-10-30T12:00:00Z";
const user = {
  id: 1,
  name: "Prueba",
  email: "prueba@example.com",
  role: "admin",
  created_at: now,
  updated_at: now,
};
const adminUrl = {
  id: 1,
  code: "qrcsp",
  url: "https://example.com",
  short_url: `http://127.0.0.1:${port}/qrcsp`,
  click_count: 0,
  created_at: now,
  updated_at: now,
  creator: { id: 1, name: "Prueba" },
};
const fakeApi = (pathname) => {
  if (pathname === "/api/auth/me") return { user };
  if (pathname === "/api/admin/stats/summary")
    return {
      total_urls: 1,
      total_clicks: 0,
      total_users: 1,
      active_api_keys: 0,
    };
  if (pathname === "/api/admin/urls")
    return { data: [adminUrl], total: 1, page: 1, limit: 9 };
  return { data: [], total: 0, page: 1, limit: 20 };
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", baseUrl);
  if (pathname.startsWith("/api/")) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(fakeApi(pathname)));
    return;
  }
  for (const { key, value } of dashboardHeaders) response.setHeader(key, value);
  const relative = normalize(pathname.replace(/^\/dashboard\/?/, "")).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  let file = join(buildDir, relative);
  if (!relative || !(await stat(file).catch(() => null))?.isFile())
    file = join(buildDir, "index.html"); // fallback SPA, como en Vercel
  response.writeHead(200, {
    "Content-Type": types[extname(file)] ?? "application/octet-stream",
  });
  response.end(await readFile(file));
});
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const cspViolations = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy"))
      cspViolations.push(message.text().slice(0, 200));
  });

  await page.goto(new URL("urls", baseUrl).toString());
  await page.getByRole("button", { name: "Generar QR" }).first().click();

  // El logo debe quedar incrustado dentro del SVG del QR (elemento <image> con data:)
  const logoInQr = async (moment, previousHref) => {
    const href = await page
      .waitForFunction(
        (previous) => {
          const svg = document.querySelector(
            '[aria-label="Vista previa del código QR"] svg',
          );
          const image = svg?.querySelector("image");
          const value =
            image?.getAttribute("href") ?? image?.getAttribute("xlink:href");
          const drawn =
            (svg?.querySelectorAll("rect, path, circle").length ?? 0) > 20;
          return drawn && value?.startsWith("data:image/") && value !== previous
            ? value
            : false;
        },
        previousHref,
        { timeout: 10000 },
      )
      .then((handle) => handle.jsonValue())
      .catch(() => {
        throw new Error(
          `El logo no aparece dentro del QR ${moment}. Violaciones de CSP: ${JSON.stringify(cspViolations)}`,
        );
      });
    if (await page.getByText("No se pudo cargar el logo").isVisible())
      throw new Error(`Se mostró el aviso de logo fallido ${moment}`);
    return href;
  };

  await logoInQr("con el logo del proyecto");
  // Se quita primero el logo para que la subida produzca un dibujo nuevo
  await page.getByRole("button", { name: "Quitar logo" }).click();
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '[aria-label="Vista previa del código QR"] svg image',
      ),
  );
  await page
    .locator('[role="dialog"] input[type="file"]')
    .setInputFiles("../branding/logo.png");
  await logoInQr("con un PNG de 512 × 512 subido");

  for (const label of ["Descargar PNG", "Descargar SVG"])
    if (await page.getByRole("button", { name: label }).isDisabled())
      throw new Error(`El botón "${label}" quedó desactivado`);
  if (cspViolations.length)
    throw new Error(`Violaciones de CSP: ${JSON.stringify(cspViolations)}`);

  await page.getByRole("dialog").screenshot({ path: "screenshots/qr-csp.png" });
  console.log("✓ QR con logo bajo la CSP de producción (proyecto y subido)");
} finally {
  await browser?.close();
  server.close();
}
