import { Link } from 'react-router-dom'
import { EmptyState, ScreenTitle } from '../components/ui'
import { formatMinutes, formatPence } from '../lib/money'
import { priceShifts, type PricedShift } from '../lib/pricing'
import { useAgencies, useRateRules, useShifts } from '../lib/queries'
import { formatDay, formatWeekRange } from '../lib/weeks'

export function Shifts() {
  const agencies = useAgencies()
  const shifts = useShifts()
  const rules = useRateRules()

  if (agencies.isPending || shifts.isPending || rules.isPending) {
    return <p className="text-muted">Loading…</p>
  }
  if (agencies.isError || shifts.isError || rules.isError) {
    return <p className="text-red-400">Couldn&rsquo;t load shifts.</p>
  }

  const priced = priceShifts(shifts.data, agencies.data, rules.data)
  const agencyName = new Map(agencies.data.map((a) => [a.id, a.name]))

  // Group by pay-week start, newest week first; shifts within a week
  // keep the query's date-descending order.
  const weeks = new Map<string, PricedShift[]>()
  for (const shift of shifts.data) {
    const entry = priced.get(shift.id)
    if (!entry) continue
    const list = weeks.get(entry.weekStart) ?? []
    list.push(entry)
    weeks.set(entry.weekStart, list)
  }
  const ordered = [...weeks.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <>
      <ScreenTitle>Shifts</ScreenTitle>

      {ordered.length === 0 && (
        <EmptyState
          title="No shifts logged"
          hint="Add your first shift from the Add tab."
        />
      )}

      <div className="space-y-8">
        {ordered.map(([weekStart, entries]) => {
          const minutes = entries.reduce((s, e) => s + e.pricing.paidMinutes, 0)
          const gross = entries.reduce((s, e) => s + e.pricing.grossPence, 0)
          return (
            <section key={weekStart}>
              <header className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-muted">
                  {formatWeekRange(weekStart)}
                </h2>
                <p className="font-mono text-sm">
                  {formatMinutes(minutes)} ·{' '}
                  <span className="font-semibold text-ink">{formatPence(gross)}</span>
                </p>
              </header>
              <div className="overflow-hidden rounded-xl border border-edge bg-surface">
                {entries.map((entry, i) => (
                  <Link
                    key={entry.shift.id}
                    to={`/shifts/${entry.shift.id}`}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i > 0 ? 'border-t border-edge' : ''
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{formatDay(entry.shift.date)}</p>
                      <p className="text-sm text-muted">
                        {agencyName.get(entry.shift.agency_id) ?? '—'} ·{' '}
                        <span className="font-mono">
                          {entry.shift.start_time.slice(0, 5)}–
                          {entry.shift.end_time.slice(0, 5)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {formatPence(entry.pricing.grossPence)}
                      </p>
                      <p className="font-mono text-sm text-muted">
                        {formatMinutes(entry.pricing.paidMinutes)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
