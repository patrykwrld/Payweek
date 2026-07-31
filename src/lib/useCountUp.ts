import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Rolls a number up to its new value.
 *
 * Used on one thing only: the pay-week total, after a shift is logged. That
 * moment is the whole point of the app, and watching the figure climb is what
 * makes it land — a number that simply appears is information, a number that
 * moves is a result.
 *
 * It deliberately does not animate on first paint. Every screen would shimmer
 * on arrival, which stops being a reward and becomes noise.
 */
export function useCountUp(value: number, durationMs = 550): number {
  const [shown, setShown] = useState(value)
  const mounted = useRef(false)
  const from = useRef(value)
  const frame = useRef(0)

  useEffect(() => {
    from.current = shown
  }, [shown])

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      setShown(value)
      return
    }
    if (prefersReducedMotion()) {
      setShown(value)
      return
    }

    const start = from.current
    const delta = value - start
    if (delta === 0) return

    const began = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - began) / durationMs, 1)
      // Decelerating: quick enough to feel immediate, slow enough to read.
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(start + delta * eased))
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [value, durationMs])

  return shown
}
