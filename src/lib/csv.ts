import { format, parseISO } from 'date-fns'
import type { Tables } from './database.types'
import { formatMinutes, penceToDecimal } from './money'
import { holidayAccrualPence, paydayDateFor } from './payday'
import { priceShifts } from './pricing'
import { payWeekEnd } from './weeks'

export function csvField(value: string | number): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n'
}

/** Minutes -> decimal hours ("7.50"), rounded to hundredths. */
export function minutesToDecimalHours(minutes: number): string {
  return (Math.round((minutes * 100) / 60) / 100).toFixed(2)
}

const HEADERS = [
  'Date',
  'Day',
  'Agency',
  'Start',
  'End',
  'Break (min)',
  'Hours',
  'Gross (GBP)',
  'Rate breakdown',
  'Pay week ending',
  'Payday',
  'Notes',
] as const

const BLANK = Array<string>(HEADERS.length).fill('')

/** Pad a short row out to the table width so columns stay aligned. */
function row(cells: (string | number)[]): (string | number)[] {
  return [...cells, ...BLANK.slice(cells.length)]
}

export interface ShiftsCsvOptions {
  /** Adds a holiday-accrual summary line under the totals. */
  holidayAccrualPct?: number | null
}

/**
 * A spreadsheet-shaped export: human-readable headers, money and hours as
 * plain decimals that SUM works on, ISO dates that sort correctly, and a
 * totals block separated from the data by a blank row. Prefixed with a BOM
 * so Excel reads the UTF-8 pound signs in the breakdown column.
 */
export function buildShiftsCsv(
  shifts: readonly Tables<'shifts'>[],
  agencies: readonly Tables<'agencies'>[],
  rules: readonly Tables<'rate_rules'>[],
  options: ShiftsCsvOptions = {},
): string {
  const priced = priceShifts(shifts, agencies, rules)
  const agencyById = new Map(agencies.map((a) => [a.id, a]))
  const ordered = [...shifts].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time),
  )

  const rows: (string | number)[][] = [[...HEADERS]]
  let totalMinutes = 0
  let totalGross = 0

  for (const shift of ordered) {
    const entry = priced.get(shift.id)
    const agency = agencyById.get(shift.agency_id)
    const pricing = entry?.pricing

    if (pricing) {
      totalMinutes += pricing.paidMinutes
      totalGross += pricing.grossPence
    }

    const breakdown = pricing
      ? pricing.breakdown
          .map(
            (line) =>
              `${line.label} ${formatMinutes(line.minutes)} @ £${penceToDecimal(
                Math.round(line.ratePence),
              )}`,
          )
          .join('; ')
      : ''

    rows.push(
      row([
        shift.date,
        format(parseISO(shift.date), 'EEE'),
        agency?.name ?? '',
        shift.start_time.slice(0, 5),
        shift.end_time.slice(0, 5),
        shift.break_minutes,
        pricing ? minutesToDecimalHours(pricing.paidMinutes) : '',
        pricing ? penceToDecimal(pricing.grossPence) : '',
        shift.manual_rate_pence != null
          ? `Manual rate £${penceToDecimal(shift.manual_rate_pence)}`
          : breakdown,
        entry ? payWeekEnd(entry.weekStart) : '',
        entry && agency
          ? paydayDateFor(entry.weekStart, agency.pay_delay_days)
          : '',
        shift.notes ?? '',
      ]),
    )
  }

  if (ordered.length > 0) {
    rows.push([...BLANK])
    rows.push(
      row([
        'Total',
        '',
        '',
        '',
        '',
        '',
        minutesToDecimalHours(totalMinutes),
        penceToDecimal(totalGross),
      ]),
    )
    const pct = options.holidayAccrualPct
    if (pct != null) {
      rows.push(
        row([
          `Holiday accrual (${pct}%)`,
          '',
          '',
          '',
          '',
          '',
          '',
          penceToDecimal(holidayAccrualPence(totalGross, pct)),
        ]),
      )
    }
  }

  // BOM: without it Excel renders "£" as "Â£".
  return '﻿' + toCsv(rows)
}
