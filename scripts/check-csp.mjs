// Serves dist with exactly the headers vercel.json declares, then loads every
// shipped page in a real browser and fails on any CSP violation.
//
//   npm run build && node scripts/postbuild-web.mjs
//   npm run check:csp
//
// A policy nobody tests is a policy that breaks the site on deploy, and the
// way it breaks is silent: a blocked script leaves a blank screen, not an
// error anybody sees. Run this after touching vercel.json, after adding a
// third-party script, and after any change to where the app sends data.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'))

const cfg = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
const globalHeaders = cfg.headers.find((h) => h.source === '/(.*)').headers
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }

const srv = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  let f = path.join('dist', decodeURIComponent(url.pathname))
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join('dist', 'app.html')
  for (const h of globalHeaders) res.setHeader(h.key, h.value)
  res.setHeader('Content-Type', TYPES[path.extname(f)] ?? 'application/octet-stream')
  res.end(fs.readFileSync(f))
})
await new Promise((r) => srv.listen(5311, r))

const b = await chromium.launch()
const pages = ['/app.html', '/', '/test.html', '/privacy.html', '/delete-account.html']
let bad = 0
for (const p of pages) {
  const page = await b.newPage()
  const hits = []
  page.on('console', (m) => {
    const t = m.text()
    if (/Content Security Policy|Refused to/i.test(t)) hits.push(t.slice(0, 160))
  })
  page.on('pageerror', (e) => hits.push('JS ERROR: ' + String(e).slice(0, 120)))
  await page.goto('http://localhost:5311' + p, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(1500)
  const uniq = [...new Set(hits)]
  bad += uniq.length
  console.log(`${p.padEnd(22)} ${uniq.length ? '✗ ' + uniq.length + ' issue(s)' : '✓ clean'}`)
  uniq.slice(0, 3).forEach((h) => console.log('    ' + h))
  await page.close()
}
await b.close()
srv.close()
process.exit(bad ? 1 : 0)
