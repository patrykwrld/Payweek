/**
 * UK income tax and National Insurance figures, for the 2026/27 tax year.
 *
 * Everything here is in PENCE, like the rest of the app, and every threshold
 * is expressed as TAXABLE income — what is left after the free pay a tax code
 * allows — not as total income. Published tables usually quote total income,
 * so each band below records both.
 *
 * Checked 27 Oct 2026 against:
 *   House of Commons Library, "Direct taxes: rates and allowances for 2026/27"
 *     https://commonslibrary.parliament.uk/research-briefings/cbp-10618/
 *   GOV.UK, "Rates and allowances: National Insurance contributions"
 *   LITRG, "Tax and NIC rates and bands" (Scottish bands)
 *
 * These change in the Budget and take effect on 6 April. When they move,
 * change them HERE and nowhere else, add the new year alongside rather than
 * over the top, and run the tests — several of them assert figures that a
 * payslip can be checked against by hand.
 */

export const TAX_YEAR = '2026/27'

/**
 * Which set of bands applies. Scotland sets its own; Wales has the power to
 * and has so far chosen the same rates as England and Northern Ireland, so
 * 'wales' is a separate region that currently happens to share UK bands —
 * if that ever stops being true, only this file changes.
 */
export type TaxRegion = 'uk' | 'scotland' | 'wales'

export type PayCycle = 'weekly' | 'fortnightly' | 'monthly'

/** How many times a year somebody on each cycle is paid. */
export const PERIODS_PER_YEAR: Record<PayCycle, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
}

/** The standard personal allowance: £12,570. Frozen until April 2031. */
export const PERSONAL_ALLOWANCE_PENCE = 1_257_000

/**
 * Above £100,000 the allowance is withdrawn by £1 for every £2, which is gone
 * entirely at £125,140. Nobody paid by a UK agency by the hour is going to
 * meet this, but a take-home figure that silently ignores it would be wrong
 * rather than merely unhelpful, so the engine applies it.
 */
export const ALLOWANCE_TAPER_FROM_PENCE = 10_000_000
export const ALLOWANCE_TAPER_RATE = 2

export interface Band {
  /** Inclusive upper bound of this band in TAXABLE pence, or null for "the rest". */
  upToPence: number | null
  /** Percent, as published: 20 means 20%. */
  percent: number
  /** What a published table would call this, for the breakdown UI. */
  label: string
}

/**
 * England, Wales and Northern Ireland. £37,700 of taxable income at 20%, then
 * 40% up to £125,140 of TOTAL income — which, measured from a full personal
 * allowance, is £112,570 of taxable income — then 45%.
 */
const UK_BANDS: Band[] = [
  { upToPence: 3_770_000, percent: 20, label: 'Basic rate' },
  { upToPence: 11_257_000, percent: 40, label: 'Higher rate' },
  { upToPence: null, percent: 45, label: 'Additional rate' },
]

/**
 * Scotland. Six bands. The taxable figures below correspond to these total
 * incomes, for somebody with the full £12,570 allowance:
 *
 *   19% starter       £12,571 – £16,537
 *   20% basic         £16,538 – £29,526
 *   21% intermediate  £29,527 – £43,662
 *   42% higher        £43,663 – £75,000
 *   45% advanced      £75,001 – £125,140
 *   48% top           above £125,140
 */
const SCOTLAND_BANDS: Band[] = [
  { upToPence: 396_700, percent: 19, label: 'Starter rate' },
  { upToPence: 1_695_600, percent: 20, label: 'Basic rate' },
  { upToPence: 3_109_200, percent: 21, label: 'Intermediate rate' },
  { upToPence: 6_243_000, percent: 42, label: 'Higher rate' },
  { upToPence: 11_257_000, percent: 45, label: 'Advanced rate' },
  { upToPence: null, percent: 48, label: 'Top rate' },
]

export const BANDS: Record<TaxRegion, Band[]> = {
  uk: UK_BANDS,
  wales: UK_BANDS,
  scotland: SCOTLAND_BANDS,
}

/**
 * The single rate a BR / D0 / D1 / D2 code charges on everything, by region.
 * D2 only exists in Scotland, where there is a sixth band to point at.
 */
export const FLAT_RATE_PERCENT: Record<TaxRegion, Record<'BR' | 'D0' | 'D1' | 'D2', number | null>> = {
  uk: { BR: 20, D0: 40, D1: 45, D2: null },
  wales: { BR: 20, D0: 40, D1: 45, D2: null },
  scotland: { BR: 20, D0: 21, D1: 42, D2: 45 },
}

