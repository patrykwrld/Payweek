import { useState, type FormEvent } from 'react'
import type { Json, Tables, TablesInsert } from '../lib/database.types'
import {
  clampPoundsInput,
  formatMinutes,
  formatPence,
  formatRate,
  parsePoundsToPence,
  penceToPoundsInput,
} from '../lib/money'
import {
  breaksFromJson,
  priceShift,
  rulesFromRows,
  shiftDurationMinutes,
  type ShiftBreak,
} from '../lib/rateEngine'
import { randomId } from '../lib/ids'
import { findOverlap } from '../lib/overlap'
import { formatDay, todayISO } from '../lib/weeks'
import {
  Card,
  ErrorText,
  Field,
  PrimaryButton,
  inputBoxCls,
  inputCls,
  selectCls,
} from './ui'

export interface ShiftFormValues {
  agency_id: string
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  breaks: Json
  manual_rate_pence: number | null
  notes: string | null
}

/** A break row while it's being edited — strings, because half-typed input
 * isn't a number yet. */
interface BreakDraft {
  key: string
  minutes: string
  startTime: string
}

const newBreak = (minutes = '30', startTime = ''): BreakDraft => ({
  key: randomId(),
  minutes,
  startTime,
})

function draftsFromInitial(initial?: Partial<TablesInsert<'shifts'>>): BreakDraft[] {
  const stored = breaksFromJson(initial?.breaks)
  if (stored.length > 0) {
    return stored.map((b) =>
      newBreak(String(b.minutes), b.startTime ? b.startTime.slice(0, 5) : ''),
    )
  }
  const total = initial?.break_minutes ?? 0
  return total > 0 ? [newBreak(String(total), '')] : []
}

interface Props {
  agencies: Tables<'agencies'>[]
  rules: Tables<'rate_rules'>[]
  /** Everything already logged, so a clash can be pointed out. */
  shifts?: Tables<'shifts'>[]
  /** The shift being edited, which should not clash with itself. */
  excludeId?: string
  initial?: Partial<TablesInsert<'shifts'>>
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (values: ShiftFormValues) => void
}

