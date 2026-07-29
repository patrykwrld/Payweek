import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShiftForm } from '../components/ShiftForm'
import {
  Card,
  GhostButton,
  ScreenTitle,
} from '../components/ui'
import { formatMinutes, formatPence, formatRate } from '../lib/money'
import { priceShifts } from '../lib/pricing'
import {
  useAgencies,
  useDeleteShift,
  useRateRules,
  useShifts,
  useUpdateShift,
} from '../lib/queries'
import { formatDay } from '../lib/weeks'

export function ShiftDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const agencies = useAgencies()
  const shifts = useShifts()
  const rules = useRateRules()
  const update = useUpdateShift()
  const remove = useDeleteShift()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (agencies.isPending || shifts.isPending || rules.isPending) {
    return <p className="text-muted">Loading…</p>
  }
  if (agencies.isError || shifts.isError || rules.isError) {
    return <p className="text-red-400">Couldn&rsquo;t load.</p>
  }

  const shift = shifts.data.find((s) => s.id === id)
  if (!shift) {
    return (
      <>
        <ScreenTitle>Shift</ScreenTitle>
        <p className="text-muted">
          This shift no longer exists.{' '}
          <Link to="/shifts" className="text-accent underline underline-offset-4">
            Back to shifts
          </Link>
        </p>
      </>
    )
  }

  const agency = agencies.data.find((a) => a.id === shift.agency_id)
  const pricing = priceShifts(shifts.data, agencies.data, rules.data).get(
    shift.id,
  )?.pricing

  return (
    <>
      <ScreenTitle
        action={
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="text-sm text-accent underline underline-offset-4"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        }
      >
        {formatDay(shift.date)}
      </ScreenTitle>

      {editing ? (
        <>
          <ShiftForm
            agencies={agencies.data}
            initial={shift}
            submitLabel="Save changes"
            pending={update.isPending}
            error={update.error}
            onSubmit={(values) =>
              update.mutate(
                { id: shift.id, ...values },
                { onSuccess: () => setEditing(false) },
              )
            }
          />
          <div className="mt-4">
            <GhostButton
              danger
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true)
                  return
                }
                remove.mutate(shift.id, {
                  onSuccess: () => navigate('/shifts'),
                })
              }}
            >
              {confirmDelete ? 'Tap again to delete' : 'Delete shift'}
            </GhostButton>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-muted">{agency?.name ?? 'Unknown agency'}</p>
            <p className="mt-1 font-mono text-4xl font-semibold tracking-tight">
              {pricing ? formatPence(pricing.grossPence) : '—'}
            </p>
            <p className="mt-1 text-sm text-muted">
              <span className="font-mono">
                {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
              </span>
              {shift.break_minutes > 0 && (
                <> · {shift.break_minutes}m break</>
              )}
              {pricing && (
                <>
                  {' '}
                  · <span className="font-mono">
                    {formatMinutes(pricing.paidMinutes)}
                  </span>{' '}
                  paid
                </>
              )}
            </p>
          </Card>

          {pricing && (
            <Card>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                How this was worked out
              </h2>
              <ul className="space-y-2">
                {pricing.breakdown.map((line) => (
                  <li
                    key={`${line.label}-${line.ratePence}`}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-sm">
                      {line.label}
                      <span className="text-muted">
                        {' '}
                        · <span className="font-mono">{formatMinutes(line.minutes)}</span> @{' '}
                        <span className="font-mono">{formatRate(line.ratePence)}</span>
                      </span>
                    </span>
                    <span className="font-mono font-semibold">
                      {formatPence(line.subtotalPence)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {shift.notes && <p className="text-sm text-muted">{shift.notes}</p>}
        </div>
      )}
    </>
  )
}
