// Films the 1080x1920 product film used for TikTok, Reels and the store.
//
//   npx vite --port 5199          # serves the shots harness
//   node scripts/film-demo.mjs    # writes vid/*.webm
//   ffmpeg -i vid/*.webm -vf format=yuv420p -c:v libx264 -preset slow \
//     -crf 20 -r 30 -movflags +faststart payweek-film.mp4
//
// It drives the real screens through src/shots.tsx, so every figure on screen
// is the rate engine's own arithmetic rather than a mock-up, and re-running it
// after a UI change produces a film that matches the app.
import { chromium } from 'playwright'
import { rmSync, mkdirSync } from 'node:fs'

rmSync('vid', { recursive: true, force: true })
mkdirSync('vid', { recursive: true })

// Forces the compositor to render at 2.6x, so the recording is a true
// 1080x1920 rather than a 415px page upscaled afterwards.
const b = await chromium.launch({ args: ['--force-device-scale-factor=2.6'] })
const ctx = await b.newContext({
  viewport: { width: 415, height: 738 },
  deviceScaleFactor: 1,
  recordVideo: { dir: 'vid', size: { width: 1080, height: 1920 } },
})
const p = await ctx.newPage()
// The fixture dates are relative to today, so on a Monday the week is nearly
// empty. Pinning the clock to a Saturday evening gives a full week every time
// this is re-run, which is what an advert needs to show.
await p.clock.setFixedTime(new Date('2026-03-07T18:30:00'))
const errs = []
p.on('pageerror', (e) => errs.push(String(e)))

await p.goto('http://localhost:5199/shots.html?s=week', { waitUntil: 'load' })
await p.waitForTimeout(2600)

// Captions live in the page rather than being burned in afterwards, so they
// are real text at the recording's own resolution instead of upscaled pixels.
await p.addStyleTag({
  content: `
  #cap {
    position: fixed; left: 14px; right: 14px; bottom: 84px; z-index: 9999;
    padding: 13px 16px; text-align: center; pointer-events: none;
    border-radius: 18px;
    background: rgba(6, 9, 13, 0.88);
    box-shadow: 0 8px 30px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.07);
    font-family: Inter, system-ui, sans-serif;
    font-size: 19.5px; line-height: 1.3; font-weight: 700;
    letter-spacing: -0.015em; color: #fff;
    opacity: 0; transform: translateY(6px);
    transition: opacity .26s ease, transform .26s ease;
  }
  #cap.on { opacity: 1; transform: none }
  #cap em { color: #5e9bff; font-style: normal }
  #cap b { color: #ff6b6b; font-weight: 800 }
  /* A title card, for the two moments the film needs to change subject. */
  #card {
    position: fixed; inset: 0; z-index: 10000; background: #0b0f14;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; padding: 0 40px; text-align: center;
    font-family: Inter, system-ui, sans-serif;
    opacity: 0; transition: opacity .4s ease; pointer-events: none;
  }
  #card.on { opacity: 1 }
`,
})
await p.evaluate(() => {
  for (const id of ['cap', 'card']) {
    const d = document.createElement('div')
    d.id = id
    document.body.appendChild(d)
  }
})

const say = async (html, ms) => {
  await p.evaluate((h) => {
    const c = document.getElementById('cap')
    c.classList.remove('on')
    setTimeout(() => {
      c.innerHTML = h
      c.classList.add('on')
    }, 180)
  }, html)
  await p.waitForTimeout(ms)
}
const clear = async () => {
  await p.evaluate(() => document.getElementById('cap').classList.remove('on'))
  await p.waitForTimeout(320)
}
const card = async (html, ms) => {
  await p.evaluate((h) => {
    const c = document.getElementById('card')
    c.innerHTML = h
    c.classList.add('on')
  }, html)
  await p.waitForTimeout(ms)
  await p.evaluate(() => document.getElementById('card').classList.remove('on'))
  await p.waitForTimeout(450)
}
const tab = async (name) => {
  await p.getByRole('link', { name, exact: true }).click()
  await p.waitForTimeout(950)
}

// ── 1. the question ─────────────────────────────────────────────────────
await card(
  `<div style="font-size:31px;font-weight:800;letter-spacing:-0.03em;color:#f3f7fb;line-height:1.25">
     You worked 42 hours<br>last week.</div>
   <div style="font-size:20px;color:#a3b0c2;margin-top:6px">Do you know what you're owed?</div>`,
  3000,
)

