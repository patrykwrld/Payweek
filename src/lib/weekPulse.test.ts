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

  // This used to assert the opposite, and that assertion was the bug. A
  // tester archived the agency he actually works for, kept logging shifts
  // against it, and the home screen told him he had earned £0.00 — while
  // the bars underneath showed £107, £132 and £1054. Archiving takes an
  // agency out of the list you can add a shift to; it does not unhappen
  // work already logged, and Payday never pretended it did.
  it('counts an archived agency, because the work still happened', () => {
    const pulse = weekPulse(
      [shift('t', WEDNESDAY)],
      [agency({ archived: true })],
      [],
      WEDNESDAY,
    )
    expect(pulse.grossPence).toBe(8000)
    expect(pulse.shiftCount).toBe(1)
  })

  it('reads the same whichever way an agency is filed', () => {
    const of = (archived: boolean) =>
      weekPulse([shift('t', WEDNESDAY)], [agency({ archived })], [], WEDNESDAY)
    expect(of(true).grossPence).toBe(of(false).grossPence)
    expect(of(true).perDay.map((d) => d.pence)).toEqual(
      of(false).perDay.map((d) => d.pence),
    )
  })

  // The shape that produced the screenshot: an empty agency still on the
  // books, and the real one archived. The empty one must not take over the
  // week — it was setting the window and the payday countdown from an
  // agency that had never been worked.
  it('does not let an empty agency carry the week', () => {
    const pulse = weekPulse(
      [shift('t', WEDNESDAY, { agency_id: 'worked' })],
      [
        agency({ id: 'empty', name: 'New place' }),
        agency({ id: 'worked', name: 'Simple', archived: true }),
      ],
      [],
      WEDNESDAY,
    )
    expect(pulse.grossPence).toBe(8000)
    expect(pulse.shiftCount).toBe(1)
    expect(pulse.perDay.reduce((t, d) => t + d.pence, 0)).toBe(8000)
  })

  // The invariant the screenshot broke. If these two ever disagree again,
  // somebody is looking at a screen that contradicts itself.
  it('always has bars that add up to the figure above them', () => {
    const cases: Parameters<typeof weekPulse>[] = [
      [[shift('a', MONDAY), shift('b', WEDNESDAY)], [agency()], [], WEDNESDAY],
      [[shift('a', WEDNESDAY)], [agency({ archived: true })], [], WEDNESDAY],
      [
        [shift('a', WEDNESDAY), shift('b', WEDNESDAY, { agency_id: 'a2' })],
        [agency(), agency({ id: 'a2', name: 'Other' })],
        [],
        WEDNESDAY,
      ],
      [
        [shift('a', WEDNESDAY), shift('old', '2026-07-22')],
        [agency()],
        [],
        WEDNESDAY,
      ],
      [[], [agency()], [], WEDNESDAY],
    ]
    for (const [shifts, agencies, rules, today] of cases) {
      const pulse = weekPulse(shifts, agencies, rules, today)
      expect(pulse.perDay.reduce((t, d) => t + d.pence, 0)).toBe(pulse.grossPence)
    }
  })

  it('keeps a Sunday week counting from Sunday even with nothing logged', () => {
    const pulse = weekPulse([], [agency({ pay_week_start_day: 0 })], [], WEDNESDAY)
    expect(pulse.dayOfWeek).toBe(4)
  })

  it('reports an empty week without inventing a comparison', () => {
    const pulse = weekPulse([], [agency()], [], WEDNESDAY)
    expect(pulse.grossPence).toBe(0)
    expect(pulse.previousGrossPence).toBeNull()
    expect(pulse.dayOfWeek).toBe(3)
  })
})
