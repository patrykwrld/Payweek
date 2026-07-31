import { describe, expect, it } from 'vitest'
import type { Tables } from './database.types'
import {
  findNightRule,
  findWeekendRule,
  otherRules,
  planRateChanges,
} from './rateShapes'

function rule(over: Partial<Tables<'rate_rules'>>): Tables<'rate_rules'> {
  return {
    id: 'r',
    agency_id: 'a',
    kind: 'time_band',
    label: 'Rate',
    days_of_week: null,
    band_start: null,
    band_end: null,
    threshold_minutes: null,
    threshold_scope: null,
    rate_pence: 1500,
    multiplier: null,
    priority: 0,
    active: true,
    created_at: '',
    ...over,
  }
}

const night = rule({
  id: 'night',
  band_start: '22:00:00',
  band_end: '06:00:00',
})
const weekend = rule({
  id: 'weekend',
  days_of_week: [0, 6],
  band_start: '00:00:00',
  band_end: '00:00:00',
  rate_pence: 1600,
})
const unusual = rule({
  id: 'twilight',
  label: 'Twilight',
  band_start: '14:00:00',
  band_end: '18:00:00',
})

describe('recognising the two common rates', () => {
  it('finds a night rate by its crossing of midnight', () => {
    expect(findNightRule([unusual, night, weekend])?.id).toBe('night')
  })

  it('does not mistake an afternoon band for a night rate', () => {
    expect(findNightRule([unusual])).toBeUndefined()
  })

  it('finds a weekend rate by its days', () => {
    expect(findWeekendRule([night, weekend])?.id).toBe('weekend')
  })

  it('does not mistake a weekday rate for a weekend one', () => {
    const weekdays = rule({ id: 'wd', days_of_week: [1, 2, 3, 4, 5] })
    expect(findWeekendRule([weekdays])).toBeUndefined()
  })

  it('leaves everything else as an "other" rate', () => {
    expect(otherRules([night, weekend, unusual]).map((r) => r.id)).toEqual([
      'twilight',
    ])
  })

  it('never treats a multiplier rule as one of the two', () => {
    const overtime = rule({
      id: 'ot',
      kind: 'threshold',
      threshold_minutes: 480,
      threshold_scope: 'shift',
      rate_pence: null,
      multiplier: 1.5,
    })
    expect(findNightRule([overtime])).toBeUndefined()
    expect(findWeekendRule([overtime])).toBeUndefined()
    expect(otherRules([overtime])).toHaveLength(1)
  })
})

describe('planRateChanges', () => {
  it('inserts what is newly ticked', () => {
    const change = planRateChanges(
      { night: { from: '22:00', to: '06:00', ratePence: 1500 }, weekend: null },
      [],
    )
    expect(change.insert).toHaveLength(1)
    expect(change.insert[0]?.rate_pence).toBe(1500)
    expect(change.update).toEqual([])
    expect(change.deleteIds).toEqual([])
  })

  it('updates in place rather than replacing, so a rate keeps its identity', () => {
    const change = planRateChanges(
      { night: { from: '21:00', to: '05:00', ratePence: 1700 }, weekend: null },
      [night],
    )
    expect(change.insert).toEqual([])
    expect(change.update).toHaveLength(1)
    expect(change.update[0]).toMatchObject({
      id: 'night',
      band_start: '21:00',
      rate_pence: 1700,
    })
    expect(change.deleteIds).toEqual([])
  })

  it('deletes what has been unticked', () => {
    const change = planRateChanges({ night: null, weekend: null }, [
      night,
      weekend,
    ])
    expect(change.deleteIds.sort()).toEqual(['night', 'weekend'])
    expect(change.insert).toEqual([])
  })

  it('never touches a rate the tick boxes do not own', () => {
    const change = planRateChanges({ night: null, weekend: null }, [unusual])
    expect(change).toEqual({ insert: [], update: [], deleteIds: [] })
  })

  it('handles one added while the other is removed', () => {
    const change = planRateChanges(
      { night: null, weekend: { ratePence: 1600 } },
      [night],
    )
    expect(change.deleteIds).toEqual(['night'])
    expect(change.insert).toHaveLength(1)
    expect(change.insert[0]?.days_of_week).toEqual([0, 6])
  })

  // The engine awards an overlapping hour to the higher priority number.
  it('ranks weekend above night, so a Saturday night pays the weekend rate', () => {
    const change = planRateChanges(
      {
        night: { from: '22:00', to: '06:00', ratePence: 1500 },
        weekend: { ratePence: 1600 },
      },
      [],
    )
    const [nightRow, weekendRow] = change.insert
    expect(nightRow?.priority).toBeLessThan(weekendRow?.priority ?? 0)
  })
})
