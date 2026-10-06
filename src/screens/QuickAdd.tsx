import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ShiftForm } from '../components/ShiftForm'
import { FirstRun } from './FirstRun'
import { WeekHero } from '../components/WeekHero'
import { Sheet, SheetHeader } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { formatMinutes, formatPence } from '../lib/money'
import { priceShifts } from '../lib/pricing'
import { useInsertPayslip, useInsertShift, usePayslips } from '../lib/queries'
import { buildAgencyWeeks } from '../lib/payday'
import { nextWeekToCheck } from '../lib/payslipCheck'
import { weekPulse } from '../lib/weekPulse'
import { formatDay, todayISO } from '../lib/weeks'
import type { Tables } from '../lib/database.types'

const NUDGE_DISMISSED = 'payweek-rates-nudge-dismissed'
const CLOCK_KEY = 'payweek-clocked-in-at'

/** Minutes elapsed since an ISO instant, floored at zero. */
function minutesSince(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 60000))
}

export function QuickAdd() {
  const data = useAppData()
  const online = useIsOnline()
  const insert = useInsertShift()
  const payslips = usePayslips()
  const confirmPayslip = useInsertPayslip()

  const [nudgeHidden, setNudgeHidden] = useState(
    () => localStorage.getItem(NUDGE_DISMISSED) === '1',
  )

  function hideNudge() {
    localStorage.setItem(NUDGE_DISMISSED, '1')
    setNudgeHidden(true)
  }

  const [sheetOpen, setSheetOpen] = useState(false)

  /* The clock survives the app being backgrounded, which on a phone it will
     be for the whole shift. Only the start instant is stored; the elapsed
     time is derived on every read, so a WebView that was frozen for six hours
     wakes up with the right number rather than the one it fell asleep on. */
  const [clockedInAt, setClockedInAt] = useState<string | null>(() =>
    localStorage.getItem(CLOCK_KEY),
  )
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (clockedInAt === null) return
    const timer = setInterval(() => forceTick((n) => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [clockedInAt])

  // Confirmation clears itself. A message about something you did four
  // minutes ago is clutter, not reassurance.
  const [justLogged, setJustLogged] = useState<string | null>(null)
  useEffect(() => {
    if (justLogged === null) return
    const timer = setTimeout(() => setJustLogged(null), 4200)
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
  if (active.length === 0) return <FirstRun />

  const noRates = active.filter(
    (a) => !rules.some((r) => r.agency_id === a.id && r.active),
  )

  const today = todayISO()
  const priced = priceShifts(shifts, agencies, rules)
  const pulse = weekPulse(shifts, agencies, rules, today)

  // Only ask once the payslips are in hand; asking about a week that has
  // already been checked is worse than not asking at all.
  const toCheck = payslips.data
    ? nextWeekToCheck(buildAgencyWeeks(shifts, agencies, rules), payslips.data, today)
    : null

  const last = shifts[0]
  const lastPriced = last ? priced.get(last.id) : undefined

  /** Price a row that hasn't been saved yet, so the toast can name the money. */
  function grossOf(row: Tables<'shifts'>): number {
    return (
      priceShifts([row], agencies, rules).get(row.id)?.pricing.grossPence ?? 0
    )
  }

  function log(
    values: Omit<Tables<'shifts'>, 'id' | 'user_id' | 'created_at'>,
  ) {
    const row: Tables<'shifts'> = {
      ...values,
      id: `local-${Date.now()}`,
      user_id: '',
      created_at: new Date().toISOString(),
    }
    const { id: _id, user_id: _user, created_at: _created, ...insertable } = row
    insert.mutate(insertable)
    setSheetOpen(false)
    // The amount is the point: it is what the hero figure is about to climb by.
    setJustLogged(`Logged ${formatPence(grossOf(row))} · your week is up there`)
  }

  function clockIn() {
    const now = new Date().toISOString()
    localStorage.setItem(CLOCK_KEY, now)
    setClockedInAt(now)
  }

  function clockOut() {
    if (clockedInAt === null || !last) return
    // Rounded to five minutes, because nobody's shift genuinely ended at
    // 17:43 and a tidy figure is easier to check against a payslip.
    const minutes = Math.max(5, Math.round(minutesSince(clockedInAt) / 5) * 5)
    const start = new Date(clockedInAt)
    const end = new Date(start.getTime() + minutes * 60_000)
    localStorage.removeItem(CLOCK_KEY)
    setClockedInAt(null)
    log({
      agency_id: last.agency_id,
      date: format(start, 'yyyy-MM-dd'),
      start_time: format(start, 'HH:mm'),
      end_time: format(end, 'HH:mm'),
      break_minutes: 0,
      breaks: [],
      manual_rate_pence: null,
      notes: null,
    })
  }

  const clockMinutes = clockedInAt === null ? 0 : minutesSince(clockedInAt)

  return (
    <>
      {/* The sidebar carries the name from `md` up, so showing it twice would
          just be the logo saying hello to itself. */}
      <div className="md:hidden">
        <header className="mb-6 flex items-baseline justify-between gap-3">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
            Payweek<span className="text-accent">.</span>
          </h1>
          <p className="font-mono text-xs text-faint">
            {format(parseISO(today), 'EEE d MMM')}
          </p>
        </header>
      </div>

      {clockedInAt !== null && (
        <div className="rise mb-3 flex items-center gap-3 rounded-2xl border border-positive/40 bg-positive/[0.07] px-3.5 py-3">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-positive shadow-[0_0_0_4px_rgba(58,210,159,0.18)]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">
              On the clock ·{' '}
              <span className="font-mono">{formatMinutes(clockMinutes)}</span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted">
              since {format(parseISO(clockedInAt), 'HH:mm')}
            </p>
          </div>
          <button
            type="button"
            onClick={clockOut}
            className="press min-h-9 shrink-0 rounded-xl border border-positive px-3.5 text-[13px] font-semibold text-positive"
          >
            Clock out
          </button>
        </div>
      )}

      <WeekHero pulse={pulse} />

      {/* One thing to tap, then two shortcuts for the shapes a week
          usually takes. This used to be the other way round, with the
          accent button carrying a glow underneath two filled cards — three
          competing invitations, and the loudest of them sat directly beneath
          the week total it was outshouting. The palette's own rule is that
          accent means the number you came for or the thing to tap next, and
          it cannot mean both on one screen. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="press mt-4 min-h-[52px] w-full rounded-2xl bg-accent text-[15.5px] font-semibold text-void"
      >
        Add a shift
      </button>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={!last}
          onClick={() => {
            if (!last) return
            const { id: _id, user_id: _u, created_at: _c, ...rest } = last
            log({ ...rest, date: today })
          }}
          className="press flex min-h-[46px] items-center justify-center rounded-xl border border-edge px-3 text-[13.5px] font-semibold disabled:opacity-40"
        >
          {last && lastPriced
            ? `Repeat ${formatDay(last.date).split(' ')[0] ?? 'last'}`
            : 'Repeat last'}
        </button>
        <button
          type="button"
          onClick={clockedInAt === null ? clockIn : clockOut}
          className="press flex min-h-[46px] items-center justify-center rounded-xl border border-edge px-3 text-[13.5px] font-semibold"
        >
          {clockedInAt === null ? 'Clock in' : 'Clock out'}
        </button>
      </div>

      {/* The reason this screen exists at all. One week, one number, one
          tap — a prompt that says "3 weeks need checking" is a chore, and a
          chore gets swiped away. "Looked right" records the expected figure
          so confirming a correct week costs nothing and still clears it. */}
      {toCheck !== null && (
        <div className="rise mt-4 rounded-2xl border border-warn/40 bg-warn/[0.06] px-4 py-3.5">
          <p className="text-[14.5px] font-semibold">
            {formatDay(toCheck.weekEnd)} should have paid{' '}
            <span className="font-mono">{formatPence(toCheck.grossPence)}</span>
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {toCheck.agency.name} paid it on {formatDay(toCheck.paydayDate)}. Did
            the right number land?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Link
              to="/payday"
              className="press flex min-h-[42px] items-center justify-center rounded-xl border border-warn/60 text-[13.5px] font-semibold text-warn"
            >
              Check it
            </Link>
            <button
              type="button"
              disabled={confirmPayslip.isPending}
              onClick={() =>
                confirmPayslip.mutate({
                  agency_id: toCheck.agency.id,
                  period_start: toCheck.weekStart,
                  period_end: toCheck.weekEnd,
                  gross_pence: toCheck.grossPence,
                  net_pence: null,
                })
              }
              className="press flex min-h-[42px] items-center justify-center rounded-xl border border-edge text-[13.5px] font-semibold text-muted disabled:opacity-40"
            >
              Looked right
            </button>
          </div>
        </div>
      )}

      {noRates.length > 0 && !nudgeHidden && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/5 py-3 pl-4 pr-2">
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

      {/* The form used to sit on the page, which made the home screen a tall
          stiff column you scrolled past to reach anything else. In a sheet it
          is one job, and the screen underneath keeps its place. */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add a shift"
      >
        <SheetHeader title="Add a shift" onClose={() => setSheetOpen(false)} />
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
          onSubmit={(values) => log(values)}
        />
      </Sheet>

      {justLogged !== null && (
        <div
          role="status"
          className="rise fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-md px-5 md:bottom-8 md:left-60 md:max-w-2xl md:px-8"
        >
          <div className="flex items-center gap-3 rounded-xl border border-positive/40 bg-surface px-4 py-3 shadow-lg shadow-black/40">
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full bg-positive/15 text-sm text-positive"
            >
              ✓
            </span>
            <p className="min-w-0 flex-1 font-mono text-sm">{justLogged}</p>
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
