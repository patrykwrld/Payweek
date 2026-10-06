/**
 * Create an agency and its rates in one go.
 *
 * Two screens do this — the first-run setup and "add another agency" — and
 * the fiddly part is the same in both: the rates are a second round trip, and
 * a failure part-way through leaves an agency with some of its rates, which
 * must not be fixed by resubmitting the form or you get two agencies.
 *
 * So the sequencing and the stranded case live here once, and the screens
 * differ only in what they say and where they go afterwards.
 */
import { useState } from 'react'
import { planRateChanges, type RatePlan } from './rateShapes'
import { useInsertAgency, useInsertRule } from './queries'
import type { TablesInsert } from './database.types'

export interface Stranded {
  /** The agency that saved. Open it and finish by hand. */
  id: string
  error: unknown
}

export function useCreateAgency() {
  const insertAgency = useInsertAgency()
  const insertRule = useInsertRule()
  // Tracked here rather than read off the agency mutation, which is finished
  // long before the rates are.
  const [saving, setSaving] = useState(false)
  const [stranded, setStranded] = useState<Stranded | null>(null)

  function create(
    values: TablesInsert<'agencies'>,
    plan: RatePlan,
    onDone: (agencyId: string) => void,
  ) {
    setSaving(true)
    insertAgency.mutate(values, {
      onSuccess: async (agency) => {
        const { insert } = planRateChanges(plan, [])
        try {
          // Sequential, not parallel: a failure part-way through leaves a
          // partial set the user can see and finish by hand.
          for (const rule of insert) {
            await insertRule.mutateAsync({ ...rule, agency_id: agency.id })
          }
        } catch (error) {
          setSaving(false)
          setStranded({ id: agency.id, error })
          return
        }
        setSaving(false)
        onDone(agency.id)
      },
      onError: () => setSaving(false),
    })
  }

  return { create, saving, stranded, error: insertAgency.error }
}
