import { addDays, format, parseISO, subDays } from 'date-fns'

/**
 * Which calendar day a shift belongs to, and spotting when that is a day out.
 *
 * A shift is stored against the day it STARTS. For a night worker that is
 * almost never the day they are standing there logging it: they finish at
 * 06:00 on Monday, open the app, and the date box helpfully says Monday. They
 * type 22:00 to 06:00 and it is filed as Monday night into Tuesday — a day
 * late.
 *
 * That is not cosmetic. It moves the shift into the next pay week, so the
 * money lands in the wrong total, and it prices Sunday-night hours at Monday
 * rates, so a weekend uplift quietly disappears. Both are the kind of wrong
 * this app exists to catch in other people's payslips.
 *
 * The form cannot simply guess, because logging a shift before working it is
 * legitimate too. So it does two things instead: it always spells out both
 * ends of the span, and when the entry has the shape of a night just
 * finished, it offers the previous day as one tap.
 */

export function previousDay(date: string): string {
  return format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
}

export function crossesMidnight(startTime: string, endTime: string): boolean {
  return endTime <= startTime
}

/** "Sun 1 Nov 22:00 → Mon 2 Nov 06:00", or one date when it ends the same day. */
export function shiftSpanLabel(
  date: string,
  startTime: string,
  endTime: string,
): string {
  const start = parseISO(date)
  const startLabel = `${format(start, 'EEE d MMM')} ${startTime}`
  if (!crossesMidnight(startTime, endTime)) {
    return `${startLabel} → ${endTime}`
  }
  return `${startLabel} → ${format(addDays(start, 1), 'EEE d MMM')} ${endTime}`
}

/**
 * Whether this looks like a night that has just ended rather than one about
 * to start.
 *
 * The tell is that the shift, as typed, lies entirely in the future: it runs
 * past midnight, it is dated today, and its start time has not come round
 * yet. Somebody who has just walked out of a night shift is describing hours
 * already worked, so a shift that cannot have happened yet is a day out.
 *
 * Restricted to the morning. At six in the evening, a crossing-midnight shift
 * starting at ten really is tonight's, and nudging then would be wrong far
 * more often than right.
 */
export function looksLikeYesterday(
  date: string,
  startTime: string,
  endTime: string,
  today: string,
  nowTime: string,
): boolean {
  if (!crossesMidnight(startTime, endTime)) return false
  if (date !== today) return false
  if (nowTime >= MORNING_ENDS) return false
  return startTime > nowTime
}

/** Past this, a late start is tonight's shift rather than last night's. */
const MORNING_ENDS = '12:00'
