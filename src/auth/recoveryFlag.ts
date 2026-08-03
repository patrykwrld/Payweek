/**
 * Remembers that a password reset was asked for on this device.
 *
 * On the web, opening a reset link makes supabase-js fire `PASSWORD_RECOVERY`
 * and everything is obvious. On Android the link comes back as a deep link
 * that is exchanged with `exchangeCodeForSession`, which fires an ordinary
 * `SIGNED_IN` — indistinguishable from any other sign-in. Left alone, the app
 * would simply open, the reset would be abandoned half-done, and the old
 * password would quietly still work.
 *
 * The reset link has to be opened on the device that asked for it anyway (the
 * PKCE verifier is stored locally), so a local note is a reliable signal —
 * more reliable than parsing a URL whose shape Supabase is free to change.
 */

const KEY = 'payweek-reset-requested-at'

/** Long enough to walk to the laptop and find the email; not open-ended. */
const VALID_FOR_MS = 60 * 60 * 1000

export function markResetRequested(now: number = Date.now()): void {
  try {
    localStorage.setItem(KEY, String(now))
  } catch {
    // Storage disabled. The web PASSWORD_RECOVERY event still covers that case.
  }
}

export function clearResetRequest(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

/**
 * True once, if a reset was asked for recently. Clears as it answers, so a
 * single request can't turn every later sign-in into a password change.
 */
export function consumeResetRequest(now: number = Date.now()): boolean {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return false
  }
  if (raw === null) return false
  clearResetRequest()
  const at = Number(raw)
  return Number.isFinite(at) && now - at >= 0 && now - at < VALID_FOR_MS
}
