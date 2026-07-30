import { useState, type FormEvent } from 'react'
import type { Json, Tables, TablesInsert } from '../lib/database.types'
import { formatMinutes, formatPence, formatRate, parsePoundsToPence, penceToPoundsInput } from '../lib/money'
import {
  breaksFromJson,
  priceShift,
  rulesFromRows,
  shiftDurationMinutes,
  type ShiftBreak,
} from '../lib/rateEngine'
import { todayISO } from '../lib/weeks'
import { Card, ErrorText, Field, PrimaryButton, inputCls, selectCls } from './ui'

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
  key: crypto.randomUUID(),
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
  initial?: Partial<TablesInsert<'shifts'>>
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (values: ShiftFormValues) => void
}

export function ShiftForm({
  agencies,
  rules,
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
      <Field label="Agency">
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

      <Field label="Date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="End">
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
              className={`${inputCls} w-16 shrink-0 px-2 py-2 text-center`}
            />
            <span className="shrink-0 whitespace-nowrap text-sm text-muted">
              min at
            </span>
            <input
              type="time"
              value={b.startTime}
              onChange={(e) => setBreak(b.key, { startTime: e.target.value })}
              aria-label="Break start time"
              className={`${inputCls} flex-1 px-3 py-2`}
            />
            <button
              type="button"
              onClick={() => setBreaks((rows) => rows.filter((r) => r.key !== b.key))}
              aria-label="Remove break"
              className="shrink-0 rounded-lg border border-edge px-3 py-2 text-sm text-muted hover:border-red-400 hover:text-red-400"
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
          One-off rate for this shift
        </summary>
        <div className="mt-3">
          <Field label="Manual rate £/h">
            <input
              type="text"
              inputMode="decimal"
              placeholder="leave blank to use the agency rules"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
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

      {validation && <p className="text-sm text-red-400">{validation}</p>}
      <ErrorText error={error} />

      <PrimaryButton disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </PrimaryButton>
    </form>
  )
}
