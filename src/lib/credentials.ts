/**
 * The rules for usernames and passwords, in one place, so the sign-up form,
 * the sign-in form and the Settings screen cannot disagree about them.
 *
 * They match the database constraint (`profiles_username_format`) and the
 * check inside the username-signin Edge Function. If one of the three moves,
 * all three have to.
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20

/**
 * What a username may contain.
 *
 * It used to be `[A-Za-z0-9_]`, which was wrong for the people this app is
 * for. Agency work in the UK is done in large part by Polish, Romanian,
 * Lithuanian and Bulgarian speakers, and the old rule rejected Paweł,
 * Mihăiță and Šarūnas while telling them "letters, numbers and underscores
 * only" — refusing a letter and calling it not a letter. Sign-ups stopped
 * and nobody said why, because the message read like the app's final word
 * rather than a bug.
 *
 * So: letters from any alphabet, combining marks so accents survive, digits,
 * and `_ . -` in the middle. It has to start and end with a letter or digit,
 * which keeps out the invisible nasties that matter here — zero-width joiners
 * and right-to-left overrides are neither, so a handle cannot be made to
 * display as something it is not.
 *
 * The database constraint and the Edge Function enforce the same shape with
 * POSIX classes; `scripts`/the migration note which. If one moves, all three
 * have to.
 */
export const USERNAME_PATTERN =
  /^[\p{L}\p{N}][\p{L}\p{M}\p{N}_.-]{1,18}[\p{L}\p{N}]$/u

/** Characters allowed anywhere except the two ends. */
const INNER = /[\p{L}\p{M}\p{N}_.-]/u

/** Supabase's own floor is 6. */
export const PASSWORD_MIN = 6

/**
 * Trim, and settle the accents.
 *
 * NFC matters more than it looks: "ł" and "s" + a combining caron can each be
 * typed two ways, and without normalising, two usernames that are identical
 * on screen are different strings — so the unique index lets both exist and
 * the sign-in lookup misses the one that was stored. Normalising on the way
 * in and on the way to the lookup is what keeps those the same handle.
 */
export function normaliseUsername(raw: string): string {
  return raw.normalize('NFC').trim()
}

/**
 * Why a username won't do, in words somebody can act on, or null if it will.
 *
 * One message at a time, and the message names the thing that is actually
 * wrong rather than reciting the rule — "no spaces" when they typed a space,
 * the offending character when it is a symbol. A rule recited back at someone
 * who has already broken it is not help.
 */
export function usernameProblem(raw: string): string | null {
  const value = normaliseUsername(raw)
  if (value === '') return 'Pick a username.'

  if (value.includes('@')) {
    return 'That looks like an email address. Pick a short name instead — your email goes in its own box.'
  }
  if (/\s/u.test(value)) {
    return `Usernames can’t have spaces. Try ${suggestUsername(value)}.`
  }
  if (value.length < USERNAME_MIN) {
    return `Usernames are at least ${USERNAME_MIN} characters.`
  }
  if (value.length > USERNAME_MAX) {
    return `Usernames are at most ${USERNAME_MAX} characters.`
  }
  if (!/^[\p{L}\p{N}]/u.test(value)) {
    return 'Usernames have to start with a letter or a number.'
  }
  if (!/[\p{L}\p{N}]$/u.test(value)) {
    return 'Usernames have to end with a letter or a number.'
  }

  // Name the first character that is not allowed. Accents and non-Latin
  // alphabets are fine, and the message says so, because the people most
  // likely to reach this line are the ones who were wrongly told otherwise.
  const bad = [...value].find((ch) => !INNER.test(ch))
  if (bad) {
    return `Usernames can’t contain “${bad}”. Letters, numbers and _ . - are fine — accents and other alphabets too.`
  }

  if (!USERNAME_PATTERN.test(value)) {
    return 'Letters, numbers and _ . - only.'
  }
  return null
}

/**
 * A username they could actually have, built from what they typed. Offered in
 * the message rather than made to invent a new one on the spot, which is the
 * moment people give up.
 */
export function suggestUsername(raw: string): string {
  const base = normaliseUsername(raw)
    .replace(/\s+/gu, '_')
    .replace(new RegExp(`[^\\p{L}\\p{M}\\p{N}_.-]`, 'gu'), '')
    .replace(/^[_.-]+/u, '')
    .replace(/[_.-]+$/u, '')
    .slice(0, USERNAME_MAX)
  return base.length >= USERNAME_MIN ? base : `${base}${'1'.repeat(USERNAME_MIN - base.length)}`
}

/**
 * The handful of passwords an attacker types before anything else. Not a
 * strength list — a list of strings that are tried first, by name, in every
 * credential-stuffing run there has ever been. Anything outside it is the
 * person's own business.
 */
const GUESSED_FIRST = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  'abc123',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  '1q2w3e4r',
  'password',
  'password1',
  'password12',
  'password123',
  'passw0rd',
  'iloveyou',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'football',
  'liverpool',
  'arsenal',
  'chelsea',
])

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Passwords are at least ${PASSWORD_MIN} characters.`
  }
  // Everything else is allowed. Demanding a symbol mostly produces
  // "Password1!" written on the back of a payslip, and refusing a password
  // somebody can actually remember pushes them towards one they cannot.
  // The only strings worth refusing outright are the ones that get tried
  // first, and the comparison folds case because "Qwerty" is not a different
  // password from "qwerty" to anybody attacking the account.
  if (GUESSED_FIRST.has(password.toLowerCase())) {
    return 'That one is guessed first. Use something else.'
  }
  return null
}

/**
 * Which of the two boxes someone has typed in. The sign-in field takes either,
 * because telling people "that's your email, not your username" when they have
 * typed something perfectly identifying is pure obstruction.
 */
export function looksLikeEmail(value: string): boolean {
  return value.includes('@')
}
