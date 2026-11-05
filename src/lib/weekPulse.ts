import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Tables } from './database.types'
import { paydayDateFor } from './payday'
import { priceShifts, type PricedShift } from './pricing'
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

/** The priced shifts in one agency's pay week starting `weekStart`. */
function entriesFor(
  priced: ReturnType<typeof priceShifts>,
  agencyId: string,
  weekStart: string,
): PricedShift[] {
  const out: PricedShift[] = []
  for (const entry of priced.values()) {
    if (entry.shift.agency_id !== agencyId) continue
    if (entry.weekStart !== weekStart) continue
    out.push(entry)
  }
  return out
}

function sum(entries: readonly PricedShift[]): {
  grossPence: number
  paidMinutes: number
  shiftCount: number
} {
  let grossPence = 0
  let paidMinutes = 0
  for (const entry of entries) {
    grossPence += entry.pricing.grossPence
    paidMinutes += entry.pricing.paidMinutes
  }
  return { grossPence, paidMinutes, shiftCount: entries.length }
}

export function weekPulse(
  shifts: readonly Tables<'shifts'>[],
  agencies: readonly Tables<'agencies'>[],
  rules: readonly Tables<'rate_rules'>[],
  today: string,
): WeekPulse {
  const priced = priceShifts(shifts, agencies, rules)

  let grossPence = 0
  let paidMinutes = 0
  let shiftCount = 0
  let previous = 0
  let sawPrevious = false

  // Every entry behind the total, kept so the bars are built from the same
  // set. They used to be worked out separately — the total from each
  // agency's pay week, the bars by calendar date across every agency with no
  // archived filter at all — and the two disagreed in front of a tester:
  // £0.00 and "0h logged" above bars reading £107, £132 and £1054. Deriving
  // one from the other is what stops that recurring.
  const contributing: PricedShift[] = []

  // The week's shape comes from whichever agency is carrying it, so the
  // progress rail and payday match the money on screen. Only an agency with
  // shifts can carry it: an empty one used to win simply by being first,
  // which set the window and the countdown from an agency never worked.
  let leadWeekStart: string | null = null
  let leadGross = -1
  let payday: string | null = null

  // Archived agencies count. Archiving takes an agency out of the list you
  // can add a shift to — it does not unhappen the work already logged
  // against it, and the Payday screen has always kept showing those weeks.
  // Leaving them out here is what made a real £1,293 week read as £0.00.
  for (const agency of agencies) {
    const thisWeek = payWeekStart(today, agency.pay_week_start_day)
    const lastWeek = format(addDays(parseISO(thisWeek), -7), 'yyyy-MM-dd')

    const entries = entriesFor(priced, agency.id, thisWeek)
    contributing.push(...entries)
    const now = sum(entries)
    grossPence += now.grossPence
    paidMinutes += now.paidMinutes
    shiftCount += now.shiftCount

    const before = sum(entriesFor(priced, agency.id, lastWeek))
    if (before.shiftCount > 0) {
      previous += before.grossPence
      sawPrevious = true
    }

    if (now.shiftCount > 0 && now.grossPence > leadGross) {
      leadGross = now.grossPence
      leadWeekStart = thisWeek
    }

    const due = paydayDateFor(thisWeek, agency.pay_delay_days)
    if (due >= today && (payday === null || due < payday)) payday = due
  }

  // With nothing logged there is no agency carrying the week, so fall back
  // to the first agency's own start day rather than assuming Monday — "day 4
  // of 7" should still be right for somebody whose week starts on Sunday.
  const weekStart =
    leadWeekStart ?? payWeekStart(today, agencies[0]?.pay_week_start_day ?? 1)

  // Bucketed here rather than in the component for the same reason as the
  // comparison above: it is week-boundary arithmetic, and an off-by-one would
  // put somebody's Sunday night under the wrong bar. By calendar date, so a
  // day with two agencies' shifts reads as one day's earnings — which is what
  // the person looking at it means by it — but only over the entries that
  // make up the total, so the bars and the figure above them cannot drift.
  const perDay: DayEarnings[] = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd')
    let pence = 0
    for (const entry of contributing) {
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
