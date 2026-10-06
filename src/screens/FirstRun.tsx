import { Link } from 'react-router-dom'
import { AgencyFormFields } from '../components/AgencyFormFields'
import { ErrorText } from '../components/ui'
import type { RatePlan } from '../lib/rateShapes'
import { useCreateAgency } from '../lib/useCreateAgency'

/**
 * What a brand new account sees.
 *
 * Half of everyone who has ever signed up never logged a single shift, and
 * the screen they landed on was a sentence explaining that Payweek needed an
 * agency, above a button that took them somewhere else to make one. Two
 * screens and a decision before anything happens.
 *
 * This is that form, here, on the screen they arrived at — so setting up is
 * one thing to fill in rather than a journey to find. The framing says how
 * long it takes and what comes next, because the honest answer to "why
 * bother" is that the next step is the one that pays.
 */
export function FirstRun() {
  const { create, saving, stranded, error } = useCreateAgency()

  if (stranded) {
    return (
      <>
        <h1 className="mb-2 text-[26px] font-semibold tracking-[-0.02em]">
          Nearly there
        </h1>
        <p className="mb-4 text-sm text-muted">
          You&rsquo;re set up, but one of the extra rates didn&rsquo;t save.
          Open it and add that rate again &mdash; don&rsquo;t fill this in a
          second time, or you&rsquo;ll end up with two.
        </p>
        <ErrorText error={stranded.error} />
        <Link
          to={`/agencies/${stranded.id}`}
          className="mt-4 inline-block text-accent underline underline-offset-4"
        >
          Open it
        </Link>
      </>
    )
  }

  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
        Step 1 of 2
      </p>
      <h1 className="mt-2 text-[30px] font-semibold leading-[1.12] tracking-[-0.025em]">
        Let&rsquo;s get you
        <br />
        set up.
      </h1>
      <p className="mb-7 mt-3 text-sm leading-relaxed text-muted">
        A name and your hourly rate is enough to start. Night and weekend rates
        come next, and you can leave those till later &mdash; Payweek just
        won&rsquo;t know about them until you do.
      </p>

      <AgencyFormFields
        submitLabel="Save and log a shift"
        pending={saving}
        error={error}
        // Stay put. The screen behind this is the one they wanted, and it is
        // ready the moment this saves.
        onSubmit={(values, plan: RatePlan) => create(values, plan, () => {})}
      />

      <p className="mt-5 text-center text-xs text-faint">
        Takes about thirty seconds. Nothing is shared with anyone.
      </p>
    </>
  )
}
