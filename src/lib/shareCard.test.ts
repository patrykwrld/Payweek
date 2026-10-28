import { describe, expect, it } from 'vitest'
import { weekCardFilename, weekCardMessage } from './shareCard'
import type { WeekPulse } from './weekPulse'

// Only the pure parts are covered here. The drawing itself needs a real
// canvas, which jsdom does not have — it is checked by rendering the card
// through the app in scripts and looking at the PNG that comes out.
const pulse = (over: Partial<WeekPulse> = {}): WeekPulse =>
  ({
    grossPence: 62_208,
    previousGrossPence: 46_753,
    paidMinutes: 2_565,
    shiftCount: 5,
    dayOfWeek: 6,
    weekEnd: '2026-03-08',
    daysToPayday: 5,
    perDay: [],
    ...over,
  }) as WeekPulse

describe('weekCardFilename', () => {
  it('names the file after the week it covers, so a gallery sorts them', () => {
    expect(weekCardFilename(pulse())).toBe('payweek-week-2026-03-08.png')
  })

  it('is a safe filename on every platform', () => {
    expect(weekCardFilename(pulse())).toMatch(/^[a-z0-9.-]+$/)
  })
})

describe('weekCardMessage', () => {
  it('carries the figure, the hours and where the app lives', () => {
    const m = weekCardMessage(pulse())
    expect(m).toContain('£622.08')
    expect(m).toContain('42h 45m')
    expect(m).toContain('payweek.app')
  })

  it('names no employer — the picture does not, and nor should the text', () => {
    expect(weekCardMessage(pulse())).not.toMatch(/agency|meridian|northgate/i)
  })
})
