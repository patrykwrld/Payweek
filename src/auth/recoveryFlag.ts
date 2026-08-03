import { createOneShot } from '../lib/oneShot'

/**
 * Remembers that a password reset was asked for on this device.
 *
 * On the web, opening a reset link makes supabase-js fire `PASSWORD_RECOVERY`
 * and everything is obvious. On Android the link comes back as a deep link
 * that is exchanged with `exchangeCodeForSession`, which fires an ordinary
 * `SIGNED_IN` — indistinguishable from any other sign-in. Left alone, the app
 * would simply open, the reset would be abandoned half-done, and the old
 * password would quietly still work.
 */
const reset = createOneShot(
  'payweek-reset-requested-at',
  // Long enough to walk to the laptop and find the email; not open-ended.
  60 * 60 * 1000,
)

export const markResetRequested = reset.mark
export const clearResetRequest = reset.clear
export const consumeResetRequest = reset.consume

/**
 * Remembers that an account was just created here, so the confirmation link
 * can be met with a celebration rather than a silent drop into the Add screen.
 *
 * Longer-lived than the reset note: people sign up, put the phone down, and
 * come back to the email later.
 */
const signup = createOneShot('payweek-signed-up-at', 24 * 60 * 60 * 1000)

export const markSignedUp = signup.mark
export const clearSignedUp = signup.clear
export const consumeSignedUp = signup.consume
