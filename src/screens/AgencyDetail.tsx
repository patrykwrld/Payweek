import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AgencyFormFields } from '../components/AgencyFormFields'
import { DAY_NAMES } from '../lib/days'
import { GhostButton, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { formatPence } from '../lib/money'
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
      ? `${formatPence(rule.rate_pence)} an hour`
      : `${rule.multiplier}× your normal rate`
  if (rule.kind === 'time_band') {
    const days = rule.days_of_week
      ? rule.days_of_week.map((d) => DAY_NAMES[d]).join(' & ')
      : 'Every day'
    const start = rule.band_start?.slice(0, 5)
    const end = rule.band_end?.slice(0, 5)
    // Equal start and end means the whole day, not a zero-length band.
    const when = start === end ? 'all day' : `${start}–${end}`
    return `${days}, ${when} → ${pay}`
  }
  const hours = (rule.threshold_minutes ?? 0) / 60
  const scope = rule.threshold_scope === 'shift' ? 'one shift' : 'the week'
  return `Past ${hours}h in ${scope} → ${pay}`
}

/** The three rates nearly everyone has. Shown as buttons so nobody has to
 * discover that "Add rule" is where night pay lives. `covered` decides whether
 * the agency already has one, so the offer disappears once taken up. */
const PRESETS = [
  {
    key: 'night',
    label: 'Add night rate',
    hint: 'More per hour after dark',
    covered: (r: { kind: string; band_start: string | null; band_end: string | null }) =>
      // A band that starts in the evening and ends in the morning.
      r.kind === 'time_band' &&
      r.band_start !== null &&
      r.band_end !== null &&
      r.band_start > r.band_end,
  },
  {
    key: 'weekend',
    label: 'Add weekend rate',
    hint: 'Different on Sat & Sun',
    covered: (r: { kind: string; days_of_week: number[] | null }) =>
      r.kind === 'time_band' &&
      r.days_of_week !== null &&
      r.days_of_week.every((d) => d === 0 || d === 6),
  },
  {
    key: 'overtime',
    label: 'Add overtime',
    hint: 'After so many hours',
    covered: (r: { kind: string }) => r.kind === 'threshold',
  },
] as const

export function AgencyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const agencies = useAgencies()
  const rules = useRateRules()
  const update = useUpdateAgency()
  const online = useIsOnline()

  const remove = useDeleteAgency()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (agencies.isPending || rules.isPending) {
    return <ScreenSkeleton rows={2} />
  }
  if (agencies.isError || rules.isError) {
    return (
      <LoadFailed
        offline={!online}
        onRetry={() => {
          void agencies.refetch(); void rules.refetch()
        }}
      />
    )
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
            Normally{' '}
            <span className="font-mono">{formatPence(agency.base_rate_pence)}</span>{' '}
            an hour · paid {agency.pay_cycle} · week starts{' '}
            {DAY_NAMES[agency.pay_week_start_day]}
          </p>

          <h2 className="text-lg font-semibold">Extra rates</h2>
          <p className="mb-3 text-sm text-muted">
            Hours that pay more than{' '}
            <span className="font-mono">{formatPence(agency.base_rate_pence)}</span>
            . Without these, every hour is priced at your normal rate.
          </p>

          {agencyRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-edge p-5 text-center">
              <p className="font-semibold">Nothing extra yet</p>
              <p className="mt-1 text-sm text-muted">
                Paid more at night, at weekends, or after a certain number of
                hours? Add it here.
              </p>
            </div>
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
                    {!rule.active && ' (paused)'}
                  </p>
                  <p className="text-sm text-muted">{describeRule(rule)}</p>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-3 grid gap-2">
            {PRESETS.filter(
              (preset) => !agencyRules.some((rule) => preset.covered(rule)),
            ).map((preset) => (
              <Link
                key={preset.key}
                to={`/agencies/${agency.id}/rules/new?preset=${preset.key}`}
                className="flex items-center justify-between rounded-xl border border-edge bg-surface px-4 py-3 transition-colors hover:border-accent"
              >
                <span>
                  <span className="block font-semibold">{preset.label}</span>
                  <span className="block text-sm text-muted">{preset.hint}</span>
                </span>
                <span aria-hidden className="text-xl text-muted">
                  +
                </span>
              </Link>
            ))}
            <Link
              to={`/agencies/${agency.id}/rules/new`}
              className="py-1 text-center text-sm text-accent underline underline-offset-4"
            >
              Add a different rate
            </Link>
          </div>
        </>

      )}
    </>
  )
}
