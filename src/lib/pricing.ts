import type { Tables } from './database.types'
import {
  pricePayWeek,
  rulesFromRows,
  shiftFromRow,
  type ShiftPricing,
} from './rateEngine'
import { payWeekStart } from './weeks'

export interface PricedShift {
  shift: Tables<'shifts'>
  pricing: ShiftPricing
  /** Pay-week start (agency's pay_week_start_day) this shift falls in. */
  weekStart: string
}

/** Price every shift, grouping by agency + pay week so pay_week-scoped
 * threshold rules accumulate correctly across a week's shifts. */
export function priceShifts(
  shifts: readonly Tables<'shifts'>[],
  agencies: readonly Tables<'agencies'>[],
  rules: readonly Tables<'rate_rules'>[],
): Map<string, PricedShift> {
  const agencyById = new Map(agencies.map((a) => [a.id, a]))

  const rulesByAgency = new Map<string, Tables<'rate_rules'>[]>()
  for (const rule of rules) {
    const list = rulesByAgency.get(rule.agency_id) ?? []
    list.push(rule)
    rulesByAgency.set(rule.agency_id, list)
  }

  const groups = new Map<string, Tables<'shifts'>[]>()
  const weekStartByShift = new Map<string, string>()
  for (const shift of shifts) {
    const agency = agencyById.get(shift.agency_id)
    if (!agency) continue
    const weekStart = payWeekStart(shift.date, agency.pay_week_start_day)
    weekStartByShift.set(shift.id, weekStart)
    const key = `${shift.agency_id}|${weekStart}`
    const list = groups.get(key) ?? []
    list.push(shift)
    groups.set(key, list)
  }

  const out = new Map<string, PricedShift>()
  for (const group of groups.values()) {
    const first = group[0]!
    const agency = agencyById.get(first.agency_id)!
    const week = pricePayWeek(group.map(shiftFromRow), {
      baseRatePence: agency.base_rate_pence,
      rules: rulesFromRows(rulesByAgency.get(agency.id) ?? []),
    })
    group.forEach((shift, i) => {
      out.set(shift.id, {
        shift,
        pricing: week.shifts[i]!,
        weekStart: weekStartByShift.get(shift.id)!,
      })
    })
  }
  return out
}
