// Renders the post graphics in posts.html at the sizes Facebook, Instagram
// and TikTok want.
//
//   npx vite --port 5199
//   node scripts/make-posts.mjs
//
// posts.html lives at the repo root rather than in public/, so it is a dev
// server page and never ships to payweek.app — the same arrangement as
// shots.html and preview.html.
import { mkdirSync } from 'node:fs'

const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)
mkdirSync('assets/posts', { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1300, height: 1500 }, deviceScaleFactor: 1 })
const errs = []
p.on('pageerror', e => errs.push(String(e)))
p.on('requestfailed', r => errs.push('failed: ' + r.url().split('/').pop()))
await p.goto('http://localhost:5199/posts.html', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const names = {
  p1: '1-would-you-have-noticed', p2: '2-night-shift', p3: '3-tester-ask',
  p4: '4-holiday-pay', p5: '5-the-week', p6: '6-what-it-doesnt-do',
  p7: '7-not-rare',
}
// Facebook wants 1080x1350, Instagram squares 1080x1080. Anything else
// gets cropped by the platform, usually through the headline.
const SIZES = { p3: [1080, 1080], p6: [1080, 1080] }
let ok = true
for (const [id, name] of Object.entries(names)) {
  const path = `assets/posts/post-${name}.png`
  await p.locator('#' + id).screenshot({ path })
  const box = await p.locator('#' + id).boundingBox()
  const [w, h] = SIZES[id] ?? [1080, 1350]
  const right = Math.round(box.width) === w && Math.round(box.height) === h
  if (!right) ok = false
  console.log(`${path} ${Math.round(box.width)}x${Math.round(box.height)} → ${right ? 'OK' : `WRONG, wanted ${w}x${h}`}`)
}
if (errs.length) console.log('page errors:', errs.slice(0, 4))
await b.close()
if (!ok) {
  console.error('\nA post is the wrong size and will be cropped. Do not use it.')
  process.exit(1)
}
