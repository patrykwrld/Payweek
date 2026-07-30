import { describe, expect, it } from 'vitest'
import type { Tables } from './database.types'
import { findOverlap } from './overlap'

function shift(
  id: string,
  date: string,
  start_time: string,
  end_time: string,
): Tables<'shifts'> {
  return {
    id,
    user_id: 'u',
    agency_id: 'a',
    date,
    start_time,
    end_time,
    break_minutes: 0,
    breaks: [],
    manual_rate_pence: null,
    notes: null,
    created_at: '',
  }
}

const logged = [
  shift('day', '2026-07-29', '09:00:00', '17:00:00'),
  shift('night', '2026-07-30', '22:00:00', '06:00:00'),
]

describe('findOverlap', () => {
  it('finds a shift logged twice', () => {
    const hit = findOverlap(
      { date: '2026-07-29', startTime: '09:00', endTime: '17:00' },
      logged,
    )
    expect(hit?.id).toBe('day')
  })

  it('finds a partial overlap', () => {
    const hit = findOverlap(
      { date: '2026-07-29', startTime: '16:00', endTime: '20:00' },
      logged,
    )
    expect(hit?.id).toBe('day')
  })

  it('allows a shift that starts exactly when another ends', () => {
    expect(
      findOverlap(
        { date: '2026-07-29', startTime: '17:00', endTime: '21:00' },
        logged,
      ),
    ).toBeNull()
  })

  it('sees into the next day for a midnight-crossing shift', () => {
    // The 30th's night shift runs to 06:00 on the 31st.
    const hit = findOverlap(
      { date: '2026-07-31', startTime: '05:00', endTime: '13:00' },
      logged,
    )
    expect(hit?.id).toBe('night')
  })

  it('clears a shift that starts after a midnight-crossing one ends', () => {
    expect(
      findOverlap(
        { date: '2026-07-31', startTime: '06:00', endTime: '14:00' },
        logged,
      ),
    ).toBeNull()
  })

  it('ignores the shift being edited', () => {
    expect(
      findOverlap(
        { date: '2026-07-29', startTime: '09:00', endTime: '17:00' },
        logged,
        'day',
      ),
    ).toBeNull()
  })

  it('ignores a different day entirely', () => {
    expect(
      findOverlap(
        { date: '2026-08-05', startTime: '09:00', endTime: '17:00' },
        logged,
      ),
    ).toBeNull()
  })

  it('treats equal start and end as a full 24 hours, as the engine does', () => {
    const hit = findOverlap(
      { date: '2026-07-29', startTime: '09:00', endTime: '09:00' },
      logged,
    )
    expect(hit?.id).toBe('day')
  })
})
