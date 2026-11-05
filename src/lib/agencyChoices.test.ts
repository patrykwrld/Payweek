import { describe, expect, it } from 'vitest'
import { isFirstRun, loggableAgencies } from './agencyChoices'

const a = (id: string, archived = false) => ({ id, archived })

describe('loggableAgencies', () => {
  it('offers the active ones and leaves the archived out of the way', () => {
    expect(loggableAgencies([a('x'), a('y', true)]).map((v) => v.id)).toEqual(['x'])
  })

  // The dead end this exists for: archive your only agency and the shift
  // form's picker came up empty, so there was nothing to select and no way
  // to log the shift you were standing there trying to log.
  it('offers the archived ones when nothing else is left', () => {
    expect(loggableAgencies([a('x', true), a('y', true)]).map((v) => v.id)).toEqual([
      'x',
      'y',
    ])
  })

  it('has nothing to offer on an empty account', () => {
    expect(loggableAgencies([])).toEqual([])
  })

  it('never hands back the caller’s array to mutate', () => {
    const input = [a('x', true)]
    expect(loggableAgencies(input)).not.toBe(input)
  })
})

describe('isFirstRun', () => {
  it('is true only for an account with no agencies at all', () => {
    expect(isFirstRun([])).toBe(true)
  })

  // Showing the setup screen here told somebody with months of shifts that
  // they had none.
  it('is false when every agency is merely archived', () => {
    expect(isFirstRun([a('x', true)])).toBe(false)
  })
})
