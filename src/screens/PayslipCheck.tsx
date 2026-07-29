import { useMemo, useState } from 'react'
import {
  Card,
  EmptyState,
  ErrorText,
  Field,
  PrimaryButton,
  ScreenTitle,
  inputCls,
  selectCls,
} from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { formatMinutes, formatPence, parsePoundsToPence } from '../lib/money'
import { buildAgencyWeeks, comparePayslip } from '../lib/payday'
import {
  useAgencies,
  useDeletePayslip,
  useInsertPayslip,
  usePayslips,
  useRateRules,
  useShifts,
} from '../lib/queries'
import { formatDay } from '../lib/weeks'

export function PayslipCheck() {
  const agencies = useAgencies()
  const shifts = useShifts()
  const rules = useRateRules()
  const payslips = usePayslips()
  const insert = useInsertPayslip()
  const remove = useDeletePayslip()
  const online = useIsOnline()


  const [agencyId, setAgencyId] = useState('')
  const [weekStart, setWeekStart] = useState('')
  const [grossInput, setGrossInput] = useState('')
  const [saved, setSaved] = useState(false)

  const ready =
    !agencies.isPending && !shifts.isPending && !rules.isPending && !payslips.isPending
  const failed =
    agencies.isError || shifts.isError || rules.isError || payslips.isError

  const weeks = useMemo(
    () =>
      ready && !failed
        ? buildAgencyWeeks(shifts.data!, agencies.data!, rules.data!)
        : [],
    [ready, failed, shifts.data, agencies.data, rules.data],
  )

  if (!ready) return <ScreenSkeleton rows={3} />
  if (failed) return (
      <LoadFailed
        offline={!online}
        onRetry={() => {
          void agencies.refetch(); void shifts.refetch(); void rules.refetch(); void payslips.refetch()
        }}
      />
    )

  const agencyIds = [...new Set(weeks.map((w) => w.agency.id))]
  const effectiveAgencyId = agencyId || agencyIds[0] || ''
  const agencyWeeks = weeks.filter((w) => w.agency.id === effectiveAgencyId)
  const effectiveWeekStart =
    agencyWeeks.find((w) => w.weekStart === weekStart)?.weekStart ??
    agencyWeeks[0]?.weekStart ??
    ''
  const week = agencyWeeks.find((w) => w.weekStart === effectiveWeekStart)

  const paidPence = parsePoundsToPence(grossInput)
  const verdict =
    week && paidPence !== null ? comparePayslip(week.grossPence, paidPence) : null

  function save() {
    if (!week || paidPence === null) return
    insert.mutate(
      {
        agency_id: week.agency.id,
        period_start: week.weekStart,
        period_end: week.weekEnd,
        gross_pence: paidPence,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  if (weeks.length === 0) {
    return (
      <>
        <ScreenTitle>Payslip check</ScreenTitle>
        <EmptyState
          title="Nothing to check yet"
          hint="Once you've logged shifts, compare a payslip's gross against what Payweek expected."
        />
      </>
    )
  }

  return (
    <>
      <ScreenTitle>Payslip check</ScreenTitle>

      <div className="space-y-4">
        <Field label="Agency">
          <select
            value={effectiveAgencyId}
            onChange={(e) => {
              setAgencyId(e.target.value)
              setWeekStart('')
              setSaved(false)
            }}
            className={selectCls}
          >
            {agencyIds.map((id) => (
              <option key={id} value={id}>
                {weeks.find((w) => w.agency.id === id)!.agency.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pay week">
          <select
            value={effectiveWeekStart}
            onChange={(e) => {
              setWeekStart(e.target.value)
              setSaved(false)
            }}
            className={selectCls}
          >
            {agencyWeeks.map((w) => (
              <option key={w.weekStart} value={w.weekStart}>
                w/e {formatDay(w.weekEnd)} · {formatPence(w.grossPence)} expected
              </option>
            ))}
          </select>
        </Field>

        <Field label="Gross on the payslip £">
          <input
            value={grossInput}
            onChange={(e) => {
              setGrossInput(e.target.value)
              setSaved(false)
            }}
            className={inputCls}
            inputMode="decimal"
            placeholder="512.30"
          />
        </Field>

        {week && verdict && (
          <Card>
            {verdict.status === 'match' ? (
              <p className="font-semibold text-emerald-400">
                Matches — {formatPence(week.grossPence)} as expected ✓
              </p>
            ) : verdict.status === 'short' ? (
              <p className="font-semibold text-red-400">
                {formatPence(verdict.diffPence)} short of the expected{' '}
                {formatPence(week.grossPence)}
              </p>
            ) : (
              <p className="font-semibold text-accent">
                {formatPence(verdict.diffPence)} over the expected{' '}
                {formatPence(week.grossPence)}
              </p>
            )}

            <ul className="mt-3 space-y-2 border-t border-edge pt-3">
              {week.entries.map((entry) => (
                <li
                  key={entry.shift.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {formatDay(entry.shift.date)}{' '}
                    <span className="text-muted">
                      <span className="font-mono">
                        {entry.shift.start_time.slice(0, 5)}–
                        {entry.shift.end_time.slice(0, 5)}
                      </span>{' '}
                      ·{' '}
                      <span className="font-mono">
                        {formatMinutes(entry.pricing.paidMinutes)}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono">
                    {formatPence(entry.pricing.grossPence)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <PrimaryButton
                type="button"
                onClick={save}
                disabled={insert.isPending || saved}
              >
                {saved ? 'Saved ✓' : 'Save this payslip'}
              </PrimaryButton>
              <ErrorText error={insert.error} />
            </div>
          </Card>
        )}
      </div>

      {payslips.data.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Saved payslips
          </h2>
          <div className="overflow-hidden rounded-xl border border-edge bg-surface">
            {payslips.data.map((slip, i) => {
              const slipWeek = weeks.find(
                (w) =>
                  w.agency.id === slip.agency_id &&
                  w.weekStart === slip.period_start,
              )
              const slipVerdict = slipWeek
                ? comparePayslip(slipWeek.grossPence, slip.gross_pence)
                : null
              return (
                <div
                  key={slip.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i > 0 ? 'border-t border-edge' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {slipWeek?.agency.name ?? 'Agency'} · w/e{' '}
                      {formatDay(slip.period_end)}
                    </p>
                    <p className="text-sm text-muted">
                      <span className="font-mono">
                        {formatPence(slip.gross_pence)}
                      </span>{' '}
                      {slipVerdict === null
                        ? ''
                        : slipVerdict.status === 'match'
                          ? '· matches ✓'
                          : slipVerdict.status === 'short'
                            ? `· ${formatPence(slipVerdict.diffPence)} short`
                            : `· ${formatPence(slipVerdict.diffPence)} over`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(slip.id)}
                    className="text-sm text-muted hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
