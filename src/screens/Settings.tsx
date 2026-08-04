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
import { replayIntro } from '../lib/intro'
import { passwordProblem, usernameProblem } from '../lib/credentials'
import { claimUsername, updatePassword } from '../auth/passwordAuth'
import { useIsOnline, useQueuedWriteCount } from '../lib/offline'
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
 * "Failed to send a request to the Edge Function" is what supabase-js says
 * when the request never left the device — no signal, or a CORS preflight
 * refused. It names an implementation detail nobody outside this repo has
 * heard of, on the one screen where a person is already nervous.
 */
function readableDeleteError(message: string): string {
  if (/failed to send a request|failed to fetch|network/i.test(message)) {
    return 'Couldn’t reach Payweek. Check your connection and try again — nothing has been removed.'
  }
  return `${message} Nothing has been removed.`
}

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
      setError(readableDeleteError(fnError.message))
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
      {error && <p className="mb-3 text-sm text-negative">{error}</p>}
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
            className="press w-full rounded-xl border border-edge bg-surface px-4 py-3.5 text-base font-semibold transition-colors hover:border-accent disabled:opacity-50"
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
            className="press w-full rounded-xl border border-edge bg-surface px-4 py-3.5 text-base font-semibold text-negative transition-colors hover:border-negative disabled:opacity-40"
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

/**
 * Lets an account that predates usernames claim one, and lets anybody change
 * their password.
 *
 * Everyone who signed up with a magic link has no username and no password,
 * so without this they could never use the sign-in form at all.
 */
function UsernameAndPassword({
  profile,
  online,
}: {
  profile: Tables<'profiles'> | null
  online: boolean
}) {
  const { session } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const claimed = profile?.username ?? null

  async function save() {
    setError(null)
    setDone(null)

    const wantsUsername = claimed === null && username.trim() !== ''
    const wantsPassword = password !== ''
    if (!wantsUsername && !wantsPassword) {
      return setError('Nothing to save yet.')
    }
    if (wantsUsername) {
      const problem = usernameProblem(username)
      if (problem) return setError(problem)
    }
    if (wantsPassword) {
      const problem = passwordProblem(password)
      if (problem) return setError(problem)
      if (password !== again) return setError('Those two passwords don’t match.')
    }

    const id = session?.user.id
    if (!id) return

    setBusy(true)
    if (wantsUsername) {
      const result = await claimUsername(id, username)
      if (!result.ok) {
        setBusy(false)
        return setError(result.message)
      }
    }
    if (wantsPassword) {
      const result = await updatePassword(password)
      if (!result.ok) {
        setBusy(false)
        // A username claimed a moment ago has stuck, so say so rather than
        // letting them think the whole thing failed.
        setError(
          wantsUsername
            ? `Username saved, but the password didn’t: ${result.message}`
            : result.message,
        )
        return
      }
    }
    setBusy(false)
    setPassword('')
    setAgain('')
    setDone(
      wantsUsername && wantsPassword
        ? 'Saved. You can sign in with that username and password now.'
        : wantsUsername
          ? 'Username saved.'
          : 'Password changed.',
    )
  }

  return (
    <section className="mt-10 border-t border-edge pt-6">
      <h2 className="text-sm font-semibold">Signing in</h2>

      {claimed ? (
        <p className="mb-3 mt-1 text-sm text-muted">
          You sign in as <span className="font-mono text-ink">{claimed}</span>.
          You can change your password below.
        </p>
      ) : (
        <p className="mb-3 mt-1 text-sm text-muted">
          Pick a username and a password and you can sign straight in, instead
          of waiting for an email every time.
        </p>
      )}

      <div className="space-y-3">
        {claimed === null && (
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`${inputCls} font-mono`}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="sam_1"
            />
          </Field>
        )}

        <Field label={claimed ? 'New password' : 'Password'}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
        </Field>
        <Field label="And again">
          <input
            type="password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
        </Field>

        {error && <p className="text-sm text-negative">{error}</p>}
        {done && <p className="text-sm text-positive">{done}</p>}
        {!online && <NeedsConnection />}

        <GhostButton onClick={() => void save()} disabled={busy || !online}>
          {busy ? 'Saving…' : claimed ? 'Change my password' : 'Save'}
        </GhostButton>
      </div>
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
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const online = useIsOnline()
  const queued = useQueuedWriteCount()

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

        {validation && <p className="text-sm text-negative">{validation}</p>}
        <ErrorText error={upsert.error} />
        {!online && <NeedsConnection />}

        <PrimaryButton disabled={upsert.isPending || !online}>
          {upsert.isPending ? 'Saving…' : savedTick ? 'Saved ✓' : 'Save settings'}
        </PrimaryButton>
      </form>

      <div className="mt-8 space-y-3">
        <Link
          to="/check"
          className="press block w-full rounded-xl border border-edge bg-surface px-4 py-3.5 text-center text-base font-semibold transition-colors hover:border-accent"
        >
          Check a payslip
        </Link>
        <GhostButton onClick={() => void exportCsv()}>
          Export my shifts as a spreadsheet
        </GhostButton>
        {exportError && <p className="text-sm text-negative">{exportError}</p>}
        <GhostButton onClick={replayIntro}>Show the intro again</GhostButton>
        <GhostButton onClick={openPrivacyPolicy}>Privacy policy</GhostButton>
      </div>

      <UsernameAndPassword profile={profile} online={online} />

      {/* Sign out is a real button, not a grey underline below the fold. The
          first person to look for it on a phone couldn't find it. */}
      <div className="mt-8">
        <p className="mb-2 text-center text-sm text-muted">
          Signed in as <span className="font-mono">{session?.user.email}</span>
        </p>
        <GhostButton
          onClick={() => {
            // Shifts logged with no signal live only on this device until they
            // sync. Signing out and reopening would take them with it.
            if (queued > 0 && !confirmSignOut) {
              setConfirmSignOut(true)
              return
            }
            void supabase.auth.signOut()
          }}
        >
          {queued > 0 && confirmSignOut
            ? `Tap again — ${queued} ${queued === 1 ? 'shift hasn’t' : 'shifts haven’t'} synced yet`
            : 'Sign out'}
        </GhostButton>
      </div>

      <DeleteAccount online={online} onExport={() => void exportCsv()} />
    </>
  )
}
