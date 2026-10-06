import { Link, useNavigate } from 'react-router-dom'
import { AgencyFormFields } from '../components/AgencyFormFields'
import { ErrorText, ScreenTitle } from '../components/ui'
import type { RatePlan } from '../lib/rateShapes'
import { useCreateAgency } from '../lib/useCreateAgency'

export function AgencyNew() {
  const navigate = useNavigate()
  const { create, saving, stranded, error } = useCreateAgency()

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
        error={error}
        onSubmit={(values, plan: RatePlan) =>
          create(values, plan, (id) => navigate(`/agencies/${id}`))
        }
      />
    </>
  )
}
