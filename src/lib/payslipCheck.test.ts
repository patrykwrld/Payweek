import { describe, expect, it } from 'vitest'
import type { Tables } from './database.types'
import type { AgencyWeek } from './payday'
import { isChecked, nextWeekToCheck, weeksAwaitingCheck } from './payslipCheck'

const agency = (id: string): Tables<'agencies'> => ({
  id,
  user_id: 'u1',
  name: `Agency ${id}`,
  base_rate_pence: 1350,
  pay_cycle: 'weekly',
  pay_week_start_day: 1,
  pay_delay_days: 5,
  archived: false,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
})

const week = (
  agencyId: string,
  weekStart: string,
  paydayDate: string,
  grossPence = 46753,
): AgencyWeek => ({
  agency: agency(agencyId),
  weekStart,
  weekEnd: weekStart,
  paydayDate,
  paidMinutes: 1920,
  grossPence,
  entries: [],
})

const slip = (agencyId: string, periodStart: string): Tables<'payslips'> => ({
  id: `ps-${agencyId}-${periodStart}`,
  user_id: 'u1',
  agency_id: agencyId,
  period_start: periodStart,
  period_end: periodStart,
  gross_pence: 43753,
  net_pence: null,
  created_at: '2026-03-06T00:00:00Z',
})

describe('isChecked', () => {
  it('matches on the agency and the week, not just one of them', () => {
    const w = week('a', '2026-03-02', '2026-03-13')
    expect(isChecked(w, [slip('a', '2026-03-02')])).toBe(true)
    // Right week, different agency — two agencies pay the same week.
    expect(isChecked(w, [slip('b', '2026-03-02')])).toBe(false)
    // Right agency, different week.
    expect(isChecked(w, [slip('a', '2026-02-23')])).toBe(false)
  })
})

describe('weeksAwaitingCheck', () => {
  const weeks = [
    week('a', '2026-02-23', '2026-03-06'),
    week('a', '2026-03-02', '2026-03-13'),
  ]

  it('leaves out a week whose money has not arrived yet', () => {
    expect(weeksAwaitingCheck(weeks, [], '2026-03-07').map((w) => w.weekStart))
      .toEqual(['2026-02-23'])
  })

  // The day it lands counts. Somebody looking at their bank on payday
  // morning is exactly who this is for.
  it('includes a week paid today', () => {
    expect(weeksAwaitingCheck(weeks, [], '2026-03-06')).toHaveLength(1)
  })

  it('leaves out a week already checked', () => {
    expect(weeksAwaitingCheck(weeks, [slip('a', '2026-02-23')], '2026-03-20'))
      .toEqual([weeks[1]])
  })

  it('leaves out a week that earned nothing', () => {
    const empty = [week('a', '2026-02-23', '2026-03-06', 0)]
    expect(weeksAwaitingCheck(empty, [], '2026-03-20')).toEqual([])
  })

  it('puts the most recently paid week first', () => {
    expect(weeksAwaitingCheck(weeks, [], '2026-03-20').map((w) => w.paydayDate))
      .toEqual(['2026-03-13', '2026-03-06'])
  })
})

describe('nextWeekToCheck', () => {
  it('asks about one week, never a backlog', () => {
    const weeks = [
      week('a', '2026-02-16', '2026-02-27'),
      week('a', '2026-02-23', '2026-03-06'),
      week('b', '2026-03-02', '2026-03-13'),
    ]
    expect(nextWeekToCheck(weeks, [], '2026-03-20')?.paydayDate).toBe('2026-03-13')
  })

  it('is null when there is nothing to ask', () => {
    expect(nextWeekToCheck([], [], '2026-03-20')).toBeNull()
    expect(
      nextWeekToCheck(
        [week('a', '2026-02-23', '2026-03-06')],
        [slip('a', '2026-02-23')],
        '2026-03-20',
      ),
    ).toBeNull()
  })
})
