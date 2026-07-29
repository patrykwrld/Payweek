import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { useAuth } from '../auth/AuthProvider'
import {
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
import { buildShiftsCsv } from '../lib/csv'
import { DAY_NAMES } from '../lib/days'
import type { Tables } from '../lib/database.types'
import {
  useAgencies,
  useProfile,
  useRateRules,
  useShifts,
  useUpsertProfile,
} from '../lib/queries'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/weeks'

export function Settings() {
  const profile = useProfile()
  const online = useIsOnline()

  if (profile.isPending) return <ScreenSkeleton rows={3} />
  if (profile.isError) return (
      <LoadFailed
        offline={!online}
        onRetry={() => {
          void profile.refetch()
        }}
      />
    )

  return <SettingsInner profile={profile.data} />
}

function SettingsInner({ profile }: { profile: Tables<'profiles'> | null }) {
  const { session } = useAuth()
  const upsert = useUpsertProfile()
  const agencies = useAgencies()
  const shifts = useShifts()
  const rules = useRateRules()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [weekStartsOn, setWeekStartsOn] = useState(
    String(profile?.week_starts_on ?? 1),
  )
  const [holidayPct, setHolidayPct] = useState(
    String(profile?.holiday_accrual_pct ?? 12.07),
  )
  const [showAccrual, setShowAccrual] = useState(
    profile?.show_holiday_accrual ?? true,
  )
  const [savedTick, setSavedTick] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)

  function save(event: FormEvent) {
    event.preventDefault()
    setValidation(null)
    setSavedTick(false)
    const pct = Number(holidayPct)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setValidation('Holiday % must be between 0 and 100.')
      return
    }
    const id = session?.user.id
    if (!id) return
    upsert.mutate(
      {
        id,
        display_name: displayName.trim() === '' ? null : displayName.trim(),
        week_starts_on: Number(weekStartsOn),
        holiday_accrual_pct: pct,
        show_holiday_accrual: showAccrual,
      },
      { onSuccess: () => setSavedTick(true) },
    )
  }

  function exportCsv() {
    if (!shifts.data || !agencies.data || !rules.data) return
    const pct = Number(holidayPct)
    const csv = buildShiftsCsv(shifts.data, agencies.data, rules.data, {
      holidayAccrualPct: showAccrual && Number.isFinite(pct) ? pct : null,
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payweek-shifts-${todayISO()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function openPrivacyPolicy() {
    const url = 'https://payweek.app/privacy.html'
    if (Capacitor.isNativePlatform()) {
      void Browser.open({ url })
    } else {
      window.open(url, '_blank', 'noopener')
    }
  }

  return (
    <>
      <ScreenTitle>Settings</ScreenTitle>

      <form onSubmit={save} className="space-y-4">
        <Field label="Your name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
            placeholder="optional"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Week starts">
            <select
              value={weekStartsOn}
              onChange={(e) => setWeekStartsOn(e.target.value)}
              className={selectCls}
            >
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Holiday accrual %">
            <input
              value={holidayPct}
              onChange={(e) => setHolidayPct(e.target.value)}
              className={inputCls}
              inputMode="decimal"
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={showAccrual}
            onChange={(e) => setShowAccrual(e.target.checked)}
            className="size-4 accent-(--color-accent)"
          />
          Show holiday accrual on the Payday screen
        </label>

        {validation && <p className="text-sm text-red-400">{validation}</p>}
        <ErrorText error={upsert.error} />

        <PrimaryButton disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : savedTick ? 'Saved ✓' : 'Save settings'}
        </PrimaryButton>
      </form>

      <div className="mt-8 space-y-3">
        <Link
          to="/agencies"
          className="block w-full rounded-lg border border-edge bg-surface px-4 py-3 text-center text-base font-semibold transition-colors hover:border-accent"
        >
          Agencies &amp; rates
        </Link>
        <GhostButton onClick={exportCsv}>Export shifts as CSV</GhostButton>
        <GhostButton onClick={openPrivacyPolicy}>Privacy policy</GhostButton>
      </div>

      <div className="mt-10 space-y-1 text-center">
        <p className="text-xs text-muted">
          Signed in as{' '}
          <span className="font-mono">{session?.user.email}</span>
        </p>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </>
  )
}