// ── 2. the number ───────────────────────────────────────────────────────
await say('This is what the week is actually worth.', 2800)
await p.getByRole('button', { name: /Saturday/ }).click()
await say('Tap a day and it tells you what that shift earned.', 3000)
await clear()

// ── 3. how it knows ─────────────────────────────────────────────────────
await card(
  `<div style="font-size:29px;font-weight:800;letter-spacing:-0.03em;color:#f3f7fb;line-height:1.3">
     It knows<br>your real rate.</div>`,
  2400,
)
await tab('Rates')
await say('Set each agency up once — base, nights, weekends.', 3200)
await clear()

// ── 4. adding a shift ───────────────────────────────────────────────────
await tab('Add')
await say('Logging a shift takes a few taps.', 2400)
await p.getByRole('button', { name: 'Add a shift' }).click()
await p.waitForTimeout(1100)
// Move it off the day the fixture already has a shift on, or the form shows
// its overlap warning — correct behaviour, but it reads as an error in an
// advert. A Sunday night also puts the live total on the night rate, which is
// the more interesting number to show.
await p.getByLabel('Which day').fill('2026-03-08')
await p.getByLabel('Started').fill('22:00')
await p.getByLabel('Finished').fill('06:00')
await p.waitForTimeout(1200)
// The live total sits below the fold in the sheet, so bring it into frame —
// it is the whole reason this beat is in the film.
await p.getByText('This shift pays').scrollIntoViewIfNeeded()
await p.waitForTimeout(900)
await say('And it prices it while you type.', 3000)
await clear()
await p.getByRole('button', { name: 'Cancel' }).click()
await p.waitForTimeout(700)

// ── 5. the week, shift by shift ─────────────────────────────────────────
await tab('Shifts')
await say('Every shift, grouped by pay week.', 2600)
await say(
  'The bar under each one is what the money was made of.',
  3000,
)
await p.getByRole('button', { name: /Fri/ }).first().click()
await p.waitForTimeout(900)
await say(
  '18:00 to 02:00 — <em>split across base and night rates</em>, breaks taken off.',
  3800,
)
await clear()
await p.getByRole('button', { name: 'Done' }).click()
await p.waitForTimeout(700)

// ── 6. when it lands ────────────────────────────────────────────────────
await tab('Payday')
await say('What each week should pay, and when it lands.', 3000)
// Describes what is actually on screen: the fixture has one short week and
// no matching one, so claiming a green state here would be a caption the
// footage does not support.
await say('Blue is still coming. <b>Red means it came up short.</b>', 3400)
await clear()

// ── 7. the payoff ───────────────────────────────────────────────────────
await card(
  `<div style="font-size:29px;font-weight:800;letter-spacing:-0.03em;color:#f3f7fb;line-height:1.3">
     Then check<br>the payslip.</div>`,
  2400,
)
await p.getByRole('link', { name: /Been paid/ }).click()
await p.waitForTimeout(1000)
await say('Type in what they actually paid you.', 2600)
const selects = p.locator('select')
await selects.nth(1).selectOption({ index: 1 })
await p.waitForTimeout(600)
await p.locator('main input').first().fill('437.53')
await p.waitForTimeout(1500)
await say('<b>£30 short.</b> And you would never have known.', 4000)
await clear()

// ── 8. what it is not ───────────────────────────────────────────────────
await say('No ads. No tracking. Your data stays yours.', 3000)
await clear()

// ── 9. end card ─────────────────────────────────────────────────────────
await p.evaluate(() => {
  const e = document.getElementById('card')
  e.innerHTML = `
    <div style="font-size:44px;font-weight:800;letter-spacing:-0.035em;color:#f3f7fb">
      Payweek<span style="color:#5e9bff">.</span></div>
    <div style="font-size:20px;color:#a3b0c2;line-height:1.45;margin-top:2px">
      Know what you're owed<br>before payday.</div>
    <div style="margin-top:14px;font-size:18px;font-weight:700;color:#5e9bff">payweek.app</div>
    <div style="font-size:14.5px;color:#8b98a9;margin-top:2px">Free · Built for UK agency workers</div>`
  e.classList.add('on')
})
await p.waitForTimeout(3200)

console.log('page errors:', errs.slice(0, 3))
await ctx.close()
await b.close()
console.log('recorded')
