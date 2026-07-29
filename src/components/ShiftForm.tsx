import { useState, type FormEvent } from 'react'
import type { Tables, TablesInsert } from '../lib/database.types'
import { parsePoundsToPence, penceToPoundsInput } from '../lib/money'
import { todayISO } from '../lib/weeks'
import { ErrorText, Field, PrimaryButton, inputCls, selectCls } from './ui'

export interface ShiftFormValues {
  agency_id: string
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  manual_rate_pence: number | null
  notes: string | null
}

interface Props {
  agencies: Tables<'agencies'>[]
  initial?: Partial<TablesInsert<'shifts'>>
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (values: ShiftFormValues) => void
}

export function ShiftForm({
  agencies,
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: Props) {
  const active = agencies.filter((a) => !a.archived)
  const [agencyId, setAgencyId] = useState(
    initial?.agency_id ?? active[0]?.id ?? '',
  )
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [startTime, setStartTime] = useState(
    (initial?.start_time ?? '09:00').slice(0, 5),
  )
  const [endTime, setEndTime] = useState(
    (initial?.end_time ?? '17:00').slice(0, 5),
  )
  const [breakMinutes, setBreakMinutes] = useState(
    String(initial?.break_minutes ?? 0),
  )
  const [manualRate, setManualRate] = useState(
    initial?.manual_rate_pence != null
      ? penceToPoundsInput(initial.manual_rate_pence)
      : '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [validation, setValidation] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(null)
    const breakParsed = Number(breakMinutes || '0')
    if (!Number.isInteger(breakParsed) || breakParsed < 0) {
      setValidation('Break must be a whole number of minutes.')
      return
    }
    let manualPence: number | null = null
    if (manualRate.trim() !== '') {
      manualPence = parsePoundsToPence(manualRate)
      if (manualPence === null) {
        setValidation('Manual rate must look like 14.50.')
        return
      }
    }
    if (!agencyId) {
      setValidation('Pick an agency.')
      return
    }
    onSubmit({
      agency_id: agencyId,
      date,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakParsed,
      manual_rate_pence: manualPence,
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
      <p className="text-xs text-muted">
        An end time at or before the start means the shift runs past midnight.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Break (min)">
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Manual rate £/h">
          <input
            type="text"
            inputMode="decimal"
            placeholder="rules apply"
            value={manualRate}
            onChange={(e) => setManualRate(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Notes">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="optional"
          className={inputCls}
        />
      </Field>

      {validation && <p className="text-sm text-red-400">{validation}</p>}
      <ErrorText error={error} />

      <PrimaryButton disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </PrimaryButton>
    </form>
  )
}
