import { describe, expect, it } from 'vitest'
import {
  clampPoundsInput,
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

describe('clampPoundsInput', () => {
  it('leaves a normal amount alone', () => {
    expect(clampPoundsInput('696.91')).toBe('696.91')
    expect(clampPoundsInput('13')).toBe('13')
    expect(clampPoundsInput('13.5')).toBe('13.5')
  })

  // The one that made the answer vanish: a third decimal is unparseable, so
  // the verdict card simply stopped rendering.
  it('stops at two decimal places', () => {
    expect(clampPoundsInput('696.919')).toBe('696.91')
    expect(clampPoundsInput('696.9199999')).toBe('696.91')
  })

  it('allows only one point', () => {
    expect(clampPoundsInput('696.91.5')).toBe('696.91')
    expect(clampPoundsInput('1.2.3')).toBe('1.23')
  })

  it('drops anything that is not a digit or a point', () => {
    expect(clampPoundsInput('£696.91')).toBe('696.91')
    expect(clampPoundsInput('696,91')).toBe('69691')
    expect(clampPoundsInput('-12')).toBe('12')
    expect(clampPoundsInput('12abc')).toBe('12')
  })

  it('keeps a half-typed amount usable', () => {
    expect(clampPoundsInput('')).toBe('')
    expect(clampPoundsInput('696.')).toBe('696.')
    expect(clampPoundsInput('.5')).toBe('.5')
  })

  it('refuses a seventh figure', () => {
    expect(clampPoundsInput('12345678.99')).toBe('123456.99')
  })

  // Everything it lets through has to survive the parser, or the clamp has
  // just moved the problem.
  it('never produces something the parser rejects', () => {
    for (const raw of ['696.919', '£1,234.567', '13..5', '0.001', '9'.repeat(12)]) {
      const clamped = clampPoundsInput(raw)
      if (clamped === '' || clamped.endsWith('.') || clamped.startsWith('.')) continue
      expect(parsePoundsToPence(clamped)).not.toBeNull()
    }
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
