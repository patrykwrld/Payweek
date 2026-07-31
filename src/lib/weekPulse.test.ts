import { describe, expect, it } from 'vitest'
import type { Tables } from './database.types'
import { weekPulse } from './weekPulse'

// Mon 27 Jul 2026 is a Monday; the pay weeks below run Mon-Sun.
const MONDAY = '2026-07-27'
const WEDNESDAY = '2026-07-29'

function agency(over: Partial<Tables<'agencies'>> = {}): Tables<'agencies'> {
  return {
    id: 'a1',
    user_id: 'u',
    name: 'Meridian',
    base_rate_pence: 1000,
    pay_cycle: 'weekly',
    pay_week_start_day: 1,
    pay_delay_days: 5,
    notes: null,
    archived: false,
    created_at: '',
    ...over,
  }
}

function shift(
  id: string,
  date: string,
  over: Partial<Tables<'shifts'>> = {},
): Tables<'shifts'> {
  return {
    id,
    user_id: 'u',
    agency_id: 'a1',
    date,
    start_time: '09:00:00',
    end_time: '17:00:00', // 8h at £10 = £80
    break_minutes: 0,
    breaks: [],
    manual_rate_pence: null,
    notes: null,
    created_at: '',
    ...over,
  }
}

describe('weekPulse', () => {
  it('totals only the pay week containing today', () => {
    const pulse = weekPulse(
      [
        shift('this', WEDNESDAY),
        shift('last', '2026-07-22'), // previous Wednesday
        shift('older', '2026-07-15'),
      ],
      [agency()],
      [],
      WEDNESDAY,
    )
    expect(pulse.grossPence).toBe(8000)
    expect(pulse.paidMinutes).toBe(480)
    expect(pulse.shiftCount).toBe(1)
  })

  it('compares against the same week seven days earlier', () => {
    const pulse = weekPulse(
      [
        shift('this', WEDNESDAY),
        shift('this2', '2026-07-30'),
        shift('last', '2026-07-22'),
      ],
      [agency()],
      [],
      WEDNESDAY,
    )
    expect(pulse.grossPence).toBe(16000)
    expect(pulse.previousGrossPence).toBe(8000)
  })

  it('has no comparison when last week is empty, rather than showing zero', () => {
    const pulse = weekPulse([shift('this', WEDNESDAY)], [agency()], [], WEDNESDAY)
    expect(pulse.previousGrossPence).toBeNull()
  })

  it('counts the day of the pay week from its own start, not Monday', () => {
    // Week starts Sunday, so Wednesday is day 4.
    const sundayWeek = weekPulse(
      [shift('this', WEDNESDAY)],
      [agency({ pay_week_start_day: 0 })],
      [],
      WEDNESDAY,
    )
    expect(sundayWeek.dayOfWeek).toBe(4)

    // Week starts Monday, so Wednesday is day 3 and Monday is day 1.
    expect(
      weekPulse([shift('t', WEDNESDAY)], [agency()], [], WEDNESDAY).dayOfWeek,
    ).toBe(3)
    expect(
      weekPulse([shift('t', MONDAY)], [agency()], [], MONDAY).dayOfWeek,
    ).toBe(1)
  })

  it('counts the days to payday', () => {
    // Week ends Sun 2 Aug, +5 days delay = Fri 7 Aug, 9 days after Wed 29th.
    const pulse = weekPulse([shift('t', WEDNESDAY)], [agency()], [], WEDNESDAY)
    expect(pulse.paydayDate).toBe('2026-08-07')
    expect(pulse.daysToPayday).toBe(9)
  })

  it('picks the nearest payday when agencies pay on different days', () => {
    const pulse = weekPulse(
      [shift('t', WEDNESDAY), shift('t2', WEDNESDAY, { agency_id: 'a2' })],
      [agency(), agency({ id: 'a2', name: 'Other', pay_delay_days: 2 })],
      [],
      WEDNESDAY,
    )
    // Other pays Tue 4 Aug, which lands first.
    expect(pulse.paydayDate).toBe('2026-08-04')
  })

  it('ignores archived agencies', () => {
    const pulse = weekPulse(
      [shift('t', WEDNESDAY)],
      [agency({ archived: true })],
      [],
      WEDNESDAY,
    )
    expect(pulse.grossPence).toBe(0)
    expect(pulse.shiftCount).toBe(0)
  })

  it('reports an empty week without inventing a comparison', () => {
    const pulse = weekPulse([], [agency()], [], WEDNESDAY)
    expect(pulse.grossPence).toBe(0)
    expect(pulse.previousGrossPence).toBeNull()
    expect(pulse.dayOfWeek).toBe(3)
  })
})
