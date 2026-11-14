// Renders the profile banners in banners.html, and a full-bleed avatar.
//
//   npx vite --port 5199
//   node scripts/make-banners.mjs
//
// One banner per platform that has one. TikTok, Instagram, Threads and
// WhatsApp channels have no banner at all — they only take the avatar.
//
// Each platform crops its banner differently on a phone and lays the profile
// picture over a corner, so banners.html keeps everything worth reading inside
// a .safe box. This script measures that every word and the week card really
// are inside it, because a headline cut in half on a phone is the one mistake
// nobody notices from a laptop.
import { mkdirSync, statSync } from 'node:fs'

const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)
mkdirSync('assets/banners', { recursive: true })

// name → [element id, width, height, upload limit in MB]
const BANNERS = {
  'x-header-1500x500': ['x', 1500, 500, 5],
  'facebook-cover-1640x720': ['fb', 1640, 720, 10],
  'youtube-banner-2560x1440': ['yt', 2560, 1440, 6],
  'avatar-1024': ['avatar', 1024, 1024, 5],
}

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 2700, height: 1600 }, deviceScaleFactor: 1 })
const errs = []
p.on('pageerror', e => errs.push(String(e)))
p.on('requestfailed', r => errs.push('failed: ' + r.url().split('/').pop()))
await p.goto('http://localhost:5199/banners.html', { waitUntil: 'networkidle' })
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(800)

let ok = true
for (const [name, [id, w, h, limitMb]] of Object.entries(BANNERS)) {
  const path = `assets/banners/${name}.png`
  const el = p.locator('#' + id)
  await el.screenshot({ path })
  const box = await el.boundingBox()
  const problems = []
  if (Math.round(box.width) !== w || Math.round(box.height) !== h) {
    problems.push(`size ${Math.round(box.width)}x${Math.round(box.height)}, wanted ${w}x${h}`)
  }
  // Everything readable has to sit inside the safe box, and (for the banners
  // with a profile picture over them) clear of that circle.
  const spill = await p.evaluate(id => {
    const root = document.getElementById(id)
    const safe = root.querySelector('.safe')
    if (!safe) return []
    const s = safe.getBoundingClientRect()
    const pic = root.querySelector('.guide.pic')
    let circle = null
    if (pic) {
      // .guide is display:none outside ?guides, so read its box from style.
      const r = root.getBoundingClientRect()
      const px = k => parseFloat(pic.style[k])
      circle = { cx: r.left + px('left') + px('width') / 2, cy: r.top + px('top') + px('height') / 2, rad: px('width') / 2 }
    }
    const out = []
    for (const el of safe.querySelectorAll('.brand, h1, .sub, .url, .card')) {
      const range = document.createRange()
      range.selectNodeContents(el)
      const rects = el.classList.contains('card') ? [el.getBoundingClientRect()] : [...range.getClientRects()]
      for (const q of rects) {
        if (q.width === 0) continue
        if (q.left < s.left - 1 || q.right > s.right + 1 || q.top < s.top - 1 || q.bottom > s.bottom + 1) {
          out.push(`${el.className || el.tagName} leaves the safe area`)
          break
        }
        if (circle) {
          const nx = Math.max(q.left, Math.min(circle.cx, q.right))
          const ny = Math.max(q.top, Math.min(circle.cy, q.bottom))
          if (Math.hypot(nx - circle.cx, ny - circle.cy) < circle.rad) {
            out.push(`${el.className || el.tagName} is under the profile picture`)
            break
          }
        }
      }
    }
    return out
  }, id)
  problems.push(...spill)
  const mb = statSync(path).size / 1024 / 1024
  if (mb > limitMb) problems.push(`${mb.toFixed(1)}MB, over the ${limitMb}MB upload limit`)
  if (problems.length) ok = false
  console.log(`${path} ${w}x${h} ${mb.toFixed(2)}MB → ${problems.length ? 'WRONG: ' + problems.join('; ') : 'OK'}`)
}
if (errs.length) { console.log('page errors:', errs.slice(0, 4)); ok = false }
await b.close()
if (!ok) {
  console.error('\nA banner would be cropped, covered or refused. Do not upload it.')
  process.exit(1)
}
