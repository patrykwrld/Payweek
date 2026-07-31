import { Link } from 'react-router-dom'
import { Card, EmptyState, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { formatMinutes, formatPence } from '../lib/money'
import { buildAgencyWeeks, holidayAccrualPence } from '../lib/payday'
import { useProfile } from '../lib/queries'
import { formatDay } from '../lib/weeks'

export function Payday() {
  const data = useAppData()
  const profile = useProfile()
  const online = useIsOnline()

  if (data.status === 'pending' || profile.isPending) {
    return <ScreenSkeleton rows={3} />
  }
  if (data.status === 'error' || profile.isError) {
    return <LoadFailed offline={!online} onRetry={data.retry} />
  }

  const { agencies, shifts, rules } = data
  const showAccrual = profile.data?.show_holiday_accrual ?? true
  const accrualPct = profile.data?.holiday_accrual_pct ?? 12.07
  const weeks = buildAgencyWeeks(shifts, agencies, rules)

  // Group the week cards under each agency heading.
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

      <div className="space-y-8">
        {[...byAgency.values()].map((agencyWeeks) => {
          const agency = agencyWeeks[0]!.agency
          return (
            <section key={agency.id}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                {agency.name}
              </h2>
              <div className="space-y-3">
                {agencyWeeks.map((week) => {
                  const accrual = holidayAccrualPence(week.grossPence, accrualPct)
                  return (
                    <Card key={week.weekStart}>
                      <div className="flex items-baseline justify-between">
                        <p className="font-semibold">
                          Week ending {formatDay(week.weekEnd)}
                        </p>
                        <p className="font-mono text-xl font-semibold tracking-tight">
                          {formatPence(week.grossPence)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        <span className="font-mono">
                          {formatMinutes(week.paidMinutes)}
                        </span>{' '}
                        across {week.entries.length}{' '}
                        {week.entries.length === 1 ? 'shift' : 'shifts'} · pays{' '}
                        {formatDay(week.paydayDate)}
                      </p>
                      {showAccrual && (
                        <p className="mt-2 border-t border-edge pt-2 text-sm text-muted">
                          Holiday pay ({accrualPct}%){' '}
                          <span className="float-right font-mono text-ink">
                            +{formatPence(accrual)}
                          </span>
                        </p>
                      )}
                    </Card>
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
          <span className="block font-semibold">Been paid? Check the payslip</span>
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
