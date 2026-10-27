import { describe, expect, it } from 'vitest'
import { estimateTakeHome, incomeTaxForPeriod, nationalInsuranceForPeriod } from './paye'
import { parseTaxCode } from './taxCode'

const code = (c: string) => parseTaxCode(c)!

describe('nationalInsuranceForPeriod', () => {
  // NI is not an estimate — it is worked out per period and never reconciled,
  // so these are the figures that appear on the payslip.
  it('charges nothing below the primary threshold', () => {
    expect(nationalInsuranceForPeriod(24_200, 'weekly')).toBe(0)
    expect(nationalInsuranceForPeriod(20_000, 'weekly')).toBe(0)
  })

  it('charges 8% between the thresholds', () => {
    // £500 a week. (50000 - 24200) = 25800 at 8% = 2064 = £20.64
    expect(nationalInsuranceForPeriod(50_000, 'weekly')).toBe(2_064)
  })

  it('drops to 2% above the upper earnings limit', () => {
    // £1,200 a week. (96700 - 24200) = 72500 at 8% = 5800,
    // plus (120000 - 96700) = 23300 at 2% = 466. Total 6266 = £62.66
    expect(nationalInsuranceForPeriod(120_000, 'weekly')).toBe(6_266)
  })

  it('uses the monthly thresholds on a monthly cycle', () => {
    // £2,200 a month. (220000 - 104800) = 115200 at 8% = 9216 = £92.16
    expect(nationalInsuranceForPeriod(220_000, 'monthly')).toBe(9_216)
  })

  it('treats a fortnight as two weeks', () => {
    expect(nationalInsuranceForPeriod(100_000, 'fortnightly')).toBe(
      nationalInsuranceForPeriod(50_000, 'weekly') * 2,
    )
  })

  it('charges nothing on nothing', () => {
    expect(nationalInsuranceForPeriod(0, 'weekly')).toBe(0)
    expect(nationalInsuranceForPeriod(-100, 'weekly')).toBe(0)
  })
})

