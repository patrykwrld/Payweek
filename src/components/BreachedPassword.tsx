import { useEffect, useState } from 'react'
import { passwordProblem } from '../lib/credentials'
import { suggestPassphrase } from '../lib/passphrase'
import { checkPwned, pwnedMessage } from '../lib/pwnedPassword'

/**
 * Warns that a password is already public, and offers one that isn't.
 *
 * Three screens set a password — signing up, resetting from an email link,
 * and changing it in Setup — and all three used to refuse a breached one at
 * the moment of submit, with no way forward. The person most likely to hit
 * it is the person who uses one password everywhere, which makes "choose a
 * different one" a request to invent and memorise a new secret on the spot.
 * The reset screen is the worst of the three: somebody who has just been
 * told by their phone that their password leaked arrives there, tries
 * another password they also reuse, and is locked out of their own pay.
 *
 * So the check runs while they type rather than after they commit, and the
 * refusal comes with a passphrase attached.
 *
 * `onPick` hands the suggestion back so the parent can put it in the field.
 */
export function BreachedPassword({
  password,
  onPick,
}: {
  password: string
  onPick: (passphrase: string) => void
}) {
  const [warning, setWarning] = useState<string | null>(null)
  // Shown in the clear when the app chose it. A suggestion nobody can read
  // is no use to somebody who needs to write it down.
  const [suggested, setSuggested] = useState<string | null>(null)

  // Debounced, like the username check beside it: a request per keystroke to
  // say "breached" about half a password helps nobody. Fails open, so a slow
  // or unreachable third party never blocks anyone.
  useEffect(() => {
    setWarning(null)
    if (password === '' || passwordProblem(password)) return
    let cancelled = false
    const timer = setTimeout(() => {
      void checkPwned(password).then((r) => {
        if (!cancelled) setWarning(pwnedMessage(r))
      })
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [password])

  // A suggestion the person has since typed over is no longer theirs.
  useEffect(() => {
    setSuggested((current) => (current !== null && current !== password ? null : current))
  }, [password])

  if (suggested !== null) {
    return (
      <div
        role="status"
        className="rounded-xl border border-accent/40 bg-accent/[0.06] px-4 py-3.5"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
          Your password
        </p>
        <p className="mt-1.5 font-mono text-[17px] font-semibold tracking-tight">
          {suggested}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Let your phone save it, or write it down before you carry on. Four
          ordinary words beat a clever one &mdash; nothing can guess this, and
          you can actually remember it.
        </p>
      </div>
    )
  }

  if (!warning) return null

  return (
    <div className="rounded-xl border border-warn/40 bg-warn/[0.06] px-4 py-3.5">
      <p className="text-sm leading-relaxed text-ink">{warning}</p>
      <button
        type="button"
        onClick={() => {
          const phrase = suggestPassphrase()
          setSuggested(phrase)
          setWarning(null)
          onPick(phrase)
        }}
        className="press mt-3 min-h-11 w-full rounded-xl border border-warn/60 text-sm font-semibold text-warn"
      >
        Pick one for me
      </button>
    </div>
  )
}
