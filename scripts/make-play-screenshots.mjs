import { chromium } from 'playwright'
// page.screenshot() renders at the context's deviceScaleFactor, not at the
// launch flag (that one is for video capture). 432x768 is exactly 9:16, so
// 2.5x lands on Play's required 1080x1920 with no resampling.
const b = await chromium.launch()
const shot = async (name, screen, fn) => {
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5 })
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.clock.setFixedTime(new Date('2026-03-07T18:30:00'))
  await p.goto(`http://localhost:5199/shots.html?s=${screen}`, { waitUntil: 'load' })
  await p.waitForTimeout(2200)
  if (fn) await fn(p)
  await p.screenshot({ path: name })
  console.log(name, errs.length ? errs[0] : 'ok')
  await p.close()
}

await shot('1-week-total.png', 'week')
await shot('4-shifts-by-week.png', 'shifts')
await shot('5-payday.png', 'payday')
await shot('2-how-it-was-worked-out.png', 'shifts', async p => {
  await p.getByRole('button', { name: /Fri/ }).first().click()
  await p.waitForTimeout(900)
})
await shot('3-night-weekend-rates.png', 'rates')
await shot('6-payslip-check.png', 'check', async p => {
  await p.locator('select').nth(1).selectOption({ index: 1 })
  await p.waitForTimeout(500)
  await p.locator('main input').first().fill('437.53')
  await p.waitForTimeout(1200)
})
await b.close()
