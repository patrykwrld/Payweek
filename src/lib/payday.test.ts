import { describe, expect, it } from 'vitest'
import type { Tables } from './database.types'
import { buildShiftsCsv, csvField, toCsv } from './csv'
import {
  buildAgencyWeeks,
  comparePayslip,
  holidayAccrualPence,
  paydayDateFor,
} from './payday'

const agencyA: Tables<'agencies'> = {
  id: 'a1',
  user_id: 'u1',
  name: 'Meridian Staffing',
  base_rate_pence: 1200,
  pay_cycle: 'weekly',
  pay_week_start_day: 1, // Monday
  pay_delay_days: 4,
  notes: null,
  archived: false,
  created_at: '',
}

const agencyB: Tables<'agencies'> = {
  ...agencyA,
  id: 'a2',
  name: 'Bolt Logistics',
  base_rate_pence: 1000,
}

const nightRule: Tables<'rate_rules'> = {
  id: 'r1',
  agency_id: 'a1',
  kind: 'time_band',
  label: 'Night rate',
  days_of_week: null,
  band_start: '22:00:00',
  band_end: '06:00:00',
  threshold_minutes: null,
  threshold_scope: null,
  rate_pence: 1450,
  multiplier: null,
  priority: 5,
  active: true,
  created_at: '',
}

const shift = (
  id: string,
  agency_id: string,
  date: string,
  start: string,
  end: string,
  breakMin = 0,
): Tables<'shifts'> => ({
  id,
  user_id: 'u1',
  agency_id,
  date,
  start_time: start,
  end_time: end,
  break_minutes: breakMin,
  manual_rate_pence: null,
  notes: null,
  created_at: '',
})

describe('holidayAccrualPence', () => {
  it('computes 12.07% in basis points, no float money', () => {
    expect(holidayAccrualPence(51230, 12.07)).toBe(6183) // £512.30 -> £61.83
    expect(holidayAccrualPence(9938, 12.07)).toBe(1200)
    expect(holidayAccrualPence(0, 12.07)).toBe(0)
    expect(holidayAccrualPence(10000, 0)).toBe(0)
  })
})

describe('comparePayslip', () => {
  it('flags short, over, and match', () => {
    expect(comparePayslip(51230, 51230)).toEqual({ status: 'match', diffPence: 0 })
    expect(comparePayslip(9938, 6098)).toEqual({ status: 'short', diffPence: 3840 })
    expect(comparePayslip(9938, 10038)).toEqual({ status: 'over', diffPence: 100 })
  })
})

describe('paydayDateFor', () => {
  it('adds the delay to the week end', () => {
    // Week starting Mon 27 Jul ends Sun 2 Aug; +4 days = Thu 6 Aug
    expect(paydayDateFor('2026-07-27', 4)).toBe('2026-08-06')
    expect(paydayDateFor('2026-07-27', 0)).toBe('2026-08-02')
  })
})

describe('buildAgencyWeeks — totals match the hand-built spreadsheet', () => {
  // Hand-built expectations:
  //   Meridian (base £12, night £14.50):
  //     Mon 27th 09:00-17:00           -> 480min @1200            =  9600
  //     Tue 28th 18:00-02:00, 60 break -> 210@1200 + 210@1450     =  9275
  //     week total: 480 + 420 = 900min paid, £188.75
  //   Bolt (base £10):
  //     Mon 27th 10:00-14:00           -> 240min @1000            =  4000
  const shifts = [
    shift('s1', 'a1', '2026-07-27', '09:00', '17:00'),
    shift('s2', 'a1', '2026-07-28', '18:00', '02:00', 60),
    shift('s3', 'a2', '2026-07-27', '10:00', '14:00'),
  ]

  it('groups per agency pay week with exact totals', () => {
    const weeks = buildAgencyWeeks(shifts, [agencyA, agencyB], [nightRule])
    expect(weeks).toHaveLength(2)

    const bolt = weeks[0]!
    expect(bolt.agency.name).toBe('Bolt Logistics')
    expect(bolt.grossPence).toBe(4000)
    expect(bolt.paidMinutes).toBe(240)

    const meridian = weeks[1]!
    expect(meridian.agency.name).toBe('Meridian Staffing')
    expect(meridian.weekStart).toBe('2026-07-27')
    expect(meridian.weekEnd).toBe('2026-08-02')
    expect(meridian.paydayDate).toBe('2026-08-06')
    expect(meridian.paidMinutes).toBe(900)
    expect(meridian.grossPence).toBe(18875)
    expect(meridian.entries.map((e) => e.shift.id)).toEqual(['s1', 's2'])
  })
})

describe('csv', () => {
  it('escapes fields containing commas, quotes and newlines', () => {
    expect(csvField('plain')).toBe('plain')
    expect(csvField('Acme, Ltd')).toBe('"Acme, Ltd"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(toCsv([['a', 'b'], ['c,d', 1]])).toBe('a,b\r\n"c,d",1\r\n')
  })

  it('builds a shifts export with priced grosses', () => {
    const csv = buildShiftsCsv(
      [shift('s1', 'a1', '2026-07-27', '09:00', '17:00')],
      [{ ...agencyA, name: 'Acme, Ltd' }],
      [],
    )
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('expected_gross_pence')
    expect(lines[1]).toBe('2026-07-27,"Acme, Ltd",09:00,17:00,0,480,9600,£96.00,,')
  })
})
