import { supabase } from '../lib/supabase'
import { looksLikeEmail, normaliseUsername } from '../lib/credentials'
import { checkPwned, pwnedMessage } from '../lib/pwnedPassword'
import { authRedirectUrl } from './redirects'
import {
  clearResetRequest,
  clearSignedUp,
  markResetRequested,
  markSignedUp,
} from './recoveryFlag'

/**
 * Everything to do with usernames and passwords, kept away from the screens
 * so the forms only have to describe themselves.
 *
 * All of it returns a plain message rather than throwing. Sign-in is the one
 * place where an unhandled error means somebody simply cannot get to their own
 * data, so nothing here is allowed to escape.
 */

export type AuthOutcome =
  /** `needsConfirmation` means the address has to be confirmed before signing in. */
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; message: string }

function readable(message: string): string {
  if (/failed to fetch|failed to send a request|network|offline/i.test(message)) {
    return 'No connection. Signing in needs signal — try again when you have some.'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'That email and password don’t match an account.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirm your email address first — check your inbox.'
  }
  if (/already registered|already been registered/i.test(message)) {
    return 'There’s already an account with that email. Sign in instead, or reset the password.'
  }
  if (/rate limit|too many|429/i.test(message)) {
    return 'Too many attempts. Wait a couple of minutes and try again.'
  }
  if (/weak.?password|password should be/i.test(message)) {
    return 'That password is too weak. Make it longer.'
  }
  return message
}

/**
 * Whether a username can be claimed. The database function behind this
 * returns a boolean and nothing else, so it cannot be used to turn a list of
 * usernames into a list of email addresses.
 *
 * A failure here answers "yes". Being unable to reach the network must not
 * stop somebody signing up — the unique index is what actually decides, and
 * it will refuse a duplicate whatever this said.
 */
export async function isUsernameFree(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', {
    p_username: normaliseUsername(username),
  })
  if (error) return true
  return data !== false
}

/**
 * Supabase's own leaked-password check is a paid feature, so Payweek does it
 * against the same source instead. Fails open — see pwnedPassword.ts.
 */
async function breachedMessage(password: string): Promise<string | null> {
  return pwnedMessage(await checkPwned(password))
}

export async function signUpWithPassword(input: {
  username: string
  email: string
  password: string
}): Promise<AuthOutcome> {
  const username = normaliseUsername(input.username)

  if (!(await isUsernameFree(username))) {
    return { ok: false, message: 'That username is taken. Try another.' }
  }

  const breached = await breachedMessage(input.password)
  if (breached) return { ok: false, message: breached }

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      // The trigger on auth.users reads this to fill in profiles.username.
      // It is the only channel available before the profile row exists.
      data: { username },
      emailRedirectTo: authRedirectUrl(),
    },
  })
  if (error) return { ok: false, message: readable(error.message) }

  // Left before the link is opened, because the link comes back as an
  // ordinary SIGNED_IN and there is nothing else to recognise it by. It is
  // what turns landing in the app into a welcome rather than a silent drop
  // onto the Add screen.
  markSignedUp()

  // No session means the project requires the address to be confirmed — which
  // is the intended setup: the emailed link is what finishes signing up.
  if (!data.session) return { ok: true, needsConfirmation: true }

  // Confirmation is switched off, so they are already in. Nothing to wait for.
  return { ok: true }
}

/**
 * Sends the confirmation email again, for a link that never arrived or was
 * deleted. Same address, same account — this creates nothing.
 */
export async function resendConfirmation(email: string): Promise<AuthOutcome> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl() },
  })
  if (error) return { ok: false, message: readable(error.message) }
  markSignedUp()
  return { ok: true }
}

/**
 * Sign in with either a username or an email address, whichever they typed.
 *
 * An email goes straight to Supabase. A username has to go through the
 * username-signin Edge Function, because resolving a username to an address
 * needs the service role — doing it in the client would publish everybody's
 * email.
 */
export async function signInWithPassword(
  identifier: string,
  password: string,
): Promise<AuthOutcome> {
  const id = identifier.trim()
  // Somebody signing in with a password they remember is not mid-reset and is
  // not arriving from a confirmation link, even if they asked for one earlier
  // and then thought better of it.
  clearResetRequest()
  clearSignedUp()

  if (looksLikeEmail(id)) {
    const { error } = await supabase.auth.signInWithPassword({
      email: id,
      password,
    })
    return error ? { ok: false, message: readable(error.message) } : { ok: true }
  }

  const { data, error } = await supabase.functions.invoke<{
    access_token?: string
    refresh_token?: string
    error?: string
  }>('username-signin', {
    method: 'POST',
    body: { username: id, password },
  })

  if (error) {
    // A non-2xx arrives here as FunctionsHttpError with the body unread, so
    // the message the function chose has to be dug out.
    const body = await readErrorBody(error)
    return { ok: false, message: readable(body ?? error.message) }
  }
  if (!data?.access_token || !data.refresh_token) {
    return { ok: false, message: data?.error ?? 'That didn’t work. Try again.' }
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })
  return sessionError
    ? { ok: false, message: readable(sessionError.message) }
    : { ok: true }
}

/** supabase-js hands back the Response on an HTTP error; the message is in it. */
async function readErrorBody(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown }).context
  if (!(context instanceof Response)) return null
  try {
    const body = (await context.json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : null
  } catch {
    return null
  }
}

export async function sendPasswordReset(email: string): Promise<AuthOutcome> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl(),
  })
  if (error) return { ok: false, message: readable(error.message) }
  // Noted before the link is opened, because on Android the link arrives as
  // an ordinary sign-in and there is nothing else to recognise it by.
  markResetRequested()
  return { ok: true }
}

/** Used by the recovery screen, and by Settings to change a password. */
export async function updatePassword(password: string): Promise<AuthOutcome> {
  const breached = await breachedMessage(password)
  if (breached) return { ok: false, message: breached }

  const { error } = await supabase.auth.updateUser({ password })
  return error ? { ok: false, message: readable(error.message) } : { ok: true }
}

/**
 * Claims a username for an account that hasn't got one — anybody who signed
 * up with a magic link before usernames existed.
 */
export async function claimUsername(
  userId: string,
  username: string,
): Promise<AuthOutcome> {
  const value = normaliseUsername(username)
  if (!(await isUsernameFree(value))) {
    return { ok: false, message: 'That username is taken. Try another.' }
  }
  const { error } = await supabase
    .from('profiles')
    .update({ username: value })
    .eq('id', userId)

  if (error) {
    // The unique index is the real arbiter, and it can refuse a name that was
    // free a moment ago.
    if (/duplicate key|unique/i.test(error.message)) {
      return { ok: false, message: 'That username was just taken. Try another.' }
    }
    return { ok: false, message: readable(error.message) }
  }
  return { ok: true }
}
