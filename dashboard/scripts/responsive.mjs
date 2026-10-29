import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:5174/dashboard/";
const widths = [320, 375, 768, 1024, 1440];
const routes = [
  { name: "inicio", path: "" },
  { name: "login", path: "login" },
  { name: "urls", path: "urls" },
  { name: "api-keys", path: "api-keys" },
  { name: "usuarios", path: "users" },
  { name: "administracion", path: "admin" },
  { name: "perfil", path: "profile" },
  { name: "skill", path: "skill" },
];

let server;
let browser;
try {
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5174",
      "--strictPort",
    ],
    {
      env: { ...process.env, VITE_USE_MOCKS: "true" },
      stdio: "ignore",
      detached: process.platform !== "win32",
    },
  );
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Vite todavía está iniciando. */
    }
    await delay(250);
  }
  if (!ready)
    throw new Error("Vite no respondió en http://127.0.0.1:5174/dashboard/");

  const localBrowserLibs = `${process.env.HOME}/.local/share/pw-libs/usr/lib/x86_64-linux-gnu`;
  browser = await chromium.launch({
    headless: true,
    env: {
      ...process.env,
      LD_LIBRARY_PATH: [process.env.LD_LIBRARY_PATH, localBrowserLibs]
        .filter(Boolean)
        .join(":"),
    },
  });
  const page = await browser.newPage();
  await mkdir("screenshots", { recursive: true });
  for (const width of widths) {
    for (const route of routes) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(new URL(route.path, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(150);
      if (width < 1024 && route.name !== "login") {
        const mobileBrand = await page.locator("header").innerText();
        if (!mobileBrand.includes("Acortador de URLs"))
          throw new Error(
            `La barra superior no conserva la marca a ${width}px`,
          );
      }
      const readiness = {
        inicio: page.getByText("Acorta, comparte y mide tus enlaces"),
        login: page.locator("#login-email"),
        urls: page.getByRole("heading", { name: "URLs", exact: true }).last(),
        "api-keys": page.getByText("Activas", { exact: true }),
        usuarios: page.getByText("Administradores", { exact: true }),
        administracion: page.getByRole("tab", { name: "Resumen" }),
        perfil: page.getByText("Datos de tu cuenta"),
        skill: page
          .getByRole("heading", { name: "SKILL para agentes" })
          .first(),
      };
      await readiness[route.name].waitFor({ state: "visible" });
      if ((await page.locator("#root").innerText()) === "")
        throw new Error(`La página ${route.name} no se renderizó`);
      if (route.name === "login") {
        const values = await page
          .locator("input[type=email], input[type=password]")
          .evaluateAll((inputs) => inputs.map((input) => input.value));
        if (values.some((value) => value !== ""))
          throw new Error("Los campos de acceso deben iniciar vacíos");
        if (
          (await page.evaluate(() => document.activeElement?.id)) !==
          "login-email"
        )
          throw new Error("El foco inicial no está en el campo de correo");
      }
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter(
            (el) =>
              el.getBoundingClientRect().right >
              document.documentElement.clientWidth + 1,
          )
          .slice(0, 12)
          .map((el) => ({
            tag: el.tagName,
            text: el.textContent?.slice(0, 50),
            className: typeof el.className === "string" ? el.className : "",
            right: Math.round(el.getBoundingClientRect().right),
            width: Math.round(el.getBoundingClientRect().width),
          })),
      }));
      if (dimensions.scrollWidth > dimensions.clientWidth) {
        throw new Error(
          `Desbordamiento horizontal en ${route.name} a ${width}px: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px; ${JSON.stringify(dimensions.offenders)}`,
        );
      }
      if (width === 1440)
        await page.screenshot({
          path: `screenshots/${route.name}.png`,
          fullPage: true,
        });
      console.log(`✓ ${route.name}: ${width}px`);
    }
  }

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    if (width < 1024) {
      if (width === 320) {
        await page.getByRole("button", { name: "Nueva URL" }).click();
        await page
          .getByRole("dialog")
          .getByRole("heading", { name: "Crear URL" })
          .waitFor();
        await page.getByLabel("URL original").fill("https://ejemplo.com/qa");
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Crear URL" })
          .click();
        await page
          .getByRole("heading", { name: "Tu URL está lista" })
          .waitFor();
        for (const label of ["Copiar", "Abrir", "Personalizar QR", "Listo"])
          await page
            .getByRole("dialog")
            .getByRole("button", { name: label })
            .waitFor();
        await page.getByRole("button", { name: "Personalizar QR" }).click();
        await page
          .getByRole("heading", { name: "Personalizar código QR" })
          .waitFor();
        await page.keyboard.press("Escape");
      }
      await page.getByRole("button", { name: "Abrir menú lateral" }).click();
      const sideSheet = page.locator(
        '[data-slot="sheet-content"][data-side="left"]',
      );
      await sideSheet.waitFor({ state: "visible" });
      if (
        (await page
          .locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
          .count()) !== 1
      )
        throw new Error(`Más de una capa abierta en el menú a ${width}px`);
      await page.keyboard.press("Control+k");
      await page
        .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
        .waitFor({ state: "visible" });
      if (
        (await page
          .locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
          .count()) !== 1
      )
        throw new Error(`La paleta no cerró el menú a ${width}px`);
      await page.keyboard.press("Escape");
      await page
        .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
        .waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Cuenta" }).click();
      const accountSheet = page.locator(
        '[data-slot="sheet-content"][data-side="bottom"]',
      );
      await accountSheet.waitFor({ state: "visible" });
      if (
        (await page
          .locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
          .count()) !== 1
      )
        throw new Error(`Más de una capa abierta al abrir Cuenta a ${width}px`);
      await accountSheet.getByRole("button", { name: "Cerrar sesión" }).click();
      await page.getByText("¿Cerrar sesión?").waitFor({ state: "visible" });
      if (
        (await page
          .locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
          .count()) !== 1
      )
        throw new Error(
          `Más de una capa abierta al confirmar salida a ${width}px: ${JSON.stringify(await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts())}`,
        );
      await page.getByRole("button", { name: "Cancelar" }).click();
      await page.locator('[role="alertdialog"]').waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Cuenta" }).click();
      await accountSheet.waitFor({ state: "visible" });
      await page.keyboard.press("Control+k");
      await page
        .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
        .waitFor({ state: "visible" });
      if (
        (await page
          .locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
          .count()) !== 1
      )
        throw new Error(`La paleta no cerró Cuenta a ${width}px`);
      await page.keyboard.press("Escape");
    } else {
      await page.getByRole("button", { name: /Buscar\.\.\./ }).click();
      await page
        .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
        .waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Abrir menú de cuenta" }).click();
      await page.getByRole("menu").waitFor();
      await page
        .getByRole("menu")
        .getByRole("button", { name: "Cerrar sesión" })
        .click();
      await page.getByText("¿Cerrar sesión?").waitFor({ state: "visible" });
      if (
        (await page
          .locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
          .count()) !== 1
      )
        throw new Error(
          `Más de una capa abierta al confirmar salida a ${width}px`,
        );
      await page.getByRole("button", { name: "Cancelar" }).click();
      await page.locator('[role="alertdialog"]').waitFor({ state: "hidden" });
      await page.keyboard.press("Control+k");
      await page
        .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
        .waitFor({ state: "visible" });
      if (
        await page
          .getByRole("menu")
          .isVisible()
          .catch(() => false)
      )
        throw new Error(`La paleta no cerró Cuenta a ${width}px`);
      await page.keyboard.press("Escape");
    }
    const pageWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    if (pageWidth.scroll > pageWidth.client)
      throw new Error(`Desbordamiento con capas abiertas a ${width}px`);
    console.log(`✓ capas mutuamente excluyentes: ${width}px`);
  }

  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const sidebarList = page
    .locator('nav[aria-label="Navegación principal"] > div')
    .last();
  await sidebarList.waitFor({ state: "visible" });
  const scrollState = await sidebarList.evaluate((element) => ({
    client: element.clientHeight,
    total: element.scrollHeight,
  }));
  if (scrollState.total <= scrollState.client)
    throw new Error(
      "La lista lateral no puede desplazarse en una ventana de 600px",
    );
  await sidebarList.hover();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100);
  if ((await sidebarList.evaluate((element) => element.scrollTop)) <= 0)
    throw new Error(
      "La rueda no desplaza la lista lateral en una ventana baja",
    );
  console.log("✓ barra lateral desplazable a 600px de alto");
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Abrir menú lateral" }).click();
  const mobileSidebarList = page
    .locator(
      '[data-slot="sheet-content"][data-side="left"] nav[aria-label="Navegación principal"] > div',
    )
    .last();
  const mobileScrollState = await mobileSidebarList.evaluate((element) => ({
    client: element.clientHeight,
    total: element.scrollHeight,
  }));
  if (mobileScrollState.total <= mobileScrollState.client)
    throw new Error(
      "La lista lateral móvil no puede desplazarse a 600px de alto",
    );
  await mobileSidebarList.hover();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100);
  if ((await mobileSidebarList.evaluate((element) => element.scrollTop)) <= 0)
    throw new Error("La rueda no desplaza la lista lateral móvil");
  await page.keyboard.press("Escape");
  console.log("✓ menú lateral móvil desplazable a 600px de alto");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("aside").waitFor({ state: "visible" });
  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
    .waitFor();
  const paletteItems = page.locator('[data-slot="command-item"]:visible');
  await paletteItems.first().waitFor();
  const paletteColors = await paletteItems.evaluateAll((items) => {
    const selected = items.filter(
      (item) => item.getAttribute("data-selected") === "true",
    );
    return {
      selectedCount: selected.length,
      unselected: items
        .filter((item) => !selected.includes(item))
        .map((item) => {
          const style = getComputedStyle(item);
          return { background: style.backgroundColor, color: style.color };
        }),
    };
  });
  if (
    paletteColors.selectedCount > 1 ||
    paletteColors.unselected.some(
      (item) => item.background !== "rgba(0, 0, 0, 0)",
    )
  )
    throw new Error("La paleta debe resaltar solo el elemento seleccionado");
  await paletteItems.nth(2).hover();
  await page.waitForTimeout(50);
  if (
    (await page
      .locator('[data-slot="command-item"][data-selected="true"]')
      .count()) > 1
  )
    throw new Error("La paleta resaltó más de un elemento al pasar el cursor");
  console.log("✓ la paleta solo resalta el elemento seleccionado");
  await page
    .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
    .fill("curso26");
  await page.getByText("curso26").first().waitFor();
  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
    .waitFor({ state: "hidden" });
  await page.goto(new URL("urls", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Borrar URL" }).first().click();
  await page
    .getByRole("alertdialog")
    .getByText("¿Eliminar esta URL?")
    .waitFor();
  await page
    .getByRole("alertdialog")
    .getByText("Esta acción no se puede deshacer.")
    .waitFor();
  await page.getByRole("button", { name: "Cancelar" }).click();

  await page.goto(new URL("api-keys", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Desactivar API key" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Desactivar" })
    .waitFor();
  await page.getByRole("alertdialog").getByText("sk_12ab").waitFor();
  await page.getByRole("button", { name: "Cancelar" }).click();

  await page.goto(new URL("users", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  const ownUser = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "maria@example.com" });
  await ownUser.getByText("Tú", { exact: true }).waitFor();
  if (
    !(await ownUser
      .getByRole("button", { name: "Eliminar usuario María López" })
      .isDisabled())
  )
    throw new Error("No se desactivó el botón para borrar la cuenta actual");
  await page
    .getByRole("button", { name: "Eliminar usuario Carlos Mendoza" })
    .click();
  await page.getByRole("alertdialog").getByText("carlos@example.com").waitFor();
  await page.getByRole("button", { name: "Cancelar" }).click();
  console.log("✓ confirmaciones de URL, API key, usuario y cuenta actual");

  await page.goto(new URL("urls", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("textbox", { name: "Buscar URLs" }).focus();
  await page.keyboard.press("n");
  if (await page.getByRole("dialog").count())
    throw new Error("El atajo N se activó mientras se escribía");
  await page.getByRole("textbox", { name: "Buscar URLs" }).fill("google");
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Buscar URLs" }).blur();
  await page.keyboard.press("/");
  if (
    (await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    )) !== "Buscar URLs"
  )
    throw new Error("El atajo / no enfocó el buscador");
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Buscar URLs" }).blur();
  await page.keyboard.press("n");
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: "Crear URL" })
    .waitFor();
  await page.keyboard.press("Escape");
  for (const [key, route] of [
    ["h", ""],
    ["l", "urls"],
    ["k", "api-keys"],
    ["u", "users"],
  ]) {
    const startingRoute = route === "urls" ? "" : "urls";
    await page.goto(new URL(startingRoute, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
    });
    await page.locator("aside").waitFor({ state: "visible" });
    await page.keyboard.press("g");
    await page.keyboard.press(key);
    const targetPath = new URL(route, baseUrl).pathname;
    await page.waitForFunction(
      (path) =>
        window.location.pathname === path ||
        (path === "/dashboard/" && window.location.pathname === "/dashboard"),
      targetPath,
    );
  }
  await page.keyboard.press("?");
  await page.getByText("Atajos de teclado").waitFor();
  await page.keyboard.press("Escape");
  await page.goto(new URL("urls", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Generar QR" }).first().click();
  await page.getByRole("dialog").getByText("Código QR").waitFor();
  await page.getByRole("button", { name: "Quitar logo" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Descargar PNG" })
    .click();
  await page.screenshot({ path: "screenshots/qr.png", fullPage: true });
  await page.keyboard.press("Escape");

  const macPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await macPage.addInitScript(() =>
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    }),
  );
  await macPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await macPage.locator("aside").waitFor({ state: "visible" });
  if (!(await macPage.getByText("⌘", { exact: false }).count()))
    throw new Error("No se mostró ⌘ al simular macOS");
  await macPage.keyboard.press("Meta+k");
  await macPage
    .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
    .waitFor();
  await macPage.keyboard.press("Meta+k");
  await macPage
    .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
    .waitFor({ state: "hidden" });
  console.log("✓ Atajos, búsqueda en vivo, QR y simulación de macOS");
} finally {
  await browser?.close();
  if (server?.pid) {
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
