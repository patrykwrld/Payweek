import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DAY_NAMES } from '../lib/days'
import {
  Card,
  ErrorText,
  Field,
  GhostButton,
  NeedsConnection,
  PrimaryButton,
  ScreenTitle,
  inputCls,
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
  label: string
  days: number[]
  bandStart: string
  bandEnd: string
  payValue: string
  priority: string
}): { row: TablesInsert<'rate_rules'> } | { error: string } {
  if (state.label.trim() === '') return { error: 'Give this rate a name.' }

  const rate_pence = parsePoundsToPence(state.payValue)
  if (rate_pence === null) return { error: 'The rate should look like 14.50.' }

  const priority = Number(state.priority || '0')
  if (!Number.isInteger(priority)) return { error: 'Order must be a whole number.' }

  if (!state.bandStart || !state.bandEnd) return { error: 'Set both times.' }

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
      multiplier: null,
      priority,
    },
  }
}

/** Starting points for the rates people actually have, so the form arrives
 * mostly filled in instead of blank. Chosen from the agency page. */
const PRESETS = {
  night: {
    label: 'Night rate',
    days: [] as number[],
    bandStart: '22:00',
    bandEnd: '06:00',
    priority: '5',
    blurb: 'A higher hourly rate between two times. Most nights run 22:00 to 06:00.',
  },
  weekend: {
    label: 'Weekend',
    // Equal start and end means the whole day.
    days: [0, 6] as number[],
    bandStart: '00:00',
    bandEnd: '00:00',
    priority: '10',
    blurb: 'A different hourly rate on the days you choose. Saturday and Sunday are already ticked.',
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

/** An older rate this form can no longer describe. Nothing creates these any
 * more, but anything already saved must still be removable. */
function LegacyRule({
  agencyId,
  rule,
}: {
  agencyId: string
  rule: Tables<'rate_rules'>
}) {
  const navigate = useNavigate()
  const remove = useDeleteRule()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <ScreenTitle>{rule.label}</ScreenTitle>
      <p className="mb-6 text-sm text-muted">
        This is an older kind of rate that Payweek no longer sets up. It still
        counts towards your pay. You can delete it, but not change it here.
      </p>
      <ErrorText error={remove.error} />
      <GhostButton
        danger
        onClick={() => {
          if (!confirmDelete) {
            setConfirmDelete(true)
            return
          }
          remove.mutate(rule.id, {
            onSuccess: () => navigate(`/agencies/${agencyId}`),
          })
        }}
      >
        {confirmDelete ? 'Tap again to delete' : 'Delete this rate'}
      </GhostButton>
    </>
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
  const online = useIsOnline()
  const insert = useInsertRule()
  const update = useUpdateRule()
  const remove = useDeleteRule()

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
  const [payValue, setPayValue] = useState(
    existing?.rate_pence != null ? penceToPoundsInput(existing.rate_pence) : '',
  )
  // Equal start and end is how the engine spells "the whole day". Showing that
  // as 00:00–00:00 confuses people, so it gets a tick of its own.
  const [allDay, setAllDay] = useState(
    existing
      ? existing.band_start === existing.band_end
      : preset !== undefined && preset.bandStart === preset.bandEnd,
  )
  const [priority, setPriority] = useState(
    existing ? String(existing.priority) : (preset?.priority ?? '0'),
  )
  const [active, setActive] = useState(existing?.active ?? true)
  const [validation, setValidation] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (existing && (existing.kind !== 'time_band' || existing.multiplier !== null)) {
    return <LegacyRule agencyId={agencyId} rule={existing} />
  }

  const band = allDay
    ? { bandStart: '00:00', bandEnd: '00:00' }
    : { bandStart, bandEnd }

  const draft = draftRow({
    agencyId,
    label: label || '(this rate)',
    days,
    ...band,
    payValue,
    priority,
  })

  // Live example: a 12h Friday-night shift priced under the agency's other
  // rates plus whatever is currently typed in.
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
      threshold_minutes: null,
      threshold_scope: null,
      rate_pence: draft.row.rate_pence ?? null,
      multiplier: null,
      priority: draft.row.priority ?? 0,
    })
    if (draftRule) previewRules.push(draftRule)
    preview = priceShift(
      // Fri 18:00 -> Sat 06:00: covers evening, night, midnight and a weekend
      // day, so most rates show up in it.
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
      label,
      days,
      ...band,
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
        <Field label="Call it">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputCls}
            placeholder="Night rate"
            required
          />
        </Field>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="size-4 accent-(--color-accent)"
            />
            All day — any hour counts
          </label>
          {!allDay && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <input type="time" value={bandStart} onChange={(e) => setBandStart(e.target.value)} className={inputCls} required />
                </Field>
                <Field label="Until">
                  <input type="time" value={bandEnd} onChange={(e) => setBandEnd(e.target.value)} className={inputCls} required />
                </Field>
              </div>
              <p className="mt-1 text-xs text-muted">
                {bandStart > bandEnd
                  ? 'This one runs past midnight, which is fine.'
                  : 'Hours worked between these two times pay the rate below.'}
              </p>
            </div>
          )}
        </div>

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
                className={`press flex-1 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
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

        <div>
          <Field label="What those hours pay, each">
            <input
              value={payValue}
              onChange={(e) => setPayValue(e.target.value)}
              className={inputCls}
              inputMode="decimal"
              placeholder="14.50"
              required
            />
          </Field>
          <p className="mt-1 text-xs text-muted">
            The full hourly rate, not the extra on top of{' '}
            <span className="font-mono">{formatPence(agency.base_rate_pence)}</span>.
          </p>
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-muted">
            Advanced — you probably don&rsquo;t need this
          </summary>
          <div className="mt-3 space-y-3">
            <Field label="Order (if two rates cover the same hour, the higher number wins)">
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
          {payValue.trim() === '' ? (
            <p className="text-sm text-muted">
              Fill in the rate above and this will show what it comes to.
            </p>
          ) : 'error' in draft ? (
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

        {validation && <p className="text-sm text-negative">{validation}</p>}
        <ErrorText error={existing ? update.error : insert.error} />
        {!online && <NeedsConnection />}

        <PrimaryButton
          disabled={insert.isPending || update.isPending || !online}
        >
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
