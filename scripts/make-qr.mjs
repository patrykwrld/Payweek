// Generates the QR code for payweek.app/test, plus an A4 sheet to print and
// stick up in a break room.
//
//   node scripts/make-qr.mjs
//
// High error correction on purpose: these get photographed at an angle, in bad
// light, on a creased bit of paper, and 'H' survives about 30% of the code
// being unreadable. The URL is short enough that the density cost is nothing.
import QRCode from 'qrcode'
import { writeFileSync, mkdirSync } from 'node:fs'

const URL_ = 'https://payweek.app/test'
mkdirSync('assets/qr', { recursive: true })

await QRCode.toFile('assets/qr/payweek-test-qr.png', URL_, {
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 1200,
  color: { dark: '#0b0f14', light: '#ffffff' },
})

// Dark-on-light, because a phone camera reads that far more reliably than the
// inverse — and because it prints on any office printer without eating toner.
const svg = await QRCode.toString(URL_, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 0,
  color: { dark: '#0b0f14', light: '#ffffff' },
})

const sheet = `<!doctype html>
<meta charset="utf-8" />
<title>Payweek tester QR — print me</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; }
  body {
    font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #0b0f14; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 269mm; -webkit-font-smoothing: antialiased;
  }
  h1 { font-size: 34pt; line-height: 1.1; letter-spacing: -.03em; font-weight: 800; }
  .lede { font-size: 15pt; color: #3d4754; margin-top: 8mm; max-width: 150mm; line-height: 1.5; }
  .qr { width: 96mm; height: 96mm; margin: 12mm 0 8mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .url { font-size: 19pt; font-weight: 800; letter-spacing: -.01em; }
  .small { font-size: 11pt; color: #5b6673; margin-top: 7mm; line-height: 1.5; max-width: 150mm; }
  b { font-weight: 800; }
</style>
<h1>Do you know what<br>your night rate is?</h1>
<p class="lede">
  I've made a free app that works out what each shift should actually pay —
  nights, weekends, breaks, shifts past midnight — and tells you if your
  payslip comes up short.
</p>
<div class="qr">${svg}</div>
<div class="url">payweek.app/test</div>
<p class="small">
  <b>Android only for now.</b> No ads, no tracking, and it's free.
  Takes about a minute to join the test.
</p>
`
writeFileSync('assets/qr/print-sheet.html', sheet)
console.log('wrote assets/qr/payweek-test-qr.png and assets/qr/print-sheet.html')
