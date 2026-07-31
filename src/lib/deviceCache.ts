/**
 * Guards around the copy of a person's data that lives on the device.
 *
 * The query cache is deliberately written to localStorage so Payweek opens
 * with a week's figures and no signal. That copy is also the risk: on a shared
 * or handed-on phone it must not outlive the account it belongs to.
 *
 * Two rules, and the difference between them matters:
 *
 *  - A *different account* must never see the previous one's data. Handled
 *    below, synchronously, before the cache is ever read back.
 *  - A session merely *expiring* is not someone leaving. Wiping right then
 *    would throw away shifts logged offline and still waiting to sync, which
 *    is the one thing this app must never do — so the running app leaves them
 *    be, and they go out as soon as the same person signs back in. The
 *    launch-time check is where the handover case is caught instead.
 */

export const CACHE_KEY = 'payweek-cache'
const LAST_USER_KEY = 'payweek-last-user'

/** Where supabase-js keeps the session: sb-<project ref>-auth-token. */
function authStorageKey(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return null
  try {
    const ref = new URL(url).hostname.split('.')[0]
    return ref ? `sb-${ref}-auth-token` : null
  } catch {
    return null
  }
}

/** The signed-in user id according to storage, without waiting on the client. */
function storedUserId(): string | null {
  const key = authStorageKey()
  if (!key) return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const user = (parsed as { user?: { id?: unknown } } | null)?.user
    return typeof user?.id === 'string' ? user.id : null
  } catch {
    // A half-written or hand-edited token is not a session.
    return null
  }
}

function drop() {
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Run before the persister restores anything. Reading storage directly keeps
 * this synchronous, so there is no window in which the old account's shifts
 * are restored and then cleared — they are simply never loaded.
 *
 * Returns the user id it settled on, so callers can track changes at runtime.
 */
export function purgeCacheIfAccountChanged(): string | null {
  const userId = storedUserId()
  // Kept only while a session is present and belongs to the same account.
  // No session means no cache: it would be unreadable anyway (every query
  // needs auth), and leaving it is exactly the handed-on-phone case.
  if (userId && localStorage.getItem(LAST_USER_KEY) === userId) return userId

  drop()
  if (userId) localStorage.setItem(LAST_USER_KEY, userId)
  else localStorage.removeItem(LAST_USER_KEY)
  return userId
}

/** Same check while the app is running, for a sign-in with no reload. */
export function noteSignedInUser(userId: string): boolean {
  if (localStorage.getItem(LAST_USER_KEY) === userId) return false
  drop()
  localStorage.setItem(LAST_USER_KEY, userId)
  return true
}

/** Deliberate sign-out: forget who it was, so the next launch starts clean. */
export function forgetLastUser(): void {
  localStorage.removeItem(LAST_USER_KEY)
}
