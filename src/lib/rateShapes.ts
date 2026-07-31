import type { Tables, TablesInsert } from './database.types'

/**
 * The two rates almost everybody has, expressed as shapes rather than rows.
 *
 * Night and weekend pay used to mean leaving the agency screen, choosing
 * "add rule", and filling in a form about time bands. They are common enough
 * to belong beside the normal rate as two tick boxes — which means something
 * has to recognise them in a list of rules, and rebuild them from the boxes.
 * That recognition lives here so the form and the screen cannot disagree.
 */

export interface NightRate {
  /** HH:MM */
  from: string
  to: string
  ratePence: number
}

export interface WeekendRate {
  ratePence: number
}

/** A rate that runs between two times of day, crossing midnight. */
export function isNightRule(rule: {
  kind: string
  band_start: string | null
  band_end: string | null
  days_of_week: number[] | null
  rate_pence: number | null
}): boolean {
  return (
    rule.kind === 'time_band' &&
    rule.rate_pence !== null &&
    rule.days_of_week === null &&
    rule.band_start !== null &&
    rule.band_end !== null &&
    rule.band_start > rule.band_end
  )
}

/** A rate that applies to Saturdays and Sundays only. */
export function isWeekendRule(rule: {
  kind: string
  days_of_week: number[] | null
  rate_pence: number | null
}): boolean {
  return (
    rule.kind === 'time_band' &&
    rule.rate_pence !== null &&
    rule.days_of_week !== null &&
    rule.days_of_week.length > 0 &&
    rule.days_of_week.every((d) => d === 0 || d === 6)
  )
}

export function findNightRule<T extends Parameters<typeof isNightRule>[0]>(
  rules: readonly T[],
): T | undefined {
  return rules.find(isNightRule)
}

export function findWeekendRule<T extends Parameters<typeof isWeekendRule>[0]>(
  rules: readonly T[],
): T | undefined {
  return rules.find(isWeekendRule)
}

/** Anything the two tick boxes don't cover, which still needs the full form. */
export function otherRules<
  T extends Parameters<typeof isNightRule>[0] &
    Parameters<typeof isWeekendRule>[0],
>(rules: readonly T[]): T[] {
  const night = findNightRule(rules)
  const weekend = findWeekendRule(rules)
  return rules.filter((r) => r !== night && r !== weekend)
}

type RuleFields = Omit<TablesInsert<'rate_rules'>, 'agency_id'>

export function nightRuleFields(rate: NightRate): RuleFields {
  return {
    kind: 'time_band',
    label: 'Night rate',
    days_of_week: null,
    band_start: rate.from,
    band_end: rate.to,
    threshold_minutes: null,
    threshold_scope: null,
    rate_pence: rate.ratePence,
    multiplier: null,
    // The engine gives an overlapping hour to the higher priority, so weekend
    // (10) outranks night (5): a Saturday night pays the weekend rate. That is
    // the usual arrangement, and the form says so where both are ticked.
    priority: 5,
  }
}

export function weekendRuleFields(rate: WeekendRate): RuleFields {
  return {
    kind: 'time_band',
    label: 'Weekend rate',
    days_of_week: [0, 6],
    // Equal start and end means the whole day.
    band_start: '00:00',
    band_end: '00:00',
    threshold_minutes: null,
    threshold_scope: null,
    rate_pence: rate.ratePence,
    multiplier: null,
    priority: 10,
  }
}

/** What the tick boxes are asking for, once the form is submitted. */
export interface RatePlan {
  night: NightRate | null
  weekend: WeekendRate | null
}

export interface RateChange {
  insert: RuleFields[]
  update: (RuleFields & { id: string })[]
  deleteIds: string[]
}

/**
 * Turn "these boxes are ticked" into the smallest set of writes. Unticking
 * deletes; changing a figure updates in place rather than deleting and
 * re-adding, so a rate keeps its identity.
 */
export function planRateChanges(
  plan: RatePlan,
  existing: readonly Tables<'rate_rules'>[],
): RateChange {
  const change: RateChange = { insert: [], update: [], deleteIds: [] }

  const pairs = [
    [plan.night && nightRuleFields(plan.night), findNightRule(existing)],
    [plan.weekend && weekendRuleFields(plan.weekend), findWeekendRule(existing)],
  ] as const

  for (const [wanted, current] of pairs) {
    if (wanted && current) change.update.push({ ...wanted, id: current.id })
    else if (wanted) change.insert.push(wanted)
    else if (current) change.deleteIds.push(current.id)
  }

  return change
}
