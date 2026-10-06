import { useState } from 'react'
import { Link } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { EmptyState, ErrorText, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { formatMinutes, formatPence, formatRate } from '../lib/money'
import {
  buildAgencyWeeks,
  comparePayslip,
  holidayAccrualPence,
  type AgencyWeek,
  type PayslipVerdict,
} from '../lib/payday'
import { nextWeekToCheck } from '../lib/payslipCheck'
import { parsePoundsToPence } from '../lib/money'
import { useInsertPayslip, usePayslips, useProfile } from '../lib/queries'
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

/**
 * The week whose money has landed and which nobody has confirmed, with the
 * box to confirm it in.
 *
 * This is the whole reason the screen was rearranged. The check was a card at
 * the bottom of Payday, below every agency — reachable, and reached once in
 * the life of the app against eighty-four logged shifts. Asking at the top,
 * on the one week it is actually about, with the number already worked out
 * and a single field to compare it against, is the difference between a
 * feature and a question somebody answers.
 */
function NeedsChecking({ week }: { week: AgencyWeek }) {
  const insert = useInsertPayslip()
  const [input, setInput] = useState('')
  const [verdict, setVerdict] = useState<PayslipVerdict | null>(null)

  const paidPence = parsePoundsToPence(input)
  const canSubmit = paidPence !== null && !insert.isPending

  function submit(pence: number) {
    insert.mutate(
      {
        agency_id: week.agency.id,
        period_start: week.weekStart,
        period_end: week.weekEnd,
        gross_pence: pence,
        net_pence: null,
      },
      { onSuccess: () => setVerdict(comparePayslip(week.grossPence, pence)) },
    )
  }

  if (verdict) {
    const good = verdict.status === 'match'
    return (
      <div
        role="status"
        className={`rise mb-7 rounded-2xl border px-4 py-4 ${
          good ? 'border-positive/40 bg-positive/[0.07]' : 'border-negative/50 bg-negative/[0.06]'
        }`}
      >
        <p className="text-[15px] font-semibold">
          {good
            ? 'Matched to the penny.'
            : verdict.status === 'short'
            ? `You're ${formatPence(verdict.diffPence)} short.`
            : `They paid ${formatPence(verdict.diffPence)} over.`}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {formatDay(week.weekEnd)} · your hours come to{' '}
          <span className="font-mono">{formatPence(week.grossPence)}</span>
          {!good && '. Worth asking about.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mb-7 rounded-2xl border border-warn/40 bg-warn/[0.06] px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-warn">
          Needs checking
        </p>
        <p className="font-mono text-[11px] text-faint">
          paid {formatDay(week.paydayDate)}
        </p>
      </div>
      <p className="mt-2.5 text-[15px] font-semibold">
        {week.agency.name} · {formatDay(week.weekEnd)}
      </p>
      <p className="mt-1 font-mono text-[28px] font-bold tracking-[-0.03em]">
        {formatPence(week.grossPence)}
      </p>
      <p className="mt-0.5 text-[13px] text-muted">is what your hours come to</p>

      <label className="mt-4 block text-[13px] font-semibold">
        What did the payslip actually say?
        <div className="mt-2 flex gap-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Gross pay on the payslip"
            className="min-h-[46px] w-full flex-1 rounded-xl border border-warn/40 bg-void px-3.5 font-mono text-[17px] font-semibold outline-none placeholder:text-faint focus:border-warn"
          />
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => paidPence !== null && submit(paidPence)}
            className="press min-h-[46px] shrink-0 rounded-xl bg-accent px-5 text-[14px] font-semibold text-void disabled:opacity-40"
          >
            Check
          </button>
        </div>
      </label>

      <button
        type="button"
        disabled={insert.isPending}
        onClick={() => submit(week.grossPence)}
        className="press mt-2.5 min-h-[40px] w-full rounded-xl border border-edge text-[13px] font-semibold text-muted disabled:opacity-40"
      >
        It matched &mdash; nothing to check
      </button>

      {/* Without this a failed write leaves the card sitting there unchanged,
          which reads as a dead button rather than as something going wrong. */}
      <ErrorText error={insert.error} />
    </div>
  )
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
  const toCheck = nextWeekToCheck(weeks, payslips.data, today)

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

      {toCheck ? (
        <NeedsChecking key={`${toCheck.agency.id}|${toCheck.weekStart}`} week={toCheck} />
      ) : (
        <p className="mb-6 text-sm text-muted">
          What each pay week should be worth, and when it lands.
        </p>
      )}

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
