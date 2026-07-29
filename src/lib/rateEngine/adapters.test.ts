import { describe, expect, it } from 'vitest'
import type { Tables } from '../database.types'
import { ruleFromRow, rulesFromRows, shiftFromRow } from './adapters'

const baseRow: Tables<'rate_rules'> = {
  id: 'r1',
  agency_id: 'a1',
  kind: 'time_band',
  label: 'Night rate',
  days_of_week: [1, 2, 3, 4, 5],
  band_start: '22:00:00',
  band_end: '06:00:00',
  threshold_minutes: null,
  threshold_scope: null,
  rate_pence: 1450,
  multiplier: null,
  priority: 5,
  active: true,
  created_at: '2026-07-29T00:00:00Z',
}

describe('ruleFromRow', () => {
  it('maps a time_band row, parsing DB time strings', () => {
    expect(ruleFromRow(baseRow)).toEqual({
      kind: 'time_band',
      label: 'Night rate',
      daysOfWeek: [1, 2, 3, 4, 5],
      bandStartMin: 1320,
      bandEndMin: 360,
      pay: { ratePence: 1450 },
      priority: 5,
    })
  })

  it('maps a threshold row with a multiplier', () => {
    const row: Tables<'rate_rules'> = {
      ...baseRow,
      kind: 'threshold',
      label: 'Daily OT',
      days_of_week: null,
      band_start: null,
      band_end: null,
      threshold_minutes: 480,
      threshold_scope: 'shift',
      rate_pence: null,
      multiplier: 1.5,
    }
    expect(ruleFromRow(row)).toEqual({
      kind: 'threshold',
      label: 'Daily OT',
      thresholdMinutes: 480,
      scope: 'shift',
      pay: { multiplier: 1.5 },
      priority: 5,
    })
  })

  it('drops inactive rules', () => {
    expect(ruleFromRow({ ...baseRow, active: false })).toBeNull()
    expect(rulesFromRows([baseRow, { ...baseRow, active: false }])).toHaveLength(1)
  })
})

describe('shiftFromRow', () => {
  it('maps a shifts row to engine input', () => {
    const row: Tables<'shifts'> = {
      id: 's1',
      user_id: 'u1',
      agency_id: 'a1',
      date: '2026-07-28',
      start_time: '22:00:00',
      end_time: '06:00:00',
      break_minutes: 30,
      manual_rate_pence: null,
      notes: null,
      created_at: '2026-07-29T00:00:00Z',
    }
    expect(shiftFromRow(row)).toEqual({
      date: '2026-07-28',
      startTime: '22:00:00',
      endTime: '06:00:00',
      breakMinutes: 30,
      manualRatePence: null,
    })
  })
})
