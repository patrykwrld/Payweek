import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AgencyFormFields } from '../components/AgencyFormFields'
import { ErrorText, ScreenTitle } from '../components/ui'
import { planRateChanges, type RatePlan } from '../lib/rateShapes'
import { useInsertAgency, useInsertRule } from '../lib/queries'

export function AgencyNew() {
  const navigate = useNavigate()
  const insertAgency = useInsertAgency()
  const insertRule = useInsertRule()
  // Saving the rates is a second round-trip, so track pending state here
  // rather than reading the agency mutation's.
  const [saving, setSaving] = useState(false)
  // Set only when the agency saved but one of its rates didn't — resubmitting
  // the form would create a duplicate agency, so we offer a link instead.
  const [stranded, setStranded] = useState<{ id: string; error: unknown } | null>(
    null,
  )

  if (stranded) {
    return (
      <>
        <ScreenTitle>Agency saved</ScreenTitle>
        <p className="mb-4 text-sm text-muted">
          The agency is saved, but one of the extra rates didn&rsquo;t go
          through. Open it and add the rate again — don&rsquo;t re-add the
          agency, or you&rsquo;ll end up with two.
        </p>
        <ErrorText error={stranded.error} />
        <Link
          to={`/agencies/${stranded.id}`}
          className="mt-4 inline-block text-accent underline underline-offset-4"
        >
          Open the agency
        </Link>
      </>
    )
  }

  return (
    <>
      <ScreenTitle>New agency</ScreenTitle>
      <p className="mb-6 text-sm text-muted">
        Payweek needs one of these before you can log a shift. The first two
        boxes are enough to start — everything else can wait.
      </p>
      <AgencyFormFields
        submitLabel="Add agency"
        pending={saving}
        error={insertAgency.error}
        onSubmit={(values, plan: RatePlan) => {
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
              navigate(`/agencies/${agency.id}`)
            },
            onError: () => setSaving(false),
          })
        }}
      />
    </>
  )
}
