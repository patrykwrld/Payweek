/**
 * Which agencies somebody can log a shift against.
 *
 * Archiving is meant to tidy an agency out of the way, not to lock anyone
 * out of their own app. It did both: archive the only agency you have — by
 * accident, or because you read it as "finished with for now" — and the
 * shift form's picker came up empty with nothing selectable, while the Week
 * screen swapped itself for the first-run setup. Every shift ever logged
 * looked deleted.
 *
 * So when nothing is active, the archived ones are offered anyway. Somebody
 * in that state has exactly one sensible intent, and refusing it helps
 * nobody.
 */
export function loggableAgencies<T extends { archived: boolean }>(
  agencies: readonly T[],
): T[] {
  const active = agencies.filter((a) => !a.archived)
  return active.length > 0 ? active : [...agencies]
}

/**
 * Whether this is genuinely a new account rather than one whose agencies all
 * happen to be archived. The first-run screen is for the former only; showing
 * it to the latter tells somebody with months of data that they have none.
 */
export function isFirstRun(agencies: readonly unknown[]): boolean {
  return agencies.length === 0
}
