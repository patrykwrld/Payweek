// Films three short vertical clips for Reels, TikTok and Shorts.
//
//   npx vite --port 5199
//   node scripts/film-shorts.mjs      # writes assets/video/*.mp4
//
// The long film (film-demo.mjs) explains the whole app in 45 seconds, which
// is the wrong shape for a feed: people decide in the first second. Each of
// these makes one point, opens on the hook rather than on a logo, and ends on
// the thing to do.
//
// Like every other graphic here they drive the real screens through
// src/shots.tsx, so every figure is the app's own arithmetic — and each clip
// fails loudly if the screen it films is not showing the number its caption
// is about to claim.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'

const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)

const PORT = process.env.SHOT_PORT ?? 5199
const OUT = 'assets/video'
mkdirSync(OUT, { recursive: true })

const STYLE = `
  #cap {
    position: fixed; left: 14px; right: 14px; bottom: 96px; z-index: 9999;
    padding: 13px 16px; text-align: center; pointer-events: none;
    border-radius: 18px; background: rgba(6, 9, 13, 0.9);
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
  #card {
    position: fixed; inset: 0; z-index: 10000; background: #0b0f14;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; padding: 0 34px; text-align: center;
    font-family: Inter, system-ui, sans-serif;
    opacity: 0; transition: opacity .35s ease; pointer-events: none;
  }
  #card.on { opacity: 1 }
  #card .h { font-size: 33px; font-weight: 800; letter-spacing: -0.03em; color: #f3f7fb; line-height: 1.22 }
  #card .s { font-size: 20px; color: #a3b0c2; line-height: 1.4; margin-top: 6px }
  #card .h b { color: #ff6b6b } #card .h em { color: #5e9bff; font-style: normal }
`

const END = (line, url) => `
  <div style="font-size:46px;font-weight:800;letter-spacing:-0.035em;color:#f3f7fb">
    Payweek<span style="color:#5e9bff">.</span></div>
  <div class="s" style="margin-top:2px">${line}</div>
  <div style="margin-top:16px;font-size:22px;font-weight:800;color:#5e9bff">${url}</div>
  <div style="font-size:14.5px;color:#8b98a9;margin-top:2px">Free · Android · UK agency workers</div>`

async function film(name, query, scenes) {
  rmSync('vid', { recursive: true, force: true })
  mkdirSync('vid', { recursive: true })
  // Forces the compositor to render at 2.6x, so the recording is a true
  // 1080x1920 rather than a 415px page upscaled afterwards.
  const b = await chromium.launch({ args: ['--force-device-scale-factor=2.6', '--lang=en-GB'], env: { ...process.env, LANG: 'en_GB.UTF-8', LANGUAGE: 'en_GB' } })
  const ctx = await b.newContext({
    viewport: { width: 415, height: 738 },
    deviceScaleFactor: 1,
    // British dates and a 24-hour clock: the audience is in the UK, and a
    // shift form reading "10:00 PM" on "03/08" looks like somebody else's app.
    locale: 'en-GB',
    recordVideo: { dir: 'vid', size: { width: 1080, height: 1920 } },
  })
  const started = Date.now()
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  // Pinned to a Saturday evening so the fixture week is full on every run.
  await p.clock.setFixedTime(new Date('2026-03-07T18:30:00'))
  await p.goto(`http://localhost:${PORT}/shots.html?${query}`, { waitUntil: 'domcontentloaded' })
  await p.addStyleTag({ content: STYLE })
  await p.evaluate(() => {
    for (const id of ['cap', 'card']) {
      const d = document.createElement('div')
      d.id = id
      document.body.appendChild(d)
    }
  })

  let lead = null
  const api = {
    p,
    async card(html, ms) {
      await p.evaluate((h) => {
        const c = document.getElementById('card')
        c.innerHTML = h
        c.classList.add('on')
      }, html)
      // Everything before the first card has faded in is page load, and is
      // trimmed off so the clip opens on the hook.
      if (lead === null) lead = (Date.now() - started) / 1000 + 0.45
      await p.waitForTimeout(ms)
    },
    async uncard() {
      await p.evaluate(() => document.getElementById('card').classList.remove('on'))
      await p.waitForTimeout(420)
    },
    async say(html, ms) {
      await p.evaluate((h) => {
        const c = document.getElementById('cap')
        c.classList.remove('on')
        setTimeout(() => {
          c.innerHTML = h
          c.classList.add('on')
        }, 180)
      }, html)
      await p.waitForTimeout(ms)
    },
    async clear() {
      await p.evaluate(() => document.getElementById('cap').classList.remove('on'))
      await p.waitForTimeout(300)
    },
    /** Stops the run if the screen is not showing what the caption claims. */
    async mustShow(text) {
      const seen = await p.getByText(text).first().isVisible().catch(() => false)
      if (!seen) throw new Error(`${name}: the screen does not show "${text}" — the caption would be a lie`)
    },
  }

  await scenes(api)
  await ctx.close()
  await b.close()
  if (errs.length) throw new Error(`${name}: page error — ${errs[0]}`)

  const webm = readdirSync('vid').find((f) => f.endsWith('.webm'))
  const out = `${OUT}/${name}.mp4`
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-ss', lead.toFixed(2), '-i', `vid/${webm}`,
     '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
     '-r', '30', '-an', '-movflags', '+faststart', out],
    { stdio: 'inherit' },
  )
  rmSync('vid', { recursive: true, force: true })
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height:format=duration', '-of', 'csv=p=0', out]).toString().trim().split('\n')
  console.log(`${out}  ${probe[0].replace(',', 'x')}  ${Number(probe[1]).toFixed(1)}s`)
  if (!probe[0].startsWith('1080,1920')) throw new Error(`${name}: wrong size ${probe[0]}`)
}

