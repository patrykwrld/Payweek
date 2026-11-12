import type { Tables } from '../database.types'
import type { Extras } from './paye'
import type { PensionBasis, PensionRelief, StudentLoanPlan } from './rates'
import { parseTaxCode, type ParsedTaxCode } from './taxCode'

/** Everything the take-home estimate needs, read off a profile row. */
export interface TakeHomeSetup {
  code: ParsedTaxCode
  extras: Extras
}

/**
 * The take-home settings somebody has saved, or null when there is nothing
 * to show: no tax code, the estimate switched off, or a stored code this
 * build cannot read. Null is a perfectly good answer — it means gross
 * figures only, which is what everybody saw before this existed.
 *
 * In one place because two screens show the estimate, and two copies of
 * "which pension treatment, which loan plan" would be two chances for the
 * Week screen and Payday to disagree about the same week's pay.
 */
export function takeHomeSetup(
  profile: Tables<'profiles'> | null | undefined,
): TakeHomeSetup | null {
  if (!profile || !profile.tax_code || !profile.show_take_home) return null
  const code = parseTaxCode(profile.tax_code)
  if (!code) return null
  return {
    code,
    extras: {
      studentLoanPlan: (profile.student_loan_plan as StudentLoanPlan | null) ?? null,
      postgradLoan: profile.postgrad_loan,
      pension:
        profile.pension_percent > 0
          ? {
              percent: profile.pension_percent,
              basis: profile.pension_basis as PensionBasis,
              relief: profile.pension_relief as PensionRelief,
            }
          : null,
    },
  }
}
