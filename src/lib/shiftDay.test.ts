import { describe, expect, it } from 'vitest'
import {
  crossesMidnight,
  looksLikeYesterday,
  previousDay,
  shiftSpanLabel,
} from './shiftDay'

// Sun 1 Nov 2026 and Mon 2 Nov 2026.
const SUNDAY = '2026-11-01'
const MONDAY = '2026-11-02'

describe('shiftSpanLabel', () => {
  it('names one day when the shift ends the same day', () => {
    expect(shiftSpanLabel(MONDAY, '09:00', '17:00')).toBe('Mon 2 Nov 09:00 → 17:00')
  })

  // The whole point: both dates, in words, so a shift filed a day late is
  // visible before it is saved rather than months later on a payslip.
  it('names both days when it runs past midnight', () => {
    expect(shiftSpanLabel(SUNDAY, '22:00', '06:00')).toBe(
      'Sun 1 Nov 22:00 → Mon 2 Nov 06:00',
    )
  })

  it('treats an identical start and end as a full day round the clock', () => {
    expect(shiftSpanLabel(SUNDAY, '22:00', '22:00')).toContain('Mon 2 Nov 22:00')
  })
})

describe('crossesMidnight', () => {
  it('is true when the end is at or before the start', () => {
    expect(crossesMidnight('22:00', '06:00')).toBe(true)
    expect(crossesMidnight('22:00', '22:00')).toBe(true)
  })

  it('is false for an ordinary day shift', () => {
    expect(crossesMidnight('09:00', '17:00')).toBe(false)
  })
})

describe('previousDay', () => {
  it('steps back one day across a month boundary', () => {
    expect(previousDay(MONDAY)).toBe(SUNDAY)
    expect(previousDay('2027-01-01')).toBe('2026-12-31')
  })
})

describe('looksLikeYesterday', () => {
  // The case that caused this: finished at 06:00 on Monday, opens the app at
  // 06:10, types 22:00 to 06:00. As typed, that shift has not happened yet.
  it('spots a night shift logged the morning after', () => {
    expect(looksLikeYesterday(MONDAY, '22:00', '06:00', MONDAY, '06:10')).toBe(true)
  })

  it('stays quiet once the date has already been corrected', () => {
    expect(looksLikeYesterday(SUNDAY, '22:00', '06:00', MONDAY, '06:10')).toBe(false)
  })

  it('stays quiet for a day shift', () => {
    expect(looksLikeYesterday(MONDAY, '09:00', '17:00', MONDAY, '06:10')).toBe(false)
  })

  // Logging tonight's shift in advance is legitimate, and nudging someone at
  // teatime would be wrong far more often than right.
  it('stays quiet in the evening, when a late start really is tonight', () => {
    expect(looksLikeYesterday(MONDAY, '22:00', '06:00', MONDAY, '18:00')).toBe(false)
  })

  it('stays quiet when the start time has already passed this morning', () => {
    // Started 02:00, now 06:10 — that did happen today.
    expect(looksLikeYesterday(MONDAY, '02:00', '10:00', MONDAY, '06:10')).toBe(false)
  })
})
