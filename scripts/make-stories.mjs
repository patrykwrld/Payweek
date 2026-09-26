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
//
// `focus` names the thing the story is actually about. The window in the
// story shows ~313 CSS px of a 768 px screen, and on two of these three the
// payoff is nowhere near the top — so rather than hard-coding offsets that
// rot the moment a screen gains a row, measure where that element sits and
// let the story scroll the image to it.
const SCALE = 780 / 432
const PAD = 20 // app px of breathing room above the focused element

const grab = async (screen, file, { act, focus } = {}) => {
  const p = await b.newPage({
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 3,
  })
  // Pin the clock so "this week" is the same week every run.
  await p.clock.setFixedTime(new Date('2026-03-07T18:30:00'))
  await p.goto(`http://localhost:5199/shots.html?s=${screen}`, { waitUntil: 'load' })
  await p.waitForTimeout(2200)
  if (act) await act(p)

  let y = 0
  if (focus) {
    const box = await focus(p).first().boundingBox().catch(() => null)
    if (box) y = Math.max(0, box.y - PAD)
    else console.warn(`${screen}: focus not found, showing the top of the screen`)
  }
  await p.screenshot({ path: `${TMP}/${file}.png` })
  await p.close()
  return {
    src: `data:image/png;base64,${readFileSync(`${TMP}/${file}.png`).toString('base64')}`,
    top: -Math.round(y * SCALE),
  }
}

const shots = {
  // Skip the app's own wordmark — the story already has one directly above
  // it, and two in a row looks like a mistake.
  week: await grab('week', 'week', { focus: (p) => p.getByText(/this pay week/i) }),
  payday: await grab('payday', 'payday', { focus: (p) => p.locator('main :is(h2,h3)') }),
  // The £30 only exists once a payslip figure is entered, same as the store
  // screenshot — and the verdict is below the form, so focus on it.
  check: await grab('check', 'check', {
    act: async (p) => {
      await p.locator('select').nth(1).selectOption({ index: 1 })
      await p.waitForTimeout(500)
      await p.locator('main input').first().fill('437.53')
      await p.waitForTimeout(1200)
    },
    focus: (p) => p.getByText(/short/i),
  }),
}

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
