/**
 * Refuses passwords that have turned up in known data breaches.
 *
 * Supabase offers this, but only on the Pro plan. It is worth having anyway —
 * a reused, already-breached password is far and away the likeliest way
 * somebody loses an account — so Payweek does it itself, against the same
 * source Supabase uses.
 *
 * **The password never leaves the device.** Have I Been Pwned's range API
 * works by k-anonymity: hash the password with SHA-1, send only the first
 * five hex characters, and get back every breached suffix that shares that
 * prefix — several hundred of them. The comparison happens here. The server
 * cannot tell which of those hundreds was being asked about, and never sees
 * the password or its full hash.
 *
 * It fails open, deliberately. A third party being slow or unreachable must
 * not stop somebody registering. The check is a bonus on top of the length
 * rule, not a gate.
 */

const RANGE_API = 'https://api.pwnedpasswords.com/range/'

/** Short. This sits in front of a button somebody has already pressed. */
const TIMEOUT_MS = 2500

export interface PwnedResult {
  /** Null when the check couldn't run — treat as "no objection". */
  breached: boolean | null
  /** How many breaches, when known. Worth showing: 4 reads very differently to 40,000. */
  count: number
}

const UNKNOWN: PwnedResult = { breached: null, count: 0 }

async function sha1Hex(input: string): Promise<string | null> {
  // Needs a secure context. The app is served over https everywhere it runs,
  // including the Android WebView, but an old WebView without SubtleCrypto
  // should skip the check rather than break sign-up.
  if (!globalThis.crypto?.subtle) return null
  try {
    const bytes = new TextEncoder().encode(input)
    const digest = await globalThis.crypto.subtle.digest('SHA-1', bytes)
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  } catch {
    return null
  }
}

export async function checkPwned(password: string): Promise<PwnedResult> {
  if (password === '') return UNKNOWN

  const hash = await sha1Hex(password)
  if (hash === null) return UNKNOWN

  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${RANGE_API}${prefix}`, {
      signal: controller.signal,
      // Asks HIBP to pad the response with random entries, so the size of the
      // reply says nothing either.
      headers: { 'Add-Padding': 'true' },
    })
    if (!response.ok) return UNKNOWN
    const body = await response.text()

    for (const line of body.split('\n')) {
      const [candidate, countText] = line.trim().split(':')
      if (candidate !== suffix) continue
      const count = Number(countText)
      // Padding entries come back with a count of 0 and are not real hits.
      if (!Number.isFinite(count) || count === 0) return { breached: false, count: 0 }
      return { breached: true, count }
    }
    return { breached: false, count: 0 }
  } catch {
    // Offline, blocked, timed out, CORS — all the same answer.
    return UNKNOWN
  } finally {
    clearTimeout(timer)
  }
}

/** The sentence to show, or null if there is no objection. */
export function pwnedMessage(result: PwnedResult): string | null {
  if (result.breached !== true) return null
  const times =
    result.count >= 1000
      ? `${Math.round(result.count / 1000).toLocaleString('en-GB')},000+ times`
      : `${result.count.toLocaleString('en-GB')} times`
  return `That password has appeared in known data breaches ${times}. It isn’t secret any more — please choose a different one.`
}
