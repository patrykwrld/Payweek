import {
  cloneElement,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { keepSignedIn, setKeepSignedIn } from '../lib/authStorage'
import { passwordProblem, usernameProblem } from '../lib/credentials'
import {
  isUsernameFree,
  resendConfirmation,
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from './passwordAuth'
import {
  MAX_PER_WINDOW,
  attemptsLeft,
  formatWait,
  gateSend,
  recordSend,
} from '../lib/signInThrottle'
import { authRedirectUrl } from './redirects'

/**
 * Which of the screen's several jobs it is currently doing. One at a time:
 * a sign-in form that also offers sign-up, magic links, password resets and
 * Google in one view is a wall of boxes.
 */
type Mode = 'signIn' | 'createAccount' | 'forgotPassword'

type Notice =
  /** Account made; the link that finishes it is in their inbox. */
  | { kind: 'created'; username: string; email: string; needsConfirmation: boolean }
  /** A password reset is in their inbox. */
  | { kind: 'resetSent'; email: string }

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

const fieldCls =
  'w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base outline-none placeholder:text-muted/50 focus:border-accent'

/**
 * The hint sits outside the <label> and is attached with aria-describedby.
 * Inside it, it becomes part of the field's name — a screen reader, and
 * Playwright, both read the email box as "Email Only used to reset your
 * password if you forget it".
 */
function Labelled({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactElement
}) {
  const hintId = useId()
  return (
    <div className="space-y-2">
      <label className="block space-y-2">
        <span className="text-sm text-muted">{label}</span>
        {hint
          ? cloneElement(
              children as ReactElement<{ 'aria-describedby'?: string }>,
              { 'aria-describedby': hintId },
            )
          : children}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

function PrimaryAction({
  children,
  disabled,
  type = 'submit',
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="press w-full rounded-lg bg-accent px-4 py-3.5 text-base font-semibold text-void transition-opacity disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function Quiet({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-accent underline underline-offset-4"
    >
      {children}
    </button>
  )
}

export function SignIn() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sign in
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // Create account
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [usernameTaken, setUsernameTaken] = useState(false)

  // Password reset
  const [email, setEmail] = useState('')

  const [keep, setKeep] = useState(() => keepSignedIn())
  const [tickOn, setTickOn] = useState(false)
  const now = useSecondsTick(tickOn)
  // Whichever address is currently in play — the one being registered, or the
  // one being reset.
  const emailInPlay = notice?.kind === 'created' ? notice.email : email
  const gate = gateSend(emailInPlay, now)
  const left = attemptsLeft(emailInPlay, now)
  useEffect(() => setTickOn(!gate.allowed), [gate.allowed])
  const waitText = gate.allowed ? null : formatWait(gate.waitMs)

  function go(next: Mode) {
    setMode(next)
    setNotice(null)
    setError(null)
  }

  // Checked as they type, but only once they've stopped — a request per
  // keystroke to say "taken" about half a username helps nobody.
  useEffect(() => {
    setUsernameTaken(false)
    const value = newUsername.trim()
    if (usernameProblem(value)) return
    const timer = setTimeout(() => {
      void isUsernameFree(value).then((free) => setUsernameTaken(!free))
    }, 400)
    return () => clearTimeout(timer)
  }, [newUsername])

  async function doSignIn(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const result = await signInWithPassword(identifier, password)
    setBusy(false)
    if (!result.ok) setError(result.message)
    // On success the auth listener swaps this screen for the app.
  }

  async function doCreateAccount(event: FormEvent) {
    event.preventDefault()
    const nameProblem = usernameProblem(newUsername)
    if (nameProblem) return setError(nameProblem)
    if (usernameTaken) return setError('That username is taken. Try another.')
    const pwProblem = passwordProblem(newPassword)
    if (pwProblem) return setError(pwProblem)

    setError(null)
    setBusy(true)
    const result = await signUpWithPassword({
      username: newUsername,
      email: newEmail,
      password: newPassword,
    })
    setBusy(false)
    if (!result.ok) return setError(result.message)

    setNotice({
      kind: 'created',
      username: newUsername.trim(),
      email: newEmail.trim(),
      needsConfirmation: result.needsConfirmation === true,
    })
    // Carried over so the button on the announcement can just sign them in.
    setIdentifier(newUsername.trim())
    setPassword(newPassword)
    setNewPassword('')
  }

  async function signInFromAnnouncement() {
    setError(null)
    setBusy(true)
    const result = await signInWithPassword(identifier, password)
    setBusy(false)
    if (result.ok) return
    // Confirmation pending, or something else. Put them on the sign-in form
    // with the reason showing, rather than leaving them on a dead button.
    setNotice(null)
    setMode('signIn')
    setError(result.message)
  }

  /**
   * Sends the confirmation link again. Same three-per-ten-minutes allowance
   * the magic link used to have — the link is now the only way to finish
   * signing up, so a lost one has to be replaceable without hammering it.
   */
  async function doResend() {
    if (notice?.kind !== 'created' || !gate.allowed) return
    setError(null)
    setBusy(true)
    const result = await resendConfirmation(notice.email)
    setBusy(false)
    if (!result.ok) {
      // A request that died on a flat signal sent no email, so it must not
      // cost anybody one of their three.
      setError(result.message)
      return
    }
    recordSend(notice.email)
    setTickOn(true)
  }

  async function doSendReset(event: FormEvent) {
    event.preventDefault()
    if (!gate.allowed) return
    setError(null)
    setBusy(true)
    const result = await sendPasswordReset(email)
    setBusy(false)
    if (!result.ok) return setError(result.message)
    recordSend(email)
    setTickOn(true)
    setNotice({ kind: 'resetSent', email })
  }

  async function signInWithGoogle() {
    setError(null)
    const redirectTo = authRedirectUrl()
    if (Capacitor.isNativePlatform()) {
      // Google blocks OAuth inside webviews, so open a Custom Tab instead;
      // the deep-link listener finishes the sign-in.
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (oauthError) setError(readable(oauthError.message))
      else if (data.url) await Browser.open({ url: data.url })
    } else {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (oauthError) setError(readable(oauthError.message))
    }
  }

  const keepBox = (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={keep}
        onChange={(e) => {
          setKeep(e.target.checked)
          // Written now rather than on submit, because an emailed link may
          // well come back in a different tab.
          setKeepSignedIn(e.target.checked)
        }}
        className="mt-0.5 size-4 shrink-0 accent-(--color-accent)"
      />
      <span className="min-w-0">
        Keep me signed in
        {!keep && (
          <span className="block text-xs text-muted">
            You&rsquo;ll be signed out when you close Payweek. Use this on a
            shared or work computer.
          </span>
        )}
      </span>
    </label>
  )

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12 sm:max-w-md">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Payweek<span className="text-accent">.</span>
        </h1>
        <p className="text-muted">Know what&rsquo;s in your packet.</p>
        {/* This screen is also what payweek.app shows a visitor, so it has to
            say what the thing is — not just ask for a password. */}
        {notice === null && mode !== 'forgotPassword' && (
          <ul className="space-y-2 pt-2 text-sm text-muted">
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
        )}
      </header>

      {/* ---------------------------------------------------- announcements */}
      {notice?.kind === 'created' ? (
        <section className="space-y-4 rounded-2xl border border-positive/40 bg-surface p-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-positive/15 text-lg text-positive"
            >
              ✓
            </span>
            <p className="text-lg font-semibold">Your account is ready</p>
          </div>

          <div className="rounded-xl border border-edge bg-void p-4">
            <p className="text-xs uppercase tracking-wider text-muted">
              Your username
            </p>
            <p className="mt-1 break-all font-mono text-lg">{notice.username}</p>
          </div>

          {notice.needsConfirmation ? (
            <>
              <p className="text-sm">
                <span className="font-semibold">One step left.</span> Open the
                link we&rsquo;ve just emailed to{' '}
                <span className="font-mono text-ink">{notice.email}</span> and
                it will take you straight into Payweek — no signing in needed.
              </p>
              <p className="text-sm text-muted">
                Open it <span className="font-semibold">on this device</span>.
                Nothing after a minute? Check your spam folder.
              </p>

              <button
                type="button"
                disabled={!gate.allowed || busy}
                onClick={() => void doResend()}
                className="press w-full rounded-lg border border-edge bg-void px-4 py-3 text-base font-semibold transition-colors hover:border-accent disabled:opacity-50 disabled:hover:border-edge"
              >
                {busy
                  ? 'Sending…'
                  : gate.allowed
                    ? 'Send the email again'
                    : `Send again in ${waitText}`}
              </button>

              <p aria-live="polite" className="text-xs text-muted">
                {left > 0
                  ? `${left} more ${left === 1 ? 'email' : 'emails'} available in the next 10 minutes.`
                  : `That’s ${MAX_PER_WINDOW} emails in 10 minutes. The next one is available in ${waitText}.`}
              </p>

              <p className="text-sm text-muted">
                After that, sign in with{' '}
                <span className="font-mono text-ink">{notice.username}</span>{' '}
                and your password. You won&rsquo;t need another email.
              </p>

              {error && <p className="text-sm text-negative">{error}</p>}

              <div className="text-center">
                <Quiet onClick={() => go('signIn')}>Back to sign in</Quiet>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Sign in with that and your password from now on. Forgotten it
                later? We&rsquo;ll email a reset link to{' '}
                <span className="font-mono text-ink">{notice.email}</span> — so
                keep that address one you can open.
              </p>

              {error && <p className="text-sm text-negative">{error}</p>}

              <PrimaryAction
                type="button"
                disabled={busy}
                onClick={() => void signInFromAnnouncement()}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </PrimaryAction>
            </>
          )}
        </section>
      ) : notice?.kind === 'resetSent' ? (
        <section className="space-y-3 rounded-xl border border-edge bg-surface p-6">
          <p className="text-lg font-semibold">Check your inbox</p>
          <p className="text-sm text-muted">
            If there&rsquo;s an account for{' '}
            <span className="font-mono text-ink">{notice.email}</span>,
            a link to set a new password is on its way. Open it on this device.
          </p>
          <Quiet onClick={() => go('signIn')}>Back to sign in</Quiet>
        </section>
      ) : mode === 'signIn' ? (
        /* ------------------------------------------------------- sign in */
        <form onSubmit={doSignIn} className="space-y-4">
          <Labelled label="Username or email">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="your username"
              className={`${fieldCls} font-mono`}
              required
            />
          </Labelled>

          <Labelled label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={fieldCls}
              required
            />
          </Labelled>

          {keepBox}

          {error && <p className="text-sm text-negative">{error}</p>}

          <PrimaryAction disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </PrimaryAction>

          <div className="flex justify-between text-sm">
            <Quiet onClick={() => go('createAccount')}>Create an account</Quiet>
            <Quiet onClick={() => go('forgotPassword')}>
              Forgotten your password?
            </Quiet>
          </div>

          <div className="flex items-center gap-3 py-1 text-xs text-muted">
            <span className="h-px flex-1 bg-edge" />
            or
            <span className="h-px flex-1 bg-edge" />
          </div>

          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="press w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base font-semibold transition-colors hover:border-accent"
          >
            Continue with Google
          </button>
        </form>
      ) : mode === 'createAccount' ? (
        /* ------------------------------------------------ create account */
        <form onSubmit={doCreateAccount} className="space-y-4">
          <Labelled
            label="Choose a username"
            hint="3–20 characters. Letters, numbers and underscores."
          >
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="sam_1"
              className={`${fieldCls} font-mono`}
              required
            />
          </Labelled>
          {usernameTaken && (
            <p className="-mt-2 text-sm text-negative">
              That username is taken. Try another.
            </p>
          )}

          <Labelled
            label="Email"
            hint="Only used to reset your password if you forget it."
          >
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className={`${fieldCls} font-mono`}
              required
            />
          </Labelled>

          <Labelled label="Password" hint="At least 8 characters.">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className={fieldCls}
              required
            />
          </Labelled>

          {error && <p className="text-sm text-negative">{error}</p>}

          <PrimaryAction disabled={busy}>
            {busy ? 'Creating your account…' : 'Create my account'}
          </PrimaryAction>

          <div className="text-center">
            <Quiet onClick={() => go('signIn')}>
              I&rsquo;ve already got an account
            </Quiet>
          </div>
        </form>
      ) : (
        /* ----------------------------------------------- forgot password */
        <form onSubmit={doSendReset} className="space-y-4">
          <div>
            <p className="text-lg font-semibold">Reset your password</p>
            <p className="mt-1 text-sm text-muted">
              Put in the email address on your account and we&rsquo;ll send a
              link to set a new password.
            </p>
          </div>

          <Labelled label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${fieldCls} font-mono`}
            />
          </Labelled>

          {error && <p className="text-sm text-negative">{error}</p>}

          <PrimaryAction disabled={busy || !gate.allowed}>
            {busy
              ? 'Sending…'
              : gate.allowed
                ? 'Send me a reset link'
                : `Try again in ${waitText}`}
          </PrimaryAction>

          {/* Say why the button is dead. A disabled button with no reason is
              the single most common way an app looks broken. */}
          {!gate.allowed && (
            <p aria-live="polite" className="text-sm text-muted">
              {gate.reason === 'spacing'
                ? `A link is already on its way to that address. You can ask for another in ${waitText}.`
                : `That address has had ${MAX_PER_WINDOW} emails in the last 10 minutes. The next one is available in ${waitText} — check your spam folder in the meantime.`}
            </p>
          )}

          <div className="text-center">
            <Quiet onClick={() => go('signIn')}>Back to sign in</Quiet>
          </div>
        </form>
      )}
    </main>
  )
}
