/**
 * A note left for the app to find once, shortly afterwards.
 *
 * Two things in Payweek need this, and both for the same reason: an email
 * link comes back through `exchangeCodeForSession` as an ordinary `SIGNED_IN`
 * event, indistinguishable from someone typing their password. The link is
 * what carries the meaning — "this is a password reset", "this is a brand new
 * account" — and by the time the app sees the session, that meaning is gone.
 *
 * Leaving a note before sending the email is what carries it across. The link
 * has to be opened on the device that asked for it anyway (the PKCE verifier
 * is stored locally), so a local note is reliable — more reliable than parsing
 * a URL whose shape Supabase is free to change.
 */
export interface OneShot {
  mark(now?: number): void
  clear(): void
  /** True at most once, and only if the note is still fresh. */
  consume(now?: number): boolean
}

export function createOneShot(key: string, validForMs: number): OneShot {
  return {
    mark(now = Date.now()) {
      try {
        localStorage.setItem(key, String(now))
      } catch {
        // Storage disabled. The web-only events still cover that case.
      }
    },

    clear() {
      try {
        localStorage.removeItem(key)
      } catch {
        // Nothing to clear.
      }
    },

    consume(now = Date.now()) {
      let raw: string | null = null
      try {
        raw = localStorage.getItem(key)
      } catch {
        return false
      }
      if (raw === null) return false
      // Cleared as it answers, so one request can't colour every later
      // sign-in on this device.
      try {
        localStorage.removeItem(key)
      } catch {
        // Best effort.
      }
      const at = Number(raw)
      // A negative age is a clock change, not a fresh note.
      return Number.isFinite(at) && now - at >= 0 && now - at < validForMs
    },
  }
}
