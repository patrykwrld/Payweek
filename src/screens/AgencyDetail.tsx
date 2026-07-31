import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AgencyFormFields,
  type AgencyFormValues,
} from '../components/AgencyFormFields'
import { DAY_NAMES } from '../lib/days'
import { ErrorText, GhostButton, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { formatPence } from '../lib/money'
import { priceShifts } from '../lib/pricing'
import {
  findNightRule,
  findWeekendRule,
  otherRules,
  planRateChanges,
  type RatePlan,
} from '../lib/rateShapes'
import {
  useAgencies,
  useDeleteAgency,
  useDeleteRule,
  useInsertRule,
  useRateRules,
  useShifts,
  useUpdateAgency,
  useUpdateRule,
} from '../lib/queries'

/** Anything the tick boxes don't cover, in a sentence. */
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
      ? // Stored Sunday-first, but read Monday-first: "Sat & Sun", not "Sun & Sat".
        [...rule.days_of_week]
          .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
          .map((d) => DAY_NAMES[d])
          .join(' & ')
      : 'Every day'
    const start = rule.band_start?.slice(0, 5)
    const end = rule.band_end?.slice(0, 5)
    const when = start === end ? 'all day' : `${start}–${end}`
    return `${days}, ${when} → ${pay}`
  }
  const hours = (rule.threshold_minutes ?? 0) / 60
  const scope = rule.threshold_scope === 'shift' ? 'one shift' : 'the week'
  return `Past ${hours}h in ${scope} → ${pay}`
}

export function AgencyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const agencies = useAgencies()
  const rules = useRateRules()
  const shifts = useShifts()
  const online = useIsOnline()

  const update = useUpdateAgency()
  const insertRule = useInsertRule()
  const updateRule = useUpdateRule()
  const deleteRule = useDeleteRule()
  const remove = useDeleteAgency()

  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (agencies.isPending || rules.isPending || shifts.isPending) {
    return <ScreenSkeleton rows={2} />
  }
  if (agencies.isError || rules.isError || shifts.isError) {
    return (
      <LoadFailed
        offline={!online}
        onRetry={() => {
          void agencies.refetch(); void rules.refetch(); void shifts.refetch()
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
  const unusual = otherRules(agencyRules)

  // Deleting an agency cascades to its shifts, so say how much goes with it.
  const shiftCount = shifts.data.filter((s) => s.agency_id === agency.id).length
  const shiftValue = [...priceShifts(shifts.data, agencies.data, rules.data)]
    .filter(([, entry]) => entry.shift.agency_id === agency.id)
    .reduce((sum, [, entry]) => sum + entry.pricing.grossPence, 0)

  async function save(values: AgencyFormValues, plan: RatePlan) {
    if (!agency) return
    setSaving(true)
    setSavedTick(false)
    setSaveError(null)
    const change = planRateChanges(plan, agencyRules)
    try {
      await update.mutateAsync({ ...values, id: agency.id })
      for (const rule of change.insert) {
        await insertRule.mutateAsync({ ...rule, agency_id: agency.id })
      }
      for (const rule of change.update) await updateRule.mutateAsync(rule)
      for (const ruleId of change.deleteIds) await deleteRule.mutateAsync(ruleId)
      setSavedTick(true)
    } catch (error) {
      setSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ScreenTitle>{agency.name}</ScreenTitle>

      {/* Keyed on which rules seed the tick boxes. Arriving here straight from
          "add agency" renders before the rules query has caught up, and the
          form reads its initial state once — without this the night rate you
          just set would show as unticked. Keyed on ids, not values, so a
          background refetch doesn't wipe out what someone is typing. */}
      <AgencyFormFields
        key={`${findNightRule(agencyRules)?.id ?? '-'}:${
          findWeekendRule(agencyRules)?.id ?? '-'
        }`}
        initial={agency}
        rules={agencyRules}
        submitLabel={savedTick && !saving ? 'Saved ✓' : 'Save changes'}
        pending={saving}
        error={saveError}
        onSubmit={(values, plan) => void save(values, plan)}
      />

      {unusual.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold">Other rates</h2>
          <div className="overflow-hidden rounded-2xl border border-edge bg-surface">
            {unusual.map((rule, i) => (
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
        </section>
      )}

      <div className="mt-8 space-y-3">
        {/* The escape hatch for anything the two tick boxes can't say. Quiet
            on purpose — almost nobody needs it. */}
        <Link
          to={`/agencies/${agency.id}/rules/new`}
          className="block py-1 text-center text-sm text-accent underline underline-offset-4"
        >
          Add an unusual rate
        </Link>

        <GhostButton
          onClick={() =>
            update.mutate({ id: agency.id, archived: !agency.archived })
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
            remove.mutate(agency.id, { onSuccess: () => navigate('/agencies') })
          }}
        >
          {confirmDelete
            ? `Tap again to delete — ${
                shiftCount === 1 ? '1 shift goes' : `${shiftCount} shifts go`
              } with it`
            : 'Delete agency'}
        </GhostButton>
        {confirmDelete && shiftCount > 0 && (
          <p className="text-center text-sm text-muted">
            That&rsquo;s{' '}
            <span className="font-mono">{formatPence(shiftValue)}</span> of
            logged pay. Export from Settings first if you need the record.
          </p>
        )}
        <ErrorText error={remove.error} />
      </div>
    </>
  )
}
