import { useState, type FormEvent } from 'react'
import type { Tables } from '../lib/database.types'
import { parsePoundsToPence, penceToPoundsInput } from '../lib/money'
import { DAY_NAMES } from '../lib/days'
import { ErrorText, Field, PrimaryButton, inputCls, selectCls } from './ui'

export interface AgencyFormValues {
  name: string
  base_rate_pence: number
  pay_cycle: string
  pay_week_start_day: number
  pay_delay_days: number
  notes: string | null
}

interface Props {
  initial?: Tables<'agencies'>
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (values: AgencyFormValues) => void
}

export function AgencyFormFields({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [baseRate, setBaseRate] = useState(
    initial ? penceToPoundsInput(initial.base_rate_pence) : '',
  )
  const [payCycle, setPayCycle] = useState(initial?.pay_cycle ?? 'weekly')
  const [weekStartDay, setWeekStartDay] = useState(
    String(initial?.pay_week_start_day ?? 1),
  )
  const [payDelay, setPayDelay] = useState(String(initial?.pay_delay_days ?? 4))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [validation, setValidation] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(null)
    const ratePence = parsePoundsToPence(baseRate)
    if (ratePence === null) {
      setValidation('Base rate must look like 12.50.')
      return
    }
    const delay = Number(payDelay || '0')
    if (!Number.isInteger(delay) || delay < 0) {
      setValidation('Pay delay must be a whole number of days.')
      return
    }
    onSubmit({
      name: name.trim(),
      base_rate_pence: ratePence,
      pay_cycle: payCycle,
      pay_week_start_day: Number(weekStartDay),
      pay_delay_days: delay,
      notes: notes.trim() === '' ? null : notes.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="e.g. Meridian Staffing"
          required
        />
      </Field>

      <Field label="Base rate £/h">
        <input
          value={baseRate}
          onChange={(e) => setBaseRate(e.target.value)}
          className={inputCls}
          inputMode="decimal"
          placeholder="12.50"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pay cycle">
          <select
            value={payCycle}
            onChange={(e) => setPayCycle(e.target.value)}
            className={selectCls}
          >
            <option value="weekly">weekly</option>
            <option value="fortnightly">fortnightly</option>
            <option value="monthly">monthly</option>
          </select>
        </Field>
        <Field label="Week starts">
          <select
            value={weekStartDay}
            onChange={(e) => setWeekStartDay(e.target.value)}
            className={selectCls}
          >
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Paid how many days after the week ends?">
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={payDelay}
          onChange={(e) => setPayDelay(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Notes">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
          placeholder="optional"
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
