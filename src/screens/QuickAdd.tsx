import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShiftForm } from '../components/ShiftForm'
import {
  Card,
  EmptyState,
  GhostButton,
  ScreenTitle,
} from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { formatMinutes, formatPence } from '../lib/money'
import { priceShifts } from '../lib/pricing'
import { useInsertShift } from '../lib/queries'
import { shiftDurationMinutes } from '../lib/rateEngine'
import { formatDay, payWeekEnd, todayISO } from '../lib/weeks'

export function QuickAdd() {
  const navigate = useNavigate()
  const data = useAppData()
  const online = useIsOnline()
  const insert = useInsertShift()
  const [repeated, setRepeated] = useState(false)

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
          title="No agencies yet"
          hint="Add the agency you work for and its rates — then logging a shift takes seconds."
        />
        <div className="mt-4">
          <Link
            to="/agencies/new"
            className="block w-full rounded-lg bg-accent px-4 py-3 text-center text-base font-semibold text-void"
          >
            Add your first agency
          </Link>
        </div>
      </>
    )
  }

  const last = shifts[0]
  const lastAgency = last
    ? agencies.find((a) => a.id === last.agency_id)
    : undefined

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

  function repeatLast() {
    if (!last) return
    insert.mutate(
      {
        agency_id: last.agency_id,
        date: todayISO(),
        start_time: last.start_time,
        end_time: last.end_time,
        break_minutes: last.break_minutes,
        breaks: last.breaks,
        manual_rate_pence: last.manual_rate_pence,
        notes: null,
      },
    )
    setRepeated(true)
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

      {last && lastAgency && (
        <div className="mt-4">
          <GhostButton onClick={repeatLast}>
            {repeated
              ? 'Added ✓'
              : `Repeat last: ${lastAgency.name} ${last.start_time.slice(0, 5)}–${last.end_time.slice(0, 5)} (${formatMinutes(
                  shiftDurationMinutes(last.start_time, last.end_time),
                )})`}
          </GhostButton>
          {last && (
            <p className="mt-1 text-center text-xs text-muted">
              Last shift: {formatDay(last.date)}
            </p>
          )}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Add a shift</h2>
      <ShiftForm
        agencies={agencies}
        rules={rules}
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