describe('incomeTaxForPeriod', () => {
  it('taxes a normal week on 1257L at basic rate', () => {
    // Free pay 1,257,000 / 52 = 24,173. Taxable 50,000 - 24,173 = 25,827,
    // rounded down to whole pounds = 25,800. At 20% = 5,160 = £51.60
    const r = incomeTaxForPeriod(50_000, code('1257L'), 'weekly')
    expect(r.freePayPence).toBe(24_173)
    expect(r.taxPence).toBe(5_160)
    expect(r.bands).toHaveLength(1)
    expect(r.bands[0]!.percent).toBe(20)
  })

  it('agrees with the annual arithmetic to within the rounding', () => {
    // £26,000 a year: (26,000 - 12,570) x 20% = £2,686, or £51.65 a week.
    // The weekly calculation rounds taxable pay down to whole pounds, so it
    // lands a few pence under — which is the direction payroll rounds too.
    const weekly = incomeTaxForPeriod(50_000, code('1257L'), 'weekly').taxPence
    const annual = Math.round(((2_600_000 - 1_257_000) * 20) / 100 / 52)
    expect(Math.abs(weekly - annual)).toBeLessThanOrEqual(10)
  })

  it('charges nothing when the week is under the free pay', () => {
    expect(incomeTaxForPeriod(20_000, code('1257L'), 'weekly').taxPence).toBe(0)
  })

  it('reaches the higher rate in a big week', () => {
    // Taxable = 120,000 - 24,173 = 95,827 -> 95,800.
    // Basic band this week is 3,770,000 / 52 = 72,500, taxed at 20% = 14,500.
    // The remaining 23,300 at 40% = 9,320. Total 23,820 = £238.20
    const r = incomeTaxForPeriod(120_000, code('1257L'), 'weekly')
    expect(r.taxPence).toBe(23_820)
    expect(r.bands.map((b) => b.percent)).toEqual([20, 40])
  })

  it('taxes every penny on BR, with no allowance', () => {
    // The second-job code. £500 x 20% = £100.
    const r = incomeTaxForPeriod(50_000, code('BR'), 'weekly')
    expect(r.taxPence).toBe(10_000)
    expect(r.freePayPence).toBe(0)
  })

  it('charges nothing at all on NT', () => {
    expect(incomeTaxForPeriod(120_000, code('NT'), 'weekly').taxPence).toBe(0)
  })

  it('gives 0T no allowance but still steps through the bands', () => {
    // Taxable is the whole £500, all inside the weekly basic band.
    const r = incomeTaxForPeriod(50_000, code('0T'), 'weekly')
    expect(r.taxPence).toBe(10_000)
    expect(r.bands[0]!.percent).toBe(20)
  })

  it('uses Scottish bands on an S code, which are kinder at this wage', () => {
    // Taxable 25,800. Starter band 396,700/52 = 7,629 at 19% = 1,449.
    // The rest, 18,171, at 20% = 3,634. Total 5,083 = £50.83 — a few pence
    // less than the 5,160 the same wage pays in England.
    const r = incomeTaxForPeriod(50_000, code('S1257L'), 'weekly')
    expect(r.taxPence).toBe(5_083)
    expect(r.bands.map((b) => b.percent)).toEqual([19, 20])
    expect(r.taxPence).toBeLessThan(incomeTaxForPeriod(50_000, code('1257L'), 'weekly').taxPence)
  })

  it('treats Wales the same as England, for now', () => {
    expect(incomeTaxForPeriod(50_000, code('C1257L'), 'weekly').taxPence).toBe(
      incomeTaxForPeriod(50_000, code('1257L'), 'weekly').taxPence,
    )
  })

  it('adds a K code to taxable pay instead of sheltering it', () => {
    // K500 adds £5,000 a year, or 9,615 a week. Taxable 50,000 + 9,615
    // = 59,615 -> 59,600 at 20% = 11,920 = £119.20, well above the 51.60
    // the same wage pays on 1257L.
    const r = incomeTaxForPeriod(50_000, code('K500'), 'weekly')
    expect(r.taxPence).toBe(11_920)
  })

  it('never takes more than half a payment, which is what K codes are for', () => {
    // K5000 on a £200 week would otherwise charge £319.40 on £200 of pay.
    const r = incomeTaxForPeriod(20_000, code('K5000'), 'weekly')
    expect(r.taxPence).toBe(10_000)
    expect(r.bands[0]!.label).toMatch(/half/i)
  })

  it('works a month the same way as a week', () => {
    // Free pay 1,257,000 / 12 = 104,750. Taxable 220,000 - 104,750
    // = 115,250 -> 115,200 at 20% = 23,040 = £230.40
    const r = incomeTaxForPeriod(220_000, code('1257L'), 'monthly')
    expect(r.taxPence).toBe(23_040)
  })

  it('charges nothing on nothing', () => {
    expect(incomeTaxForPeriod(0, code('1257L'), 'weekly').taxPence).toBe(0)
  })
})

describe('estimateTakeHome', () => {
  it('puts the week together', () => {
    const t = estimateTakeHome(50_000, code('1257L'), 'weekly')
    expect(t.grossPence).toBe(50_000)
    expect(t.taxPence).toBe(5_160)
    expect(t.niPence).toBe(2_064)
    expect(t.netPence).toBe(42_776)
    // Net plus deductions is always the gross — no money appears or vanishes.
    expect(t.netPence + t.taxPence + t.niPence).toBe(t.grossPence)
  })

  it('still charges NI on NT, because NT is an income tax code', () => {
    const t = estimateTakeHome(50_000, code('NT'), 'weekly')
    expect(t.taxPence).toBe(0)
    expect(t.niPence).toBe(2_064)
  })

  it('leaves a small week whole', () => {
    const t = estimateTakeHome(20_000, code('1257L'), 'weekly')
    expect(t.netPence).toBe(20_000)
  })

  it('never returns a net above the gross, at any wage or code', () => {
    for (const gross of [0, 1_000, 24_200, 50_000, 120_000, 500_000]) {
      for (const c of ['1257L', 'BR', 'D0', 'D1', '0T', 'NT', 'K500', 'S1257L']) {
        const t = estimateTakeHome(gross, code(c), 'weekly')
        expect(t.netPence, `${c} on ${gross}`).toBeLessThanOrEqual(gross)
        expect(t.netPence, `${c} on ${gross}`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
