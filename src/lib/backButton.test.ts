import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleBack, onBack, resetBackStack } from './backButton'

const env = (canGoBack: boolean) => ({
  canGoBack,
  goBack: vi.fn(),
  leave: vi.fn(),
})

beforeEach(resetBackStack)

describe('handleBack', () => {
  // The bug: on the first screen, back was a dead key.
  it('leaves the app from the root rather than doing nothing', () => {
    const e = env(false)
    expect(handleBack(e)).toBe('left')
    expect(e.leave).toHaveBeenCalledOnce()
    expect(e.goBack).not.toHaveBeenCalled()
  })

  it('goes back a page when there is one', () => {
    const e = env(true)
    expect(handleBack(e)).toBe('navigated')
    expect(e.goBack).toHaveBeenCalledOnce()
    expect(e.leave).not.toHaveBeenCalled()
  })

  // The other bug: with a sheet open, back navigated the page underneath
  // away and left the sheet's form half filled in over a different screen.
  it('closes what is open before it navigates anywhere', () => {
    const close = vi.fn()
    onBack(close)
    const e = env(true)
    expect(handleBack(e)).toBe('dismissed')
    expect(close).toHaveBeenCalledOnce()
    expect(e.goBack).not.toHaveBeenCalled()
  })

  it('closes the most recently opened thing first', () => {
    const first = vi.fn()
    const second = vi.fn()
    onBack(first)
    onBack(second)
    handleBack(env(false))
    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
  })

  it('forgets a sheet once it has closed itself', () => {
    const close = vi.fn()
    const off = onBack(close)
    off()
    const e = env(false)
    expect(handleBack(e)).toBe('left')
    expect(close).not.toHaveBeenCalled()
  })

  it('removes only its own entry when the same handler is registered twice', () => {
    const close = vi.fn()
    const offA = onBack(close)
    onBack(close)
    offA()
    expect(handleBack(env(false))).toBe('dismissed')
  })
})
