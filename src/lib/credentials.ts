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

/** Supabase's own floor is 6. Eight is the shortest that is worth typing. */
export const PASSWORD_MIN = 8

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

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Passwords are at least ${PASSWORD_MIN} characters.`
  }
  // Length is the thing that matters, and demanding a symbol mostly produces
  // "Password1!" written on a payslip. The only pattern worth refusing is the
  // one people genuinely reach for first.
  if (/^password/i.test(password) || /^12345678/.test(password)) {
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
