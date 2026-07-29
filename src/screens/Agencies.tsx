import { Link } from 'react-router-dom'
import { EmptyState, ScreenTitle } from '../components/ui'
import { formatRate } from '../lib/money'
import { useAgencies } from '../lib/queries'
import { supabase } from '../lib/supabase'

export function Agencies() {
  const agencies = useAgencies()

  if (agencies.isPending) return <p className="text-muted">Loading…</p>
  if (agencies.isError) return <p className="text-red-400">Couldn&rsquo;t load.</p>

  const active = agencies.data.filter((a) => !a.archived)
  const archived = agencies.data.filter((a) => a.archived)

  return (
    <>
      <ScreenTitle
        action={
          <Link
            to="/agencies/new"
            className="text-sm text-accent underline underline-offset-4"
          >
            Add
          </Link>
        }
      >
        Agencies
      </ScreenTitle>

      {agencies.data.length === 0 && (
        <EmptyState
          title="No agencies yet"
          hint="An agency holds your base rate and rate rules."
        />
      )}

      <div className="space-y-3">
        {active.map((agency) => (
          <Link
            key={agency.id}
            to={`/agencies/${agency.id}`}
            className="flex items-center justify-between rounded-xl border border-edge bg-surface px-4 py-4"
          >
            <div>
              <p className="font-semibold">{agency.name}</p>
              <p className="text-sm text-muted">
                {agency.pay_cycle} ·{' '}
                <span className="font-mono">
                  {formatRate(agency.base_rate_pence)}
                </span>{' '}
                base
              </p>
            </div>
            <span className="text-muted">›</span>
          </Link>
        ))}
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

      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </>
  )
}
