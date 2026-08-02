/**
 * Every press of "Email me a sign-in link" sends a real email out of a real
 * quota. The promise this makes to the person at the sign-in screen is three
 * links every ten minutes — enough to survive a typo, a slow inbox and a
 * deleted email, and not enough for one stuck finger to burn the send quota
 * for everyone else.
 *
 * It is deliberately per email address rather than per device: two people
 * sharing a phone shouldn't lock each other out, and one person switching
 * devices shouldn't get a free reset.
 */

const STORE_KEY = 'payweek-signin-attempts'

/** Three links inside this window, then the oldest has to roll off. */
export const WINDOW_MS = 10 * 60_000
export const MAX_PER_WINDOW = 3

/**
 * Supabase enforces its own cooldown between one-time-password emails to the
 * same address. Matching it here means the countdown we show is the truth
 * rather than a guess that sends them into a 429 anyway.
 */
export const SPACING_MS = 60_000

export type Gate =
  | { allowed: true }
  | { allowed: false; waitMs: number; reason: 'spacing' | 'window' }

type Store = Record<string, number[]>

// A WebView with storage disabled shouldn't make sign-in throw. It falls back
// to memory, which loses the history on relaunch — the server-side limit is
// still there underneath, so that fails safe rather than open.
let memory: Store = {}

function normalise(email: string): string {
  return email.trim().toLowerCase()
}

function read(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Store = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        out[key] = value.filter((n): n is number => typeof n === 'number')
      }
    }
    return out
  } catch {
    return memory
  }
}

function write(store: Store): void {
  memory = store
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // Memory already holds it.
  }
}

/** Timestamps still inside the window, oldest first. */
function recent(store: Store, key: string, now: number): number[] {
  return (store[key] ?? [])
    .filter((at) => now - at < WINDOW_MS)
    .sort((a, b) => a - b)
}

/**
 * Whether a link can be sent to this address right now, and if not, how long
 * until it can be. Two separate reasons, because they read differently: one is
 * "you only just asked", the other is "you've used your three".
 */
export function gateSend(email: string, now: number = Date.now()): Gate {
  const key = normalise(email)
  if (key === '') return { allowed: true }
  const attempts = recent(read(), key, now)

  const last = attempts[attempts.length - 1]
  if (last !== undefined && now - last < SPACING_MS) {
    return { allowed: false, waitMs: SPACING_MS - (now - last), reason: 'spacing' }
  }

  if (attempts.length >= MAX_PER_WINDOW) {
    // The window is rolling, not fixed: the next slot opens when the oldest
    // of the three ages out, not on some arbitrary ten-minute boundary.
    const oldest = attempts[attempts.length - MAX_PER_WINDOW]
    if (oldest !== undefined) {
      return { allowed: false, waitMs: WINDOW_MS - (now - oldest), reason: 'window' }
    }
  }

  return { allowed: true }
}

/**
 * Call this only when an email actually went out. A request that died on a
 * flat mobile signal sent nothing, so it must not cost anyone an attempt.
 */
export function recordSend(email: string, now: number = Date.now()): void {
  const key = normalise(email)
  if (key === '') return
  const store = read()
  const next: Store = {}
  // Prune every address while we're here, so the entry for an email typed
  // wrong once in March doesn't sit in storage forever.
  for (const other of Object.keys(store)) {
    const kept = recent(store, other, now)
    if (kept.length > 0) next[other] = kept
  }
  next[key] = [...(next[key] ?? []), now]
  write(next)
}

/** How many of the three are left. Shown once they've used one. */
export function attemptsLeft(email: string, now: number = Date.now()): number {
  const key = normalise(email)
  if (key === '') return MAX_PER_WINDOW
  return Math.max(0, MAX_PER_WINDOW - recent(read(), key, now).length)
}

/** Plain English, rounded up, so a countdown never sits on "0 seconds". */
export function formatWait(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000))
  // 60 counts as seconds, not "1 minute", so the countdown reads 60, 59, 58
  // rather than flicking from "1 minute" to "58 seconds" and looking broken.
  if (seconds <= 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  // Rounded, not ceiled, above a minute: 61 seconds is "1 minute", and the
  // handoff to the exact seconds happens the moment it reaches 60.
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

/** Test seam. */
export function resetThrottle(): void {
  memory = {}
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    // Nothing to clear.
  }
}
