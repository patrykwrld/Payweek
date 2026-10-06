/**
 * Colours for the little striped bar under each shift.
 *
 * The bar shows which hours were paid at which rate, and it was the cleverest
 * thing on the Shifts screen that nobody could read: two colours, one legend,
 * and the legend was underneath the whole list where you only reach it after
 * scrolling past every shift you own.
 *
 * So the colours now follow the rates somebody actually set up rather than a
 * fixed "base / everything else" pair, and the legend names them. Someone
 * with a night rate and a bank-holiday rate sees both, by name, in their own
 * colour.
 *
 * Assignment is alphabetical rather than first-seen so a shift does not
 * change colour depending on which week you are looking at.
 */

/** The engine's label for hours at the plain hourly rate. */
export const BASE_LABEL = 'Base rate'

/** Tailwind classes, not hex: these have to survive the compiler's scan, so
 * every one of them appears here as a whole literal string. */
const BASE_CLASS = 'bg-accent'
const EXTRA_CLASSES = ['bg-positive', 'bg-warn'] as const
/** Beyond two extra rates the colours stop meaning anything, so the rest
 * share one. Nobody in the data has more than two. */
const OVERFLOW_CLASS = 'bg-faint'

/**
 * Maps every rate label on screen to the class that draws it.
 *
 * @param labels every breakdown label visible, in any order and with repeats
 */
export function bandColours(labels: Iterable<string>): Map<string, string> {
  const extras = [...new Set(labels)]
    .filter((l) => l !== BASE_LABEL)
    .sort((a, b) => a.localeCompare(b))

  const map = new Map<string, string>([[BASE_LABEL, BASE_CLASS]])
  extras.forEach((label, i) => {
    map.set(label, EXTRA_CLASSES[i] ?? OVERFLOW_CLASS)
  })
  return map
}

/** What the legend lists: base first, then the extras in their own colour. */
export function legendEntries(
  colours: Map<string, string>,
): { label: string; className: string }[] {
  return [...colours].map(([label, className]) => ({
    label: label === BASE_LABEL ? 'base rate' : label.toLowerCase(),
    className,
  }))
}
