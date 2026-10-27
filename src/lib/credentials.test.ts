import { describe, expect, it } from 'vitest'
import {
  USERNAME_PATTERN,
  looksLikeEmail,
  normaliseUsername,
  passwordProblem,
  usernameProblem,
} from './credentials'

describe('usernameProblem', () => {
  it('accepts an ordinary handle', () => {
    expect(usernameProblem('sam_1')).toBeNull()
    expect(usernameProblem('SamJones')).toBeNull()
    expect(usernameProblem('abc')).toBeNull()
    expect(usernameProblem('a'.repeat(20))).toBeNull()
  })

  it('asks for one that is long enough', () => {
    expect(usernameProblem('ab')).toMatch(/at least 3/)
  })

  it('refuses one that is too long', () => {
    expect(usernameProblem('a'.repeat(21))).toMatch(/at most 20/)
  })

  it('refuses spaces and symbols', () => {
    expect(usernameProblem('sam jones')).toMatch(/no spaces/)
    expect(usernameProblem('sam@work')).toMatch(/no spaces/)
    expect(usernameProblem('sam-jones')).toMatch(/no spaces/)
  })

  it('treats an empty box as its own case', () => {
    expect(usernameProblem('   ')).toBe('Pick a username.')
  })

  it('ignores the spaces around what was typed', () => {
    expect(usernameProblem('  sam_1  ')).toBeNull()
    expect(normaliseUsername('  sam_1  ')).toBe('sam_1')
  })

  // The database constraint and the Edge Function use this same shape. If
  // they drift, someone passes the form and is refused by the server.
  it('agrees with the pattern the database enforces', () => {
    for (const ok of ['sam_1', 'ABC', 'a'.repeat(20), '000']) {
      expect(USERNAME_PATTERN.test(ok)).toBe(true)
      expect(usernameProblem(ok)).toBeNull()
    }
    for (const bad of ['ab', 'a'.repeat(21), 'sam jones', 'sam@x', 'sam-1']) {
      expect(USERNAME_PATTERN.test(bad)).toBe(false)
      expect(usernameProblem(bad)).not.toBeNull()
    }
  })
})

describe('passwordProblem', () => {
  it('accepts anything long enough', () => {
    expect(passwordProblem('correct horse')).toBeNull()
    expect(passwordProblem('8charact')).toBeNull()
    expect(passwordProblem('hunter')).toBeNull()
  })

  it('refuses a short one', () => {
    expect(passwordProblem('short')).toMatch(/at least 6/)
    expect(passwordProblem('')).toMatch(/at least 6/)
  })

  it('refuses the handful that get tried first', () => {
    expect(passwordProblem('password')).toMatch(/guessed first/)
    expect(passwordProblem('123456')).toMatch(/guessed first/)
    expect(passwordProblem('qwerty')).toMatch(/guessed first/)
    expect(passwordProblem('liverpool')).toMatch(/guessed first/)
  })

  it('folds case, because Qwerty is not a different password', () => {
    expect(passwordProblem('Password1')).toMatch(/guessed first/)
    expect(passwordProblem('QWERTY')).toMatch(/guessed first/)
  })

  // The point of the change: the list is strings an attacker types first,
  // not a strength policy. Anything off it is the person's own business.
  it('allows a password that merely resembles one on the list', () => {
    expect(passwordProblem('my dogs password')).toBeNull()
    expect(passwordProblem('qwerty is rubbish')).toBeNull()
    expect(passwordProblem('liverpool4ever')).toBeNull()
    expect(passwordProblem('Dave1987')).toBeNull()
  })
})

describe('looksLikeEmail', () => {
  it('tells the two kinds of sign-in apart', () => {
    expect(looksLikeEmail('sam@example.com')).toBe(true)
    expect(looksLikeEmail('sam_1')).toBe(false)
  })
})
