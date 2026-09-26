// Renders every invite graphic that is a whole phone screen: the two scan
// overlays (the one you hold up, and a lock screen) and the two Instagram
// stories — then decodes the QR back out of the finished PNGs.
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
mkdirSync('assets/social', { recursive: true })

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

// `qr: false` is the stories. A QR is worse than useless on a story —
// nobody can scan the screen they are holding — so those carry a link
// sticker instead, and there is nothing in them to decode.
const out = [
  { id: 'show', path: 'assets/qr/overlay-show.png', qr: true },
  { id: 'lock', path: 'assets/qr/overlay-lock.png', qr: true },
  { id: 'story-ask', path: 'assets/social/story-ask.png', qr: false },
  { id: 'story-short', path: 'assets/social/story-short.png', qr: false },
]
for (const { id, path } of out) {
  await page.locator('#' + id).screenshot({ path })
}
if (errs.length) console.log('page errors:', errs.slice(0, 3))
await b.close()

// Check the size of every one, and read the QRs back the way a camera would.
let ok = true
for (const { path, qr } of out) {
  const png = PNG.sync.read(readFileSync(path))
  const sized = png.width === 1080 && png.height === 1920
  if (!sized) ok = false
  let note = sized ? 'size OK' : 'WRONG SIZE'
  if (qr) {
    const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
    const good = res && res.data === URL_
    if (!good) ok = false
    note += good ? ', scans OK' : ', DOES NOT SCAN'
  }
  console.log(`${path} ${png.width}x${png.height} → ${note}`)
}
if (!ok) {
  console.error('\nOne of these is wrong. Do not ship it.')
  process.exit(1)
}
