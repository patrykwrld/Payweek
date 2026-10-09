/**
 * The two nights a year a shift is not as long as the clock says.
 *
 * Payweek measured every shift as wall-clock arithmetic on a 1440-minute
 * day, which is right for 363 nights and wrong for two. Somebody who clocks
 * 22:00–06:00 on the last Sunday of October is on site for nine hours, not
 * eight; on the last Sunday of March, seven. At a £16.20 night rate that is
 * £16.20 in each direction — understated in October, which is the one that
 * matters, because the app's whole promise is telling you when you have been
 * paid short.
 *
 * The correction is deliberately shaped so it can only act on those nights.
 * Away from a transition the two offsets are equal, the adjustment is zero,
 * and the result is the same number the old code produced — so the change
 * cannot quietly alter anybody's ordinary week.
 *
 * Europe/London is hard-coded rather than read from the device. Payweek is
 * for UK agency work, the rates are in pounds, and a phone left on holiday
 * time should not silently reprice somebody's shifts.
 */

const ZONE = 'Europe/London'

const FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * How far ahead of UTC London is at a given instant: 0 in winter, 60 in
 * summer.
 *
 * Done by formatting the instant into London time and reading the clock back
 * out, which is the only way to get this right without shipping a copy of
 * the timezone database — the browser already has one.
 */
export function londonOffsetMinutes(utcMs: number): number {
  const parts = Object.fromEntries(
    FORMAT.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
  )
  // Whole minutes: the comparison is between two instants that differ only
  // by the offset, so the seconds the formatter dropped cancel out.
  return Math.round((asIfUtc - utcMs) / 60000)
}

/**
 * The instant a shift starts, from the day and the wall-clock time on it.
 *
 * Converting a local time to an instant needs the offset, and the offset
 * needs the instant, so this guesses once and corrects — which settles
 * everywhere except inside the repeated hour, where two instants genuinely
 * share one clock reading and the first is taken.
 */
function startInstant(date: string, startMin: number): number | null {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  const naive = Date.UTC(y, m - 1, d) + startMin * 60000
  const guess = naive - londonOffsetMinutes(naive) * 60000
  return naive - londonOffsetMinutes(guess) * 60000
}

/** Where a clock change falls inside a shift, and which way it goes. */
export interface ClockChange {
  /** Minutes worked before the jump. */
  atMinute: number
  /** What the wall clock does at that point: -60 back, +60 forward. */
  shiftMinutes: number
}

/**
 * Finds the clock change inside a shift, or null on the other 363 nights.
 *
 * Binary search rather than a minute-by-minute scan: the offset is a step
 * function, so eleven probes settle a whole day and the pricing path runs
 * this for every shift somebody owns.
 *
 * @param elapsedMinutes real minutes worked, not wall-clock minutes
 */
export function clockChangeDuring(
  date: string,
  startMin: number,
  elapsedMinutes: number,
): ClockChange | null {
  const from = startInstant(date, startMin)
  if (from === null || elapsedMinutes <= 0) return null

  const before = londonOffsetMinutes(from)
  const after = londonOffsetMinutes(from + elapsedMinutes * 60000)
  if (before === after) return null

  let lo = 0
  let hi = elapsedMinutes
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (londonOffsetMinutes(from + mid * 60000) === before) lo = mid
    else hi = mid
  }
  return { atMinute: hi, shiftMinutes: after - before }
}

/**
 * Minutes to add to a wall-clock duration to get the hours actually worked.
 *
 * +60 across the October change, −60 across the March one, 0 every other
 * night of the year.
 *
 * @param date  the day the shift starts, YYYY-MM-DD
 * @param startMin  start time as minutes from midnight
 * @param endMin    end time as minutes from midnight; the caller has already
 *                  decided whether the shift wrapped past midnight, which is
 *                  why this takes the wrapped duration rather than working it
 *                  out again
 * @param wallMinutes  the wall-clock duration the old arithmetic produced
 *
 * The probe instants treat the wall times as if they were UTC, which puts
 * them within an hour of the truth — enough to land on the right side of a
 * transition for any shift that does not itself start inside the repeated
 * hour. A shift beginning at 01:30 on the October night is genuinely
 * ambiguous (that clock time happens twice) and resolves to the first,
 * which is the usual convention and the one that favours nobody.
 */
export function clockChangeMinutes(
  date: string,
  startMin: number,
  wallMinutes: number,
): number {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return 0

  const startProbe = Date.UTC(y, m - 1, d) + startMin * 60000
  const endProbe = startProbe + wallMinutes * 60000

  return londonOffsetMinutes(startProbe) - londonOffsetMinutes(endProbe)
}

/** True when this shift spans a clock change — worth telling somebody. */
export function crossesClockChange(
  date: string,
  startMin: number,
  wallMinutes: number,
): boolean {
  return clockChangeMinutes(date, startMin, wallMinutes) !== 0
}

/**
 * What to tell somebody looking at a shift that spans a clock change.
 *
 * Without this the Payday screen says nine hours for a 22:00–06:00 shift
 * and looks broken. With it, the number is the point: it is the hour most
 * people get short-changed on, and the one worth checking the payslip for.
 *
 * Null on every ordinary night.
 */
export function clockChangeNote(
  date: string,
  startMin: number,
  wallMinutes: number,
): string | null {
  const delta = clockChangeMinutes(date, startMin, wallMinutes)
  if (delta === 0) return null
  return delta > 0
    ? 'The clocks went back during this shift, so it ran an hour longer than the times suggest. Worth checking you were paid for it.'
    : 'The clocks went forward during this shift, so it ran an hour shorter than the times suggest.'
}
