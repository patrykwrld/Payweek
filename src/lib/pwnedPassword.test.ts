import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Node has had a global WebCrypto since 18, so the module's own
// globalThis.crypto.subtle path is what runs here — the same one the browser
// takes, rather than a stand-in that could drift from it.

const { checkPwned, pwnedMessage } = await import('./pwnedPassword')

// SHA-1('password') = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const PREFIX = '5BAA6'
const SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8'

let calls: string[] = []

function respond(body: string, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      calls.push(url)
      return Promise.resolve({ ok, text: () => Promise.resolve(body) })
    }),
  )
}

beforeEach(() => {
  calls = []
})
afterEach(() => vi.unstubAllGlobals())

describe('checkPwned', () => {
  it('finds a password that is in the list', async () => {
    respond(`${SUFFIX}:24230577\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5`)
    const result = await checkPwned('password')
    expect(result).toEqual({ breached: true, count: 24230577 })
  })

  it('clears a password that is not', async () => {
    respond('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:2')
    expect(await checkPwned('password')).toEqual({ breached: false, count: 0 })
  })

  // The entire point: only five characters of the hash go over the wire.
  it('sends five hex characters and nothing else', async () => {
    respond('')
    await checkPwned('password')
    expect(calls).toHaveLength(1)
    // Everything after the endpoint must be the five-character prefix and
    // nothing else — not the password, not the rest of the hash. Asserting on
    // the whole URL would pass by accident: the hostname contains the word
    // "password" all by itself.
    const sent = (calls[0] ?? '').replace('https://api.pwnedpasswords.com/range/', '')
    expect(sent).toBe(PREFIX)
    expect(sent).toHaveLength(5)
  })

  // Fail open, every time. A third party having a bad day must never be the
  // reason somebody can't sign up.
  it('says nothing when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    expect(await checkPwned('password')).toEqual({ breached: null, count: 0 })
  })

  it('says nothing on a non-200', async () => {
    respond('nope', false)
    expect(await checkPwned('password')).toEqual({ breached: null, count: 0 })
  })

  it('says nothing when there is no SubtleCrypto', async () => {
    vi.stubGlobal('crypto', {})
    expect(await checkPwned('password')).toEqual({ breached: null, count: 0 })
  })

  it('ignores the padding entries, which come back with a count of zero', async () => {
    respond(`${SUFFIX}:0`)
    expect(await checkPwned('password')).toEqual({ breached: false, count: 0 })
  })

  it('does not call out for an empty box', async () => {
    respond('')
    expect(await checkPwned('')).toEqual({ breached: null, count: 0 })
    expect(calls).toHaveLength(0)
  })

  it('copes with carriage returns, which the API sends', async () => {
    respond(`${SUFFIX}:12\r\nAAAA:1\r\n`)
    expect(await checkPwned('password')).toEqual({ breached: true, count: 12 })
  })
})

describe('pwnedMessage', () => {
  it('stays quiet unless there is a definite hit', () => {
    expect(pwnedMessage({ breached: false, count: 0 })).toBeNull()
    expect(pwnedMessage({ breached: null, count: 0 })).toBeNull()
  })

  it('rounds a big number, because the exact figure is noise', () => {
    expect(pwnedMessage({ breached: true, count: 24230577 })).toMatch(
      /24,231,000\+ times/,
    )
  })

  it('gives a small number exactly, because four is not forty thousand', () => {
    expect(pwnedMessage({ breached: true, count: 4 })).toMatch(/4 times/)
  })
})
