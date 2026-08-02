import { useEffect, useState, type FormEvent } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import {
  MAX_PER_WINDOW,
  attemptsLeft,
  formatWait,
  gateSend,
  recordSend,
} from '../lib/signInThrottle'
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
  if (/rate limit|too many|429/i.test(message)) {
    return 'That was one link too many. Give it a couple of minutes and try again.'
  }
  return message
}

/**
 * A clock that only ticks while something on screen is counting down. The
 * sign-in screen is otherwise completely still, and a re-render every second
 * for no reason is exactly the sort of thing that makes a cheap phone warm.
 */
function useSecondsTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

export function SignIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  // Cheap enough to recompute on every render, and it has to be: the answer
  // changes with the clock as well as with what's in the box.
  const [tickOn, setTickOn] = useState(false)
  const now = useSecondsTick(tickOn)
  const gate = gateSend(email, now)
  const left = attemptsLeft(email, now)

  useEffect(() => {
    setTickOn(!gate.allowed)
  }, [gate.allowed])

  const waitText = gate.allowed ? null : formatWait(gate.waitMs)

  async function send() {
    if (!gate.allowed) return
    setStatus({ kind: 'sending' })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    })
    if (error) {
      // A request that died on a flat signal sent no email, so it must not
      // cost anybody one of their three.
      setStatus({ kind: 'error', message: readable(error.message) })
      return
    }
    recordSend(email)
    setTickOn(true)
    setStatus({ kind: 'sent' })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send()
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
          <p className="text-sm text-muted">
            Nothing there after a minute? Check your spam folder.
          </p>

          {/* The link goes missing often enough that "send another" has to be
              here rather than behind going back and retyping the address. */}
          <button
            type="button"
            disabled={!gate.allowed}
            onClick={() => void send()}
            className="press w-full rounded-lg border border-edge bg-void px-4 py-3 text-base font-semibold transition-colors hover:border-accent disabled:opacity-50 disabled:hover:border-edge"
          >
            {gate.allowed ? 'Send another link' : `Send another in ${waitText}`}
          </button>

          <p aria-live="polite" className="text-xs text-muted">
            {left > 0
              ? `${left} more ${left === 1 ? 'link' : 'links'} available in the next 10 minutes.`
              : `That’s ${MAX_PER_WINDOW} links in 10 minutes. The next one is available in ${waitText}.`}
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
        <form onSubmit={onSubmit} className="space-y-4">
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
            disabled={status.kind === 'sending' || !gate.allowed}
            className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-void transition-opacity disabled:opacity-50"
          >
            {status.kind === 'sending'
              ? 'Sending…'
              : gate.allowed
                ? 'Email me a sign-in link'
                : `Try again in ${waitText}`}
          </button>

          {/* Say why the button is dead. A disabled button with no reason is
              the single most common way an app looks broken. */}
          {!gate.allowed && (
            <p aria-live="polite" className="text-sm text-muted">
              {gate.reason === 'spacing'
                ? `A link is already on its way to that address. You can ask for another in ${waitText}.`
                : `That address has had ${MAX_PER_WINDOW} links in the last 10 minutes. The next one is available in ${waitText} — check your spam folder in the meantime.`}
            </p>
          )}

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
