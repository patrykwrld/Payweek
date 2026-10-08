import { describe, expect, it } from 'vitest'
import { WORD_COUNT, entropyBits, suggestPassphrase } from './passphrase'
import { PASSWORD_MIN, passwordProblem } from './credentials'

describe('suggestPassphrase', () => {
  // The one thing that must never happen: offering somebody a password the
  // very next validation step rejects.
  it('always satisfies the password rules', () => {
    for (let i = 0; i < 300; i++) {
      expect(passwordProblem(suggestPassphrase())).toBeNull()
    }
  })

  it('is comfortably longer than the minimum', () => {
    for (let i = 0; i < 50; i++) {
      expect(suggestPassphrase().length).toBeGreaterThan(PASSWORD_MIN + 8)
    }
  })

  it('uses the stated number of words, hyphenated', () => {
    expect(suggestPassphrase().split('-')).toHaveLength(WORD_COUNT)
  })

  it('is typeable: lowercase letters and hyphens only', () => {
    for (let i = 0; i < 100; i++) {
      expect(suggestPassphrase()).toMatch(/^[a-z]+(-[a-z]+)+$/)
    }
  })

  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 200 }, suggestPassphrase))
    expect(seen.size).toBe(200)
  })

  // A suggestion made of four words drawn from the same end of the list
  // would pass every test above and still be weak, so check the spread.
  it('draws from across the whole list', () => {
    const firsts = new Set(
      Array.from({ length: 400 }, () => suggestPassphrase().split('-')[0]),
    )
    expect(firsts.size).toBeGreaterThan(150)
  })
})

describe('entropyBits', () => {
  it('is strong enough to be worth offering', () => {
    // 50 bits is far past anything an online attacker reaches through
    // Supabase's rate limiting, and past offline reach for a single account.
    expect(entropyBits()).toBeGreaterThanOrEqual(30)
  })

  it('is computed from the list, not written down', () => {
    expect(entropyBits()).toBe(Math.floor(WORD_COUNT * Math.log2(368)))
  })
})
