import type { Tables } from './database.types'
import { formatPence } from './money'
import { priceShifts } from './pricing'

export function csvField(value: string | number): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n'
}

/** All shifts with their engine-priced gross, oldest first. */
export function buildShiftsCsv(
  shifts: readonly Tables<'shifts'>[],
  agencies: readonly Tables<'agencies'>[],
  rules: readonly Tables<'rate_rules'>[],
): string {
  const priced = priceShifts(shifts, agencies, rules)
  const agencyName = new Map(agencies.map((a) => [a.id, a.name]))
  const ordered = [...shifts].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time),
  )

  const rows: (string | number)[][] = [
    [
      'date',
      'agency',
      'start',
      'end',
      'break_minutes',
      'paid_minutes',
      'expected_gross_pence',
      'expected_gross',
      'manual_rate_pence',
      'notes',
    ],
  ]
  for (const shift of ordered) {
    const pricing = priced.get(shift.id)?.pricing
    rows.push([
      shift.date,
      agencyName.get(shift.agency_id) ?? '',
      shift.start_time.slice(0, 5),
      shift.end_time.slice(0, 5),
      shift.break_minutes,
      pricing?.paidMinutes ?? '',
      pricing?.grossPence ?? '',
      pricing ? formatPence(pricing.grossPence) : '',
      shift.manual_rate_pence ?? '',
      shift.notes ?? '',
    ])
  }
  return toCsv(rows)
}