export function ShiftForm({
  agencies,
  rules,
  shifts = [],
  excludeId,
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: Props) {
  const active = agencies.filter((a) => !a.archived)
  const [agencyId, setAgencyId] = useState(initial?.agency_id ?? active[0]?.id ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [startTime, setStartTime] = useState((initial?.start_time ?? '09:00').slice(0, 5))
  const [endTime, setEndTime] = useState((initial?.end_time ?? '17:00').slice(0, 5))
  const [breaks, setBreaks] = useState<BreakDraft[]>(() => draftsFromInitial(initial))
  const [manualRate, setManualRate] = useState(
    initial?.manual_rate_pence != null
      ? penceToPoundsInput(initial.manual_rate_pence)
      : '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [validation, setValidation] = useState<string | null>(null)

  const workedMinutes = shiftDurationMinutes(startTime, endTime)

  /** Only well-formed rows count towards the price. */
  const parsedBreaks: ShiftBreak[] = breaks.flatMap((b) => {
    const mins = Number(b.minutes)
    if (!Number.isFinite(mins) || mins <= 0) return []
    return [{ minutes: Math.round(mins), startTime: b.startTime || null }]
  })
  const breakTotal = parsedBreaks.reduce((s, b) => s + b.minutes, 0)

  // Live price, using the same engine the saved shift will use.
  const agency = agencies.find((a) => a.id === agencyId)
  const manualPence = manualRate.trim() === '' ? null : parsePoundsToPence(manualRate)
  const preview =
    agency && workedMinutes > 0
      ? priceShift(
          {
            date,
            startTime,
            endTime,
            breakMinutes: breakTotal,
            breaks: parsedBreaks,
            manualRatePence: manualPence,
          },
          {
            baseRatePence: agency.base_rate_pence,
            rules: rulesFromRows(rules.filter((r) => r.agency_id === agencyId)),
          },
        )
      : null

  const clash =
    workedMinutes > 0
      ? findOverlap({ date, startTime, endTime }, shifts, excludeId)
      : null

  function setBreak(key: string, patch: Partial<BreakDraft>) {
    setBreaks((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(null)
    if (!agencyId) {
      setValidation('Pick an agency.')
      return
    }
    for (const b of breaks) {
      const mins = Number(b.minutes)
      if (b.minutes.trim() === '' || !Number.isFinite(mins) || mins < 0) {
        setValidation('Each break needs a number of minutes.')
        return
      }
    }
    if (breakTotal > workedMinutes) {
      setValidation('Breaks add up to longer than the shift.')
      return
    }
    let manual: number | null = null
    if (manualRate.trim() !== '') {
      manual = parsePoundsToPence(manualRate)
      if (manual === null) {
        setValidation('Manual rate must look like 14.50.')
        return
      }
    }
    onSubmit({
      agency_id: agencyId,
      date,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakTotal,
      breaks: parsedBreaks.map((b) => ({
        minutes: b.minutes,
        start_time: b.startTime ?? null,
      })) as Json,
      manual_rate_pence: manual,
      notes: notes.trim() === '' ? null : notes.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Who you worked for">
        <select
          value={agencyId}
          onChange={(e) => setAgencyId(e.target.value)}
          className={selectCls}
          required
        >
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Which day">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Started">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Finished">
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
      </div>
      <p className="-mt-1 text-xs text-muted">
        {workedMinutes > 0 ? (
          <>
            <span className="font-mono">{formatMinutes(workedMinutes)}</span> on
            the clock
            {endTime <= startTime && ' · runs past midnight'}
          </>
        ) : (
          'Set the times'
        )}
      </p>

      {clash && (
        <p className="rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 text-sm">
          <span className="font-semibold">You already have a shift here.</span>{' '}
          <span className="text-muted">
            {formatDay(clash.date)}{' '}
            <span className="font-mono">
              {clash.start_time.slice(0, 5)}–{clash.end_time.slice(0, 5)}
            </span>{' '}
            overlaps this one. Saving both counts those hours twice — check
            before you do.
          </span>
        </p>
      )}

      {/* Breaks. Giving one a time takes it out of the rate band it actually
          falls in, which matters when the shift spans two rates. */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Unpaid breaks</span>
          {breakTotal > 0 && (
            <span className="font-mono text-xs text-muted">
              {formatMinutes(breakTotal)} total
            </span>
          )}
        </div>

        {breaks.length === 0 && (
          <p className="text-xs text-muted">None — the whole shift is paid.</p>
        )}

        {/* min-w-0 on the time field matters: a flex item defaults to
            min-width:auto, and a native time input's intrinsic width is wide
            enough to push this row past the width of a phone. */}
        {breaks.map((b) => (
          <div key={b.key} className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={5}
              inputMode="numeric"
              value={b.minutes}
              onChange={(e) => setBreak(b.key, { minutes: e.target.value })}
              aria-label="Break minutes"
              className={`${inputBoxCls} w-14 shrink-0 px-1 py-2 text-center`}
            />
            <span className="shrink-0 whitespace-nowrap text-sm text-muted">
              min at
            </span>
            <input
              type="time"
              value={b.startTime}
              onChange={(e) => setBreak(b.key, { startTime: e.target.value })}
              aria-label="Break start time"
              className={`${inputBoxCls} min-w-0 flex-1 px-2 py-2`}
            />
            <button
              type="button"
              onClick={() => setBreaks((rows) => rows.filter((r) => r.key !== b.key))}
              aria-label="Remove break"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-edge text-sm text-muted hover:border-negative hover:text-negative"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setBreaks((rows) => [...rows, newBreak()])}
          className="text-sm text-accent underline underline-offset-4"
        >
          + Add a break
        </button>
        {breaks.some((b) => !b.startTime) && (
          <p className="text-xs text-muted">
            A break with no time is spread evenly across the shift. Give it a
            time and it comes off the rate you were actually on.
          </p>
        )}
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted">
          Paid a one-off rate for this shift?
        </summary>
        <div className="mt-3">
          <Field label="Pay the whole shift at (£ an hour)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="leave blank to use your usual rates"
              value={manualRate}
              onChange={(e) => setManualRate(clampPoundsInput(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </details>

      <Field label="Notes">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="optional"
          className={inputCls}
        />
      </Field>

      {preview && (
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              This shift pays
            </p>
            <p className="font-mono text-2xl font-semibold tracking-tight">
              {formatPence(preview.grossPence)}
            </p>
          </div>
          <ul className="mt-3 space-y-1 border-t border-edge pt-3">
            {preview.breakdown.map((line) => (
              <li
                key={`${line.label}-${line.ratePence}`}
                className="flex justify-between text-sm"
              >
                <span>
                  {line.label}{' '}
                  <span className="text-muted">
                    <span className="font-mono">{formatMinutes(line.minutes)}</span>{' '}
                    @ <span className="font-mono">{formatRate(line.ratePence)}</span>
                  </span>
                </span>
                <span className="font-mono">{formatPence(line.subtotalPence)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {validation && <p className="text-sm text-negative">{validation}</p>}
      <ErrorText error={error} />

      <PrimaryButton disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </PrimaryButton>
    </form>
  )
}
