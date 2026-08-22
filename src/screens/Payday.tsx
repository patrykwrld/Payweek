import { Link } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { EmptyState, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { formatMinutes, formatPence, formatRate } from '../lib/money'
import {
  buildAgencyWeeks,
  comparePayslip,
  holidayAccrualPence,
  type AgencyWeek,
} from '../lib/payday'
import { usePayslips, useProfile } from '../lib/queries'
import { formatDay, todayISO } from '../lib/weeks'

/**
 * What each week is worth and when it lands.
 *
 * A flat stack of cards said nothing about sequence — every week looked
 * equally settled whether it was paid a month ago or still being worked. The
 * rail turns them into a timeline, and the dot on each one carries its state
 * in a glance: blue still coming, green paid and correct, red short.
 */
type Status =
  | { kind: 'upcoming'; label: string }
  | { kind: 'match'; label: string }
  | { kind: 'short'; label: string }
  | { kind: 'over'; label: string }
  | { kind: 'unpaid'; label: string }

function statusOf(
  week: AgencyWeek,
  paidPence: number | undefined,
  today: string,
): Status {
  // A payslip that has arrived is the truth, whatever the calendar says.
  if (paidPence !== undefined) {
    const verdict = comparePayslip(week.grossPence, paidPence)
    if (verdict.status === 'match')
      return { kind: 'match', label: 'paid · matches ✓' }
    if (verdict.status === 'short')
      return { kind: 'short', label: `${formatPence(verdict.diffPence)} short` }
    return { kind: 'over', label: `${formatPence(verdict.diffPence)} over` }
  }

  const days = differenceInCalendarDays(
    parseISO(week.paydayDate),
    parseISO(today),
  )
  if (days > 1) return { kind: 'upcoming', label: `pays in ${days} days` }
  if (days === 1) return { kind: 'upcoming', label: 'pays tomorrow' }
  if (days === 0) return { kind: 'upcoming', label: 'pays today' }
  // Past its payday with no payslip saved. Not an error — just the nudge to
  // check it, which is the one thing this screen wants you to do.
  return { kind: 'unpaid', label: 'due · not checked' }
}

const CHIP: Record<Status['kind'], string> = {
  upcoming: 'bg-accent-soft text-accent',
  match: 'bg-positive/10 text-positive',
  short: 'bg-negative/10 text-negative',
  over: 'bg-warn/10 text-warn',
  unpaid: 'bg-edge text-muted',
}

const DOT: Record<Status['kind'], string> = {
  upcoming: 'border-accent',
  match: 'border-positive',
  short: 'border-negative',
  over: 'border-warn',
  unpaid: 'border-edge',
}

export function Payday() {
  const data = useAppData()
  const profile = useProfile()
  const payslips = usePayslips()
  const online = useIsOnline()

  if (data.status === 'pending' || profile.isPending || payslips.isPending) {
    return <ScreenSkeleton rows={3} />
  }
  if (data.status === 'error' || profile.isError || payslips.isError) {
    return <LoadFailed offline={!online} onRetry={data.retry} />
  }

  const { agencies, shifts, rules } = data
  const showAccrual = profile.data?.show_holiday_accrual ?? true
  const accrualPct = profile.data?.holiday_accrual_pct ?? 12.07
  const weeks = buildAgencyWeeks(shifts, agencies, rules)
  const today = todayISO()

  // Same key PayslipCheck saves under: agency plus the week it covers.
  const paidBy = new Map(
    payslips.data.map((slip) => [
      `${slip.agency_id}|${slip.period_start}`,
      slip.gross_pence,
    ]),
  )

  const byAgency = new Map<string, typeof weeks>()
  for (const week of weeks) {
    const list = byAgency.get(week.agency.id) ?? []
    list.push(week)
    byAgency.set(week.agency.id, list)
  }

  return (
    <>
      <ScreenTitle>Payday</ScreenTitle>
      <p className="mb-6 text-sm text-muted">
        What each pay week should be worth, and when it lands.
      </p>

      {weeks.length === 0 && (
        <EmptyState
          title="Nothing to pay yet"
          hint="Log shifts and each agency's pay weeks appear here with what to expect in the packet."
        />
      )}

      <div className="space-y-7">
        {[...byAgency.values()].map((agencyWeeks) => {
          const agency = agencyWeeks[0]!.agency
          return (
            <section key={agency.id}>
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  {agency.name}
                </h2>
                <p className="font-mono text-[11px] text-faint">
                  {formatRate(agency.base_rate_pence)} base
                </p>
              </div>

              {/* The rail is inset 10px top and bottom so it starts and ends
                  inside the first and last dot rather than running past them. */}
              <div className="relative pl-[22px]">
                <span
                  aria-hidden
                  className="absolute bottom-2.5 left-[5px] top-2.5 w-px bg-edge"
                />
                {agencyWeeks.map((week) => {
                  const accrual = holidayAccrualPence(
                    week.grossPence,
                    accrualPct,
                  )
                  const status = statusOf(
                    week,
                    paidBy.get(`${week.agency.id}|${week.weekStart}`),
                    today,
                  )
                  return (
                    <div key={week.weekStart} className="relative mb-2.5">
                      <span
                        aria-hidden
                        className={`absolute -left-[21px] top-5 size-[11px] rounded-full border-2 bg-void ${
                          DOT[status.kind]
                        }`}
                      />
                      <div className="card-raised rounded-[18px] border border-edge bg-surface p-3.5">
                        <div className="flex items-baseline justify-between gap-2.5">
                          <p className="text-sm font-semibold">
                            Week ending {formatDay(week.weekEnd)}
                          </p>
                          <p className="font-mono text-[21px] font-[650] tracking-[-0.03em]">
                            {formatPence(week.grossPence)}
                          </p>
                        </div>
                        <p className="mt-1 font-mono text-[12.5px] text-muted">
                          {formatMinutes(week.paidMinutes)} across{' '}
                          {week.entries.length}{' '}
                          {week.entries.length === 1 ? 'shift' : 'shifts'} ·
                          pays {formatDay(week.paydayDate)}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg px-2.5 py-1 font-mono text-[11.5px] font-semibold ${
                              CHIP[status.kind]
                            }`}
                          >
                            {status.label}
                          </span>
                          {showAccrual && (
                            <span className="font-mono text-[11.5px] text-faint">
                              holiday {accrualPct}%{' '}
                              <span className="text-muted">
                                +{formatPence(accrual)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <Link
        to="/check"
        className="press card-raised mt-8 flex items-center justify-between rounded-2xl border border-edge bg-surface px-4 py-4 transition-colors hover:border-accent"
      >
        <span>
          <span className="block font-semibold">
            Been paid? Check the payslip
          </span>
          <span className="block text-sm text-muted">
            Type in what you were actually paid and see if it matches
          </span>
        </span>
        <span aria-hidden className="text-muted">
          ›
        </span>
      </Link>
    </>
  )
}
