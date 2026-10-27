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
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/

/**
 * Supabase's own floor is 6, and this now sits on it rather than above it.
 *
 * Eight was a guess at "worth typing" that cost real sign-ups: agency workers
 * setting this up on a phone at the end of a shift, told their password was
 * too short, then told it had been in a leak. Length is the only rule that
 * buys anything, and two characters of it do not outweigh somebody giving up
 * on the app. The breach check beside this one is advice, not a gate, for the
 * same reason.
 */
export const PASSWORD_MIN = 6

/** Trims and folds case. Storage keeps what was typed; comparison uses this. */
export function normaliseUsername(raw: string): string {
  return raw.trim()
}

/**
 * Why a username won't do, in words a person can act on, or null if it will.
 * One message at a time — a list of six rules is a wall, not help.
 */
export function usernameProblem(raw: string): string | null {
  const value = normaliseUsername(raw)
  if (value === '') return 'Pick a username.'
  if (value.length < USERNAME_MIN) {
    return `Usernames are at least ${USERNAME_MIN} characters.`
  }
  if (value.length > USERNAME_MAX) {
    return `Usernames are at most ${USERNAME_MAX} characters.`
  }
  if (!USERNAME_PATTERN.test(value)) {
    return 'Letters, numbers and underscores only — no spaces or symbols.'
  }
  return null
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
  'password',
  'password1',
  'password12',
  'password123',
  'qwertyuiop',
  '1q2w3e4r',
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
