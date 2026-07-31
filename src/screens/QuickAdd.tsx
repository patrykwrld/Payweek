import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShiftForm } from '../components/ShiftForm'
import { WeekHero } from '../components/WeekHero'
import { EmptyState, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { useInsertShift } from '../lib/queries'
import { weekPulse } from '../lib/weekPulse'
import { todayISO } from '../lib/weeks'

const NUDGE_DISMISSED = 'payweek-rates-nudge-dismissed'

export function QuickAdd() {
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

  // Confirmation clears itself. A message about something you did four
  // minutes ago is clutter, not reassurance.
  const [justLogged, setJustLogged] = useState<number | null>(null)
  useEffect(() => {
    if (justLogged === null) return
    const timer = setTimeout(() => setJustLogged(null), 4500)
    return () => clearTimeout(timer)
  }, [justLogged])

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
  const pulse = weekPulse(shifts, agencies, rules, todayISO())

  return (
    <>
      <ScreenTitle>
        Payweek<span className="text-accent">.</span>
      </ScreenTitle>

      <WeekHero pulse={pulse} />

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
          // Staying put is the point: the total above climbs by what was just
          // earned. Bouncing to a list would hide the one thing they came for.
          setJustLogged(Date.now())
        }}
      />

      {justLogged !== null && (
        <div
          role="status"
          className="rise fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-md px-5"
        >
          <div className="flex items-center gap-3 rounded-xl border border-positive/40 bg-surface px-4 py-3 shadow-lg shadow-black/40">
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full bg-positive/15 text-sm text-positive"
            >
              ✓
            </span>
            <p className="min-w-0 flex-1 text-sm">
              Logged. Your week is up there.
            </p>
            <Link
              to="/shifts"
              className="shrink-0 text-sm font-semibold text-accent"
            >
              See it
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
