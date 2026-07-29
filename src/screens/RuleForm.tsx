import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DAY_NAMES } from '../lib/days'
import {
  Card,
  ErrorText,
  Field,
  GhostButton,
  PrimaryButton,
  ScreenTitle,
  inputCls,
  selectCls,
} from '../components/ui'
import type { Tables, TablesInsert } from '../lib/database.types'
import {
  formatMinutes,
  formatPence,
  formatRate,
  parsePoundsToPence,
  penceToPoundsInput,
} from '../lib/money'
import {
  useAgencies,
  useDeleteRule,
  useInsertRule,
  useRateRules,
  useUpdateRule,
} from '../lib/queries'
import { priceShift, ruleFromRow, rulesFromRows } from '../lib/rateEngine'

/** Build the row this form currently describes, or null + why not. */
function draftRow(state: {
  agencyId: string
  kind: 'time_band' | 'threshold'
  label: string
  days: number[]
  bandStart: string
  bandEnd: string
  thresholdHours: string
  thresholdScope: 'shift' | 'pay_week'
  payKind: 'fixed' | 'multiplier'
  payValue: string
  priority: string
}): { row: TablesInsert<'rate_rules'> } | { error: string } {
  if (state.label.trim() === '') return { error: 'Give the rule a name.' }

  let rate_pence: number | null = null
  let multiplier: number | null = null
  if (state.payKind === 'fixed') {
    rate_pence = parsePoundsToPence(state.payValue)
    if (rate_pence === null) return { error: 'Rate must look like 14.50.' }
  } else {
    multiplier = Number(state.payValue)
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return { error: 'Multiplier must be a positive number like 1.5.' }
    }
  }

  const priority = Number(state.priority || '0')
  if (!Number.isInteger(priority)) return { error: 'Priority must be a whole number.' }

  if (state.kind === 'time_band') {
    if (!state.bandStart || !state.bandEnd) return { error: 'Set the band times.' }
    return {
      row: {
        agency_id: state.agencyId,
        kind: 'time_band',
        label: state.label.trim(),
        days_of_week: state.days.length === 0 ? null : [...state.days].sort(),
        band_start: state.bandStart,
        band_end: state.bandEnd,
        threshold_minutes: null,
        threshold_scope: null,
        rate_pence,
        multiplier,
        priority,
      },
    }
  }

  const hours = Number(state.thresholdHours)
  if (!Number.isFinite(hours) || hours <= 0) {
    return { error: 'Threshold must be a positive number of hours.' }
  }
  return {
    row: {
      agency_id: state.agencyId,
      kind: 'threshold',
      label: state.label.trim(),
      days_of_week: null,
      band_start: null,
      band_end: null,
      threshold_minutes: Math.round(hours * 60),
      threshold_scope: state.thresholdScope,
      rate_pence,
      multiplier,
      priority,
    },
  }
}

export function RuleForm() {
  const { id: agencyId, ruleId } = useParams()
  const agencies = useAgencies()
  const rules = useRateRules()

  if (agencies.isPending || rules.isPending) {
    return <p className="text-muted">Loading…</p>
  }
  if (agencies.isError || rules.isError || !agencyId) {
    return <p className="text-red-400">Couldn&rsquo;t load.</p>
  }

  const agency = agencies.data.find((a) => a.id === agencyId)
  const existing = rules.data.find((r) => r.id === ruleId)
  if (!agency || (ruleId && !existing)) {
    return (
      <p className="text-muted">
        Not found.{' '}
        <Link to="/agencies" className="text-accent underline underline-offset-4">
          Back
        </Link>
      </p>
    )
  }

  return (
    <RuleFormInner
      agency={agency}
      agencyRules={rules.data.filter((r) => r.agency_id === agencyId)}
      existing={existing}
    />
  )
}

