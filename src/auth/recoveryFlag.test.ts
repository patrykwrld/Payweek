import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
})

const { clearResetRequest, consumeResetRequest, markResetRequested } =
  await import('./recoveryFlag')

const T0 = 1_700_000_000_000
const HOUR = 60 * 60 * 1000

beforeEach(() => store.clear())

describe('consumeResetRequest', () => {
  it('is false when no reset was asked for', () => {
    expect(consumeResetRequest(T0)).toBe(false)
  })

  it('is true right after a reset is asked for', () => {
    markResetRequested(T0)
    expect(consumeResetRequest(T0 + 30_000)).toBe(true)
  })

  // Otherwise one forgotten password turns every later sign-in on that device
  // into a demand for a new one.
  it('answers only once', () => {
    markResetRequested(T0)
    expect(consumeResetRequest(T0 + 1_000)).toBe(true)
    expect(consumeResetRequest(T0 + 2_000)).toBe(false)
  })

  it('expires after an hour', () => {
    markResetRequested(T0)
    expect(consumeResetRequest(T0 + HOUR + 1)).toBe(false)
  })

  it('is still valid just inside the hour', () => {
    markResetRequested(T0)
    expect(consumeResetRequest(T0 + HOUR - 1)).toBe(true)
  })

  it('can be cancelled, for a sign-in that is not a reset', () => {
    markResetRequested(T0)
    clearResetRequest()
    expect(consumeResetRequest(T0 + 1_000)).toBe(false)
  })

  it('ignores rubbish in storage', () => {
    store.set('payweek-reset-requested-at', 'yesterday')
    expect(consumeResetRequest(T0)).toBe(false)
  })

  it('ignores a timestamp from the future, which is a clock change', () => {
    markResetRequested(T0 + HOUR)
    expect(consumeResetRequest(T0)).toBe(false)
  })
})
