import { describe, expect, it } from 'vitest'
import { priceShift, pricePayWeek, timeToMinutes } from './engine'
import type {
  AgencyRates,
  RateRule,
  ShiftPricing,
  TimeBandRule,
} from './types'

// Known days: 2026-07-25 Sat, 2026-07-26 Sun, 2026-07-27 Mon,
// 2026-07-28 Tue, 2026-07-31 Fri.

const BASE = 1200 // £12.00/h

const nightBand = (over: Partial<TimeBandRule> = {}): TimeBandRule => ({
  kind: 'time_band',
  label: 'Night rate',
  daysOfWeek: null,
  bandStartMin: timeToMinutes('22:00'),
  bandEndMin: timeToMinutes('06:00'),
  pay: { ratePence: 1450 },
  priority: 5,
  ...over,
})

const weekendBand = (over: Partial<TimeBandRule> = {}): TimeBandRule => ({
  kind: 'time_band',
  label: 'Weekend',
  daysOfWeek: [0, 6],
  bandStartMin: 0,
  bandEndMin: 0, // equal start/end = all day
  pay: { ratePence: 1500 },
  priority: 10,
  ...over,
})

const dailyOT: RateRule = {
  kind: 'threshold',
  label: 'Daily OT',
  thresholdMinutes: 480,
  scope: 'shift',
  pay: { multiplier: 1.5 },
  priority: 0,
}

const weeklyOT: RateRule = {
  kind: 'threshold',
  label: 'Weekly OT',
  thresholdMinutes: 2400, // 40h
  scope: 'pay_week',
  pay: { multiplier: 1.5 },
  priority: 0,
}

const rates = (...rules: RateRule[]): AgencyRates => ({
  baseRatePence: BASE,
  rules,
})

function expectInternallyConsistent(p: ShiftPricing) {
  expect(p.breakdown.reduce((s, l) => s + l.minutes, 0)).toBe(p.paidMinutes)
  expect(p.breakdown.reduce((s, l) => s + l.subtotalPence, 0)).toBe(
    p.grossPence,
  )
  for (const line of p.breakdown) {
    expect(line.subtotalPence).toBe(
      Math.round((line.minutes * line.ratePence) / 60),
    )
    expect(Number.isInteger(line.subtotalPence)).toBe(true)
  }
}

describe('timeToMinutes', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('22:00:00')).toBe(1320)
    expect(timeToMinutes('00:00')).toBe(0)
  })
})

