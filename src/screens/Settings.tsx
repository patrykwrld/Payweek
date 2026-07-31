import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { useAuth } from '../auth/AuthProvider'
import {
  ErrorText,
  Field,
  GhostButton,
  NeedsConnection,
  PrimaryButton,
  ScreenTitle,
  inputCls,
  selectCls,
} from '../components/ui'
import { LoadFailed, ScreenSkeleton } from '../components/states'
import { useIsOnline } from '../lib/offline'
import { buildShiftsCsv } from '../lib/csv'
import { saveTextFile } from '../lib/download'
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

/**
 * Play requires an in-app route to account deletion for any app that offers
 * sign-up. The deletion itself needs the service role, so it runs in the
 * `delete-account` Edge Function; this only asks, twice, and signs out.
 */
function DeleteAccount({
  online,
  onExport,
}: {
  online: boolean
  onExport: () => void
}) {
  const [stage, setStage] = useState<'idle' | 'confirming' | 'deleting'>('idle')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Two taps is too little for something with no undo and no backup — the
  // word has to be typed. It's a once-ever action, so the friction costs
  // nobody anything in normal use.
  const confirmed = typed.trim().toUpperCase() === 'DELETE'

  async function remove() {
    setStage('deleting')
    setError(null)
    const { error: fnError } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    })
    if (fnError) {
      setError(
        `Couldn't delete the account: ${fnError.message}. Nothing has been removed.`,
      )
      setStage('confirming')
      return
    }
    // The account is gone; signing out drops the dead session and clears the
    // cached copy on this device.
    await supabase.auth.signOut()
  }

  return (
    <section className="mt-12 border-t border-edge pt-6">
      <h2 className="text-sm font-semibold">Delete my account</h2>
      <p className="mb-3 mt-1 text-sm text-muted">
        Removes your account and every shift, agency, rate and payslip in it,
        straight away and for good. There is no undo, and no copy kept. Export
        your shifts first if you want to keep them.
      </p>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {!online ? (
        <NeedsConnection />
      ) : stage === 'idle' ? (
        <GhostButton danger onClick={() => setStage('confirming')}>
          Delete my account
        </GhostButton>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={onExport}
            disabled={stage === 'deleting'}
            className="w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base font-semibold transition-colors hover:border-accent disabled:opacity-50"
          >
            Export my shifts first
          </button>
          <Field label="Type DELETE to confirm">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className={inputCls}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="DELETE"
              disabled={stage === 'deleting'}
            />
          </Field>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={!confirmed || stage === 'deleting'}
            className="w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base font-semibold text-red-400 transition-colors hover:border-red-400 disabled:opacity-40"
          >
            {stage === 'deleting'
              ? 'Deleting…'
              : 'Delete my account permanently'}
          </button>
          {stage !== 'deleting' && (
            <button
              type="button"
              onClick={() => {
                setStage('idle')
                setTyped('')
                setError(null)
              }}
              className="w-full py-2 text-sm text-muted underline underline-offset-4"
            >
              Keep my account
            </button>
          )}
        </div>
      )}
    </section>
  )
}

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
  const [exportError, setExportError] = useState<string | null>(null)
  const online = useIsOnline()

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

  async function exportCsv() {
    setExportError(null)
    if (!shifts.data || !agencies.data || !rules.data) return
    if (shifts.data.length === 0) {
      setExportError('There are no shifts to export yet.')
      return
    }
    const pct = Number(holidayPct)
    const csv = buildShiftsCsv(shifts.data, agencies.data, rules.data, {
      holidayAccrualPct: showAccrual && Number.isFinite(pct) ? pct : null,
    })
    try {
      await saveTextFile(`payweek-shifts-${todayISO()}.csv`, csv, 'text/csv')
    } catch (error) {
      // Dismissing the Android share sheet rejects too; that isn't a failure
      // worth shouting about.
      const message = error instanceof Error ? error.message : String(error)
      if (!/cancel/i.test(message)) setExportError(message)
    }
  }

  function openPrivacyPolicy() {
    if (Capacitor.isNativePlatform()) {
      // The APK serves from the local filesystem, so the policy has to be
      // fetched from the web. VITE_PRIVACY_URL lets a build point at
      // wherever it is actually hosted.
      void Browser.open({
        url: import.meta.env.VITE_PRIVACY_URL || 'https://payweek.app/privacy.html',
      })
    } else {
      // On the web it ships alongside the app, whatever the domain.
      window.open('/privacy.html', '_blank', 'noopener')
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
          <Field label="Your week starts">
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
          <Field label="Holiday pay %">
            <input
              value={holidayPct}
              onChange={(e) => setHolidayPct(e.target.value)}
              className={inputCls}
              inputMode="decimal"
            />
          </Field>
        </div>
        <p className="-mt-1 text-xs text-muted">
          Holiday pay builds up as you work. 12.07% is the usual figure for
          agency work — check your contract if you&rsquo;re not sure.
        </p>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={showAccrual}
            onChange={(e) => setShowAccrual(e.target.checked)}
            className="size-4 accent-(--color-accent)"
          />
          Show holiday pay on the Payday screen
        </label>

        {validation && <p className="text-sm text-red-400">{validation}</p>}
        <ErrorText error={upsert.error} />
        {!online && <NeedsConnection />}

        <PrimaryButton disabled={upsert.isPending || !online}>
          {upsert.isPending ? 'Saving…' : savedTick ? 'Saved ✓' : 'Save settings'}
        </PrimaryButton>
      </form>

      <div className="mt-8 space-y-3">
        <Link
          to="/check"
          className="block w-full rounded-lg border border-edge bg-surface px-4 py-3 text-center text-base font-semibold transition-colors hover:border-accent"
        >
          Check a payslip
        </Link>
        <GhostButton onClick={() => void exportCsv()}>
          Export my shifts as a spreadsheet
        </GhostButton>
        {exportError && <p className="text-sm text-red-400">{exportError}</p>}
        <GhostButton onClick={openPrivacyPolicy}>Privacy policy</GhostButton>
      </div>

      <div className="mt-10 space-y-4 text-center">
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

      <DeleteAccount online={online} onExport={() => void exportCsv()} />
    </>
  )
}
