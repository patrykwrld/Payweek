import { beforeEach, describe, expect, it, vi } from 'vitest'

// The module reads VITE_SUPABASE_URL at call time to work out the storage key.
vi.stubEnv('VITE_SUPABASE_URL', 'https://testref.supabase.co')

// Tests run in node; a Map is enough of a Storage for what this module does.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
})

const AUTH_KEY = 'sb-testref-auth-token'

const {
  CACHE_KEY,
  forgetLastUser,
  noteSignedInUser,
  purgeCacheIfAccountChanged,
} = await import('./deviceCache')

function signedInAs(id: string) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ user: { id } }))
}

function cacheExists() {
  return localStorage.getItem(CACHE_KEY) !== null
}

beforeEach(() => {
  localStorage.clear()
})

describe('purgeCacheIfAccountChanged', () => {
  it('keeps the cache when the same account comes back', () => {
    signedInAs('alice')
    purgeCacheIfAccountChanged()
    localStorage.setItem(CACHE_KEY, 'alice-shifts')

    expect(purgeCacheIfAccountChanged()).toBe('alice')
    expect(cacheExists()).toBe(true)
  })

  it('drops the cache when a different account is signed in', () => {
    signedInAs('alice')
    purgeCacheIfAccountChanged()
    localStorage.setItem(CACHE_KEY, 'alice-shifts')

    signedInAs('bob')
    expect(purgeCacheIfAccountChanged()).toBe('bob')
    expect(cacheExists()).toBe(false)
  })

  it('drops the cache when nobody is signed in any more', () => {
    signedInAs('alice')
    purgeCacheIfAccountChanged()
    localStorage.setItem(CACHE_KEY, 'alice-shifts')

    localStorage.removeItem(AUTH_KEY)
    expect(purgeCacheIfAccountChanged()).toBeNull()
    expect(cacheExists()).toBe(false)
  })

  it('treats an unreadable token as nobody, rather than throwing', () => {
    localStorage.setItem(AUTH_KEY, 'not-json{{')
    localStorage.setItem(CACHE_KEY, 'stale')

    expect(purgeCacheIfAccountChanged()).toBeNull()
    expect(cacheExists()).toBe(false)
  })

  it('is a no-op on a first launch with nothing stored', () => {
    expect(purgeCacheIfAccountChanged()).toBeNull()
    expect(cacheExists()).toBe(false)
  })
})

describe('noteSignedInUser', () => {
  it('reports a change and clears only when the account differs', () => {
    signedInAs('alice')
    purgeCacheIfAccountChanged()
    localStorage.setItem(CACHE_KEY, 'alice-shifts')

    expect(noteSignedInUser('alice')).toBe(false)
    expect(cacheExists()).toBe(true)

    expect(noteSignedInUser('bob')).toBe(true)
    expect(cacheExists()).toBe(false)
  })
})

describe('forgetLastUser', () => {
  it('leaves the cache in place so queued offline shifts survive an expiry', () => {
    signedInAs('alice')
    purgeCacheIfAccountChanged()
    localStorage.setItem(CACHE_KEY, 'alice-shifts-with-queued-writes')

    forgetLastUser()
    expect(cacheExists()).toBe(true)
  })

  it('but the next launch clears it once the session has gone', () => {
    signedInAs('alice')
    purgeCacheIfAccountChanged()
    localStorage.setItem(CACHE_KEY, 'alice-shifts')

    forgetLastUser()
    localStorage.removeItem(AUTH_KEY)
    purgeCacheIfAccountChanged()
    expect(cacheExists()).toBe(false)
  })
})
