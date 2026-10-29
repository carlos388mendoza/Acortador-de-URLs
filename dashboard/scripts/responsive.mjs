import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const baseUrl = 'http://127.0.0.1:5174/dashboard/'
const widths = [320, 375, 768, 1024, 1440]
const routes = [
  { name: 'inicio', path: '' },
  { name: 'login', path: 'login' },
  { name: 'urls', path: 'urls' },
  { name: 'api-keys', path: 'api-keys' },
  { name: 'personas', path: 'users' },
  { name: 'perfil', path: 'profile' },
]

let server
let browser
try {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], {
    env: { ...process.env, VITE_USE_MOCKS: 'true' },
    stdio: 'ignore',
    detached: process.platform !== 'win32',
  })
  let ready = false
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) { ready = true; break }
    } catch { /* Vite todavía está iniciando. */ }
    await delay(250)
  }
  if (!ready) throw new Error('Vite no respondió en http://127.0.0.1:5173/dashboard/')

  const localBrowserLibs = `${process.env.HOME}/.local/share/pw-libs/usr/lib/x86_64-linux-gnu`
  browser = await chromium.launch({ headless: true, env: { ...process.env, LD_LIBRARY_PATH: [process.env.LD_LIBRARY_PATH, localBrowserLibs].filter(Boolean).join(':') } })
  const page = await browser.newPage()
  await mkdir('screenshots', { recursive: true })
  for (const width of widths) {
    for (const route of routes) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(new URL(route.path, baseUrl).toString(), { waitUntil: 'networkidle' })
      await page.waitForTimeout(250)
      if (await page.locator('#root').innerText() === '') throw new Error(`La página ${route.name} no se renderizó`)
      if (route.name === 'login') {
        const values = await page.locator('input[type=email], input[type=password]').evaluateAll((inputs) => inputs.map((input) => input.value))
        if (values.some((value) => value !== '')) throw new Error('Los campos de acceso deben iniciar vacíos')
      }
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 12).map((el) => ({ tag: el.tagName, text: el.textContent?.slice(0, 50), className: typeof el.className === 'string' ? el.className : '', right: Math.round(el.getBoundingClientRect().right), width: Math.round(el.getBoundingClientRect().width) })),
      }))
      if (dimensions.scrollWidth > dimensions.clientWidth) {
        throw new Error(`Desbordamiento horizontal en ${route.name} a ${width}px: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px; ${JSON.stringify(dimensions.offenders)}`)
      }
      if (width === 1440) await page.screenshot({ path: `screenshots/${route.name}.png`, fullPage: true })
      console.log(`✓ ${route.name}: ${width}px`)
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Escribe una página o acción…').waitFor()
  await page.keyboard.press('Escape')
  await page.getByPlaceholder('Escribe una página o acción…').waitFor({ state: 'hidden' })
  await page.getByRole('textbox', { name: 'Buscar URLs' }).focus()
  await page.keyboard.press('n')
  if (await page.getByRole('dialog').count()) throw new Error('El atajo N se activó mientras se escribía')
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: 'Buscar URLs' }).blur()
  await page.keyboard.press('/')
  if (await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) !== 'Buscar URLs') throw new Error('El atajo / no enfocó el buscador')
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: 'Buscar URLs' }).blur()
  await page.keyboard.press('n')
  await page.getByRole('dialog').getByText('Crear URL').waitFor()
  await page.keyboard.press('Escape')
  await page.keyboard.press('g')
  await page.keyboard.press('u')
  await page.getByRole('heading', { name: 'URLs' }).waitFor()
  await page.keyboard.press('?')
  await page.getByText('Atajos de teclado').waitFor()
  await page.keyboard.press('Escape')
  await page.goto(new URL('urls', baseUrl).toString(), { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Generar QR' }).first().click()
  await page.getByRole('dialog').getByText('Código QR').waitFor()
  await page.getByRole('button', { name: 'Quitar logo' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Descargar PNG' }).click()
  await page.screenshot({ path: 'screenshots/qr.png', fullPage: true })
  await page.keyboard.press('Escape')

  const macPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await macPage.addInitScript(() => Object.defineProperty(navigator, 'platform', { configurable: true, value: 'MacIntel' }))
  await macPage.goto(baseUrl, { waitUntil: 'networkidle' })
  if (!(await macPage.getByText('⌘', { exact: false }).count())) throw new Error('No se mostró ⌘ al simular macOS')
  await macPage.keyboard.press('Meta+k')
  await macPage.getByPlaceholder('Escribe una página o acción…').waitFor()
  await macPage.keyboard.press('Escape')
  console.log('✓ Atajos, búsqueda en vivo, QR y simulación de macOS')
} finally {
  await browser?.close()
  if (server?.pid) {
    try { process.kill(process.platform === 'win32' ? server.pid : -server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
  }
}
