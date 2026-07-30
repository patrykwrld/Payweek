import type { Tables } from './database.types'
import { shiftDurationMinutes } from './rateEngine'

/** Whole minutes from the epoch to the start of a calendar date. */
function dayStartMinutes(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 60_000
}

function timeToMinutes(time: string): number {
  const [h = '0', m = '0'] = time.split(':')
  return Number(h) * 60 + Number(m)
}

interface Span {
  from: number
  to: number
}

/** A shift's real position on the timeline, midnight-crossing included. */
function span(date: string, startTime: string, endTime: string): Span | null {
  const minutes = shiftDurationMinutes(startTime, endTime)
  if (minutes <= 0) return null
  const from = dayStartMinutes(date) + timeToMinutes(startTime)
  return { from, to: from + minutes }
}

/**
 * The first already-logged shift that covers some of the same time as the one
 * being entered, or null. Double-logging a shift is easy — the pay week total
 * is the whole point of the app, and it would quietly come out too high.
 *
 * Agency is deliberately ignored: nobody works two places at once, so an
 * overlap across agencies is just as much a mistake.
 */
export function findOverlap(
  candidate: { date: string; startTime: string; endTime: string },
  shifts: Tables<'shifts'>[],
  excludeId?: string,
): Tables<'shifts'> | null {
  const a = span(candidate.date, candidate.startTime, candidate.endTime)
  if (!a) return null

  for (const shift of shifts) {
    if (shift.id === excludeId) continue
    const b = span(
      shift.date,
      shift.start_time.slice(0, 5),
      shift.end_time.slice(0, 5),
    )
    if (!b) continue
    if (a.from < b.to && b.from < a.to) return shift
  }
  return null
}
