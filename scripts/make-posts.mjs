// Renders the post graphics in posts.html at the sizes Facebook, Instagram
// and TikTok want.
//
//   npx vite --port 5199
//   node scripts/make-posts.mjs
//
// posts.html lives at the repo root rather than in public/, so it is a dev
// server page and never ships to payweek.app — the same arrangement as
// shots.html and preview.html.
import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1300, height: 1500 }, deviceScaleFactor: 1 })
const errs = []
p.on('pageerror', e => errs.push(String(e)))
p.on('requestfailed', r => errs.push('failed: ' + r.url().split('/').pop()))
await p.goto('http://localhost:5199/posts.html', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
for (const [id, name] of [['a', 'post-short-payslip'], ['b', 'post-night-shift'], ['c', 'post-tester-ask']]) {
  await p.locator('#' + id).screenshot({ path: `${name}.png` })
  const box = await p.locator('#' + id).boundingBox()
  console.log(name, box.width + 'x' + box.height)
}
console.log('errors:', errs.slice(0, 4))
await b.close()
