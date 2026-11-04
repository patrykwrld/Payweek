import { describe, expect, it } from 'vitest'
import {
  USERNAME_PATTERN,
  looksLikeEmail,
  normaliseUsername,
  suggestUsername,
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

  // The bug this rule was changed for. Agency work in the UK is done in
  // large part by Polish, Romanian and Lithuanian speakers, and the old
  // ASCII-only rule refused their names while telling them "letters only".
  it('accepts a name in the alphabet the person actually has', () => {
    for (const name of ['Paweł', 'Łukasz', 'Mihăiță', 'Šarūnas', 'Żaneta', 'Müller']) {
      expect(usernameProblem(name), name).toBeNull()
    }
  })

  it('accepts other scripts entirely', () => {
    expect(usernameProblem('Александр')).toBeNull()
    expect(usernameProblem('李小明')).toBeNull()
  })

  it('accepts the separators people put in a name', () => {
    expect(usernameProblem('anne-marie')).toBeNull()
    expect(usernameProblem('j.smith')).toBeNull()
  })

  it('asks for one that is long enough', () => {
    expect(usernameProblem('ab')).toMatch(/at least 3/)
  })

  it('refuses one that is too long', () => {
    expect(usernameProblem('a'.repeat(21))).toMatch(/at most 20/)
  })

  it('names the space, and offers one that would work', () => {
    const problem = usernameProblem('sam jones')
    expect(problem).toMatch(/spaces/)
    expect(problem).toMatch(/sam_jones/)
  })

  it('spots an email in the username box and says so', () => {
    expect(usernameProblem('me@mail.com')).toMatch(/email/i)
  })

  it('names the offending character rather than reciting the rule', () => {
    // Mid-string, because a symbol on the end hits the "must end with a
    // letter" rule first — which is the more useful message for that case.
    const problem = usernameProblem('sa!m')
    expect(problem).toMatch(/!/)
    // And tells the people who were wrongly refused that they are fine.
    expect(problem).toMatch(/accents/i)
  })

  it('refuses a separator on either end', () => {
    expect(usernameProblem('_sam')).toMatch(/start/)
    expect(usernameProblem('sam_')).toMatch(/end/)
    expect(usernameProblem('-sam')).toMatch(/start/)
    expect(usernameProblem('sam.')).toMatch(/end/)
  })

  // Not cosmetic: a zero-width joiner or a right-to-left override inside a
  // handle makes it display as something other than what it is.
  it('refuses invisible and direction-flipping characters', () => {
    expect(usernameProblem('zero\u200Bwidth')).not.toBeNull()
    expect(usernameProblem('rtl\u202Eflip')).not.toBeNull()
  })

  it('treats an empty box as its own case', () => {
    expect(usernameProblem('   ')).toBe('Pick a username.')
  })

  it('ignores the spaces around what was typed', () => {
    expect(usernameProblem('  sam_1  ')).toBeNull()
    expect(normaliseUsername('  sam_1  ')).toBe('sam_1')
  })

  // Two ways of typing the same accented name have to be one username, or
  // the unique index lets both exist and sign-in misses the stored one.
  it('settles accents to one form', () => {
    // é, which really does have two encodings — unlike ł, whose stroke is
    // part of the character rather than a combining mark.
    const composed = 'Jos\u00e9'
    const decomposed = 'Jose\u0301'
    // Four code units against five: the same name, stored two ways.
    expect(composed.length).toBe(4)
    expect(decomposed.length).toBe(5)
    expect(normaliseUsername(decomposed)).toBe(normaliseUsername(composed))
    expect(usernameProblem(decomposed)).toBeNull()
  })

  // The database constraint and the Edge Function enforce this same shape.
  // If they drift, someone passes the form and is refused by the server.
  it('agrees with the pattern the database enforces', () => {
    for (const ok of ['sam_1', 'ABC', 'a'.repeat(20), '000', 'Paweł', 'j.smith']) {
      expect(USERNAME_PATTERN.test(ok), ok).toBe(true)
      expect(usernameProblem(ok), ok).toBeNull()
    }
    for (const bad of ['ab', 'a'.repeat(21), 'sam jones', 'sam@x', '_sam', 'sam.']) {
      expect(USERNAME_PATTERN.test(bad), bad).toBe(false)
      expect(usernameProblem(bad), bad).not.toBeNull()
    }
  })
})

describe('suggestUsername', () => {
  it('turns what they typed into something that works', () => {
    expect(suggestUsername('sam jones')).toBe('sam_jones')
    expect(suggestUsername('O’Brien')).toBe('OBrien')
    expect(suggestUsername('  Paweł  ')).toBe('Paweł')
  })

  it('never suggests something the rule would then refuse', () => {
    for (const raw of ['sam jones', 'a b', '!!x!!', 'O’Brien', 'Paweł', '李 小 明']) {
      expect(usernameProblem(suggestUsername(raw)), raw).toBeNull()
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
