/**
 * Income tax and National Insurance on one pay period.
 *
 * ── What this can and cannot know ──────────────────────────────────────────
 *
 * National Insurance is EXACT. Class 1 is worked out on each pay period on
 * its own and is never reconciled across the year, so a week's NI depends on
 * nothing but that week's pay and the cycle it is paid on. The figure below
 * is the figure on the payslip.
 *
 * Income tax is an ESTIMATE, and it is worth being precise about why. Most
 * people are on a cumulative code: each payday HMRC looks at everything
 * earned and taxed since 6 April and charges whatever brings the year to
 * date straight. Payweek knows the shifts entered into it. It does not know
 * about a second job, a few weeks on the books somewhere else in May, a
 * refund already given, or anything that happened before the app was
 * installed — so it cannot reproduce a cumulative calculation and should not
 * pretend to.
 *
 * What it does instead is the Week 1 / Month 1 calculation: this period's
 * pay, this period's slice of the allowance, nothing carried in. That is
 * exactly right for anyone whose code ends W1, M1 or X — which a great many
 * agency workers are, because starting mid-year on a new assignment puts you
 * there. For everyone else it is close in a steady week and wrong in an odd
 * one, in the direction the cumulative calculation will later correct.
 *
 * So: a good guide to whether a payslip is roughly right. Not a payslip.
 *
 * ── HMRC's rounding ────────────────────────────────────────────────────────
 *
 * Taxable pay is rounded DOWN to whole pounds before the rates are applied,
 * and the tax that comes out is rounded down to the penny. Both favour the
 * worker, both are what payroll does, and doing neither would leave this a
 * penny or two out against a real payslip on most weeks.
 */

import type { PayCycle, TaxRegion } from './rates'
import {
  ALLOWANCE_TAPER_FROM_PENCE,
  ALLOWANCE_TAPER_RATE,
  BANDS,
  NI_PRIMARY_THRESHOLD_PENCE,
  NI_RATE_MAIN_PERCENT,
  NI_RATE_UPPER_PERCENT,
  NI_UPPER_EARNINGS_LIMIT_PENCE,
  PERIODS_PER_YEAR,
} from './rates'
import type { ParsedTaxCode } from './taxCode'

/** One slice of pay and what was charged on it, for the breakdown UI. */
export interface BandCharge {
  label: string
  percent: number
  onPence: number
  taxPence: number
}

export interface TakeHome {
  grossPence: number
  taxPence: number
  niPence: number
  /** Gross less tax and NI. Nothing else is deducted. */
  netPence: number
  region: TaxRegion
  cycle: PayCycle
  bands: BandCharge[]
  /** Free pay this period — the slice of the allowance that applied. */
  freePayPence: number
}

const POUND = 100

/** HMRC rounds taxable pay down to whole pounds before applying any rate. */
function floorToPound(pence: number): number {
  return Math.floor(pence / POUND) * POUND
}

/**
 * The allowance this period, after the £100,000 taper.
 *
 * The taper is an annual rule, so it has to be judged against an annual
 * figure, and on a Week 1 basis the only annual figure available is this
 * period's pay scaled up. That is what payroll does on a W1 code too: an
 * unusually large week really is taxed as though every week looked like it.
 */
function freePayForPeriod(code: ParsedTaxCode, grossPence: number, periods: number): number {
  if (code.allowancePence === 0) return 0
  const annualised = grossPence * periods
  let allowance = code.allowancePence
  if (annualised > ALLOWANCE_TAPER_FROM_PENCE) {
    const lost = Math.floor((annualised - ALLOWANCE_TAPER_FROM_PENCE) / ALLOWANCE_TAPER_RATE)
    allowance = Math.max(0, allowance - lost)
  }
  return Math.round(allowance / periods)
}

/**
 * Income tax on one period's pay.
 *
 * Returns the band-by-band breakdown as well as the total, because "£41.20"
 * on its own invites the question this is meant to answer.
 */