// ── 1 · the payslip that came up short ───────────────────────────────────
await film('short-1-thirty-pounds-short', 's=check', async ({ p, card, uncard, say, clear, mustShow }) => {
  await card(`<div class="h">Your payslip says<br><b>£437.53</b>.</div>
              <div class="s">Did you check it?</div>`, 2900)
  await p.locator('select').nth(1).selectOption({ index: 1 })
  await p.waitForTimeout(500)
  await uncard()
  await say('Type in what they actually paid you.', 1700)
  await p.locator('main input').first().pressSequentially('437.53', { delay: 110 })
  await p.waitForTimeout(700)
  await p.getByText(/short/i).first().scrollIntoViewIfNeeded()
  await mustShow(/£30\.00 short/i)
  await say('<b>£30 short.</b> You’d never have known.', 3600)
  await clear()
  await card(END('Know what you’re owed<br>before payday.', 'payweek.app'), 3000)
})

// ── 2 · what actually lands ──────────────────────────────────────────────
await film('short-2-what-actually-lands', 's=week', async ({ p, card, uncard, say, clear, mustShow }) => {
  await card(`<div class="h">£622 this week.</div>
              <div class="s">How much of it is actually yours?</div>`, 3000)
  await uncard()
  await say('This is what the week is worth.', 2000)
  await p.getByRole('button', { name: /breakdown/i }).first().scrollIntoViewIfNeeded()
  await p.getByRole('button', { name: /breakdown/i }).first().click()
  await p.waitForTimeout(500)
  await p.getByText('National Insurance').first().scrollIntoViewIfNeeded()
  await mustShow('£515.67')
  await say('<em>£515.67</em> after tax and NI. Worked out for you.', 3600)
  await say('Student loan and pension too.', 2200)
  await clear()
  await card(END('An estimate to check<br>your payslip against.', 'payweek.app'), 3000)
})

// ── 3 · the tester ask ───────────────────────────────────────────────────
await film('short-3-tester-ask', 's=week', async ({ p, card, uncard, say, clear, mustShow }) => {
  await card(`<div class="h">I built an app for<br>agency workers.</div>
              <div class="s">Google won’t release it until<br><b style="color:#f3f7fb">12 people</b> test it.</div>`, 3600)
  await uncard()
  await mustShow('£622.08')
  await say('It works out what every shift should pay.', 2500)
  await p.getByRole('link', { name: 'Payday', exact: true }).click()
  await p.waitForTimeout(900)
  await mustShow(/short/i)
  await say('And tells you when the <b>payslip is short</b>.', 2900)
  await clear()
  await card(END('Two taps. You don’t even<br>have to use it.', 'payweek.app/test'), 3600)
})