function RuleFormInner({
  agency,
  agencyRules,
  existing,
}: {
  agency: Tables<'agencies'>
  agencyRules: Tables<'rate_rules'>[]
  existing: Tables<'rate_rules'> | undefined
}) {
  const agencyId = agency.id
  const ruleId = existing?.id
  const navigate = useNavigate()
  const insert = useInsertRule()
  const update = useUpdateRule()
  const remove = useDeleteRule()

  const [kind, setKind] = useState<'time_band' | 'threshold'>(
    existing?.kind === 'threshold' ? 'threshold' : 'time_band',
  )
  const [label, setLabel] = useState(existing?.label ?? '')
  const [days, setDays] = useState<number[]>(existing?.days_of_week ?? [])
  const [bandStart, setBandStart] = useState(
    existing?.band_start?.slice(0, 5) ?? '22:00',
  )
  const [bandEnd, setBandEnd] = useState(
    existing?.band_end?.slice(0, 5) ?? '06:00',
  )
  const [thresholdHours, setThresholdHours] = useState(
    existing?.threshold_minutes != null
      ? String(existing.threshold_minutes / 60)
      : '8',
  )
  const [thresholdScope, setThresholdScope] = useState<'shift' | 'pay_week'>(
    existing?.threshold_scope === 'pay_week' ? 'pay_week' : 'shift',
  )
  const [payKind, setPayKind] = useState<'fixed' | 'multiplier'>(
    existing?.multiplier != null ? 'multiplier' : 'fixed',
  )
  const [payValue, setPayValue] = useState(
    existing?.multiplier != null
      ? String(existing.multiplier)
      : existing?.rate_pence != null
        ? penceToPoundsInput(existing.rate_pence)
        : '',
  )
  const [priority, setPriority] = useState(String(existing?.priority ?? 0))
  const [active, setActive] = useState(existing?.active ?? true)
  const [validation, setValidation] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const draft = draftRow({
    agencyId,
    kind,
    label: label || '(this rule)',
    days,
    bandStart,
    bandEnd,
    thresholdHours,
    thresholdScope,
    payKind,
    payValue,
    priority,
  })

  // Live preview: a sample 12h Fri-night shift priced under the agency's
  // other rules plus the current draft.
  const otherRules = agencyRules.filter((r) => r.id !== ruleId)
  const previewRules = rulesFromRows(otherRules)
  let preview = null
  if ('row' in draft && active) {
    const draftRule = ruleFromRow({
      ...draft.row,
      id: 'draft',
      active: true,
      created_at: '',
      days_of_week: draft.row.days_of_week ?? null,
      band_start: draft.row.band_start ?? null,
      band_end: draft.row.band_end ?? null,
      threshold_minutes: draft.row.threshold_minutes ?? null,
      threshold_scope: draft.row.threshold_scope ?? null,
      rate_pence: draft.row.rate_pence ?? null,
      multiplier: draft.row.multiplier ?? null,
      priority: draft.row.priority ?? 0,
    })
    if (draftRule) previewRules.push(draftRule)
    preview = priceShift(
      // Fri 18:00 -> Sat 06:00: touches evening, night, midnight and a
      // weekend day, so most rules show up.
      { date: '2026-07-31', startTime: '18:00', endTime: '06:00', breakMinutes: 0 },
      { baseRatePence: agency.base_rate_pence, rules: previewRules },
    )
  }

  function toggleDay(d: number) {
    setDays((current) =>
      current.includes(d) ? current.filter((x) => x !== d) : [...current, d],
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(null)
    const result = draftRow({
      agencyId,
      kind,
      label,
      days,
      bandStart,
      bandEnd,
      thresholdHours,
      thresholdScope,
      payKind,
      payValue,
      priority,
    })
    if ('error' in result) {
      setValidation(result.error)
      return
    }
    const onSuccess = () => navigate(`/agencies/${agencyId}`)
    if (existing) {
      update.mutate({ id: existing.id, ...result.row, active }, { onSuccess })
    } else {
      insert.mutate({ ...result.row, active }, { onSuccess })
    }
  }

  const segCls = (selected: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
      selected ? 'bg-accent text-void' : 'bg-surface text-muted'
    }`

  return (
    <>
      <ScreenTitle>{existing ? 'Edit rule' : 'New rule'}</ScreenTitle>
      <p className="mb-4 text-sm text-muted">{agency.name}</p>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2 rounded-lg border border-edge p-1">
          <button type="button" className={segCls(kind === 'time_band')} onClick={() => setKind('time_band')}>
            Time band
          </button>
          <button type="button" className={segCls(kind === 'threshold')} onClick={() => setKind('threshold')}>
            After N hours
          </button>
        </div>

        <Field label="Name">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputCls}
            placeholder={kind === 'time_band' ? 'Night rate' : 'Overtime'}
            required
          />
        </Field>

        {kind === 'time_band' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input type="time" value={bandStart} onChange={(e) => setBandStart(e.target.value)} className={inputCls} required />
              </Field>
              <Field label="To">
                <input type="time" value={bandEnd} onChange={(e) => setBandEnd(e.target.value)} className={inputCls} required />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm text-muted">
                On days (none selected = every day)
              </p>
              <div className="flex gap-1">
                {DAY_NAMES.map((name, d) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                      days.includes(d)
                        ? 'bg-accent text-void'
                        : 'border border-edge bg-surface text-muted'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="After (hours)">
              <input
                type="number"
                min={0.5}
                step={0.5}
                inputMode="decimal"
                value={thresholdHours}
                onChange={(e) => setThresholdHours(e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Counted per">
              <select
                value={thresholdScope}
                onChange={(e) => setThresholdScope(e.target.value as 'shift' | 'pay_week')}
                className={selectCls}
              >
                <option value="shift">shift</option>
                <option value="pay_week">pay week</option>
              </select>
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Pays">
            <select
              value={payKind}
              onChange={(e) => setPayKind(e.target.value as 'fixed' | 'multiplier')}
              className={selectCls}
            >
              <option value="fixed">fixed £/h</option>
              <option value="multiplier">multiplier ×</option>
            </select>
          </Field>
          <Field label={payKind === 'fixed' ? 'Rate £/h' : 'Multiplier'}>
            <input
              value={payValue}
              onChange={(e) => setPayValue(e.target.value)}
              className={inputCls}
              inputMode="decimal"
              placeholder={payKind === 'fixed' ? '14.50' : '1.5'}
              required
            />
          </Field>
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-muted">Advanced</summary>
          <div className="mt-3 space-y-3">
            <Field label="Priority (higher wins on overlap)">
              <input
                type="number"
                step={1}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputCls}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 accent-(--color-accent)"
              />
              Rule is active
            </label>
          </div>
        </details>

        <Card>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Preview · 12h shift · Fri 18:00 → Sat 06:00
          </h2>
          {'error' in draft ? (
            <p className="text-sm text-muted">{draft.error}</p>
          ) : preview ? (
            <>
              <ul className="space-y-1">
                {preview.breakdown.map((line) => (
                  <li
                    key={`${line.label}-${line.ratePence}`}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {line.label}{' '}
                      <span className="text-muted">
                        <span className="font-mono">{formatMinutes(line.minutes)}</span> @{' '}
                        <span className="font-mono">{formatRate(line.ratePence)}</span>
                      </span>
                    </span>
                    <span className="font-mono">{formatPence(line.subtotalPence)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-edge pt-2 text-right font-mono text-lg font-semibold">
                {formatPence(preview.grossPence)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Rule is off — preview skipped.</p>
          )}
        </Card>

        {validation && <p className="text-sm text-red-400">{validation}</p>}
        <ErrorText error={existing ? update.error : insert.error} />

        <PrimaryButton disabled={insert.isPending || update.isPending}>
          {existing ? 'Save rule' : 'Add rule'}
        </PrimaryButton>

        {existing && (
          <GhostButton
            danger
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true)
                return
              }
              remove.mutate(existing.id, {
                onSuccess: () => navigate(`/agencies/${agencyId}`),
              })
            }}
          >
            {confirmDelete ? 'Tap again to delete' : 'Delete rule'}
          </GhostButton>
        )}
      </form>
    </>
  )
}
