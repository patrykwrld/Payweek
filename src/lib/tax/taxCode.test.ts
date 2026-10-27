import { describe, expect, it } from 'vitest'
import { DEFAULT_TAX_CODE, parseTaxCode, taxCodeProblem } from './taxCode'

describe('parseTaxCode', () => {
  it('reads the ordinary code off a payslip', () => {
    const c = parseTaxCode('1257L')!
    expect(c.region).toBe('uk')
    expect(c.kind).toBe('allowance')
    // 1257 means £12,570, which is 1,257,000 pence.
    expect(c.allowancePence).toBe(1_257_000)
    expect(c.nonCumulative).toBe(false)
  })

  it('accepts the other suffix letters', () => {
    for (const letter of ['L', 'M', 'N', 'T']) {
      expect(parseTaxCode(`1257${letter}`)?.allowancePence).toBe(1_257_000)
    }
  })

  it('takes S for Scotland and C for Wales', () => {
    expect(parseTaxCode('S1257L')?.region).toBe('scotland')
    expect(parseTaxCode('C1257L')?.region).toBe('wales')
    expect(parseTaxCode('1257L')?.region).toBe('uk')
  })

  it('does not mistake 1257M for 1257 with an M1 marker', () => {
    const c = parseTaxCode('1257M')!
    expect(c.allowancePence).toBe(1_257_000)
    expect(c.nonCumulative).toBe(false)
  })

  it('reads the non-cumulative markers, however they are spaced', () => {
    for (const raw of ['1257L W1', '1257L M1', '1257L X', '1257LW1', '1257L/X']) {
      const c = parseTaxCode(raw)
      expect(c, raw).not.toBeNull()
      expect(c!.nonCumulative, raw).toBe(true)
      expect(c!.allowancePence, raw).toBe(1_257_000)
    }
  })

  it('reads the flat-rate codes at the right rate for the region', () => {
    expect(parseTaxCode('BR')?.flatPercent).toBe(20)
    expect(parseTaxCode('D0')?.flatPercent).toBe(40)
    expect(parseTaxCode('D1')?.flatPercent).toBe(45)
    // Scotland's bands are different, so the same letters mean other rates.
    expect(parseTaxCode('SD0')?.flatPercent).toBe(21)
    expect(parseTaxCode('SD1')?.flatPercent).toBe(42)
    expect(parseTaxCode('SD2')?.flatPercent).toBe(45)
  })

  it('refuses D2 outside Scotland, which has no band to point at', () => {
    expect(parseTaxCode('D2')).toBeNull()
    expect(parseTaxCode('CD2')).toBeNull()
  })

  it('reads NT and 0T', () => {
    expect(parseTaxCode('NT')?.kind).toBe('none')
    const zero = parseTaxCode('0T')!
    expect(zero.kind).toBe('noAllowance')
    expect(zero.allowancePence).toBe(0)
  })

  it('reads a K code as pay ADDED to the taxable figure', () => {
    const c = parseTaxCode('K500')!
    expect(c.allowancePence).toBe(0)
    // K500 adds £5,000 a year.
    expect(c.addToTaxablePence).toBe(500_000)
  })

  it('folds case and ignores spacing', () => {
    expect(parseTaxCode('  s1257l  ')?.region).toBe('scotland')
    expect(parseTaxCode('br')?.flatPercent).toBe(20)
  })

  it('refuses what is not a tax code', () => {
    for (const bad of ['', 'S', 'C', 'HELLO', '1257', 'L1257', '12.57L', 'BRX2']) {
      expect(parseTaxCode(bad), bad).toBeNull()
    }
  })
})

describe('taxCodeProblem', () => {
  it('passes the default', () => {
    expect(taxCodeProblem(DEFAULT_TAX_CODE)).toBeNull()
  })

  it('asks for one when the box is empty', () => {
    expect(taxCodeProblem('')).toMatch(/payslip/i)
  })

  it('names the shape it wants when the code is wrong', () => {
    expect(taxCodeProblem('BANANA')).toMatch(/1257L/)
  })
})
