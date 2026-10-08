/**
 * Which pay week is waiting to be checked against a payslip.
 *
 * The payslip check is the thing Payweek is for, and across every account
 * that has ever existed it had been used once against eighty-four logged
 * shifts. It was not hidden — it sat on Payday, underneath every agency —
 * it just never arrived at the moment anybody cared, which is the morning
 * the money lands.
 *
 * So the app works out which week that is and says so, on the home screen
 * and at the top of Payday. A week qualifies when its payday has been and
 * gone and no payslip has been recorded against it.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Tables } from './database.types'
import type { AgencyWeek } from './payday'

/**
 * How long after payday the app keeps asking.
 *
 * Agency work is seasonal — students over the summer, a stint between jobs —
 * and somebody who stops for a term comes back to an app holding months of
 * unchecked weeks. Without a bound the home screen would greet them with
 * "Sun 14 Sep should have paid £472 — did the right number land?" the
 * following June, which is both absurd and unactionable: that money either
 * arrived or it did not, and six months on there is nothing to be done from
 * a prompt.
 *
 * Six weeks is long enough for somebody who checks their bank monthly and
 * short enough that the question is still about money they can remember.
 * Older weeks are not hidden — they stay in the Payday timeline marked
 * unchecked, and the screen will still price them on request. They simply
 * stop interrupting.
 */
export const ASK_WITHIN_DAYS = 42

/** True when a payslip has already been recorded for this exact pay week. */
export function isChecked(
  week: AgencyWeek,
  payslips: readonly Tables<'payslips'>[],
): boolean {
  return payslips.some(
    (p) => p.agency_id === week.agency.id && p.period_start === week.weekStart,
  )
}

/**
 * Every week whose money should have arrived and which nobody has confirmed,
 * most recently paid first.
 *
 * `today` is compared as an ISO date string rather than a Date so that a
 * payday lands the moment the calendar says so, in whatever timezone the
 * phone is in — the same comparison the rest of the app makes.
 */
export function weeksAwaitingCheck(
  weeks: readonly AgencyWeek[],
  payslips: readonly Tables<'payslips'>[],
  today: string,
  withinDays: number = ASK_WITHIN_DAYS,
): AgencyWeek[] {
  const now = parseISO(today)
  return (
    weeks
      .filter((w) => w.paydayDate <= today && !isChecked(w, payslips))
      // A week with no hours in it was never going to be paid anything, so
      // asking about it is noise.
      .filter((w) => w.grossPence > 0)
      // And a week old enough that nothing can be done about it is noise of
      // a worse kind: it occupies the one prompt somebody sees on opening.
      .filter(
        (w) => differenceInCalendarDays(now, parseISO(w.paydayDate)) <= withinDays,
      )
      .sort((a, b) => b.paydayDate.localeCompare(a.paydayDate))
  )
}

/**
 * The single week worth asking about. Null when there is nothing to ask.
 *
 * Only ever one: a prompt that says "3 weeks need checking" is a chore, and
 * a chore gets dismissed. One week, one number, one tap.
 */
export function nextWeekToCheck(
  weeks: readonly AgencyWeek[],
  payslips: readonly Tables<'payslips'>[],
  today: string,
  withinDays: number = ASK_WITHIN_DAYS,
): AgencyWeek | null {
  return weeksAwaitingCheck(weeks, payslips, today, withinDays)[0] ?? null
}
