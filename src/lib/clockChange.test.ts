import { describe, expect, it } from 'vitest'
import {
  clockChangeDuring,
  clockChangeMinutes,
  clockChangeNote,
  crossesClockChange,
  londonOffsetMinutes,
} from './clockChange'

const utc = (s: string) => Date.parse(s + 'Z')

describe('londonOffsetMinutes', () => {
  it('is GMT in winter and BST in summer', () => {
    expect(londonOffsetMinutes(utc('2026-01-15T12:00:00'))).toBe(0)
    expect(londonOffsetMinutes(utc('2026-07-15T12:00:00'))).toBe(60)
  })

  // The transitions themselves: 01:00 UTC on the last Sunday of each.
  it('switches at the right instant in March', () => {
    expect(londonOffsetMinutes(utc('2026-03-29T00:59:00'))).toBe(0)
    expect(londonOffsetMinutes(utc('2026-03-29T01:01:00'))).toBe(60)
  })

  it('switches at the right instant in October', () => {
    expect(londonOffsetMinutes(utc('2026-10-25T00:59:00'))).toBe(60)
    expect(londonOffsetMinutes(utc('2026-10-25T01:01:00'))).toBe(0)
  })

  it('still knows the dates in other years', () => {
    expect(londonOffsetMinutes(utc('2027-10-31T12:00:00'))).toBe(0)
    expect(londonOffsetMinutes(utc('2027-03-28T12:00:00'))).toBe(60)
  })
})

describe('clockChangeMinutes', () => {
  const nightShift = 8 * 60

  // The whole point. 22:00 start, eight hours on the clock.
  it('adds an hour across the October change', () => {
    expect(clockChangeMinutes('2026-10-24', 22 * 60, nightShift)).toBe(60)
  })

  it('takes an hour off across the March change', () => {
    expect(clockChangeMinutes('2026-03-28', 22 * 60, nightShift)).toBe(-60)
  })

  // The guarantee that makes this safe to put in the pricing path: on every
  // other night of the year it must do precisely nothing.
  it('does nothing on any ordinary night', () => {
    for (const date of [
      '2026-01-10', '2026-02-14', '2026-03-27', '2026-03-30',
      '2026-06-21', '2026-08-01', '2026-10-23', '2026-10-26',
      '2026-11-05', '2026-12-24',
    ]) {
      expect(clockChangeMinutes(date, 22 * 60, nightShift)).toBe(0)
    }
  })

  it('does nothing for a day shift on the changeover day itself', () => {
    // 09:00-17:00 on 25 Oct is after the 02:00 change, so eight hours is
    // eight hours.
    expect(clockChangeMinutes('2026-10-25', 9 * 60, 8 * 60)).toBe(0)
  })

  it('catches a shift that starts on the Sunday and runs into Monday', () => {
    // 22:00 Sun 25 Oct is already GMT — the change happened that morning.
    expect(clockChangeMinutes('2026-10-25', 22 * 60, nightShift)).toBe(0)
  })

  it('survives a malformed date rather than throwing', () => {
    expect(clockChangeMinutes('', 0, 480)).toBe(0)
    expect(clockChangeMinutes('not-a-date', 0, 480)).toBe(0)
  })

  // Midnight Sat to midnight Sun is 24 real hours: the change is at 02:00
  // on the Sunday, after this one has finished. Worth pinning, because it
  // is the obvious case to get wrong by assuming "the day before counts".
  it('leaves a 24-hour span alone when it stops short of the change', () => {
    expect(clockChangeMinutes('2026-10-24', 0, 1440)).toBe(0)
  })

  it('adjusts a 24-hour span that does cross it', () => {
    expect(clockChangeMinutes('2026-10-25', 0, 1440)).toBe(60)
  })
})

describe('crossesClockChange', () => {
  it('is true only on the two nights', () => {
    expect(crossesClockChange('2026-10-24', 22 * 60, 480)).toBe(true)
    expect(crossesClockChange('2026-03-28', 22 * 60, 480)).toBe(true)
    expect(crossesClockChange('2026-07-04', 22 * 60, 480)).toBe(false)
  })
})

describe('clockChangeDuring', () => {
  // The jump is when the LOCAL clock reads 02:00, not when UTC reads 01:00
  // — four hours into a 22:00 start, not three. Easy to get wrong, so it is
  // pinned: at minute 240 the wall clock goes 02:00 -> 01:00, which is what
  // puts the repeated hour back inside the night band.
  it('locates the October jump and its direction', () => {
    const c = clockChangeDuring('2026-10-24', 22 * 60, 540)
    expect(c).not.toBeNull()
    expect(c!.atMinute).toBe(240)
    expect(c!.shiftMinutes).toBe(-60)
  })

  it('locates the March jump the other way', () => {
    const c = clockChangeDuring('2026-03-28', 22 * 60, 420)
    expect(c!.shiftMinutes).toBe(60)
  })

  it('is null on an ordinary night', () => {
    expect(clockChangeDuring('2026-07-04', 22 * 60, 480)).toBeNull()
  })

  it('is null for a zero-length shift rather than dividing by nothing', () => {
    expect(clockChangeDuring('2026-10-24', 22 * 60, 0)).toBeNull()
  })
})

describe('clockChangeNote', () => {
  it('tells somebody the shift was longer, and why that matters', () => {
    const n = clockChangeNote('2026-10-24', 22 * 60, 480)!
    expect(n).toMatch(/went back/)
    expect(n).toMatch(/longer/)
    expect(n).toMatch(/paid/)
  })

  it('tells them when it was shorter', () => {
    expect(clockChangeNote('2026-03-28', 22 * 60, 480)).toMatch(/shorter/)
  })

  it('says nothing on an ordinary night', () => {
    expect(clockChangeNote('2026-07-04', 22 * 60, 480)).toBeNull()
  })
})
