import { useState, type FormEvent, type ReactNode } from 'react'
import type { Tables, TablesInsert } from '../lib/database.types'
import { DAY_NAMES } from '../lib/days'
import { parsePoundsToPence, penceToPoundsInput } from '../lib/money'
import { useIsOnline } from '../lib/offline'
import {
  ErrorText,
  Field,
  NeedsConnection,
  PrimaryButton,
  inputCls,
  selectCls,
} from './ui'

export interface AgencyFormValues {
  name: string
  base_rate_pence: number
  pay_cycle: string
  pay_week_start_day: number
  pay_delay_days: number
  notes: string | null
}

/** Rate rules the create flow can set up for you, so the common ones
 * don't have to be discovered separately. */
export type NewRule = Omit<TablesInsert<'rate_rules'>, 'agency_id'>

interface Props {
  initial?: Tables<'agencies'>
  /** Offer night/weekend/overtime setup inline. On by default for new
   * agencies; existing ones manage rules from the agency page. */
  offerRates?: boolean
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (values: AgencyFormValues, extraRules: NewRule[]) => void
}

/** A rate you can switch on, with its fields revealed underneath. */
function RateToggle({
  on,
  onChange,
  title,
  subtitle,
  children,
}: {
  on: boolean
  onChange: (on: boolean) => void
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        on ? 'border-accent/60 bg-accent/5' : 'border-edge bg-surface'
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-4 shrink-0 accent-(--color-accent)"
        />
        <span className="min-w-0">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-muted">{subtitle}</span>
        </span>
      </label>
      {on && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  )
}

export function AgencyFormFields({
  initial,
  offerRates = !initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: Props) {
  const online = useIsOnline()
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

  // Optional extras, offered while creating so they aren't hidden away.
  const [night, setNight] = useState(false)
  const [nightFrom, setNightFrom] = useState('22:00')
  const [nightTo, setNightTo] = useState('06:00')
  const [nightRate, setNightRate] = useState('')

  const [weekend, setWeekend] = useState(false)
  const [weekendRate, setWeekendRate] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(null)

    const ratePence = parsePoundsToPence(baseRate)
    if (ratePence === null) {
      setValidation('Your normal hourly rate should look like 12.50.')
      return
    }
    const delay = Number(payDelay || '0')
    if (!Number.isInteger(delay) || delay < 0) {
      setValidation('Days until payday must be a whole number.')
      return
    }

    const extras: NewRule[] = []

    if (night) {
      const pence = parsePoundsToPence(nightRate)
      if (pence === null) {
        setValidation('Night rate should look like 14.50.')
        return
      }
      extras.push({
        kind: 'time_band',
        label: 'Night rate',
        days_of_week: null,
        band_start: nightFrom,
        band_end: nightTo,
        threshold_minutes: null,
        threshold_scope: null,
        rate_pence: pence,
        multiplier: null,
        priority: 5,
      })
    }

    if (weekend) {
      const pence = parsePoundsToPence(weekendRate)
      if (pence === null) {
        setValidation('Weekend rate should look like 15.00.')
        return
      }
      extras.push({
        kind: 'time_band',
        label: 'Weekend',
        days_of_week: [0, 6],
        // Equal start and end means the whole day.
        band_start: '00:00',
        band_end: '00:00',
        threshold_minutes: null,
        threshold_scope: null,
        rate_pence: pence,
        multiplier: null,
        priority: 10,
      })
    }

    onSubmit(
      {
        name: name.trim(),
        base_rate_pence: ratePence,
        pay_cycle: payCycle,
        pay_week_start_day: Number(weekStartDay),
        pay_delay_days: delay,
        notes: notes.trim() === '' ? null : notes.trim(),
      },
      extras,
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Who do you work for?">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="e.g. Meridian Staffing"
          required
        />
      </Field>

      <div>
        <Field label="Your normal hourly rate">
          <input
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
            className={inputCls}
            inputMode="decimal"
            placeholder="12.50"
            required
          />
        </Field>
        <p className="mt-1 text-xs text-muted">
          What one ordinary daytime hour pays, in pounds. Nights and weekends go
          below, so don&rsquo;t average them into this.
        </p>
      </div>

      {offerRates && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Do some hours pay more?</h2>
            <p className="text-xs text-muted">
              Tick any that apply. You can change them later.
            </p>
          </div>

          <RateToggle
            on={night}
            onChange={setNight}
            title="Night rate"
            subtitle="A higher rate between two times"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input
                  type="time"
                  value={nightFrom}
                  onChange={(e) => setNightFrom(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Until">
                <input
                  type="time"
                  value={nightTo}
                  onChange={(e) => setNightTo(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Night hourly rate">
              <input
                value={nightRate}
                onChange={(e) => setNightRate(e.target.value)}
                className={inputCls}
                inputMode="decimal"
                placeholder="14.50"
              />
            </Field>
          </RateToggle>

          <RateToggle
            on={weekend}
            onChange={setWeekend}
            title="Weekend rate"
            subtitle="A different rate on Saturdays and Sundays"
          >
            <Field label="Weekend hourly rate">
              <input
                value={weekendRate}
                onChange={(e) => setWeekendRate(e.target.value)}
                className={inputCls}
                inputMode="decimal"
                placeholder="15.00"
              />
            </Field>
          </RateToggle>
        </section>
      )}

      <details className="rounded-xl border border-edge bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          When you get paid
          <span className="ml-2 font-normal text-muted">
            — only affects the Payday screen
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid every">
              <select
                value={payCycle}
                onChange={(e) => setPayCycle(e.target.value)}
                className={selectCls}
              >
                <option value="weekly">week</option>
                <option value="fortnightly">fortnight</option>
                <option value="monthly">month</option>
              </select>
            </Field>
            <Field label="Pay week starts">
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
          <div>
            <Field label="Days from the week ending to payday">
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
            <p className="mt-1 text-xs text-muted">
              Week ends Sunday and you&rsquo;re paid the following Friday? That&rsquo;s 5.
            </p>
          </div>
          <Field label="Notes">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
              placeholder="optional"
            />
          </Field>
        </div>
      </details>

      {validation && <p className="text-sm text-red-400">{validation}</p>}
      <ErrorText error={error} />
      {!online && <NeedsConnection />}

      <PrimaryButton disabled={pending || !online}>
        {pending ? 'Saving…' : submitLabel}
      </PrimaryButton>
    </form>
  )
}
