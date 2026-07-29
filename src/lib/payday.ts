import { addDays, format, parseISO } from 'date-fns'
import type { Tables } from './database.types'
import { priceShifts, type PricedShift } from './pricing'
import { payWeekEnd } from './weeks'

/** Holiday accrual in pence. pct is a percentage like 12.07; computed in
 * basis points so no float touches the money. */
export function holidayAccrualPence(grossPence: number, pct: number): number {
  const basisPoints = Math.round(pct * 100)
  return Math.round((grossPence * basisPoints) / 10000)
}

export type PayslipVerdict =
  | { status: 'match'; diffPence: 0 }
  | { status: 'short' | 'over'; diffPence: number }

/** Compare a payslip's gross against the engine's expectation. */
export function comparePayslip(
  expectedPence: number,
  paidPence: number,
): PayslipVerdict {
  const diff = paidPence - expectedPence
  if (diff === 0) return { status: 'match', diffPence: 0 }
  return diff < 0
    ? { status: 'short', diffPence: -diff }
    : { status: 'over', diffPence: diff }
}

/** The date this pay week lands in the packet: week end + the agency's
 * pay delay. */
export function paydayDateFor(weekStart: string, payDelayDays: number): string {
  return format(
    addDays(parseISO(payWeekEnd(weekStart)), payDelayDays),
    'yyyy-MM-dd',
  )
}

export interface AgencyWeek {
  agency: Tables<'agencies'>
  weekStart: string
  weekEnd: string
  paydayDate: string
  paidMinutes: number
  grossPence: number
  entries: PricedShift[]
}

/** Every (agency, pay week) that has shifts, priced. Sorted by agency
 * name, then newest week first. */
export function buildAgencyWeeks(
  shifts: readonly Tables<'shifts'>[],
  agencies: readonly Tables<'agencies'>[],
  rules: readonly Tables<'rate_rules'>[],
): AgencyWeek[] {
  const priced = priceShifts(shifts, agencies, rules)
  const byKey = new Map<string, AgencyWeek>()

  for (const entry of priced.values()) {
    const agency = agencies.find((a) => a.id === entry.shift.agency_id)
    if (!agency) continue
    const key = `${agency.id}|${entry.weekStart}`
    let week = byKey.get(key)
    if (!week) {
      week = {
        agency,
        weekStart: entry.weekStart,
        weekEnd: payWeekEnd(entry.weekStart),
        paydayDate: paydayDateFor(entry.weekStart, agency.pay_delay_days),
        paidMinutes: 0,
        grossPence: 0,
        entries: [],
      }
      byKey.set(key, week)
    }
    week.paidMinutes += entry.pricing.paidMinutes
    week.grossPence += entry.pricing.grossPence
    week.entries.push(entry)
  }

  for (const week of byKey.values()) {
    week.entries.sort(
      (a, b) =>
        a.shift.date.localeCompare(b.shift.date) ||
        a.shift.start_time.localeCompare(b.shift.start_time),
    )
  }

  return [...byKey.values()].sort(
    (a, b) =>
      a.agency.name.localeCompare(b.agency.name) ||
      b.weekStart.localeCompare(a.weekStart),
  )
}
