import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RateBands, Sheet, SheetHeader } from './ui'
import { formatMinutes, formatPence, formatRate } from '../lib/money'
import { breaksFromJson } from '../lib/rateEngine'
import type { PricedShift } from '../lib/pricing'
import { formatDay } from '../lib/weeks'

/**
 * A shift, opened where you tapped it.
 *
 * The list's job is to be scanned, and leaving the list to answer "why is
 * that one £126?" cost the reader their place in it — they came back to the
 * top of the screen and had to find their row again. The sheet answers the
 * question over the list and closes, so the scroll position, the week you
 * were reading and the row you tapped are all still there underneath.
 *
 * `/shifts/:id` stays exactly as it was: it is the deep link, and it is where
 * Edit still goes, because editing wants the whole screen.
 */
export function ShiftSheet({
  entry,
  agencyName,
  onClose,
  onDuplicate,
  onDelete,
}: {
  entry: PricedShift | null
  agencyName: string
  onClose: () => void
  onDuplicate: (entry: PricedShift) => void
  onDelete: (entry: PricedShift) => void
}) {
  const navigate = useNavigate()
  // Reset per open, so a sheet closed mid-confirm doesn't reopen armed.
  const [confirming, setConfirming] = useState(false)

  if (!entry) return null
  const { shift, pricing } = entry
  const breaks = breaksFromJson(shift.breaks)

  function close() {
    setConfirming(false)
    onClose()
  }

  return (
    <Sheet open onClose={close} title={formatDay(shift.date)}>
      {/* "Done" rather than SheetHeader's default "Cancel": nothing here is
          being edited, so there is nothing to cancel out of. */}
      <SheetHeader
        title={formatDay(shift.date)}
        right={
          <button
            type="button"
            onClick={close}
            className="press min-h-8 px-2.5 text-[13.5px] text-muted"
          >
            Done
          </button>
        }
      />
      <p className="text-sm text-muted">{agencyName}</p>
      <p className="mt-0.5 font-mono text-[38px] font-[650] leading-none tracking-[-0.035em]">
        {formatPence(pricing.grossPence)}
      </p>
      <p className="mt-2 font-mono text-[12.5px] text-muted">
        {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
        {shift.break_minutes > 0 && <> · {shift.break_minutes}m break</>} ·{' '}
        {formatMinutes(pricing.paidMinutes)} paid
      </p>

      <div className="mt-3.5">
        <RateBands
          breakdown={pricing.breakdown}
          paidMinutes={pricing.paidMinutes}
          height={5}
        />
      </div>

      <ul className="mt-4 space-y-2 border-t border-edge pt-4">
        {pricing.breakdown.map((line) => (
          <li
            key={`${line.label}-${line.ratePence}`}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="min-w-0 truncate text-sm">
              {line.label}
              <span className="font-mono text-muted">
                {' '}
                · {formatMinutes(line.minutes)} @ {formatRate(line.ratePence)}
              </span>
            </span>
            <span className="flex-none font-mono text-sm font-semibold">
              {formatPence(line.subtotalPence)}
            </span>
          </li>
        ))}
      </ul>

      {breaks.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-edge pt-3">
          {breaks.map((b, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm">
              <span className="font-mono text-muted">
                {formatMinutes(b.minutes)} unpaid
              </span>
              <span className="text-faint">
                {b.startTime
                  ? `from ${b.startTime.slice(0, 5)}`
                  : 'spread across the shift'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {shift.notes && (
        <p className="mt-3 border-t border-edge pt-3 text-sm text-muted">
          {shift.notes}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => navigate(`/shifts/${shift.id}`)}
          className="press flex-1 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-void"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            onDuplicate(entry)
            close()
          }}
          className="press flex-1 rounded-xl border border-edge px-3 py-3 text-sm font-semibold"
        >
          Copy to today
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!confirming) {
            setConfirming(true)
            return
          }
          onDelete(entry)
          close()
        }}
        className="press mt-2 w-full rounded-xl border border-edge px-3 py-3 text-sm font-semibold text-negative"
      >
        {confirming ? 'Tap again to delete' : 'Delete shift'}
      </button>
    </Sheet>
  )
}
