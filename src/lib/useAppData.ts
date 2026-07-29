import type { Tables } from './database.types'
import { useAgencies, useRateRules, useShifts } from './queries'

export type AppData =
  | { status: 'pending' }
  | { status: 'error'; retry: () => void }
  | {
      status: 'ready'
      agencies: Tables<'agencies'>[]
      shifts: Tables<'shifts'>[]
      rules: Tables<'rate_rules'>[]
      retry: () => void
    }

/** The three tables nearly every screen prices against, behind one
 * pending/error/ready result so states stay consistent and the ready
 * case hands back plain arrays. */
export function useAppData(): AppData {
  const agencies = useAgencies()
  const shifts = useShifts()
  const rules = useRateRules()

  const retry = () => {
    void agencies.refetch()
    void shifts.refetch()
    void rules.refetch()
  }

  if (agencies.isError || shifts.isError || rules.isError) {
    return { status: 'error', retry }
  }
  if (!agencies.data || !shifts.data || !rules.data) {
    return { status: 'pending' }
  }
  return {
    status: 'ready',
    agencies: agencies.data,
    shifts: shifts.data,
    rules: rules.data,
    retry,
  }
}
