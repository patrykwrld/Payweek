// Screenshots of the take-home estimate, rendered from the real components
// in src/shots.tsx — not a mock-up. For review before any of it ships.
//
//   npx vite --port 5199
//   node scripts/make-takehome-shots.mjs [outDir]
import { mkdirSync } from 'node:fs'

const { chromium } = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.mjs'),
)

const OUT = process.argv[2] ?? 'review-shots'
mkdirSync(OUT, { recursive: true })

const b = await chromium.launch()

async function shot({ file, screen, tax, act, note }) {
  const p = await b.newPage({
    viewport: { width: 432, height: 860 },
    deviceScaleFactor: 2,
  })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  const q = tax ? `&tax=${encodeURIComponent(tax)}` : ''
  await p.goto(`http://localhost:${process.env.SHOT_PORT ?? 5199}/shots.html?s=${screen}${q}`, { waitUntil: 'load' })
  await p.waitForTimeout(2200)
  if (act) await act(p)
  await p.screenshot({ path: `${OUT}/${file}.png`, fullPage: false })
  await p.close()
  if (errs.length) console.log(`  ! ${file}: ${errs[0]}`)
  console.log(`  ${OUT}/${file}.png  ${note}`)
}

// Opens the first take-home breakdown on the screen.
const expand = async (p) => {
  const t = p.getByRole('button', { name: /after tax/i }).first()
  await t.waitFor({ timeout: 4000 }).catch(() => {})
  await t.click().catch(() => {})
  await p.waitForTimeout(400)
}

console.log('Take-home review shots')
await shot({
  file: '1-payday-collapsed',
  screen: 'payday',
  note: 'the estimate as it sits under each week',
})
await shot({
  file: '2-payday-breakdown',
  screen: 'payday',
  act: expand,
  note: 'tapped open — band by band',
})
await shot({
  file: '3-scottish-code',
  screen: 'payday',
  tax: 'S1257L',
  act: expand,
  note: 'S1257L — Scottish starter + basic rate',
})
await shot({
  file: '4-br-second-job',
  screen: 'payday',
  tax: 'BR',
  act: expand,
  note: 'BR — every penny at 20%, no allowance',
})
await shot({
  file: '5-no-tax-code',
  screen: 'payday',
  tax: 'none',
  note: 'no code entered — gross only, unchanged',
})
await shot({
  file: '6-settings-field',
  screen: 'settings',
  note: 'where the code goes in Setup',
  act: async (p) => {
    const f = p.getByText(/tax code/i).first()
    await f.scrollIntoViewIfNeeded().catch(() => {})
    await p.waitForTimeout(400)
  },
})

await b.close()
