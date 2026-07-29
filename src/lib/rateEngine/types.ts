/** Pay for a rule: a fixed hourly rate in pence, or a multiplier on the
 * rate otherwise applicable (base rate for time bands, the minute's
 * already-resolved rate for thresholds). */
export type Pay = { ratePence: number } | { multiplier: number }

export interface TimeBandRule {
  kind: 'time_band'
  label: string
  /** 0=Sun..6=Sat; null = all days. Matched against the actual calendar
   * day of each minute, so a shift crossing midnight can leave a band. */
  daysOfWeek: readonly number[] | null
  /** Minutes from midnight, inclusive. */
  bandStartMin: number
  /** Minutes from midnight, exclusive. end <= start wraps midnight;
   * equal start/end covers the whole day. */
  bandEndMin: number
  pay: Pay
  /** Higher wins on overlap; ties go to the higher resulting rate. */
  priority: number
}

export interface ThresholdRule {
  kind: 'threshold'
  label: string
  /** Paid minutes after which this rule kicks in. */
  thresholdMinutes: number
  scope: 'shift' | 'pay_week'
  pay: Pay
  priority: number
}

export type RateRule = TimeBandRule | ThresholdRule

export interface ShiftInput {
  /** YYYY-MM-DD — the calendar day the shift starts. */
  date: string
  /** HH:MM or HH:MM:SS. */
  startTime: string
  /** HH:MM or HH:MM:SS. end <= start means the shift crosses midnight;
   * equal start/end is a 24h shift. */
  endTime: string
  breakMinutes: number
  /** Escape hatch: bypasses all rules when set. Breaks still deduct. */
  manualRatePence?: number | null
}

export interface AgencyRates {
  baseRatePence: number
  rules: readonly RateRule[]
}

export interface BreakdownLine {
  label: string
  minutes: number
  /** Effective hourly rate in pence. May be fractional after a
   * multiplier (e.g. 1450 × 1.5 = 2175, but 1250 × 1.25 = 1562.5);
   * subtotals are always rounded to integer pence. */
  ratePence: number
  subtotalPence: number
}

export interface ShiftPricing {
  /** Clocked minutes, before break deduction. */
  workedMinutes: number
  /** workedMinutes - breakMinutes (floored at 0). */
  paidMinutes: number
  grossPence: number
  /** Sums exactly to grossPence. */
  breakdown: BreakdownLine[]
}

export interface PayWeekPricing {
  shifts: ShiftPricing[]
  totalPaidMinutes: number
  totalGrossPence: number
}
