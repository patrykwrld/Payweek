import type { Tables } from '../database.types'
import { timeToMinutes } from './engine'
import type { RateRule, ShiftBreak, ShiftInput } from './types'

/** Map a rate_rules row to an engine rule. Returns null for inactive
 * rows or rows that don't satisfy the schema's shape (belt and braces —
 * the DB check constraints should make that impossible). */
export function ruleFromRow(row: Tables<'rate_rules'>): RateRule | null {
  if (!row.active) return null

  const pay =
    row.rate_pence !== null
      ? { ratePence: row.rate_pence }
      : row.multiplier !== null
        ? { multiplier: row.multiplier }
        : null
  if (!pay) return null

  if (row.kind === 'time_band') {
    if (row.band_start === null || row.band_end === null) return null
    return {
      kind: 'time_band',
      label: row.label,
      daysOfWeek: row.days_of_week,
      bandStartMin: timeToMinutes(row.band_start),
      bandEndMin: timeToMinutes(row.band_end) % 1440,
      pay,
      priority: row.priority,
    }
  }

  if (row.kind === 'threshold') {
    if (
      row.threshold_minutes === null ||
      (row.threshold_scope !== 'shift' && row.threshold_scope !== 'pay_week')
    ) {
      return null
    }
    return {
      kind: 'threshold',
      label: row.label,
      thresholdMinutes: row.threshold_minutes,
      scope: row.threshold_scope,
      pay,
      priority: row.priority,
    }
  }

  return null
}

export function rulesFromRows(rows: readonly Tables<'rate_rules'>[]): RateRule[] {
  return rows
    .map(ruleFromRow)
    .filter((r): r is RateRule => r !== null)
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

/** The breaks column is jsonb, so it is untyped at the boundary. Drop
 * anything malformed rather than letting it throw inside the engine — a bad
 * row must never take the pricing down. */
export function breaksFromJson(value: unknown): ShiftBreak[] {
  if (!Array.isArray(value)) return []
  const out: ShiftBreak[] = []
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue
    const entry = raw as Record<string, unknown>
    const minutes = entry.minutes
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
      continue
    }
    const start = entry.start_time
    out.push({
      minutes: Math.round(minutes),
      startTime: typeof start === 'string' && TIME_RE.test(start) ? start : null,
    })
  }
  return out
}

export function shiftFromRow(row: Tables<'shifts'>): ShiftInput {
  return {
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    breakMinutes: row.break_minutes,
    breaks: breaksFromJson(row.breaks),
    manualRatePence: row.manual_rate_pence,
  }
}
