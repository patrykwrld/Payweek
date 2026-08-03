import { useState, type FormEvent } from 'react'
import { passwordProblem } from '../lib/credentials'
import { updatePassword } from './passwordAuth'
import { supabase } from '../lib/supabase'

/**
 * Where a password-reset link lands.
 *
 * Opening the link puts a real session on the device, so this screen has to
 * come before the app itself — otherwise someone arriving from the email sees
 * the Add screen, has no idea a reset is half-finished, and their old password
 * quietly still works.
 */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = passwordProblem(password)
    if (problem) return setError(problem)
    if (password !== again) return setError('Those two don’t match.')

    setError(null)
    setBusy(true)
    const result = await updatePassword(password)
    setBusy(false)
    if (!result.ok) return setError(result.message)
    onDone()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12 sm:max-w-md">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Payweek<span className="text-accent">.</span>
        </h1>
        <p className="text-lg font-semibold">Set a new password</p>
        <p className="text-sm text-muted">
          You&rsquo;re signed in from the link in your email. Choose a new
          password and you&rsquo;re done.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-muted">New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
            required
          />
          <span className="block text-xs text-muted">At least 8 characters.</span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-muted">And again</span>
          <input
            type="password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
            required
          />
        </label>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="press w-full rounded-lg bg-accent px-4 py-3.5 text-base font-semibold text-void transition-opacity disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save my new password'}
        </button>

        {/* Someone who opened the link by accident, or changed their mind,
            must not be trapped on a screen with one way out. */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="text-sm text-muted underline underline-offset-4"
          >
            Cancel and sign out
          </button>
        </div>
      </form>
    </main>
  )
}
