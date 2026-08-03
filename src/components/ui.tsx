import type { ReactNode } from 'react'

// A focused field gets a ring as well as a border. On a phone held at arm's
// length a 1px colour change is easy to miss, and "where am I typing" is the
// question a form has to answer continuously.
// Width deliberately excluded: `w-full` in a shared class silently beats any
// `w-14` a caller adds, because Tailwind orders same-property utilities by
// stylesheet position rather than by the order they're written.
export const inputBoxCls =
  'rounded-xl border border-edge bg-surface px-4 py-3 font-mono text-base outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/25'

export const inputCls = `w-full ${inputBoxCls}`

export const selectCls =
  'w-full appearance-none rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  )
}

export function PrimaryButton({
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
      disabled={disabled}
      onClick={onClick}
      className="press w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-void shadow-lg shadow-accent/20 transition-opacity disabled:opacity-40 disabled:shadow-none"
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  danger,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  type?: 'submit' | 'button'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`press w-full rounded-xl border border-edge bg-surface px-4 py-3.5 text-base font-semibold transition-colors disabled:opacity-40 disabled:hover:border-edge ${
        danger ? 'text-negative hover:border-negative' : 'hover:border-accent'
      }`}
    >
      {children}
    </button>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="card-raised rounded-2xl border border-edge bg-surface p-5">
      {children}
    </div>
  )
}

/**
 * Only shifts are queued for later — agencies, rates, payslips and settings
 * all need a live connection. Saying so beats a button that looks like it
 * worked and quietly waits for signal.
 */
export function NeedsConnection() {
  return (
    <p className="rounded-xl border border-edge bg-surface px-4 py-3 text-sm text-muted">
      You&rsquo;re offline. Logging shifts still works, but saving this needs a
      connection — try again once you&rsquo;re back on signal.
    </p>
  )
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : String(error)
  return <p className="text-sm text-negative">{message}</p>
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-edge p-8 text-center">
      <p className="font-semibold">{title}</p>
      {hint && (
        <p className="mx-auto mt-1 max-w-[36ch] text-sm text-muted">{hint}</p>
      )}
    </div>
  )
}

export function ScreenTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex items-baseline justify-between gap-3">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">
        {children}
      </h1>
      {action}
    </header>
  )
}