/**
 * Class 1 employee National Insurance, 2026/27.
 *
 * Unlike income tax, NI is worked out on each pay period in isolation and is
 * never reconciled across the year. That makes the figure this app produces
 * for NI exact rather than an estimate — see the note in paye.ts.
 *
 * Thresholds are published weekly and monthly; fortnightly is twice weekly,
 * which is how payroll software derives it too.
 */
export const NI_RATE_MAIN_PERCENT = 8
export const NI_RATE_UPPER_PERCENT = 2

export const NI_PRIMARY_THRESHOLD_PENCE: Record<PayCycle, number> = {
  weekly: 24_200,
  fortnightly: 48_400,
  monthly: 104_800,
}

export const NI_UPPER_EARNINGS_LIMIT_PENCE: Record<PayCycle, number> = {
  weekly: 96_700,
  fortnightly: 193_400,
  monthly: 418_900,
}

/* ── Student loans ───────────────────────────────────────────────────────
 *
 * Checked 27 Oct 2026 against GOV.UK "Repaying your student loan: how much
 * you repay" and Commons Library briefing CBP-10654.
 *
 * Like NI, and unlike income tax, these are worked out on each pay period
 * alone and never reconciled across the year — so the figure this app gives
 * for a student loan is exact, not an estimate.
 *
 * The period thresholds below are GOV.UK's own published figures rather than
 * the annual one divided down, because those are what payroll uses and what
 * a payslip can be checked against. Fortnightly is twice weekly.
 *
 * Deductions are rounded DOWN to the whole pound. That is HMRC's rule, not a
 * convenience.
 */

export type StudentLoanPlan = 'plan1' | 'plan2' | 'plan4' | 'plan5'

export const STUDENT_LOAN_RATE_PERCENT = 9
export const POSTGRAD_LOAN_RATE_PERCENT = 6

export const STUDENT_LOAN_THRESHOLD_PENCE: Record<
  StudentLoanPlan,
  Record<PayCycle, number>
> = {
  plan1: { weekly: 51_700, fortnightly: 103_400, monthly: 224_100 },
  plan2: { weekly: 56_500, fortnightly: 113_000, monthly: 244_800 },
  plan4: { weekly: 64_900, fortnightly: 129_800, monthly: 281_600 },
  plan5: { weekly: 48_000, fortnightly: 96_000, monthly: 208_300 },
}

/** The Postgraduate Loan sits on top of any other plan, at its own rate. */
export const POSTGRAD_THRESHOLD_PENCE: Record<PayCycle, number> = {
  weekly: 40_300,
  fortnightly: 80_600,
  monthly: 175_000,
}

export const STUDENT_LOAN_LABEL: Record<StudentLoanPlan, string> = {
  plan1: 'Plan 1',
  plan2: 'Plan 2',
  plan4: 'Plan 4',
  plan5: 'Plan 5',
}

/* ── Workplace pension ───────────────────────────────────────────────────
 *
 * Automatic enrolment qualifying earnings for 2026/27, confirmed unchanged
 * at £6,240–£50,270 by the DWP's annual review. The statutory minimum
 * employee contribution is 5% of the earnings between those two figures.
 *
 * How a contribution is treated decides what it does to the tax:
 *
 *   before_tax        net pay arrangement. Comes off pay before income tax
 *                     is worked out, but NI is still charged on the lot.
 *   after_tax         relief at source — NEST and most group personal
 *                     pensions. Changes neither tax nor NI here; the
 *                     provider reclaims the relief separately.
 *   salary_sacrifice  gives up the pay itself, so it reduces both.
 *
 * Whichever it is, the same money leaves the packet — the difference is
 * only in what tax and NI are charged on.
 */

export type PensionRelief = 'before_tax' | 'after_tax' | 'salary_sacrifice'

/** 'qualifying' is the statutory default: only pay between the band limits. */
export type PensionBasis = 'qualifying' | 'gross'

export const PENSION_LOWER_PENCE: Record<PayCycle, number> = {
  weekly: 12_000,
  fortnightly: 24_000,
  monthly: 52_000,
}

export const PENSION_UPPER_PENCE: Record<PayCycle, number> = {
  weekly: 96_700,
  fortnightly: 193_400,
  monthly: 418_900,
}

/** What auto-enrolment puts an employee on unless their scheme says otherwise. */
export const PENSION_DEFAULT_PERCENT = 5
