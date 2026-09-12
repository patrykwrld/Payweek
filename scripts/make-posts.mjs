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
const names = {
  p1: '1-would-you-have-noticed', p2: '2-night-shift', p3: '3-tester-ask',
  p4: '4-holiday-pay', p5: '5-the-week', p6: '6-what-it-doesnt-do',
  p7: '7-not-rare',
}
for (const [id, name] of Object.entries(names)) {
  await p.locator('#' + id).screenshot({ path: `post-${name}.png` })
}
  const box = await p.locator('#' + id).boundingBox()
  console.log(name, box.width + 'x' + box.height)
}
console.log('errors:', errs.slice(0, 4))
await b.close()