export function incomeTaxForPeriod(
  grossPence: number,
  code: ParsedTaxCode,
  cycle: PayCycle,
): { taxPence: number; bands: BandCharge[]; freePayPence: number } {
  const periods = PERIODS_PER_YEAR[cycle]

  if (grossPence <= 0 || code.kind === 'none') {
    return { taxPence: 0, bands: [], freePayPence: 0 }
  }

  // BR, D0, D1, D2 — one rate on everything, no allowance, no bands.
  if (code.kind === 'flat' && code.flatPercent !== null) {
    const on = floorToPound(grossPence)
    const tax = Math.floor((on * code.flatPercent) / 100)
    return {
      taxPence: tax,
      freePayPence: 0,
      bands: [{ label: `All pay at ${code.flatPercent}%`, percent: code.flatPercent, onPence: on, taxPence: tax }],
    }
  }

  const freePay = freePayForPeriod(code, grossPence, periods)
  // A K code adds to taxable pay instead of sheltering it.
  const added = Math.round(code.addToTaxablePence / periods)
  const taxable = floorToPound(Math.max(0, grossPence - freePay + added))

  const bands: BandCharge[] = []
  let remaining = taxable
  let floor = 0
  let tax = 0

  for (const band of BANDS[code.region]) {
    if (remaining <= 0) break
    // Band bounds are annual; this period gets its share of each.
    const ceiling = band.upToPence === null ? null : Math.round(band.upToPence / periods)
    const width = ceiling === null ? remaining : Math.max(0, ceiling - floor)
    const inBand = Math.min(remaining, width)
    if (inBand > 0) {
      const charged = Math.floor((inBand * band.percent) / 100)
      bands.push({ label: band.label, percent: band.percent, onPence: inBand, taxPence: charged })
      tax += charged
      remaining -= inBand
    }
    if (ceiling === null) break
    floor = ceiling
  }

  // The regulatory limit: PAYE may never take more than half of a payment.
  // It exists for K codes, where the added pay can otherwise outrun the
  // wage it is added to.
  const limit = Math.floor(grossPence / 2)
  if (tax > limit) {
    return {
      taxPence: limit,
      freePayPence: freePay,
      bands: [{ label: 'Capped at half your pay', percent: 50, onPence: grossPence, taxPence: limit }],
    }
  }

  return { taxPence: tax, bands, freePayPence: freePay }
}

/**
 * Class 1 employee National Insurance on one period's pay. Exact, for the
 * reasons at the top of this file.
 */
export function nationalInsuranceForPeriod(grossPence: number, cycle: PayCycle): number {
  if (grossPence <= 0) return 0
  const primary = NI_PRIMARY_THRESHOLD_PENCE[cycle]
  const upper = NI_UPPER_EARNINGS_LIMIT_PENCE[cycle]
  if (grossPence <= primary) return 0

  const main = Math.min(grossPence, upper) - primary
  const above = Math.max(0, grossPence - upper)
  return (
    Math.round((main * NI_RATE_MAIN_PERCENT) / 100) +
    Math.round((above * NI_RATE_UPPER_PERCENT) / 100)
  )
}

/** Tax, NI and what is left, for one pay period. */
export function estimateTakeHome(
  grossPence: number,
  code: ParsedTaxCode,
  cycle: PayCycle,
): TakeHome {
  const { taxPence, bands, freePayPence } = incomeTaxForPeriod(grossPence, code, cycle)
  const niPence = nationalInsuranceForPeriod(grossPence, cycle)
  return {
    grossPence,
    taxPence,
    niPence,
    netPence: grossPence - taxPence - niPence,
    region: code.region,
    cycle,
    bands,
    freePayPence,
  }
}

/** What share of the gross actually goes in deductions, for a one-line summary. */
export function deductionRatePercent(t: TakeHome): number {
  if (t.grossPence <= 0) return 0
  return ((t.taxPence + t.niPence) / t.grossPence) * 100
}
