import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AgencyFormFields } from '../components/AgencyFormFields'
import { DAY_NAMES } from '../lib/days'
import { EmptyState, GhostButton, ScreenTitle } from '../components/ui'
import { formatRate } from '../lib/money'
import {
  useAgencies,
  useDeleteAgency,
  useRateRules,
  useUpdateAgency,
} from '../lib/queries'

function describeRule(rule: {
  kind: string
  days_of_week: number[] | null
  band_start: string | null
  band_end: string | null
  threshold_minutes: number | null
  threshold_scope: string | null
  rate_pence: number | null
  multiplier: number | null
}): string {
  const pay =
    rule.rate_pence !== null
      ? formatRate(rule.rate_pence)
      : `×${rule.multiplier}`
  if (rule.kind === 'time_band') {
    const days = rule.days_of_week
      ? rule.days_of_week.map((d) => DAY_NAMES[d]).join(' ')
      : 'Every day'
    return `${days} ${rule.band_start?.slice(0, 5)}–${rule.band_end?.slice(0, 5)} → ${pay}`
  }
  const hours = (rule.threshold_minutes ?? 0) / 60
  const scope = rule.threshold_scope === 'shift' ? 'a shift' : 'the pay week'
  return `After ${hours}h in ${scope} → ${pay}`
}

export function AgencyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const agencies = useAgencies()
  const rules = useRateRules()
  const update = useUpdateAgency()
  const remove = useDeleteAgency()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (agencies.isPending || rules.isPending) {
    return <p className="text-muted">Loading…</p>
  }
  if (agencies.isError || rules.isError) {
    return <p className="text-red-400">Couldn&rsquo;t load.</p>
  }

  const agency = agencies.data.find((a) => a.id === id)
  if (!agency) {
    return (
      <>
        <ScreenTitle>Agency</ScreenTitle>
        <p className="text-muted">
          Not found.{' '}
          <Link to="/agencies" className="text-accent underline underline-offset-4">
            Back
          </Link>
        </p>
      </>
    )
  }

  const agencyRules = rules.data.filter((r) => r.agency_id === agency.id)

  return (
    <>
      <ScreenTitle
        action={
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="text-sm text-accent underline underline-offset-4"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        }
      >
        {agency.name}
      </ScreenTitle>

      {editing ? (
        <>
          <AgencyFormFields
            initial={agency}
            submitLabel="Save changes"
            pending={update.isPending}
            error={update.error}
            onSubmit={(values) =>
              update.mutate(
                { id: agency.id, ...values },
                { onSuccess: () => setEditing(false) },
              )
            }
          />
          <div className="mt-4 space-y-3">
            <GhostButton
              onClick={() =>
                update.mutate(
                  { id: agency.id, archived: !agency.archived },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              {agency.archived ? 'Unarchive' : 'Archive'}
            </GhostButton>
            <GhostButton
              danger
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true)
                  return
                }
                remove.mutate(agency.id, {
                  onSuccess: () => navigate('/agencies'),
                })
              }}
            >
              {confirmDelete
                ? 'Tap again — deletes its shifts too'
                : 'Delete agency'}
            </GhostButton>
          </div>
        </>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted">
            <span className="font-mono">{formatRate(agency.base_rate_pence)}</span>{' '}
            base · paid {agency.pay_cycle} · week starts{' '}
            {DAY_NAMES[agency.pay_week_start_day]}
          </p>

          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Rate rules</h2>
            <Link
              to={`/agencies/${agency.id}/rules/new`}
              className="text-sm text-accent underline underline-offset-4"
            >
              Add rule
            </Link>
          </div>

          {agencyRules.length === 0 ? (
            <EmptyState
              title="No rules — every hour pays base rate"
              hint="Add night, weekend or overtime rates and Payweek prices each minute."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-edge bg-surface">
              {agencyRules.map((rule, i) => (
                <Link
                  key={rule.id}
                  to={`/agencies/${agency.id}/rules/${rule.id}`}
                  className={`block px-4 py-3 ${i > 0 ? 'border-t border-edge' : ''} ${
                    rule.active ? '' : 'opacity-50'
                  }`}
                >
                  <p className="font-semibold">
                    {rule.label}
                    {!rule.active && ' (off)'}
                  </p>
                  <p className="font-mono text-sm text-muted">
                    {describeRule(rule)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
