import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:5174/dashboard/";
const widths = [320, 375, 768, 1024, 1440];
// Se ejecuta una vez por modo: `node scripts/responsive.mjs light` o `... dark`
const theme = process.argv[2] ?? "light";
if (!["light", "dark"].includes(theme))
  throw new Error('El modo debe ser "light" o "dark"');
const themeLabel = theme === "light" ? "claro" : "oscuro";
const expectedColors =
  theme === "light"
    ? {
        activeBg: "rgb(253, 232, 234)",
        activeFg: "rgb(227, 6, 19)",
        primaryBg: "rgb(28, 25, 23)",
        primaryFg: "rgb(255, 255, 255)",
      }
    : {
        activeBg: "rgb(61, 26, 28)",
        activeFg: "rgb(255, 107, 112)",
        primaryBg: "rgb(245, 245, 244)",
        primaryFg: "rgb(28, 25, 23)",
      };
const luminance = (cssColor) => {
  const [r, g, b] = cssColor.match(/\d+(\.\d+)?/g).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const computed = (locator, props) =>
  locator.first().evaluate((el, names) => {
    const style = getComputedStyle(el);
    return Object.fromEntries(names.map((name) => [name, style[name]]));
  }, props);
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

const sameColors = (actual, expectedBg, expectedFg, label) => {
  if (actual.backgroundColor !== expectedBg || actual.color !== expectedFg)
    throw new Error(
      `${label} en modo ${themeLabel}: se esperaba ${expectedBg} / ${expectedFg} y salió ${actual.backgroundColor} / ${actual.color}`,
    );
};

// Colores de estado activo, botones principales y barra inferior en el modo actual
async function checkThemeColors(page, width) {
  const mobile = width < 1024;
  const scope = mobile
    ? page.locator('nav[aria-label="Navegación móvil"]')
    : page.locator("aside");

  const activeStyle = await computed(scope.locator('a[aria-current="page"]'), [
    "backgroundColor",
    "color",
  ]);
  sameColors(
    activeStyle,
    expectedColors.activeBg,
    expectedColors.activeFg,
    `Elemento activo (${mobile ? "barra inferior" : "menú lateral"}) a ${width}px`,
  );
  if (theme === "light" && luminance(activeStyle.backgroundColor) < 200)
    throw new Error(`El activo en modo claro es oscuro a ${width}px`);

  const primary = mobile
    ? scope.locator('button[aria-label="Nueva URL"] > span')
    : scope.getByRole("button", { name: "Nueva URL" });
  sameColors(
    await computed(primary, ["backgroundColor", "color"]),
    expectedColors.primaryBg,
    expectedColors.primaryFg,
    `Botón principal a ${width}px`,
  );

  if (!mobile)
    sameColors(
      await computed(scope.locator('[data-slot="avatar-fallback"]'), [
        "backgroundColor",
        "color",
      ]),
      expectedColors.primaryBg,
      expectedColors.primaryFg,
      "Avatar del usuario",
    );

  if (mobile) {
    // El botón "Nuevo" debe quedar dentro de la barra, y la barra no puede crecer
    const navBox = await scope.boundingBox();
    const circle = await primary.boundingBox();
    const cells = await scope
      .locator(":scope > *")
      .evaluateAll((elements) =>
        elements.map((el) => el.getBoundingClientRect().height),
      );
    if (!navBox || !circle)
      throw new Error("No se pudo medir la barra inferior");
    if (
      circle.y < navBox.y - 0.5 ||
      circle.y + circle.height > navBox.y + navBox.height + 0.5 ||
      circle.x < navBox.x ||
      circle.x + circle.width > navBox.x + navBox.width
    )
      throw new Error(`El botón "Nuevo" sobresale de la barra a ${width}px`);
    if (circle.height > 48)
      throw new Error(`El botón "Nuevo" mide ${circle.height}px (máx. 48)`);
    if (cells.length !== 5 || cells.some((h) => Math.abs(h - cells[0]) > 0.5))
      throw new Error(
        `Los botones de la barra no tienen la misma altura a ${width}px: ${cells}`,
      );
    if (navBox.height > 64)
      throw new Error(`La barra inferior creció a ${navBox.height}px`);
  }
}

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
  const page = await browser.newPage({ colorScheme: theme });
  await page.addInitScript((value) => {
    localStorage.setItem("au-theme", value);
  }, theme);
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
        // #48: en celular y tablet la barra superior no lleva botón de búsqueda
        if (
          await page
            .locator("header button:visible")
            .filter({ hasText: /Buscar/ })
            .count()
        )
          throw new Error(
            `La barra superior muestra un botón de búsqueda a ${width}px`,
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
      if (route.name === "inicio") {
        const isDark = await page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        );
        if (isDark !== (theme === "dark"))
          throw new Error(`El modo ${themeLabel} no se aplicó a ${width}px`);
        await checkThemeColors(page, width);
      }
      if (width === 1440)
        await page.screenshot({
          path: `screenshots/${route.name}-${themeLabel}.png`,
          fullPage: true,
        });
      if (width === 375 && route.name === "inicio")
        await page
          .locator('nav[aria-label="Navegación móvil"]')
          .screenshot({ path: `screenshots/barra-inferior-${themeLabel}.png` });
      console.log(`✓ ${route.name}: ${width}px (${themeLabel})`);
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
      // #48: sin el botón de arriba, la paleta se abre desde "Buscar" de la barra inferior
      await page
        .locator('nav[aria-label="Navegación móvil"]')
        .getByRole("button", { name: "Buscar" })
        .click();
      await page
        .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
        .waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page
        .getByPlaceholder("Busca URLs, usuarios, keys o acciones...")
        .waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Abrir menú lateral" }).click();
      const sideSheet = page.locator(
        '[data-slot="sheet-content"][data-side="left"]',
      );
      await sideSheet.waitFor({ state: "visible" });
      sameColors(
        await computed(sideSheet.locator('a[aria-current="page"]'), [
          "backgroundColor",
          "color",
        ]),
        expectedColors.activeBg,
        expectedColors.activeFg,
        `Elemento activo del panel móvil a ${width}px`,
      );
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
  const selectedItem = await computed(
    page.locator('[data-slot="command-item"][data-selected="true"]'),
    ["backgroundColor", "color"],
  );
  if (
    theme === "light" &&
    (luminance(selectedItem.backgroundColor) < 200 ||
      luminance(selectedItem.color) > 150)
  )
    throw new Error(
      `La paleta en modo claro usa colores oscuros: ${selectedItem.backgroundColor} / ${selectedItem.color}`,
    );
  if (theme === "dark" && selectedItem.backgroundColor !== "rgb(61, 26, 28)")
    throw new Error(
      `La paleta en modo oscuro no usa el fondo activo: ${selectedItem.backgroundColor}`,
    );
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
  await page
    .locator('[data-slot="card"]')
    .filter({ hasText: "sk_12ab" })
    .getByRole("button", { name: "Desactivar API key" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Desactivar" })
    .waitFor();
  await page.getByRole("alertdialog").getByText("sk_12ab").waitFor();
  await page.getByRole("button", { name: "Cancelar" }).click();

  // #50: orden, creador, estado y búsqueda en API keys, aplicados también a las inactivas y guardados en la URL
  const prefixesIn = (title) =>
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .locator('[data-slot="card"]')
      .evaluateAll((cards) =>
        cards.map((card) => card.textContent?.match(/sk_\w{4}/)?.[0] ?? "?"),
      );
  const expectKeys = async (label, active, inactive) => {
    // Reintenta durante 3 s: tras cambiar un filtro, React vuelve a pintar las tarjetas
    let got;
    for (let attempt = 0; attempt < 30; attempt++) {
      got = {
        active: await prefixesIn("Activas"),
        inactive: await prefixesIn("Inactivas"),
      };
      if (JSON.stringify(got) === JSON.stringify({ active, inactive })) return;
      await page.waitForTimeout(100);
    }
    if (JSON.stringify(got) !== JSON.stringify({ active, inactive }))
      throw new Error(
        `API keys (${label}): se esperaba ${JSON.stringify({ active, inactive })} y salió ${JSON.stringify(got)}`,
      );
  };
  const choose = async (trigger, option) => {
    await page.getByRole("combobox", { name: trigger }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  await expectKeys(
    "orden por defecto",
    ["sk_12ab", "sk_rep7", "sk_mov1"],
    ["sk_tmp4", "sk_old9"],
  );
  await choose("Ordenar API keys", "Creación: más antiguas");
  await expectKeys(
    "creación antigua",
    ["sk_mov1", "sk_rep7", "sk_12ab"],
    ["sk_old9", "sk_tmp4"],
  );
  await choose("Ordenar API keys", "Último uso: más reciente");
  await expectKeys(
    "último uso",
    ["sk_mov1", "sk_rep7", "sk_12ab"],
    ["sk_old9", "sk_tmp4"],
  );
  await choose("Filtrar por creador", "Carlos Mendoza");
  await expectKeys("creador", ["sk_mov1"], ["sk_old9"]);
  if (!page.url().includes("orden=uso") || !page.url().includes("creador=2"))
    throw new Error(
      `Los filtros de API keys no quedaron en la URL: ${page.url()}`,
    );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .locator('[data-slot="card"]')
    .filter({ hasText: "sk_mov1" })
    .waitFor();
  await expectKeys("después de recargar", ["sk_mov1"], ["sk_old9"]);
  if (
    !(
      await page.getByRole("combobox", { name: "Ordenar API keys" }).innerText()
    ).includes("Último uso: más reciente")
  )
    throw new Error("El orden de API keys no se conservó al recargar");
  await page.getByRole("tab", { name: /^Inactivas/ }).click();
  await page
    .getByRole("heading", { name: "Activas", exact: true })
    .waitFor({ state: "detached", timeout: 3000 })
    .catch(() => {
      throw new Error("El filtro Inactivas sigue mostrando las activas");
    });
  await expectKeys("solo inactivas", [], ["sk_old9"]);
  await page
    .getByRole("textbox", { name: "Buscar API keys" })
    .fill("no-existe");
  await page.getByText("Ninguna API key coincide con los filtros.").waitFor();
  await page.getByRole("button", { name: "Quitar filtros" }).click();
  await expectKeys(
    "sin filtros",
    ["sk_12ab", "sk_rep7", "sk_mov1"],
    ["sk_tmp4", "sk_old9"],
  );
  if (new URL(page.url()).search !== "")
    throw new Error(`Quitar filtros no limpió la URL: ${page.url()}`);
  console.log(`✓ filtros de API keys en la URL (${themeLabel})`);

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
  // La vista previa debe dibujarse al abrir, con una imagen dañada, con una imagen válida y sin logo
  const waitForQr = (moment) =>
    page
      .waitForFunction(
        () => {
          const svg = document.querySelector(
            '[aria-label="Vista previa del código QR"] svg',
          );
          return (svg?.querySelectorAll("rect, path, circle").length ?? 0) > 20;
        },
        undefined,
        { timeout: 10000 },
      )
      .catch(() => {
        throw new Error(`La vista previa del QR quedó en blanco ${moment}`);
      });
  const logoInput = page.locator('[role="dialog"] input[type="file"]');
  await waitForQr("al abrir el diálogo");
  await logoInput.setInputFiles({
    name: "danada.png",
    mimeType: "image/png",
    buffer: Buffer.from("esto no es una imagen"),
  });
  await page.getByText("No se pudo usar esa imagen").first().waitFor();
  await waitForQr("con una imagen dañada");
  await logoInput.setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await waitForQr("al subir una imagen válida");
  await page.getByRole("button", { name: "Quitar logo" }).click();
  await waitForQr("al quitar el logo");
  console.log("✓ vista previa del QR con logo válido, dañado y sin logo");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Descargar PNG" })
    .click();
  await page.screenshot({
    path: `screenshots/qr-${themeLabel}.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");

  // Bloques de código de la SKILL: sin fondo de "código en línea" y con contraste alto (WCAG AAA, 7:1)
  await page.goto(new URL("skill", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.locator("pre code").first().waitFor();
  const codeBlocks = await page.locator("pre code").evaluateAll((elements) => {
    const channel = (value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    // Tailwind 4 usa oklch(): un canvas convierte cualquier color CSS a RGB
    const context = document.createElement("canvas").getContext("2d", {
      willReadFrequently: true,
    });
    const lum = (css) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = css;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const isTransparent = (css) =>
      css === "transparent" || css === "rgba(0, 0, 0, 0)";
    return elements.map((code) => {
      let block = code.parentElement;
      while (block && isTransparent(getComputedStyle(block).backgroundColor))
        block = block.parentElement;
      const [light, dark] = [
        lum(getComputedStyle(code).color),
        lum(getComputedStyle(block ?? document.body).backgroundColor),
      ].sort((a, b) => b - a);
      return {
        background: getComputedStyle(code).backgroundColor,
        contrast: (light + 0.05) / (dark + 0.05),
      };
    });
  });
  for (const block of codeBlocks) {
    if (!["transparent", "rgba(0, 0, 0, 0)"].includes(block.background))
      throw new Error(
        `El código dentro de un bloque tiene fondo propio (${block.background}) en modo ${themeLabel}`,
      );
    if (block.contrast < 7)
      throw new Error(
        `Contraste insuficiente en un bloque de código (${block.contrast.toFixed(1)}:1) en modo ${themeLabel}`,
      );
  }
  console.log(
    `✓ bloques de código de la SKILL legibles (${codeBlocks.length}, ${themeLabel})`,
  );

  // Las tablas en Markdown (GFM) se muestran como tabla y no como texto con barras
  const skillTable = await page.evaluate(() => ({
    rows: document.querySelectorAll("main table tr").length,
    headers: [...document.querySelectorAll("main table th")].map((th) =>
      th.textContent?.trim(),
    ),
    rawPipes: (document.querySelector("main")?.innerText ?? "").includes(
      "|---",
    ),
  }));
  if (
    skillTable.rows < 3 ||
    skillTable.headers.join(",") !== "Código,Cuerpo,Cuándo" ||
    skillTable.rawPipes
  )
    throw new Error(
      `La tabla de la SKILL no se renderizó: ${JSON.stringify(skillTable)}`,
    );
  console.log(`✓ tabla de la SKILL renderizada (${themeLabel})`);

  const macPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
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
