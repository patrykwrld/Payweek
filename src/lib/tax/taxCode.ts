/**
 * Reads a PAYE tax code off a payslip and says what it means.
 *
 * The codes an employee can actually be on:
 *
 *   1257L   the usual one — allowance is the number times ten, so £12,570
 *   1257M / 1257N   marriage allowance moved to or away from them
 *   1257T   same arithmetic, HMRC reviews it by hand
 *   0T      no allowance at all; the bands still apply in order
 *   BR      every penny at basic rate — the classic second-job code
 *   D0 / D1 every penny at higher / additional rate
 *   D2      Scotland only; every penny at the top rate
 *   NT      no tax
 *   K500    the opposite of an allowance: £5,000 ADDED to taxable pay,
 *           because untaxed benefits have swallowed it
 *
 * A leading S means Scottish rates, a leading C means Welsh ones (Cymru).
 * A trailing W1, M1 or X means the code is non-cumulative — each pay period
 * stands alone, ignoring the year so far. That is already how this app
 * estimates, which is why the flag is recorded but changes no arithmetic;
 * see the note at the top of paye.ts.
 */

import type { TaxRegion } from './rates'
import { FLAT_RATE_PERCENT } from './rates'

export type TaxCodeKind = 'allowance' | 'flat' | 'none' | 'noAllowance'

export interface ParsedTaxCode {
  /** Exactly what was typed, for showing back to them. */
  raw: string
  /** Upper-cased, spaces stripped — the form everything else compares. */
  normalised: string
  region: TaxRegion
  kind: TaxCodeKind
  /** Annual free pay in pence. Zero for 0T, BR, D0, D1, D2, NT and K codes. */
  allowancePence: number
  /** Annual pence a K code ADDS to taxable pay. Zero for everything else. */
  addToTaxablePence: number
  /** For BR/D0/D1/D2: the single rate charged on everything. */
  flatPercent: number | null
  /** W1, M1 or X — each period judged on its own. */
  nonCumulative: boolean
}

/** Strip spaces and punctuation people type, and fold case. */
export function normaliseTaxCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s\-/]/g, '')
}

const FLAT_CODES = ['BR', 'D0', 'D1', 'D2'] as const

/**
 * Everything except the W1/M1/X marker: region prefix already removed.
 * Returns null when the body is not a code.
 */
function parseBody(
  body: string,
  region: TaxRegion,
): Omit<ParsedTaxCode, 'raw' | 'normalised' | 'nonCumulative'> | null {
  if (body === 'NT') {
    return { region, kind: 'none', allowancePence: 0, addToTaxablePence: 0, flatPercent: null }
  }

  if (body === '0T') {
    return {
      region,
      kind: 'noAllowance',
      allowancePence: 0,
      addToTaxablePence: 0,
      flatPercent: null,
    }
  }

  if (FLAT_CODES.includes(body as (typeof FLAT_CODES)[number])) {
    const percent = FLAT_RATE_PERCENT[region][body as (typeof FLAT_CODES)[number]]
    // D2 exists only where there is a sixth band to point at.
    if (percent === null) return null
    return { region, kind: 'flat', allowancePence: 0, addToTaxablePence: 0, flatPercent: percent }
  }

  // K code: the number is added to taxable pay rather than taken off it.
  const k = body.match(/^K(\d{1,6})$/)
  if (k) {
    return {
      region,
      kind: 'noAllowance',
      allowancePence: 0,
      addToTaxablePence: Number(k[1]) * 1000,
      flatPercent: null,
    }
  }

  // Suffix code: digits then one of L, M, N, T.
  const suffixCode = body.match(/^(\d{1,6})([LMNT])$/)
  if (suffixCode) {
    return {
      region,
      kind: 'allowance',
      // The number is the allowance in pounds divided by ten, so 1257 is
      // £12,570 — which in pence is the number times 1000.
      allowancePence: Number(suffixCode[1]) * 1000,
      addToTaxablePence: 0,
      flatPercent: null,
    }
  }

  return null
}

/**
 * Parses a code, or returns null if it is not one. Deliberately strict: a
 * code this cannot read is better refused at the input than quietly treated
 * as 1257L, which would show somebody a take-home figure for a tax position
 * that is not theirs.
 */
export function parseTaxCode(raw: string): ParsedTaxCode | null {
  const normalised = normaliseTaxCode(raw)
  if (normalised === '') return null

  let rest = normalised

  // Region prefix. S and C only count as a prefix when something follows —
  // on its own "S" is just a typo, not Scotland.
  let region: TaxRegion = 'uk'
  if (rest.length > 1 && rest.startsWith('S')) {
    region = 'scotland'
    rest = rest.slice(1)
  } else if (rest.length > 1 && rest.startsWith('C')) {
    region = 'wales'
    rest = rest.slice(1)
  }

  // The body is tried whole FIRST, so that 1257M — marriage allowance — is
  // never mistaken for 1257 with an M1 marker hanging off it. Only when the
  // whole thing fails is a trailing W1, M1 or X treated as the marker it
  // usually is, which is what makes "1257L X" and "1257L M1" parse.
  const whole = parseBody(rest, region)
  if (whole) {
    return { ...whole, raw, normalised, nonCumulative: false }
  }

  const marker = rest.match(/(W1|M1|X)$/)
  if (marker) {
    const body = parseBody(rest.slice(0, rest.length - marker[0].length), region)
    if (body) {
      return { ...body, raw, normalised, nonCumulative: true }
    }
  }

  return null
}

/**
 * Why a tax code won't do, in words somebody can act on, or null if it will.
 * One message at a time, like usernameProblem.
 */
export function taxCodeProblem(raw: string): string | null {
  const value = normaliseTaxCode(raw)
  if (value === '') return 'Enter the tax code from your payslip.'
  if (parseTaxCode(value) === null) {
    return "That isn't a tax code I recognise. It's on your payslip — usually something like 1257L or BR."
  }
  return null
}

/** The code most people are on, used as the starting value in the field. */
export const DEFAULT_TAX_CODE = '1257L'
