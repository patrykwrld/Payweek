// Films the 1080x1920 product demo used for TikTok and Reels.
//
//   npx vite --port 5199          # serves the shots harness
//   node scripts/film-demo.mjs    # writes vid/*.webm
//   ffmpeg -i vid/*.webm -vf format=yuv420p -c:v libx264 -preset slow \
//     -crf 20 -r 30 -movflags +faststart payweek-demo.mp4
//
// It drives the real screens through src/shots.tsx, so every figure on screen
// is the rate engine's own arithmetic rather than a mock-up, and re-running it
// after a UI change produces an advert that matches the app.
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
p.on('pageerror', e => errs.push(String(e)))

await p.goto('http://localhost:5199/shots.html?s=week', { waitUntil: 'load' })
await p.waitForTimeout(2600)

// Captions live in the page rather than being burned in afterwards, so they
// are real text at the recording's own resolution instead of upscaled pixels.
await p.addStyleTag({ content: `
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
`})
await p.evaluate(() => {
  const d = document.createElement('div')
  d.id = 'cap'
  document.body.appendChild(d)
})
const say = async (t, ms) => {
  await p.evaluate(t => {
    const c = document.getElementById('cap')
    c.classList.remove('on')
    setTimeout(() => { c.textContent = t; c.classList.add('on') }, 180)
  }, t)
  await p.waitForTimeout(ms)
}
const clear = async () => {
  await p.evaluate(() => document.getElementById('cap').classList.remove('on'))
  await p.waitForTimeout(300)
}

// 1. the number, counting up
await say('You worked 42 hours last week.', 2400)
await say('Do you know what you are owed?', 2200)

// 2. tap a day
await p.getByRole('button', { name: /Saturday/ }).click()
await say('Every shift, priced properly.', 2600)
await clear()

// 3. into the shifts list, open one that runs past midnight
await p.getByRole('link', { name: 'Shifts' }).click()
await p.waitForTimeout(900)
await say('Nights. Weekends. Breaks.', 2300)
await p.getByRole('button', { name: /Fri/ }).first().click()
await p.waitForTimeout(800)
await say('A shift past midnight, split across both rates.', 3000)
await clear()
await p.getByRole('button', { name: 'Done' }).click()
await p.waitForTimeout(600)

// 4. the payslip check — the whole point
await p.getByRole('link', { name: 'Payday' }).click()
await p.waitForTimeout(900)
await p.getByRole('link', { name: /Been paid/ }).click()
await p.waitForTimeout(900)
await say('Then check what they actually paid you.', 2600)
const selects = p.locator('select')
await selects.nth(1).selectOption({ index: 1 })
await p.waitForTimeout(500)
await p.locator('main input').first().fill('437.53')
await p.waitForTimeout(1400)
await say('£30 short. You would never have known.', 3600)
await clear()

// 5. end card
await p.evaluate(() => {
  const e = document.createElement('div')
  e.style.cssText = `position:fixed;inset:0;z-index:10000;background:#0b0f14;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:14px;font-family:Inter,system-ui,sans-serif;opacity:0;transition:opacity .45s ease`
  e.innerHTML = `
    <div style="font-size:40px;font-weight:800;letter-spacing:-0.035em;color:#f3f7fb">
      Payweek<span style="color:#5e9bff">.</span></div>
    <div style="font-size:19px;color:#a3b0c2;text-align:center;line-height:1.45;max-width:300px">
      Know what you're owed<br>before payday.</div>
    <div style="margin-top:10px;font-size:17px;font-weight:700;color:#5e9bff">payweek.app</div>
    <div style="font-size:14px;color:#6f7d90">Free · No ads · No tracking</div>`
  document.body.appendChild(e)
  requestAnimationFrame(() => { e.style.opacity = '1' })
})
await p.waitForTimeout(2800)

console.log('page errors:', errs.slice(0, 3))
await ctx.close()
await b.close()
console.log('recorded')
