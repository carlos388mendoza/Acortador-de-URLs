// Prueba de la actualización en vivo con el servidor simulado (VITE_USE_MOCKS).
// Cambia los datos "del servidor" desde la prueba y comprueba que la pantalla se actualiza sola, sin recargar.
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:5177/dashboard/";
const urlsPage = new URL("urls", baseUrl).toString();

const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5177",
    "--strictPort",
  ],
  {
    env: { ...process.env, VITE_USE_MOCKS: "true" },
    stdio: "ignore",
    detached: process.platform !== "win32",
  },
);

let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 80 && !ready; attempt += 1) {
    ready = await fetch(baseUrl)
      .then((response) => response.ok)
      .catch(() => false);
    if (!ready) await delay(250);
  }
  if (!ready) throw new Error(`Vite no respondió en ${baseUrl}`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await mkdir("screenshots", { recursive: true });

  /** Página con ciclos de actualización de `intervalMs` (solo con datos simulados). */
  const openPage = async (intervalMs, options = {}) => {
    const page = options.reducedMotion
      ? await browser.newPage({
          viewport: { width: 1280, height: 900 },
          reducedMotion: "reduce",
        })
      : await context.newPage();
    await page.addInitScript((value) => {
      localStorage.setItem("au-theme", "light");
      localStorage.setItem("au-live-interval-ms", String(value));
    }, intervalMs);
    await page.goto(urlsPage, { waitUntil: "domcontentloaded" });
    await page.getByText("curso26").first().waitFor();
    return page;
  };
  const card = (page, code) =>
    page.locator('[data-slot="card"]').filter({ hasText: code }).first();
  const label = (page) => page.locator('[data-slot="live-label"]').first();
  const waitForLabel = (page, text, moment) =>
    page
      .waitForFunction(
        (expected) =>
          document
            .querySelector('[data-slot="live-label"]')
            ?.textContent?.includes(expected),
        text,
        { timeout: 8000 },
      )
      .catch(async () => {
        throw new Error(
          `El indicador debía decir "${text}" ${moment}; dice "${await label(page).innerText()}"`,
        );
      });
  const server = (page, method, ...args) =>
    page.evaluate(
      ([name, params]) => window.__mockServer[name](...params),
      [method, args],
    );
  const requests = (page) => page.evaluate(() => window.__mockServer.requests);
  const setHidden = (page, hidden) =>
    page.evaluate((value) => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => (value ? "hidden" : "visible"),
      });
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => value,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);

  const page = await openPage(1000);
  // Si la página se recargara, esta marca desaparecería
  await page.evaluate(() => {
    window.__sinRecargar = true;
  });
  await waitForLabel(page, "En vivo · actualizado hace", "al cargar");

  // 1. Cambian los clics en el servidor: la tarjeta se actualiza sola y el número destella
  await server(page, "addClicks", "curso26", 5);
  await card(page, "curso26")
    .filter({ hasText: "289 clics" })
    .waitFor({ timeout: 5000 })
    .catch(() => {
      throw new Error("Los clics de /curso26 no se actualizaron solos");
    });
  const flash = card(page, "curso26").locator("[data-live-flash]");
  if (!(await flash.count()))
    throw new Error("El número de clics no destelló al cambiar");
  if (
    (await flash.evaluate((el) => getComputedStyle(el).animationName)) !==
    "live-flash"
  )
    throw new Error("El destello no usa la animación live-flash");
  console.log("✓ los clics se actualizan solos y destellan");

  // 2. Aparece una URL nueva: su tarjeta entra con animación
  await server(page, "addUrl", "live-nueva");
  await card(page, "live-nueva")
    .waitFor({ timeout: 5000 })
    .catch(() => {
      throw new Error("La URL nueva no apareció sola");
    });
  if (!((await card(page, "live-nueva").getAttribute("data-live-new")) === ""))
    throw new Error("La tarjeta nueva no se marcó para animar su entrada");
  if (await card(page, "curso26").getAttribute("data-live-new"))
    throw new Error("Una tarjeta que ya estaba se animó como nueva");
  console.log("✓ las tarjetas nuevas entran con animación");

  // 3. Lo que se está haciendo no se pierde: diálogo abierto con texto escrito y búsqueda
  await page
    .getByRole("main")
    .getByRole("button", { name: "Nueva URL" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("URL original")
    .fill("https://escribiendo.com/no-borrar");
  await server(page, "addClicks", "curso26", 1);
  await page.waitForTimeout(3500);
  if (!(await dialog.isVisible()))
    throw new Error("Una actualización automática cerró el diálogo abierto");
  if (
    (await dialog.getByLabel("URL original").inputValue()) !==
    "https://escribiendo.com/no-borrar"
  )
    throw new Error(
      "Una actualización automática borró lo que se estaba escribiendo",
    );
  await page.keyboard.press("Escape");
  const search = page.getByRole("textbox", { name: "Buscar URLs" });
  await search.fill("curso");
  await page.waitForTimeout(3000);
  if (
    (await search.inputValue()) !== "curso" ||
    !page.url().includes("search=curso")
  )
    throw new Error("Una actualización automática cambió la búsqueda actual");
  if (await page.locator('[data-slot="skeleton"]').count())
    throw new Error("Se mostraron skeletons en una actualización automática");
  await search.fill("");
  console.log("✓ diálogos, texto escrito y búsqueda se conservan");

  // 4. Pestaña oculta: no consulta y el indicador dice "Pausado"; al volver se actualiza de inmediato
  await setHidden(page, true);
  await waitForLabel(page, "Pausado", "con la pestaña oculta");
  // Margen para que termine una petición que ya iba en curso al ocultar la pestaña
  await page.waitForTimeout(600);
  const before = await requests(page);
  await server(page, "addClicks", "curso26", 10);
  await page.waitForTimeout(3500);
  const during = await requests(page);
  if (during !== before)
    throw new Error(
      `Con la pestaña oculta se hicieron ${during - before} peticiones`,
    );
  if (await card(page, "curso26").filter({ hasText: "300 clics" }).count())
    throw new Error("La pantalla se actualizó con la pestaña oculta");
  await setHidden(page, false);
  await card(page, "curso26")
    .filter({ hasText: "300 clics" })
    .waitFor({ timeout: 1500 })
    .catch(() => {
      throw new Error("Al volver a la pestaña no se actualizó de inmediato");
    });
  await waitForLabel(page, "En vivo", "al volver a la pestaña");
  console.log("✓ se pausa con la pestaña oculta y se actualiza al volver");

  // 5. Fallos seguidos: "Sin conexión", sin avisos de error y sin perder los datos
  await server(page, "fail", true);
  await waitForLabel(page, "Sin conexión", "tras varios fallos");
  await page.screenshot({ path: "screenshots/en-vivo-sin-conexion.png" });
  if (!(await card(page, "curso26").isVisible()))
    throw new Error("Los datos desaparecieron al fallar la actualización");
  if (await page.locator("[data-sonner-toast]").count())
    throw new Error(
      "Se mostraron avisos de error por actualizaciones automáticas",
    );
  await server(page, "fail", false);
  await waitForLabel(page, "En vivo · actualizado hace", "al recuperarse");
  console.log(
    '✓ fallos: indicador "Sin conexión", sin avisos y se recupera solo',
  );

  // 6. "Actualizar ahora" pide los datos al momento
  const beforeButton = await requests(page);
  await page.getByRole("button", { name: "Actualizar ahora" }).first().click();
  await page.waitForTimeout(400);
  if ((await requests(page)) <= beforeButton)
    throw new Error('"Actualizar ahora" no hizo ninguna petición');
  await page.screenshot({ path: "screenshots/en-vivo.png" });
  if (!(await page.evaluate(() => window.__sinRecargar === true)))
    throw new Error("La página se recargó durante la prueba");
  console.log('✓ "Actualizar ahora" y sin recargar la página');

  // 7. Otra pestaña del mismo navegador se actualiza al instante tras borrar una URL aquí
  const other = await openPage(600_000);
  await other.waitForTimeout(500);
  const otherBefore = await requests(other);
  await card(page, "live-nueva")
    .getByRole("button", { name: "Borrar URL" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Eliminar URL" })
    .click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  await other
    .waitForFunction(
      (count) => window.__mockServer.requests > count,
      otherBefore,
      { timeout: 3000 },
    )
    .catch(() => {
      throw new Error(
        "La otra pestaña no recibió el aviso de BroadcastChannel",
      );
    });
  console.log(
    "✓ las otras pestañas se actualizan al instante (BroadcastChannel)",
  );

  // 8. Movimiento reducido: sin animaciones
  const calm = await openPage(1000, { reducedMotion: true });
  await server(calm, "addClicks", "curso26", 1);
  const calmFlash = card(calm, "curso26").locator("[data-live-flash]");
  await calmFlash.waitFor({ timeout: 5000 });
  if (
    (await calmFlash.evaluate((el) => getComputedStyle(el).animationName)) !==
    "none"
  )
    throw new Error("Con movimiento reducido el número sigue animándose");
  console.log("✓ sin animaciones con prefers-reduced-motion");
} finally {
  await browser?.close();
  if (server.pid) {
    try {
      process.kill(
        process.platform === "win32" ? server.pid : -server.pid,
        "SIGTERM",
      );
    } catch {
      server.kill("SIGTERM");
    }
  }
}
