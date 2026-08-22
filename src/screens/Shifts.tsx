import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState,
  RateBands,
  RateBandsLegend,
  ScreenTitle,
} from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { UndoBar } from '../components/Undo'
import type { Tables } from '../lib/database.types'
import { useIsOnline } from '../lib/offline'
import { useAppData } from '../lib/useAppData'
import { formatMinutes, formatPence } from '../lib/money'
import { priceShifts, type PricedShift } from '../lib/pricing'
import { useDeleteShift, useInsertShift } from '../lib/queries'
import { formatDay, formatWeekRange, todayISO } from '../lib/weeks'

/** Re-insert keeps the original id, so an undone delete restores the same
 * shift rather than a copy of it. */
function reinsertable(shift: Tables<'shifts'>) {
  const { user_id: _user, created_at: _created, ...rest } = shift
  return rest
}

export function Shifts() {
  const data = useAppData()
  const online = useIsOnline()
  const remove = useDeleteShift()
  const insert = useInsertShift()

  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [undo, setUndo] = useState<{
    rows: Tables<'shifts'>[]
    message: string
  } | null>(null)

  const dismissUndo = useCallback(() => setUndo(null), [])

  if (data.status === 'pending') {
    return <ScreenSkeleton rows={3} />
  }
  if (data.status === 'error') {
    return <LoadFailed offline={!online} onRetry={data.retry} />
  }

  const { agencies, shifts, rules } = data
  const priced = priceShifts(shifts, agencies, rules)
  const agencyName = new Map(agencies.map((a) => [a.id, a.name]))

  // Group by pay-week start, newest week first; shifts within a week
  // keep the query's date-descending order.
  const weeks = new Map<string, PricedShift[]>()
  for (const shift of shifts) {
    const entry = priced.get(shift.id)
    if (!entry) continue
    const list = weeks.get(entry.weekStart) ?? []
    list.push(entry)
    weeks.set(entry.weekStart, list)
  }
  const ordered = [...weeks.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelection() {
    setSelecting(false)
    setSelected(new Set())
  }

  function deleteSelected() {
    const rows = shifts.filter((s) => selected.has(s.id))
    if (rows.length === 0) return
    for (const row of rows) remove.mutate(row.id)
    setUndo({
      rows,
      message: `${rows.length} shift${rows.length === 1 ? '' : 's'} deleted`,
    })
    exitSelection()
  }

  function duplicateSelectedToToday() {
    const rows = shifts.filter((s) => selected.has(s.id))
    if (rows.length === 0) return
    for (const row of rows) {
      const { id: _id, ...copy } = reinsertable(row)
      insert.mutate({ ...copy, date: todayISO() })
    }
    exitSelection()
  }

  function restore() {
    if (!undo) return
    for (const row of undo.rows) insert.mutate(reinsertable(row))
    setUndo(null)
  }

  const totalSelected = selected.size

  return (
    <>
      <ScreenTitle
        action={
          shifts.length > 0 ? (
            <button
              type="button"
              onClick={() => (selecting ? exitSelection() : setSelecting(true))}
              className="text-sm text-accent underline underline-offset-4"
            >
              {selecting ? 'Done' : 'Select'}
            </button>
          ) : undefined
        }
      >
        Shifts
      </ScreenTitle>

      {shifts.length > 0 && !selecting && (
        <p className="-mt-4 mb-6 font-mono text-xs text-muted">
          {shifts.length} logged
        </p>
      )}

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
          const weekIds = entries.map((e) => e.shift.id)
          const allPicked = weekIds.every((id) => selected.has(id))
          return (
            <section key={weekStart}>
              <header className="sticky top-0 z-[2] mb-2 flex items-baseline justify-between gap-2.5 bg-gradient-to-b from-void from-72% to-transparent py-2">
                <h2 className="text-sm font-semibold text-muted">
                  {selecting ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((current) => {
                          const next = new Set(current)
                          for (const id of weekIds) {
                            if (allPicked) next.delete(id)
                            else next.add(id)
                          }
                          return next
                        })
                      }
                      className="text-accent underline underline-offset-4"
                    >
                      {allPicked ? 'Clear week' : 'Select week'}
                    </button>
                  ) : (
                    formatWeekRange(weekStart)
                  )}
                </h2>
                <p className="font-mono text-sm">
                  {formatMinutes(minutes)} ·{' '}
                  <span className="font-semibold text-ink">
                    {formatPence(gross)}
                  </span>
                </p>
              </header>
              <div className="card-raised overflow-hidden rounded-[20px] border border-edge bg-surface">
                {entries.map((entry, i) => {
                  const picked = selected.has(entry.shift.id)
                  const body = (
                    <>
                      <div className="flex items-center gap-3">
                        {selecting && (
                          <span
                            aria-hidden="true"
                            className={`mr-3 grid size-5 shrink-0 place-items-center rounded-md border text-xs ${
                              picked
                                ? 'border-accent bg-accent text-void'
                                : 'border-edge'
                            }`}
                          >
                            {picked ? '✓' : ''}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {formatDay(entry.shift.date)}
                          </p>
                          <p className="truncate text-sm text-muted">
                            {agencyName.get(entry.shift.agency_id) ?? '—'} ·{' '}
                            <span className="font-mono">
                              {entry.shift.start_time.slice(0, 5)}–
                              {entry.shift.end_time.slice(0, 5)}
                            </span>
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono font-semibold">
                            {formatPence(entry.pricing.grossPence)}
                          </p>
                          <p className="font-mono text-sm text-muted">
                            {formatMinutes(entry.pricing.paidMinutes)}
                          </p>
                        </div>
                      </div>
                      {/* What the money was actually made of, at a glance:
                          how much of the row was ordinary hours and how much
                          was nights and weekends. */}
                      <div className="mt-[9px]">
                        <RateBands
                          breakdown={entry.pricing.breakdown}
                          paidMinutes={entry.pricing.paidMinutes}
                        />
                      </div>
                    </>
                  )
                  const cls = `press block w-full px-3.5 pb-3 pt-[13px] text-left ${
                    i > 0 ? 'border-t border-edge' : ''
                  } ${picked ? 'bg-accent/10' : ''}`

                  return selecting ? (
                    <button
                      key={entry.shift.id}
                      type="button"
                      onClick={() => toggle(entry.shift.id)}
                      aria-pressed={picked}
                      className={cls}
                    >
                      {body}
                    </button>
                  ) : (
                    <Link
                      key={entry.shift.id}
                      to={`/shifts/${entry.shift.id}`}
                      className={cls}
                    >
                      {body}
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {ordered.length > 0 && <RateBandsLegend />}

      {/* Bulk actions sit above the tab bar while anything is picked. */}
      {selecting && totalSelected > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mx-auto md:bottom-8 md:left-60 w-full max-w-md px-5 md:max-w-2xl md:px-8">
          <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface p-2 shadow-lg shadow-black/40">
            <span className="px-2 font-mono text-sm">{totalSelected}</span>
            <button
              type="button"
              onClick={duplicateSelectedToToday}
              className="flex-1 rounded-lg border border-edge px-3 py-2 text-sm font-semibold hover:border-accent"
            >
              Copy to today
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="flex-1 rounded-lg border border-edge px-3 py-2 text-sm font-semibold text-negative hover:border-negative"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {undo && (
        <UndoBar
          message={undo.message}
          onUndo={restore}
          onDismiss={dismissUndo}
        />
      )}
    </>
  )
}
