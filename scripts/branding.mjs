// Genera los recursos de marca a partir de branding/logo-original.<ext>.
// Uso: npm run branding
import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brandingDir = path.join(root, 'branding')
const generatedModule = path.join(root, 'src', 'lib', 'branding-assets.ts')
const ALLOWED = /^logo-original\.(png|jpe?g|webp|svg)$/i

const TARGETS = [
  ['logo.png', 512],
  ['logo-192.png', 192],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
  ['favicon-16.png', 16],
]

/** Redimensiona manteniendo la transparencia y el cuadrado. */
async function resize(source, size) {
  return sharp(source, { density: 384 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

await mkdir(brandingDir, { recursive: true })
await mkdir(path.dirname(generatedModule), { recursive: true })

const candidates = (await readdir(brandingDir)).filter((name) => ALLOWED.test(name))
if (candidates.length === 0) {
  console.error('Falta branding/logo-original.png (o .jpg, .webp, .svg)')
  process.exit(1)
}
if (candidates.length > 1) {
  console.error(`Hay varios originales en branding/: ${candidates.join(', ')}. Deja solo uno.`)
  process.exit(1)
}

const fileName = candidates[0]
const source = path.join(brandingDir, fileName)
const isSvg = fileName.toLowerCase().endsWith('.svg')

if (isSvg) {
  await copyFile(source, path.join(brandingDir, 'logo.svg'))
}

const buffers = new Map()
for (const [name, size] of TARGETS) {
  const buffer = await resize(source, size)
  await writeFile(path.join(brandingDir, name), buffer)
  buffers.set(size, buffer)
}

// png-to-ico necesita los PNG en orden ascendente: 16, 32 y 48
const icoBuffers = await Promise.all([16, 32, 48].map((size) => resize(source, size)))
await writeFile(path.join(brandingDir, 'favicon.ico'), await pngToIco(icoBuffers))

// Copia embebida para que el backend pueda servir el favicon y el logo sin depender del sistema de archivos
// en Vercel. Es un archivo generado: no se edita a mano.
const faviconBase64 = (await readFile(path.join(brandingDir, 'favicon.ico'))).toString('base64')
const logoBase64 = (buffers.get(192) ?? (await resize(source, 192))).toString('base64')
const moduleSource = `// Archivo generado por scripts/branding.mjs. No editar a mano.
/* eslint-disable */
export const FAVICON_ICO_BASE64 =
  '${faviconBase64}'

export const LOGO_PNG_BASE64 =
  '${logoBase64}'
`
await writeFile(generatedModule, moduleSource, 'utf8')

console.log('Branding generado en branding/:')
for (const [name, size] of TARGETS) console.log(`  ${name} (${size}x${size})`)
console.log('  favicon.ico (16, 32 y 48)')
if (isSvg) console.log('  logo.svg')
console.log('  src/lib/branding-assets.ts (favicon y logo embebidos para el backend)')
