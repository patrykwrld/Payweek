/**
 * What Android's back button does.
 *
 * Capacitor's default is thinner than it looks: with no listener it steps
 * the WebView's history back, and when there is no history left it does
 * NOTHING. So on the Week screen — where everybody starts — back was a dead
 * key, and with a sheet open it navigated the page underneath away instead
 * of closing the sheet. Both break what Android users expect from back, and
 * "back does nothing" is one of the things Play's own quality checklist
 * calls out.
 *
 * The order is the platform's own: dismiss what is on top, then go back,
 * then leave. Kept free of Capacitor so the order itself is testable; the
 * wiring to the hardware button lives in main.tsx.
 */

type Dismiss = () => void

/** Whatever is open over the page right now, most recent last. */
const open: Dismiss[] = []

/**
 * Called by anything that should close on back — a sheet, a dialog. Returns
 * the function that takes it off the stack again, shaped for useEffect.
 */
export function onBack(dismiss: Dismiss): () => void {
  open.push(dismiss)
  return () => {
    const at = open.lastIndexOf(dismiss)
    if (at !== -1) open.splice(at, 1)
  }
}

export type BackOutcome = 'dismissed' | 'navigated' | 'left'

export function handleBack(env: {
  canGoBack: boolean
  goBack: () => void
  /** Hand the screen back to the launcher. Minimise, not kill. */
  leave: () => void
}): BackOutcome {
  const top = open[open.length - 1]
  if (top) {
    top()
    return 'dismissed'
  }
  if (env.canGoBack) {
    env.goBack()
    return 'navigated'
  }
  env.leave()
  return 'left'
}

/** For tests: nothing open. */
export function resetBackStack(): void {
  open.length = 0
}
