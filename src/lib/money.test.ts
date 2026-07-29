import { describe, expect, it } from 'vitest'
import {
  formatMinutes,
  formatPence,
  parsePoundsToPence,
  penceToPoundsInput,
} from './money'
import { payWeekStart, payWeekEnd } from './weeks'

describe('formatPence', () => {
  it('formats pounds and pence', () => {
    expect(formatPence(51230)).toBe('£512.30')
    expect(formatPence(5)).toBe('£0.05')
    expect(formatPence(-3840)).toBe('-£38.40')
    expect(formatPence(0)).toBe('£0.00')
  })
})

describe('formatMinutes', () => {
  it('renders decimal halves and h/m otherwise', () => {
    expect(formatMinutes(480)).toBe('8h')
    expect(formatMinutes(510)).toBe('8.5h')
    expect(formatMinutes(505)).toBe('8h 25m')
    expect(formatMinutes(2550)).toBe('42.5h')
    expect(formatMinutes(25)).toBe('25m')
  })
})

describe('parsePoundsToPence', () => {
  it('parses without float arithmetic', () => {
    expect(parsePoundsToPence('12')).toBe(1200)
    expect(parsePoundsToPence('12.5')).toBe(1250)
    expect(parsePoundsToPence('£12.50')).toBe(1250)
    expect(parsePoundsToPence('0.07')).toBe(7)
    expect(parsePoundsToPence('19.99')).toBe(1999)
  })
  it('rejects junk', () => {
    expect(parsePoundsToPence('')).toBeNull()
    expect(parsePoundsToPence('12.345')).toBeNull()
    expect(parsePoundsToPence('-5')).toBeNull()
    expect(parsePoundsToPence('abc')).toBeNull()
  })
})

describe('penceToPoundsInput', () => {
  it('round-trips with parsePoundsToPence', () => {
    for (const pence of [0, 5, 1200, 1250, 1999, 123456]) {
      expect(parsePoundsToPence(penceToPoundsInput(pence))).toBe(pence)
    }
  })
})

describe('payWeekStart', () => {
  it('finds the containing week for any start day', () => {
    // 2026-07-29 is a Wednesday
    expect(payWeekStart('2026-07-29', 1)).toBe('2026-07-27') // Mon start
    expect(payWeekStart('2026-07-29', 0)).toBe('2026-07-26') // Sun start
    expect(payWeekStart('2026-07-29', 3)).toBe('2026-07-29') // Wed start: same day
    expect(payWeekStart('2026-07-29', 4)).toBe('2026-07-23') // Thu start: previous week
  })
  it('pairs with payWeekEnd', () => {
    expect(payWeekEnd('2026-07-27')).toBe('2026-08-02')
  })
})
