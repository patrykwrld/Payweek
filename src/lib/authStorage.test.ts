import { beforeEach, describe, expect, it, vi } from 'vitest'

// The module reads VITE_SUPABASE_URL to work out the token key.
vi.stubEnv('VITE_SUPABASE_URL', 'https://testref.supabase.co')

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    map,
    api: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, String(v)),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    },
  }
}

const local = fakeStorage()
const session = fakeStorage()
vi.stubGlobal('localStorage', local.api)
vi.stubGlobal('sessionStorage', session.api)

const {
  authStorage,
  authTokenKey,
  keepSignedIn,
  setKeepSignedIn,
  storedSessionUserId,
} = await import('./authStorage')

const TOKEN = 'sb-testref-auth-token'
const VERIFIER = 'sb-testref-auth-token-code-verifier'
const SESSION = JSON.stringify({ user: { id: 'user-1' } })

beforeEach(() => {
  local.map.clear()
  session.map.clear()
})

describe('the choice', () => {
  it('defaults to staying signed in', () => {
    expect(keepSignedIn()).toBe(true)
  })

  it('survives in localStorage, because it switches sessionStorage off', () => {
    setKeepSignedIn(false)
    expect(keepSignedIn()).toBe(false)
    expect(session.map.size).toBe(0)
  })
})

describe('with the box ticked', () => {
  it('puts the token where closing the app cannot reach it', () => {
    authStorage.setItem(TOKEN, SESSION)
    expect(local.map.get(TOKEN)).toBe(SESSION)
    expect(session.map.has(TOKEN)).toBe(false)
  })
})

describe('with the box unticked', () => {
  beforeEach(() => setKeepSignedIn(false))

  it('puts the token somewhere closing the app clears', () => {
    authStorage.setItem(TOKEN, SESSION)
    expect(session.map.get(TOKEN)).toBe(SESSION)
    expect(local.map.has(TOKEN)).toBe(false)
  })

  // The whole point of the unticked box. A fallback read would resurrect a
  // session that was meant to die with the app.
  it('refuses to see a token left behind in localStorage', () => {
    local.map.set(TOKEN, SESSION)
    expect(authStorage.getItem(TOKEN)).toBeNull()
    expect(storedSessionUserId()).toBeNull()
  })

  // Without this, "keep me signed in" would break sign-in outright: the
  // verifier is written in one tab and read in whichever tab the emailed
  // link opens in.
  it('still keeps the PKCE verifier where the other tab can find it', () => {
    authStorage.setItem(VERIFIER, 'v1')
    expect(local.map.get(VERIFIER)).toBe('v1')
    expect(session.map.has(VERIFIER)).toBe(false)
    expect(authStorage.getItem(VERIFIER)).toBe('v1')
  })
})

describe('changing your mind', () => {
  it('carries a live session across instead of signing you out', () => {
    authStorage.setItem(TOKEN, SESSION)
    setKeepSignedIn(false)
    expect(session.map.get(TOKEN)).toBe(SESSION)
    expect(local.map.has(TOKEN)).toBe(false)
    expect(storedSessionUserId()).toBe('user-1')

    setKeepSignedIn(true)
    expect(local.map.get(TOKEN)).toBe(SESSION)
    expect(session.map.has(TOKEN)).toBe(false)
    expect(storedSessionUserId()).toBe('user-1')
  })

  it('does nothing when the answer has not changed', () => {
    authStorage.setItem(TOKEN, SESSION)
    setKeepSignedIn(true)
    expect(local.map.get(TOKEN)).toBe(SESSION)
  })
})

describe('signing out', () => {
  it('clears both stores, whichever one it was in', () => {
    authStorage.setItem(TOKEN, SESSION)
    local.map.set(TOKEN, SESSION)
    session.map.set(TOKEN, SESSION)
    authStorage.removeItem(TOKEN)
    expect(local.map.has(TOKEN)).toBe(false)
    expect(session.map.has(TOKEN)).toBe(false)
  })
})

describe('storedSessionUserId', () => {
  it('reads the id out of the stored session', () => {
    authStorage.setItem(TOKEN, SESSION)
    expect(storedSessionUserId()).toBe('user-1')
  })

  it('treats a half-written token as no session', () => {
    local.map.set(TOKEN, '{"user":')
    expect(storedSessionUserId()).toBeNull()
  })

  it('knows the project ref', () => {
    expect(authTokenKey()).toBe(TOKEN)
  })
})
