import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Tables } from './database.types'
import { paydayDateFor } from './payday'
import { priceShifts } from './pricing'
import { payWeekEnd, payWeekStart } from './weeks'

/**
 * Everything the home screen needs to answer "what's my pay week looking
 * like?" in one glance.
 *
 * The comparison and the countdown are here rather than in the component
 * because they are the two figures most likely to be quietly wrong — an
 * off-by-one on a week boundary would misreport somebody's pay — and that is
 * worth testing directly.
 */
export interface WeekPulse {
  grossPence: number
  paidMinutes: number
  shiftCount: number
  /** The same pay week, seven days earlier. Null when there wasn't one. */
  previousGrossPence: number | null
  /** 1-7: which day of the pay week today is. */
  dayOfWeek: number
  weekEnd: string
  /** Nearest payday still to come for the weeks in progress. */
  paydayDate: string | null
  daysToPayday: number | null
  /** What each day of the pay week earned, index 0 being the week's start. */
  perDay: readonly DayEarnings[]
}

export interface DayEarnings {
  date: string
  pence: number
  isToday: boolean
  /** Later than today, so an empty bar means "not yet" rather than "nothing". */
  isFuture: boolean
}

/** Total the priced shifts falling in [weekStart, weekStart+6] for an agency. */
function totalFor(
  priced: ReturnType<typeof priceShifts>,
  agencyId: string,
  weekStart: string,
): { grossPence: number; paidMinutes: number; shiftCount: number } {
  let grossPence = 0
  let paidMinutes = 0
  let shiftCount = 0
  for (const entry of priced.values()) {
    if (entry.shift.agency_id !== agencyId) continue
    if (entry.weekStart !== weekStart) continue
    grossPence += entry.pricing.grossPence
    paidMinutes += entry.pricing.paidMinutes
    shiftCount += 1
  }
  return { grossPence, paidMinutes, shiftCount }
}

export function weekPulse(
  shifts: readonly Tables<'shifts'>[],
  agencies: readonly Tables<'agencies'>[],
  rules: readonly Tables<'rate_rules'>[],
  today: string,
): WeekPulse {
  const priced = priceShifts(shifts, agencies, rules)
  const active = agencies.filter((a) => !a.archived)

  let grossPence = 0
  let paidMinutes = 0
  let shiftCount = 0
  let previous = 0
  let sawPrevious = false

  // The week's shape comes from whichever agency is carrying it, so the
  // progress rail and payday match the money on screen.
  let leadWeekStart: string | null = null
  let leadGross = -1
  let payday: string | null = null

  for (const agency of active) {
    const thisWeek = payWeekStart(today, agency.pay_week_start_day)
    const lastWeek = format(addDays(parseISO(thisWeek), -7), 'yyyy-MM-dd')

    const now = totalFor(priced, agency.id, thisWeek)
    grossPence += now.grossPence
    paidMinutes += now.paidMinutes
    shiftCount += now.shiftCount

    const before = totalFor(priced, agency.id, lastWeek)
    if (before.shiftCount > 0) {
      previous += before.grossPence
      sawPrevious = true
    }

    if (now.grossPence > leadGross) {
      leadGross = now.grossPence
      leadWeekStart = thisWeek
    }

    const due = paydayDateFor(thisWeek, agency.pay_delay_days)
    if (due >= today && (payday === null || due < payday)) payday = due
  }

  const weekStart = leadWeekStart ?? payWeekStart(today, 1)

  // Bucketed here rather than in the component for the same reason as the
  // comparison above: it is week-boundary arithmetic, and an off-by-one would
  // put somebody's Sunday night under the wrong bar. Deliberately by calendar
  // date across every agency, so a day with two agencies' shifts reads as one
  // day's earnings — which is what the person looking at it means by it.
  const perDay: DayEarnings[] = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd')
    let pence = 0
    for (const entry of priced.values()) {
      if (entry.shift.date === date) pence += entry.pricing.grossPence
    }
    return { date, pence, isToday: date === today, isFuture: date > today }
  })

  return {
    grossPence,
    paidMinutes,
    shiftCount,
    previousGrossPence: sawPrevious ? previous : null,
    dayOfWeek:
      differenceInCalendarDays(parseISO(today), parseISO(weekStart)) + 1,
    weekEnd: payWeekEnd(weekStart),
    paydayDate: payday,
    daysToPayday:
      payday === null
        ? null
        : differenceInCalendarDays(parseISO(payday), parseISO(today)),
    perDay,
  }
}
