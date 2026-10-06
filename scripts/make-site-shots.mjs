// The app screenshots on payweek.app.
//
//   npx vite --port 5199
//   node scripts/make-site-shots.mjs
//
// These existed for a month as five PNGs nobody could regenerate, and the
// hero on the landing page ended up showing a version of the app that no
// longer existed — five tabs, a button stack that had been replaced, and a
// "tap a bar" hint that had been removed. Nothing caught it, because nothing
// connected the picture to the thing it was a picture of.
//
// Now they come out of the running app. 416x732 at 2x, which is the size the
// landing page renders them at.
import { readFileSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'

const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)

const OUT = 'public/shots'
const W = 416
const H = 732
const HERO_H = 880
mkdirSync(OUT, { recursive: true })

const b = await chromium.launch()
const errs = []

const shot = async (name, screen, act, height = H) => {
  const p = await b.newPage({ viewport: { width: W, height }, deviceScaleFactor: 2 })
  p.on('pageerror', (e) => errs.push(`${name}: ${e}`))
  // Pinned so "this week" is the same week every run and the figures match
  // the ones quoted in the landing copy.
  await p.clock.setFixedTime(new Date('2026-03-07T18:30:00'))
  await p.goto(`http://localhost:5199/shots.html?s=${screen}`, { waitUntil: 'load' })
  await p.waitForTimeout(2300)
  if (act) await act(p)
  await p.screenshot({ path: `${OUT}/${name}.png` })
  await p.close()
}

// 'homecheck' is the home screen with last week unconfirmed, which is the
// normal state for anybody paid weekly — and it is the better picture: the
// week total and the bars still lead, and the prompt underneath is the thing
// the app is actually for rather than empty space.
// Taller than the rest: the prompt is the point of the picture and a hero
// with its buttons sliced off by the tab bar reads as a broken screenshot
// rather than a tall phone. .frame img is height:auto, so the page frame
// takes whatever aspect it is given.
await shot('week', 'homecheck', undefined, HERO_H)
await shot('shifts', 'shifts')
// The week waiting to be checked, not the one already settled — that prompt
// is the whole argument for the app and it should be what the picture shows.
await shot('payday', 'tocheck')
await shot('breakdown', 'shifts', async (p) => {
  await p.getByRole('button', { name: /Fri/ }).first().click()
  await p.waitForTimeout(900)
})
await shot('check', 'check', async (p) => {
  await p.locator('select').nth(1).selectOption({ index: 1 })
  await p.waitForTimeout(500)
  await p.locator('main input').first().fill('437.53')
  await p.waitForTimeout(1200)
})

await b.close()
if (errs.length) console.log('page errors:', errs.slice(0, 3))

// Every one the same size, and none of them a flat rectangle where a screen
// failed to render.
let ok = errs.length === 0
for (const name of ['week', 'shifts', 'payday', 'breakdown', 'check']) {
  const png = PNG.sync.read(readFileSync(`${OUT}/${name}.png`))
  const want = (name === 'week' ? HERO_H : H) * 2
  const sized = png.width === W * 2 && png.height === want
  const vals = []
  for (let y = 100; y < png.height - 100; y += 7) {
    for (let x = 40; x < png.width - 40; x += 7) {
      const i = (png.width * y + x) << 2
      vals.push((png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3)
    }
  }
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length)
  const rendered = sd > 8
  if (!sized || !rendered) ok = false
  console.log(
    `${OUT}/${name}.png ${png.width}x${png.height} → ` +
      `${sized ? 'size OK' : `WRONG SIZE, wanted ${W * 2}x${want}`}, ` +
      `${rendered ? 'rendered' : 'BLANK'}`,
  )
}
if (!ok) {
  console.error('\nOne of these is wrong. Do not deploy it.')
  process.exit(1)
}
