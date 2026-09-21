// Renders the scan overlays — the screen you hold up to somebody, and a lock
// screen version — then decodes the QR back out of the finished PNG.
//
//   npx vite --port 5199
//   node scripts/make-overlay.mjs
//
// The decode at the end is the point. A QR that has been composited, scaled
// and re-encoded can stop scanning while still looking perfectly fine, and the
// only way to know is to read it back the way a phone camera would.
import QRCode from 'qrcode'
import jsQRImport from 'jsqr'
import { PNG } from 'pngjs'
import { readFileSync, mkdirSync } from 'node:fs'

const jsQR = jsQRImport.default || jsQRImport

// Playwright is not a dependency of this project — it is big, it downloads
// browsers, and it is only ever needed by these tooling scripts. Take it from
// wherever it happens to live.
const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)
const URL_ = 'https://payweek.app/test'
mkdirSync('assets/qr', { recursive: true })

// Error correction H: these get photographed at an angle, in bad light, and H
// survives roughly 30% of the code being unreadable.
const svg = await QRCode.toString(URL_, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 0,
  color: { dark: '#0b0f14', light: '#ffffff' },
})

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1200, height: 2000 } })
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('requestfailed', (r) => errs.push('failed: ' + r.url().split('/').pop()))
await page.goto('http://localhost:5199/overlay.html', { waitUntil: 'networkidle' })
await page.evaluate((s) => {
  for (const el of document.querySelectorAll('.qr')) el.innerHTML = s
}, svg)
await page.waitForTimeout(700)

const out = [
  ['show', 'assets/qr/overlay-show.png'],
  ['lock', 'assets/qr/overlay-lock.png'],
]
for (const [id, path] of out) {
  await page.locator('#' + id).screenshot({ path })
}
if (errs.length) console.log('page errors:', errs.slice(0, 3))
await b.close()

// Read each one back the way a camera would.
let ok = true
for (const [, path] of out) {
  const png = PNG.sync.read(readFileSync(path))
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  const good = res && res.data === URL_
  if (!good) ok = false
  console.log(
    `${path} ${png.width}x${png.height} → ${good ? 'scans OK' : 'DOES NOT SCAN'}`,
  )
}
if (!ok) {
  console.error('\nA QR in one of these does not decode. Do not ship it.')
  process.exit(1)
}
