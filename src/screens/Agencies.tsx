import { Link } from 'react-router-dom'
import { EmptyState, ScreenTitle } from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { formatPence } from '../lib/money'
import { useAgencies, useRateRules } from '../lib/queries'

export function Agencies() {
  const agencies = useAgencies()
  const rules = useRateRules()
  const online = useIsOnline()

  if (agencies.isPending || rules.isPending) return <ScreenSkeleton rows={3} />
  if (agencies.isError || rules.isError) return (
      <LoadFailed
        offline={!online}
        onRetry={() => {
          void agencies.refetch(); void rules.refetch()
        }}
      />
    )

  const active = agencies.data.filter((a) => !a.archived)
  const archived = agencies.data.filter((a) => a.archived)
  const countRates = (agencyId: string) =>
    rules.data.filter((r) => r.agency_id === agencyId && r.active).length

  return (
    <>
      <ScreenTitle
        action={
          <Link
            to="/agencies/new"
            className="text-sm text-accent underline underline-offset-4"
          >
            Add agency
          </Link>
        }
      >
        Your rates
      </ScreenTitle>
      <p className="mb-6 text-sm text-muted">
        Tap who you work for to set night, weekend and overtime pay. Payweek
        uses these to price every shift.
      </p>

      {agencies.data.length === 0 && (
        <EmptyState
          title="Nobody added yet"
          hint="Add the agency you work for and what it pays you."
        />
      )}

      <div className="space-y-3">
        {active.map((agency) => {
          const extras = countRates(agency.id)
          return (
            <Link
              key={agency.id}
              to={`/agencies/${agency.id}`}
              className="flex items-center justify-between rounded-xl border border-edge bg-surface px-4 py-4 transition-colors hover:border-accent"
            >
              <div className="min-w-0">
                <p className="font-semibold">{agency.name}</p>
                <p className="text-sm text-muted">
                  <span className="font-mono">
                    {formatPence(agency.base_rate_pence)}
                  </span>{' '}
                  an hour ·{' '}
                  {extras === 0
                    ? 'no extra rates yet'
                    : `${extras} extra ${extras === 1 ? 'rate' : 'rates'}`}
                </p>
              </div>
              <span aria-hidden className="text-muted">
                ›
              </span>
            </Link>
          )
        })}
      </div>

      {archived.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold text-muted">Archived</h2>
          <div className="space-y-3 opacity-60">
            {archived.map((agency) => (
              <Link
                key={agency.id}
                to={`/agencies/${agency.id}`}
                className="flex items-center justify-between rounded-xl border border-edge bg-surface px-4 py-4"
              >
                <p className="font-semibold">{agency.name}</p>
                <span className="text-muted">›</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
