// Builds the email hero, then renders a preview of the finished email.
//
//   npx vite --port 5199
//   node scripts/make-email.mjs
//
// The hero is a real screenshot of the app, captured seconds earlier, so it
// cannot drift away from what somebody sees after installing.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import { appShot, SCREENS } from './lib/app-shot.mjs'

const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)

const TMP = 'node_modules/.cache/payweek-email'
mkdirSync('public/email', { recursive: true })
mkdirSync(TMP, { recursive: true })

const b = await chromium.launch()
const WINDOW_W = 1040
const shot = await appShot(b, { ...SCREENS.check, file: 'check', dir: TMP, width: WINDOW_W })

const hero = await b.newPage({ viewport: { width: 1300, height: 1000 } })
await hero.goto('http://localhost:5199/email-hero.html', { waitUntil: 'networkidle' })
await hero.evaluate((s) => {
  const img = document.querySelector('[data-shot]')
  img.src = s.src
  img.style.top = s.top + 'px'
}, shot)
await hero.waitForFunction(() => {
  const i = document.querySelector('[data-shot]')
  return i.complete && i.naturalWidth
})
await hero.waitForTimeout(400)
await hero.locator('#hero').screenshot({ path: 'public/email/hero.png' })
await hero.close()

// ── preview the finished email ─────────────────────────────────────────
// Point the <img> at the local file so the preview works before the site is
// deployed; the shipped template keeps its absolute payweek.app URL, which
// is the only kind of URL an email client can load.
const html = readFileSync('public/email/invite.html', 'utf8')
const local = html.replace(
  'https://payweek.app/email/hero.png',
  `data:image/png;base64,${readFileSync('public/email/hero.png').toString('base64')}`,
)
writeFileSync(`${TMP}/preview.html`, local)

const mail = await b.newPage({ viewport: { width: 700, height: 1200 }, deviceScaleFactor: 2 })
await mail.goto(`file://${process.cwd()}/${TMP}/preview.html`, { waitUntil: 'networkidle' })
await mail.waitForTimeout(500)
await mail.screenshot({ path: 'assets/social/email-preview.png', fullPage: true })
await mail.close()
await b.close()

// ── checks ─────────────────────────────────────────────────────────────
const png = PNG.sync.read(readFileSync('public/email/hero.png'))
const bytes = readFileSync('public/email/hero.png').length
const sized = png.width === 1200 && png.height === 752

// Gmail clips a message over 102KB and hides everything below the cut,
// including the button. The hero is a linked image so it does not count,
// but the HTML itself must stay well under.
const kb = Buffer.byteLength(html, 'utf8') / 1024
const small = kb < 60

// Every link has to be absolute — a relative href in an email goes nowhere.
const bad = [...html.matchAll(/href="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((h) => !/^(https?:|mailto:)/.test(h))

console.log(`public/email/hero.png ${png.width}x${png.height} ${(bytes / 1024).toFixed(0)}KB → ${sized ? 'size OK' : 'WRONG SIZE'}`)
console.log(`public/email/invite.html ${kb.toFixed(1)}KB → ${small ? 'under the Gmail clip' : 'TOO BIG, Gmail will clip it'}`)
console.log(`links → ${bad.length ? 'RELATIVE HREF: ' + bad.join(', ') : 'all absolute'}`)
console.log('assets/social/email-preview.png written')
if (!sized || !small || bad.length) process.exit(1)
