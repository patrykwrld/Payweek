import { Card, EmptyState, ScreenTitle } from '../components/ui'
import { formatMinutes, formatPence } from '../lib/money'
import { buildAgencyWeeks, holidayAccrualPence } from '../lib/payday'
import { useAgencies, useProfile, useRateRules, useShifts } from '../lib/queries'
import { formatDay } from '../lib/weeks'

export function Payday() {
  const agencies = useAgencies()
  const shifts = useShifts()
  const rules = useRateRules()
  const profile = useProfile()

  if (agencies.isPending || shifts.isPending || rules.isPending || profile.isPending) {
    return <p className="text-muted">Loading…</p>
  }
  if (agencies.isError || shifts.isError || rules.isError || profile.isError) {
    return <p className="text-red-400">Couldn&rsquo;t load.</p>
  }

  const showAccrual = profile.data?.show_holiday_accrual ?? true
  const accrualPct = profile.data?.holiday_accrual_pct ?? 12.07
  const weeks = buildAgencyWeeks(shifts.data, agencies.data, rules.data)

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
                          Holiday accrual ({accrualPct}%){' '}
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
    </>
  )
}
