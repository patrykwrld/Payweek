import { describe, expect, it } from 'vitest'
import { BASE_LABEL, bandColours, legendEntries } from './rateBands'

describe('bandColours', () => {
  it('always gives the base rate the accent', () => {
    expect(bandColours([BASE_LABEL]).get(BASE_LABEL)).toBe('bg-accent')
  })

  it('gives each extra rate its own colour', () => {
    const c = bandColours([BASE_LABEL, 'Night rate', 'Weekend rate'])
    expect(c.get('Night rate')).not.toBe(c.get('Weekend rate'))
    expect(c.get('Night rate')).not.toBe(c.get(BASE_LABEL))
  })

  // The whole point of sorting rather than taking first-seen order: a shift
  // must not change colour because you scrolled to a different week.
  it('assigns the same colour regardless of the order it sees them', () => {
    const a = bandColours(['Weekend rate', BASE_LABEL, 'Night rate'])
    const b = bandColours([BASE_LABEL, 'Night rate', 'Weekend rate'])
    expect(a.get('Night rate')).toBe(b.get('Night rate'))
    expect(a.get('Weekend rate')).toBe(b.get('Weekend rate'))
  })

  it('ignores repeats', () => {
    const c = bandColours(['Night rate', 'Night rate', 'Night rate'])
    expect([...c.keys()]).toEqual([BASE_LABEL, 'Night rate'])
  })

  it('shares one colour past the second extra rate', () => {
    const c = bandColours(['A rate', 'B rate', 'C rate', 'D rate'])
    expect(c.get('C rate')).toBe('bg-faint')
    expect(c.get('D rate')).toBe('bg-faint')
  })

  it('still names the base rate when no shift used one', () => {
    expect(bandColours(['Night rate']).get(BASE_LABEL)).toBe('bg-accent')
  })
})

describe('legendEntries', () => {
  it('reads as a sentence fragment, not a database column', () => {
    const entries = legendEntries(bandColours([BASE_LABEL, 'Night rate']))
    expect(entries.map((e) => e.label)).toEqual(['base rate', 'night rate'])
  })
})