describe('priceShift', () => {
  it('prices a plain shift at base rate only', () => {
    const p = priceShift(
      { date: '2026-07-28', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
      rates(),
    )
    expect(p.workedMinutes).toBe(480)
    expect(p.paidMinutes).toBe(480)
    expect(p.grossPence).toBe(9600)
    expect(p.breakdown).toEqual([
      { label: 'Base rate', minutes: 480, ratePence: 1200, subtotalPence: 9600 },
    ])
    expectInternallyConsistent(p)
  })

  it('follows a shift across midnight into a night band', () => {
    // Tue 22:00 -> Wed 06:00; Mon-Fri night band covers both sides
    const p = priceShift(
      { date: '2026-07-28', startTime: '22:00', endTime: '06:00', breakMinutes: 0 },
      rates(nightBand({ daysOfWeek: [1, 2, 3, 4, 5] })),
    )
    expect(p.workedMinutes).toBe(480)
    expect(p.grossPence).toBe(11600)
    expect(p.breakdown).toEqual([
      { label: 'Night rate', minutes: 480, ratePence: 1450, subtotalPence: 11600 },
    ])
    expectInternallyConsistent(p)
  })

  it('drops out of a weekday band when midnight rolls into Saturday', () => {
    // Fri 22:00 -> Sat 06:00 with a Mon-Fri-only night band:
    // only the Friday minutes (22:00-24:00) match
    const p = priceShift(
      { date: '2026-07-31', startTime: '22:00', endTime: '06:00', breakMinutes: 0 },
      rates(nightBand({ daysOfWeek: [1, 2, 3, 4, 5] })),
    )
    expect(p.breakdown).toEqual([
      { label: 'Night rate', minutes: 120, ratePence: 1450, subtotalPence: 2900 },
      { label: 'Base rate', minutes: 360, ratePence: 1200, subtotalPence: 7200 },
    ])
    expectInternallyConsistent(p)
  })

  it('resolves overlapping weekend and night bands by priority', () => {
    // Sat 20:00 -> Sun 04:00. Weekend (priority 10) overlaps night
    // (priority 5) from 22:00; weekend wins throughout.
    const p = priceShift(
      { date: '2026-07-25', startTime: '20:00', endTime: '04:00', breakMinutes: 0 },
      rates(weekendBand(), nightBand()),
    )
    expect(p.breakdown).toEqual([
      { label: 'Weekend', minutes: 480, ratePence: 1500, subtotalPence: 12000 },
    ])
    expectInternallyConsistent(p)
  })

  it('resolves an equal-priority overlap to the higher resulting rate', () => {
    const p = priceShift(
      { date: '2026-07-25', startTime: '23:00', endTime: '01:00', breakMinutes: 0 },
      rates(weekendBand({ priority: 5 }), nightBand({ priority: 5 })),
    )
    // weekend 1500 beats night 1450 on the tie
    expect(p.breakdown[0]).toEqual({
      label: 'Weekend',
      minutes: 120,
      ratePence: 1500,
      subtotalPence: 3000,
    })
    expectInternallyConsistent(p)
  })

  it('applies daily OT after 8h in a 10h shift', () => {
    const p = priceShift(
      { date: '2026-07-28', startTime: '06:00', endTime: '16:00', breakMinutes: 0 },
      rates(dailyOT),
    )
    expect(p.breakdown).toEqual([
      { label: 'Base rate', minutes: 480, ratePence: 1200, subtotalPence: 9600 },
      {
        label: 'Daily OT',
        minutes: 120,
        ratePence: 1800,
        subtotalPence: 3600,
      },
    ])
    expect(p.grossPence).toBe(13200)
    expectInternallyConsistent(p)
  })

  it('applies a threshold multiplier to the night rate, not base', () => {
    // Tue 14:00 -> 00:00 (10h): 8h base, then 2h that are BOTH past the
    // daily OT threshold AND inside the night band. OT multiplies the
    // night rate: 1450 * 1.5 = 2175.
    const p = priceShift(
      { date: '2026-07-28', startTime: '14:00', endTime: '00:00', breakMinutes: 0 },
      rates(nightBand(), dailyOT),
    )
    expect(p.breakdown).toEqual([
      { label: 'Base rate', minutes: 480, ratePence: 1200, subtotalPence: 9600 },
      {
        label: 'Daily OT (Night rate)',
        minutes: 120,
        ratePence: 2175,
        subtotalPence: 4350,
      },
    ])
    expect(p.grossPence).toBe(13950)
    expectInternallyConsistent(p)
  })

  it('lets a manual override ignore every rule', () => {
    const p = priceShift(
      {
        date: '2026-07-25',
        startTime: '20:00',
        endTime: '04:00',
        breakMinutes: 30,
        manualRatePence: 2000,
      },
      rates(weekendBand(), nightBand(), dailyOT, weeklyOT),
    )
    expect(p.paidMinutes).toBe(450)
    expect(p.breakdown).toEqual([
      { label: 'Manual rate', minutes: 450, ratePence: 2000, subtotalPence: 15000 },
    ])
    expectInternallyConsistent(p)
  })

  it('deducts a break pro-rata across two bands', () => {
    // Tue 18:00 -> 02:00: 240min base + 240min night. 60min break
    // splits 30/30 pro-rata.
    const p = priceShift(
      { date: '2026-07-28', startTime: '18:00', endTime: '02:00', breakMinutes: 60 },
      rates(nightBand()),
    )
    expect(p.workedMinutes).toBe(480)
    expect(p.paidMinutes).toBe(420)
    expect(p.breakdown).toEqual([
      { label: 'Base rate', minutes: 210, ratePence: 1200, subtotalPence: 4200 },
      { label: 'Night rate', minutes: 210, ratePence: 1450, subtotalPence: 5075 },
    ])
    expect(p.grossPence).toBe(9275)
    expectInternallyConsistent(p)
  })

  it('applies a multiplier time band against the base rate', () => {
    // Fri 16:00 -> 24:00 with "Fri evening x1.25" from 18:00
    const p = priceShift(
      { date: '2026-07-31', startTime: '16:00', endTime: '00:00', breakMinutes: 0 },
      rates({
        kind: 'time_band',
        label: 'Fri evening',
        daysOfWeek: [5],
        bandStartMin: timeToMinutes('18:00'),
        bandEndMin: 0,
        pay: { multiplier: 1.25 },
        priority: 0,
      }),
    )
    expect(p.breakdown).toEqual([
      { label: 'Base rate', minutes: 120, ratePence: 1200, subtotalPence: 2400 },
      { label: 'Fri evening', minutes: 360, ratePence: 1500, subtotalPence: 9000 },
    ])
    expectInternallyConsistent(p)
  })

  it('clamps an over-long break to zero paid minutes', () => {
    const p = priceShift(
      { date: '2026-07-28', startTime: '09:00', endTime: '10:00', breakMinutes: 90 },
      rates(),
    )
    expect(p.paidMinutes).toBe(0)
    expect(p.grossPence).toBe(0)
  })
})

describe('pricePayWeek', () => {
  it('crosses the weekly OT threshold mid-shift on the 5th shift', () => {
    // Mon-Thu 8h each (1920min), Fri 10h: the Friday shift passes 40h
    // at its 480th minute; the last 120min are weekly OT.
    const week = pricePayWeek(
      [
        { date: '2026-07-27', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
        { date: '2026-07-28', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
        { date: '2026-07-29', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
        { date: '2026-07-30', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
        { date: '2026-07-31', startTime: '08:00', endTime: '18:00', breakMinutes: 0 },
      ],
      rates(weeklyOT),
    )
    const friday = week.shifts[4]!
    expect(friday.breakdown).toEqual([
      { label: 'Base rate', minutes: 480, ratePence: 1200, subtotalPence: 9600 },
      {
        label: 'Weekly OT',
        minutes: 120,
        ratePence: 1800,
        subtotalPence: 3600,
      },
    ])
    expect(week.totalPaidMinutes).toBe(1920 + 600)
    expect(week.totalGrossPence).toBe(4 * 9600 + 13200)
  })

  it('accumulates shifts chronologically regardless of input order', () => {
    const shifts = [
      { date: '2026-07-31', startTime: '08:00', endTime: '18:00', breakMinutes: 0 },
      { date: '2026-07-27', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
      { date: '2026-07-28', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
      { date: '2026-07-29', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
      { date: '2026-07-30', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
    ]
    const week = pricePayWeek(shifts, rates(weeklyOT))
    // same totals as the ordered version: OT lands on the Friday shift
    expect(week.totalGrossPence).toBe(4 * 9600 + 13200)
  })

  it('prefers the winning threshold when shift and weekly OT both apply', () => {
    // Weekly OT already passed before this 10h shift starts; daily OT
    // passes at minute 480. Multipliers must not stack (x1.5, not x2.25):
    // the higher-priority rule wins.
    const p = priceShift(
      { date: '2026-07-31', startTime: '06:00', endTime: '16:00', breakMinutes: 0 },
      rates(dailyOT, { ...weeklyOT, priority: 1 }),
      { weekPaidMinutesBefore: 2400 },
    )
    expect(p.breakdown).toEqual([
      { label: 'Weekly OT', minutes: 600, ratePence: 1800, subtotalPence: 18000 },
    ])
    expectInternallyConsistent(p)
  })
})
