// Renders the Instagram stories: captures the real app screens first, then
// composites them into the story frames.
//
//   npx vite --port 5199
//   node scripts/make-stories.mjs
//
// The phone in each story is a live screenshot of the app taken seconds
// earlier from src/shots.tsx, not an export of a mock-up — so if a screen
// changes, the next story changes with it and cannot quietly go stale.
import { readFileSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'
import { appShot, SCREENS } from './lib/app-shot.mjs'

const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)

const OUT = 'assets/social'
const TMP = 'node_modules/.cache/payweek-stories'
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

const b = await chromium.launch()

// ── the app screens ────────────────────────────────────────────────────
// 432x768 at 3x. Wider than the story window needs, so scaling down into the
// frame keeps the app's own text crisp rather than soft.
const WIDTH = 780
const shots = Object.fromEntries(
  await Promise.all(
    ['week', 'payday', 'check'].map(async (k) => [
      k,
      await appShot(b, { ...SCREENS[k], file: k, dir: TMP, width: WIDTH }),
    ]),
  ),
)

// ── the stories ────────────────────────────────────────────────────────
const page = await b.newPage({ viewport: { width: 1200, height: 2000 } })
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('requestfailed', (r) => errs.push('failed: ' + r.url().split('/').pop()))
await page.goto('http://localhost:5199/stories.html', { waitUntil: 'networkidle' })
await page.evaluate((s) => {
  for (const img of document.querySelectorAll('[data-shot]')) {
    const shot = s[img.getAttribute('data-shot')]
    img.src = shot.src
    img.style.top = shot.top + 'px'
  }
}, shots)
await page.waitForFunction(() =>
  [...document.querySelectorAll('[data-shot]')].every((i) => i.complete && i.naturalWidth),
)
await page.waitForTimeout(600)

const overflow = await page.evaluate(() =>
  [...document.querySelectorAll('.screen')]
    .filter((el) => {
      const sub = el.querySelector('.sub')
      return sub.getBoundingClientRect().bottom - el.getBoundingClientRect().top > 780
    })
    .map((el) => el.id),
)
if (overflow.length) {
  console.error(`Text runs into the phone on: ${overflow.join(', ')}. Shorten it.`)
  process.exitCode = 1
}

const frames = [
  ['short', 'story-short.png'],
  ['week', 'story-week.png'],
  ['ask', 'story-ask.png'],
]
for (const [id, file] of frames) {
  await page.locator('#' + id).screenshot({ path: `${OUT}/${file}` })
}
if (errs.length) console.log('page errors:', errs.slice(0, 3))
await b.close()

// ── check what came out ────────────────────────────────────────────────
// Two failures are invisible until somebody posts them: the wrong canvas
// size, and a frame where the phone never loaded and left a dark rectangle.
// The band sampled is where the app screen should be.
let ok = true
for (const [, file] of frames) {
  const png = PNG.sync.read(readFileSync(`${OUT}/${file}`))
  const sized = png.width === 1080 && png.height === 1920
  // A frame whose screenshot failed to load is a flat rectangle, and that
  // is invisible until somebody posts it. Sample inside the phone window
  // and insist on some actual variation.
  const vals = []
  for (let y = 830; y < 1330; y += 5) {
    for (let x = 180; x < 900; x += 5) {
      const i = (png.width * y + x) << 2
      vals.push((png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3)
    }
  }
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length)
  const hasPhone = sd > 8
  if (!sized || !hasPhone) ok = false
  console.log(
    `${OUT}/${file} ${png.width}x${png.height} → ` +
      `${sized ? 'size OK' : 'WRONG SIZE'}, ` +
      `${hasPhone ? 'app screen present' : 'APP SCREEN MISSING'} (sd ${sd.toFixed(1)})`,
  )
}
if (!ok) {
  console.error('\nOne of these is wrong. Do not post it.')
  process.exit(1)
}
