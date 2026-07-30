import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
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
  if (state.label.trim() === '') return { error: 'Give this rate a name.' }

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

/** Starting points for the rates people actually have, so the form arrives
 * mostly filled in instead of blank. Chosen from the agency page. */
const PRESETS = {
  night: {
    kind: 'time_band',
    label: 'Night rate',
    days: [] as number[],
    bandStart: '22:00',
    bandEnd: '06:00',
    payKind: 'fixed',
    payValue: '',
    priority: '5',
    blurb: 'A higher hourly rate between two times — most nights run 22:00 to 06:00.',
  },
  weekend: {
    kind: 'time_band',
    label: 'Weekend',
    // Equal start and end means the whole day.
    days: [0, 6] as number[],
    bandStart: '00:00',
    bandEnd: '00:00',
    payKind: 'fixed',
    payValue: '',
    priority: '10',
    blurb: 'A different hourly rate on the days you pick. Saturday and Sunday are ticked already.',
  },
  overtime: {
    kind: 'threshold',
    label: 'Overtime',
    days: [] as number[],
    bandStart: '22:00',
    bandEnd: '06:00',
    payKind: 'multiplier',
    payValue: '1.5',
    priority: '0',
    blurb: 'Extra pay once you pass a number of hours. 1.5 is time and a half.',
  },
} as const

type PresetName = keyof typeof PRESETS

function presetFrom(value: string | null) {
  return value !== null && value in PRESETS
    ? PRESETS[value as PresetName]
    : undefined
}

export function RuleForm() {
  const { id: agencyId, ruleId } = useParams()
  const [searchParams] = useSearchParams()
  const agencies = useAgencies()
  const rules = useRateRules()
  const online = useIsOnline()

  if (agencies.isPending || rules.isPending) {
    return <ScreenSkeleton rows={2} />
  }
  if (agencies.isError || rules.isError || !agencyId) {
    return (
      <LoadFailed
        offline={!online}
        onRetry={() => {
          void agencies.refetch(); void rules.refetch()
        }}
      />
    )
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
      preset={existing ? undefined : presetFrom(searchParams.get('preset'))}
    />
  )
}

function RuleFormInner({
  agency,
  agencyRules,
  existing,
  preset,
}: {
  agency: Tables<'agencies'>
  agencyRules: Tables<'rate_rules'>[]
  existing: Tables<'rate_rules'> | undefined
  preset: (typeof PRESETS)[PresetName] | undefined
}) {
  const agencyId = agency.id
  const ruleId = existing?.id
  const navigate = useNavigate()
  const insert = useInsertRule()
  const update = useUpdateRule()
  const remove = useDeleteRule()

  const [kind, setKind] = useState<'time_band' | 'threshold'>(
    existing?.kind === 'threshold' || preset?.kind === 'threshold'
      ? 'threshold'
      : 'time_band',
  )
  const [label, setLabel] = useState(existing?.label ?? preset?.label ?? '')
  const [days, setDays] = useState<number[]>(
    existing?.days_of_week ?? [...(preset?.days ?? [])],
  )
  const [bandStart, setBandStart] = useState(
    existing?.band_start?.slice(0, 5) ?? preset?.bandStart ?? '22:00',
  )
  const [bandEnd, setBandEnd] = useState(
    existing?.band_end?.slice(0, 5) ?? preset?.bandEnd ?? '06:00',
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
    existing
      ? existing.multiplier != null
        ? 'multiplier'
        : 'fixed'
      : (preset?.payKind ?? 'fixed'),
  )
  const [payValue, setPayValue] = useState(
    existing?.multiplier != null
      ? String(existing.multiplier)
      : existing?.rate_pence != null
        ? penceToPoundsInput(existing.rate_pence)
        : (preset?.payValue ?? ''),
  )
  const [priority, setPriority] = useState(
    existing ? String(existing.priority) : (preset?.priority ?? '0'),
  )
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
      <ScreenTitle>
        {existing ? 'Edit rate' : (preset?.label ?? 'Extra rate')}
      </ScreenTitle>
      <p className="mb-4 text-sm text-muted">
        {agency.name} · normally{' '}
        <span className="font-mono">{formatPence(agency.base_rate_pence)}</span> an
        hour
      </p>
      {preset && !existing && (
        <p className="mb-4 text-sm text-muted">{preset.blurb}</p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-muted">When does this rate apply?</p>
          <div className="flex gap-2 rounded-lg border border-edge p-1">
            <button type="button" className={segCls(kind === 'time_band')} onClick={() => setKind('time_band')}>
              At certain hours
            </button>
            <button type="button" className={segCls(kind === 'threshold')} onClick={() => setKind('threshold')}>
              After so many hours
            </button>
          </div>
        </div>

        <Field label="Call it">
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
            {bandStart === bandEnd && (
              <p className="-mt-1 text-xs text-muted">
                Same time in both boxes means the whole day.
              </p>
            )}
            <div>
              <p className="mb-2 text-sm text-muted">
                Which days? Leave them all off to mean every day.
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
            <Field label="After how many hours">
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
                <option value="shift">single shift</option>
                <option value="pay_week">whole week</option>
              </select>
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="How is it paid?">
            <select
              value={payKind}
              onChange={(e) => setPayKind(e.target.value as 'fixed' | 'multiplier')}
              className={selectCls}
            >
              <option value="fixed">a set hourly rate</option>
              <option value="multiplier">times your normal rate</option>
            </select>
          </Field>
          <Field
            label={
              payKind === 'fixed' ? 'That hourly rate' : 'Times your normal rate'
            }
          >
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
        <p className="text-xs text-muted">
          {payKind === 'fixed'
            ? 'What one hour pays while this rate applies — not the extra on top.'
            : '1.5 means time and a half, 2 means double time.'}
        </p>

        <details>
          <summary className="cursor-pointer text-sm text-muted">
            Advanced — you probably don&rsquo;t need this
          </summary>
          <div className="mt-3 space-y-3">
            <Field label="Priority (if two rates cover the same hour, the higher number wins)">
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
              Use this rate (untick to pause it without deleting)
            </label>
          </div>
        </details>

        <Card>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            What an example shift would pay · Fri 18:00 → Sat 06:00
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
            <p className="text-sm text-muted">
              This rate is paused, so it isn&rsquo;t in the example.
            </p>
          )}
        </Card>

        {validation && <p className="text-sm text-red-400">{validation}</p>}
        <ErrorText error={existing ? update.error : insert.error} />

        <PrimaryButton disabled={insert.isPending || update.isPending}>
          {existing ? 'Save changes' : 'Add this rate'}
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
            {confirmDelete ? 'Tap again to delete' : 'Delete this rate'}
          </GhostButton>
        )}
      </form>
    </>
  )
}
