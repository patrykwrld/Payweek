import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShiftForm } from '../components/ShiftForm'
import { Card, EmptyState, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { formatMinutes, formatPence } from '../lib/money'
import { priceShifts } from '../lib/pricing'
import { useInsertShift } from '../lib/queries'
import { payWeekEnd, todayISO } from '../lib/weeks'

const NUDGE_DISMISSED = 'payweek-rates-nudge-dismissed'

export function QuickAdd() {
  const navigate = useNavigate()
  const data = useAppData()
  const online = useIsOnline()
  const insert = useInsertShift()
  // Say it once. Someone genuinely on a single flat rate shouldn't be told
  // about night pay every time they open the app.
  const [nudgeHidden, setNudgeHidden] = useState(
    () => localStorage.getItem(NUDGE_DISMISSED) === '1',
  )

  function hideNudge() {
    localStorage.setItem(NUDGE_DISMISSED, '1')
    setNudgeHidden(true)
  }

  if (data.status === 'pending') {
    return <ScreenSkeleton rows={3} />
  }
  if (data.status === 'error') {
    return <LoadFailed offline={!online} onRetry={data.retry} />
  }

  const { agencies, shifts, rules } = data
  const active = agencies.filter((a) => !a.archived)
  if (active.length === 0) {
    return (
      <>
        <ScreenTitle>
          Payweek<span className="text-accent">.</span>
        </ScreenTitle>
        <EmptyState
          title="One thing first"
          hint="Tell Payweek who you work for and what they pay you. After that, logging a shift takes seconds."
        />
        <div className="mt-4">
          <Link
            to="/agencies/new"
            className="block w-full rounded-lg bg-accent px-4 py-3 text-center text-base font-semibold text-void"
          >
            Add who you work for
          </Link>
        </div>
      </>
    )
  }

  // Nobody goes looking for a settings screen they've never seen, so if an
  // agency is still priced at one flat rate, say so where they already are.
  const noRates = active.filter(
    (a) => !rules.some((r) => r.agency_id === a.id && r.active),
  )

  const last = shifts[0]
  // Header number: totals across every shift whose agency pay week
  // contains today.
  const priced = priceShifts(shifts, agencies, rules)
  const today = todayISO()
  let weekMinutes = 0
  let weekGross = 0
  for (const { pricing, weekStart } of priced.values()) {
    if (today >= weekStart && today <= payWeekEnd(weekStart)) {
      weekMinutes += pricing.paidMinutes
      weekGross += pricing.grossPence
    }
  }

  return (
    <>
      <ScreenTitle>
        Payweek<span className="text-accent">.</span>
      </ScreenTitle>

      <Card>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          This pay week
        </p>
        <p className="mt-1 font-mono text-5xl font-semibold tracking-tight">
          {formatPence(weekGross)}
        </p>
        <p className="mt-1 text-sm text-muted">
          <span className="font-mono">{formatMinutes(weekMinutes)}</span> logged
        </p>
      </Card>

      {noRates.length > 0 && !nudgeHidden && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/5 pl-4 pr-2 py-3">
          <Link
            to={
              noRates.length === 1 && noRates[0]
                ? `/agencies/${noRates[0].id}`
                : '/agencies'
            }
            className="min-w-0 flex-1"
          >
            <span className="block font-semibold">
              Paid more at night or weekends?
            </span>
            <span className="block text-sm text-muted">
              {noRates.length === 1 && noRates[0]
                ? `${noRates[0].name} is priced at one flat rate. Set the extras.`
                : 'Some of your agencies are priced at one flat rate.'}
            </span>
          </Link>
          <button
            type="button"
            onClick={hideNudge}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg px-2 py-1 text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Add a shift</h2>
      <ShiftForm
        agencies={agencies}
        rules={rules}
        shifts={shifts}
        initial={
          last
            ? {
                agency_id: last.agency_id,
                start_time: last.start_time,
                end_time: last.end_time,
                break_minutes: last.break_minutes,
                breaks: last.breaks,
              }
            : undefined
        }
        submitLabel="Log shift"
        pending={insert.isPending}
        error={insert.error}
        onSubmit={(values) => {
          insert.mutate(values)
          navigate('/shifts')
        }}
      />
    </>
  )
}
