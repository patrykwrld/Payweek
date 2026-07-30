import type {
  AgencyRates,
  BreakdownLine,
  PayWeekPricing,
  ShiftInput,
  ShiftPricing,
  ThresholdRule,
  TimeBandRule,
} from './types'

/** 'HH:MM' or 'HH:MM:SS' -> minutes from midnight. Seconds are ignored. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':')
  const hours = Number(h)
  const minutes = Number(m ?? 0)
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 24 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time: ${time}`)
  }
  return hours * 60 + minutes
}

/** Clocked minutes; end <= start means the shift crosses midnight
 * (equal start/end = 24h). */
export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return end > start ? end - start : end + 1440 - start
}

/** 0=Sun..6=Sat for a YYYY-MM-DD date. */
function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid date: ${date}`)
  }
  return new Date(y, m - 1, d).getDay()
}

/** Is minute-of-day inside the band? end <= start wraps midnight;
 * equal start/end covers the whole day. */
function minuteInBand(minOfDay: number, startMin: number, endMin: number): boolean {
  if (startMin < endMin) return minOfDay >= startMin && minOfDay < endMin
  return minOfDay >= startMin || minOfDay < endMin
}

/** A chronological stretch of minutes sharing one resolved rate. */
interface Run {
  label: string
  ratePence: number
  minutes: number
}

/** The rate resolved for one worked minute. */
interface MinuteRate {
  label: string
  ratePence: number
}

/** Resolve every worked minute against time-band rules: highest priority
 * wins, ties go to the higher resulting rate, no match = base rate. */
function resolveMinutes(shift: ShiftInput, rates: AgencyRates): MinuteRate[] {
  const bands = rates.rules.filter(
    (r): r is TimeBandRule => r.kind === 'time_band',
  )
  const duration = shiftDurationMinutes(shift.startTime, shift.endTime)
  const startMin = timeToMinutes(shift.startTime)
  const startDow = dayOfWeek(shift.date)

  const minutes: MinuteRate[] = []
  for (let i = 0; i < duration; i++) {
    const absolute = startMin + i
    const dow = (startDow + Math.floor(absolute / 1440)) % 7
    const minOfDay = absolute % 1440

    let label = 'Base rate'
    let ratePence = rates.baseRatePence
    let bestPriority = -Infinity
    for (const band of bands) {
      if (band.daysOfWeek && !band.daysOfWeek.includes(dow)) continue
      if (!minuteInBand(minOfDay, band.bandStartMin, band.bandEndMin)) continue
      const rate =
        'ratePence' in band.pay
          ? band.pay.ratePence
          : rates.baseRatePence * band.pay.multiplier
      if (
        bestPriority === -Infinity ||
        band.priority > bestPriority ||
        (band.priority === bestPriority && rate > ratePence)
      ) {
        label = band.label
        ratePence = rate
        bestPriority = band.priority
      }
    }
    minutes.push({ label, ratePence })
  }
  return minutes
}

/** Group contiguous equal-rate minutes into runs, skipping unpaid ones. */
function toRuns(minutes: MinuteRate[], paid: boolean[]): Run[] {
  const runs: Run[] = []
  for (let i = 0; i < minutes.length; i++) {
    if (!paid[i]) continue
    const m = minutes[i]!
    const last = runs[runs.length - 1]
    if (last && last.label === m.label && last.ratePence === m.ratePence) {
      last.minutes++
    } else {
      runs.push({ label: m.label, ratePence: m.ratePence, minutes: 1 })
    }
  }
  return runs
}

/** Mark the minutes covered by each positioned break as unpaid, and return
 * how many break minutes were left unplaced (to spread pro-rata later).
 * A break outside the shift is ignored; one overrunning the end is clamped. */
function applyPositionedBreaks(
  shift: ShiftInput,
  paid: boolean[],
): number {
  const breaks = shift.breaks ?? []
  if (breaks.length === 0) return shift.breakMinutes

  const duration = paid.length
  const shiftStart = timeToMinutes(shift.startTime)
  let unplaced = 0

  for (const brk of breaks) {
    if (brk.minutes <= 0) continue
    if (brk.startTime === null || brk.startTime === undefined) {
      unplaced += brk.minutes
      continue
    }
    // Offset from the shift start, wrapping past midnight.
    const offset = (timeToMinutes(brk.startTime) - shiftStart + 1440) % 1440
    if (offset >= duration) continue // break falls outside the shift
    const end = Math.min(offset + brk.minutes, duration)
    for (let i = offset; i < end; i++) paid[i] = false
  }
  return unplaced
}

/** Scale run minutes down to paidTotal, apportioning the break pro-rata
 * (largest-remainder rounding so the result sums exactly). */
function deductBreakProRata(runs: Run[], paidTotal: number): Run[] {
  const workedTotal = runs.reduce((s, r) => s + r.minutes, 0)
  if (workedTotal === 0 || paidTotal <= 0) return []
  if (paidTotal >= workedTotal) return runs

  const exact = runs.map((r) => (r.minutes * paidTotal) / workedTotal)
  const floors = exact.map(Math.floor)
  let remainder = paidTotal - floors.reduce((s, f) => s + f, 0)
  const byFraction = exact
    .map((e, i) => ({ i, fraction: e - Math.floor(e) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  for (let k = 0; k < remainder; k++) floors[byFraction[k]!.i]!++

  return runs
    .map((r, i) => ({ ...r, minutes: floors[i]! }))
    .filter((r) => r.minutes > 0)
}

/** Split runs at threshold boundaries and re-rate the minutes beyond
 * each. When several threshold rules cover a minute, exactly one wins
 * (highest priority, then highest resulting rate) — multipliers do not
 * stack with each other. A threshold multiplier applies to the minute's
 * already-resolved rate, so night-rate OT pays x on the night rate. */
function applyThresholds(
  runs: Run[],
  thresholds: ThresholdRule[],
  weekPaidMinutesBefore: number,
): Run[] {
  if (thresholds.length === 0) return runs

  // Boundary positions in shift-paid-minute coordinates.
  const boundaryFor = (t: ThresholdRule): number =>
    t.scope === 'shift'
      ? t.thresholdMinutes
      : t.thresholdMinutes - weekPaidMinutesBefore

  const paidTotal = runs.reduce((s, r) => s + r.minutes, 0)
  const cuts = [
    ...new Set(
      thresholds
        .map(boundaryFor)
        .filter((b) => b > 0 && b < paidTotal),
    ),
  ].sort((a, b) => a - b)

  const out: Run[] = []
  let cursor = 0 // paid minutes consumed so far
  for (const run of runs) {
    let offset = 0
    while (offset < run.minutes) {
      const segStart = cursor + offset
      const nextCut = cuts.find((c) => c > segStart) ?? Infinity
      const segLen = Math.min(run.minutes - offset, nextCut - segStart)

      const active = thresholds.filter((t) => boundaryFor(t) <= segStart)
      let label = run.label
      let ratePence = run.ratePence
      if (active.length > 0) {
        let winner: ThresholdRule | null = null
        let winnerRate = 0
        for (const t of active) {
          const rate =
            'ratePence' in t.pay ? t.pay.ratePence : run.ratePence * t.pay.multiplier
          if (
            !winner ||
            t.priority > winner.priority ||
            (t.priority === winner.priority && rate > winnerRate)
          ) {
            winner = t
            winnerRate = rate
          }
        }
        label =
          run.label === 'Base rate'
            ? winner!.label
            : `${winner!.label} (${run.label})`
        ratePence = winnerRate
      }

      const last = out[out.length - 1]
      if (last && last.label === label && last.ratePence === ratePence) {
        last.minutes += segLen
      } else {
        out.push({ label, ratePence, minutes: segLen })
      }
      offset += segLen
    }
    cursor += run.minutes
  }
  return out
}

function toBreakdown(runs: Run[]): BreakdownLine[] {
  // Merge non-adjacent repeats of the same label+rate into one line.
  const lines: BreakdownLine[] = []
  for (const run of runs) {
    const existing = lines.find(
      (l) => l.label === run.label && l.ratePence === run.ratePence,
    )
    if (existing) {
      existing.minutes += run.minutes
    } else {
      lines.push({
        label: run.label,
        minutes: run.minutes,
        ratePence: run.ratePence,
        subtotalPence: 0,
      })
    }
  }
  for (const line of lines) {
    line.subtotalPence = Math.round((line.minutes * line.ratePence) / 60)
  }
  return lines
}

export interface PriceShiftOptions {
  /** Paid minutes already accumulated earlier in the pay week, for
   * pay_week-scoped threshold rules. */
  weekPaidMinutesBefore?: number
}

export function priceShift(
  shift: ShiftInput,
  rates: AgencyRates,
  options: PriceShiftOptions = {},
): ShiftPricing {
  const workedMinutes = shiftDurationMinutes(shift.startTime, shift.endTime)
  const override = shift.manualRatePence

  // A manual override replaces every minute's rate but still loses break
  // time, so both paths share one pipeline.
  const minutes: MinuteRate[] =
    override !== null && override !== undefined
      ? Array.from({ length: workedMinutes }, () => ({
          label: 'Manual rate',
          ratePence: override,
        }))
      : resolveMinutes(shift, rates)

  const paid = new Array<boolean>(minutes.length).fill(true)
  const unplacedBreak = applyPositionedBreaks(shift, paid)
  let runs = toRuns(minutes, paid)
  // Anything not pinned to a clock time still spreads pro-rata.
  const placedTotal = runs.reduce((sum, r) => sum + r.minutes, 0)
  runs = deductBreakProRata(runs, placedTotal - unplacedBreak)

  if (override === null || override === undefined) {
    const thresholds = rates.rules.filter(
      (r): r is ThresholdRule => r.kind === 'threshold',
    )
    runs = applyThresholds(runs, thresholds, options.weekPaidMinutesBefore ?? 0)
  }

  const breakdown = toBreakdown(runs)
  return {
    workedMinutes,
    // Derived from the minutes actually paid, so it always agrees with the
    // breakdown even when a break sits outside the shift or overruns it.
    paidMinutes: breakdown.reduce((s, l) => s + l.minutes, 0),
    grossPence: breakdown.reduce((s, l) => s + l.subtotalPence, 0),
    breakdown,
  }
}

/** Price a pay week's shifts chronologically, feeding each shift the paid
 * minutes accumulated before it so pay_week thresholds land mid-shift. */
export function pricePayWeek(
  shifts: readonly ShiftInput[],
  rates: AgencyRates,
  options: PriceShiftOptions = {},
): PayWeekPricing {
  const ordered = [...shifts].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  )

  let weekPaidMinutesBefore = options.weekPaidMinutesBefore ?? 0
  const priced: ShiftPricing[] = []
  const byInput = new Map<ShiftInput, ShiftPricing>()
  for (const shift of ordered) {
    const pricing = priceShift(shift, rates, { weekPaidMinutesBefore })
    weekPaidMinutesBefore += pricing.paidMinutes
    byInput.set(shift, pricing)
  }
  for (const shift of shifts) priced.push(byInput.get(shift)!)

  return {
    shifts: priced,
    totalPaidMinutes: priced.reduce((s, p) => s + p.paidMinutes, 0),
    totalGrossPence: priced.reduce((s, p) => s + p.grossPence, 0),
  }
}
