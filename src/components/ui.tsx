import type { ReactNode } from 'react'

export const inputCls =
  'w-full rounded-lg border border-edge bg-surface px-4 py-3 font-mono text-base outline-none placeholder:text-muted/50 focus:border-accent'

export const selectCls =
  'w-full appearance-none rounded-lg border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent'

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
      className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-void transition-opacity disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  danger,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  type?: 'submit' | 'button'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full rounded-lg border border-edge bg-surface px-4 py-3 text-base font-semibold transition-colors ${
        danger ? 'text-red-400 hover:border-red-400' : 'hover:border-accent'
      }`}
    >
      {children}
    </button>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-5">{children}</div>
  )
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : String(error)
  return <p className="text-sm text-red-400">{message}</p>
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-edge p-8 text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
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
    <header className="mb-6 flex items-baseline justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {action}
    </header>
  )
}
