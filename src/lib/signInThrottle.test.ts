import { beforeEach, describe, expect, it, vi } from 'vitest'

// Tests run in node; a Map is enough of a Storage for what this module does.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
})

const {
  MAX_PER_WINDOW,
  SPACING_MS,
  WINDOW_MS,
  attemptsLeft,
  formatWait,
  gateSend,
  recordSend,
  resetThrottle,
} = await import('./signInThrottle')

const T0 = 1_700_000_000_000
const EMAIL = 'sam@example.com'

/** The three allowed sends, spaced just far enough apart to be let through. */
function useAllThree(at = T0): number {
  let now = at
  for (let i = 0; i < MAX_PER_WINDOW; i++) {
    recordSend(EMAIL, now)
    now += SPACING_MS
  }
  return now
}

beforeEach(() => {
  store.clear()
  resetThrottle()
})

describe('gateSend', () => {
  it('lets a first-time address straight through', () => {
    expect(gateSend(EMAIL, T0)).toEqual({ allowed: true })
  })

  it('holds a second send until the spacing has passed', () => {
    recordSend(EMAIL, T0)
    const gate = gateSend(EMAIL, T0 + 20_000)
    expect(gate.allowed).toBe(false)
    if (!gate.allowed) {
      expect(gate.reason).toBe('spacing')
      expect(gate.waitMs).toBe(40_000)
    }
  })

  it('allows the second send once the spacing is up', () => {
    recordSend(EMAIL, T0)
    expect(gateSend(EMAIL, T0 + SPACING_MS)).toEqual({ allowed: true })
  })

  // The promise on the tin: three inside ten minutes, not two.
  it('allows three sends inside the window', () => {
    let now = T0
    for (let i = 0; i < MAX_PER_WINDOW; i++) {
      expect(gateSend(EMAIL, now)).toEqual({ allowed: true })
      recordSend(EMAIL, now)
      now += SPACING_MS
    }
    expect(now - T0).toBeLessThan(WINDOW_MS)
  })

  it('blocks the fourth send inside the window', () => {
    const after = useAllThree()
    const gate = gateSend(EMAIL, after)
    expect(gate.allowed).toBe(false)
    if (!gate.allowed) expect(gate.reason).toBe('window')
  })

  // Rolling, not fixed: the slot opens when the oldest of the three ages out.
  it('frees a slot exactly when the oldest attempt leaves the window', () => {
    useAllThree()
    expect(gateSend(EMAIL, T0 + WINDOW_MS - 1).allowed).toBe(false)
    expect(gateSend(EMAIL, T0 + WINDOW_MS)).toEqual({ allowed: true })
  })

  it('counts the address, not the casing or the stray spaces', () => {
    recordSend('  SAM@Example.COM  ', T0)
    expect(gateSend(EMAIL, T0 + 1_000).allowed).toBe(false)
  })

  it('keeps two addresses independent', () => {
    useAllThree()
    expect(gateSend('other@example.com', T0)).toEqual({ allowed: true })
  })

  it('has nothing to say about an empty box', () => {
    expect(gateSend('', T0)).toEqual({ allowed: true })
  })
})

describe('attemptsLeft', () => {
  it('starts at the full allowance and counts down', () => {
    expect(attemptsLeft(EMAIL, T0)).toBe(3)
    recordSend(EMAIL, T0)
    expect(attemptsLeft(EMAIL, T0)).toBe(2)
    useAllThree(T0 + SPACING_MS)
    expect(attemptsLeft(EMAIL, T0 + SPACING_MS * 3)).toBe(0)
  })

  it('refills once the window has passed', () => {
    useAllThree()
    expect(attemptsLeft(EMAIL, T0 + WINDOW_MS * 2)).toBe(3)
  })
})

describe('storage', () => {
  it('survives a reload, so closing the app is not a reset', () => {
    useAllThree()
    // Same backing store, fresh read — that is what a relaunch looks like.
    expect(gateSend(EMAIL, T0 + SPACING_MS * 3).allowed).toBe(false)
    expect(store.size).toBeGreaterThan(0)
  })

  it('drops addresses whose attempts have all expired', () => {
    recordSend('old@example.com', T0)
    recordSend(EMAIL, T0 + WINDOW_MS * 2)
    const raw = store.get('payweek-signin-attempts') ?? '{}'
    expect(raw).not.toContain('old@example.com')
  })

  it('ignores rubbish left in storage rather than throwing', () => {
    store.set('payweek-signin-attempts', 'not json')
    expect(gateSend(EMAIL, T0)).toEqual({ allowed: true })
  })
})

describe('formatWait', () => {
  it('rounds up so a countdown never reads zero', () => {
    expect(formatWait(1)).toBe('1 second')
    expect(formatWait(40_400)).toBe('41 seconds')
    expect(formatWait(60_000)).toBe('60 seconds')
    expect(formatWait(60_001)).toBe('1 minute')
    expect(formatWait(89_000)).toBe('1 minute')
    expect(formatWait(9 * 60_000 + 1)).toBe('9 minutes')
  })
})
