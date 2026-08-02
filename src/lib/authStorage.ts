/**
 * Where the session token lives, and how long it outlives the app.
 *
 * "Keep me signed in" is the difference between localStorage — which survives
 * closing Payweek, which is what nearly everyone wants on their own phone —
 * and sessionStorage, which doesn't. Someone signing in on a shared laptop or
 * a machine at work can untick it and know their pay isn't left sitting there
 * for whoever sits down next.
 *
 * The choice itself always goes in localStorage. It has to survive the very
 * thing it switches off, or unticking the box would forget itself.
 */

const CHOICE_KEY = 'payweek-keep-signed-in'

function localSafe(): Storage | null {
  try {
    return localStorage
  } catch {
    // A WebView with storage disabled. Nothing persists; sign-in still works
    // for as long as the app is open.
    return null
  }
}

function sessionSafe(): Storage | null {
  try {
    return sessionStorage
  } catch {
    return null
  }
}

/** Default on: being signed out of a pay tracker every time you close it is
 * the fastest way to lose someone who logs shifts on a break. */
export function keepSignedIn(): boolean {
  return localSafe()?.getItem(CHOICE_KEY) !== '0'
}

function activeStore(): Storage | null {
  return keepSignedIn() ? localSafe() : sessionSafe()
}

function idleStore(): Storage | null {
  return keepSignedIn() ? sessionSafe() : localSafe()
}

/** Where supabase-js keeps the session: sb-<project ref>-auth-token. */
export function authTokenKey(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return null
  try {
    const ref = new URL(url).hostname.split('.')[0]
    return ref ? `sb-${ref}-auth-token` : null
  } catch {
    return null
  }
}

/**
 * The PKCE verifier is written when the link is requested and read when the
 * link is opened — and on the web that is very often a different tab, where
 * sessionStorage is a different box entirely. Keeping it in localStorage
 * regardless is what stops "keep me signed in" from quietly breaking sign-in
 * altogether. It is single-use, short-lived, and worthless without the code
 * that arrives in the email.
 */
function isVerifier(key: string): boolean {
  return key.includes('code-verifier')
}

export function setKeepSignedIn(keep: boolean): void {
  const from = activeStore()
  localSafe()?.setItem(CHOICE_KEY, keep ? '1' : '0')
  const to = activeStore()
  if (from === to || !from || !to) return

  // Carry a live session across rather than signing someone out for touching
  // a checkbox.
  const key = authTokenKey()
  if (!key) return
  const token = from.getItem(key)
  if (token === null) return
  to.setItem(key, token)
  from.removeItem(key)
}

/**
 * Deliberately reads only the active store. Falling back to the other one
 * would resurrect a token that outlived the app — which is the single thing
 * the unticked box exists to prevent.
 */
export const authStorage = {
  getItem(key: string): string | null {
    if (isVerifier(key)) return localSafe()?.getItem(key) ?? null
    return activeStore()?.getItem(key) ?? null
  },
  setItem(key: string, value: string): void {
    if (isVerifier(key)) {
      localSafe()?.setItem(key, value)
      return
    }
    activeStore()?.setItem(key, value)
    // Never two copies: a stale one is a session nobody can see or end.
    idleStore()?.removeItem(key)
  },
  removeItem(key: string): void {
    localSafe()?.removeItem(key)
    sessionSafe()?.removeItem(key)
  },
}

/** The signed-in user id according to storage, without waiting on the client. */
export function storedSessionUserId(): string | null {
  const key = authTokenKey()
  if (!key) return null
  const raw = authStorage.getItem(key)
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
