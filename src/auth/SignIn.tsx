import { useState, type FormEvent } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { authRedirectUrl } from './redirects'

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string }

/**
 * Sign-in is the one screen that can't work offline, and "Failed to fetch" on
 * a warehouse floor tells nobody anything.
 */
function readable(message: string): string {
  if (/failed to fetch|network|offline/i.test(message)) {
    return 'No connection. Sign-in needs signal — try again when you have some.'
  }
  if (/rate limit/i.test(message)) {
    return 'Too many sign-in emails for now. Wait a few minutes and try again.'
  }
  return message
}

export function SignIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault()
    setStatus({ kind: 'sending' })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    })
    setStatus(
      error
        ? { kind: 'error', message: readable(error.message) }
        : { kind: 'sent' },
    )
  }

  async function signInWithGoogle() {
    setStatus({ kind: 'idle' })
    const redirectTo = authRedirectUrl()
    if (Capacitor.isNativePlatform()) {
      // Google blocks OAuth inside webviews, so open a Custom Tab instead;
      // the deep-link listener finishes the sign-in.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error) {
        setStatus({ kind: 'error', message: readable(error.message) })
      } else if (data.url) {
        await Browser.open({ url: data.url })
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) setStatus({ kind: 'error', message: readable(error.message) })
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 py-12 sm:max-w-md">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Payweek<span className="text-accent">.</span>
        </h1>
        <p className="text-muted">Know what&rsquo;s in your packet.</p>
        {/* This screen is also what payweek.app shows a visitor, so it has to
            say what the thing is — not just ask for an email. */}
        <ul className="space-y-2 pt-3 text-sm text-muted">
          {[
            'Log your shifts and see what you’re owed as you go.',
            'Night and weekend rates, breaks and midnight shifts, priced.',
            'Check a payslip against your own hours when it lands.',
          ].map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </header>

      {status.kind === 'sent' ? (
        <div className="space-y-3 rounded-xl border border-edge bg-surface p-6">
          <p className="text-lg font-semibold">Check your inbox</p>
          <p className="text-sm text-muted">
            We sent a sign-in link to{' '}
            <span className="font-mono text-ink">{email}</span>. Open it on this
            device to finish signing in.
          </p>
          <button
            type="button"
            className="text-sm text-accent underline underline-offset-4"
            onClick={() => setStatus({ kind: 'idle' })}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-edge bg-surface px-4 py-3 font-mono text-base outline-none placeholder:text-muted/50 focus:border-accent"
            />
          </label>

          <button
            type="submit"
            disabled={status.kind === 'sending'}
            className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-void transition-opacity disabled:opacity-50"
          >
            {status.kind === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>

          {status.kind === 'error' && (
            <p className="text-sm text-negative">{status.message}</p>
          )}

          <div className="flex items-center gap-3 py-2 text-xs text-muted">
            <span className="h-px flex-1 bg-edge" />
            or
            <span className="h-px flex-1 bg-edge" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base font-semibold transition-colors hover:border-accent"
          >
            Continue with Google
          </button>
        </form>
      )}
    </main>
  )
}
