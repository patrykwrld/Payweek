import { useEffect, type ReactNode } from 'react'
import type { BreakdownLine } from '../lib/rateEngine'
import { createPortal } from 'react-dom'

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

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
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

/**
 * A bottom sheet.
 *
 * Forms used to sit inline on the screen, which meant the page grew a tall
 * stiff block you scrolled past to reach anything else. A sheet is the phone
 * convention for "one job, then gone": it arrives over the screen, it is
 * dismissed by tapping away from it, and the screen underneath keeps its
 * place.
 *
 * Portalled to the body so it escapes the scroll container and the transformed
 * ancestors that would otherwise turn `position: fixed` into "fixed relative
 * to that card".
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  // A sheet that lets the page scroll behind it feels broken on a phone.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="backdrop fixed inset-0 z-40 bg-[rgba(3,5,8,0.66)] backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet no-bar fixed inset-x-0 bottom-0 z-50 max-h-[88%] overflow-y-auto rounded-t-[26px] border-t border-hairline bg-surface px-[18px] pb-[max(1.875rem,env(safe-area-inset-bottom))] pt-2.5"
      >
        <div className="flex justify-center pb-2">
          <span aria-hidden className="h-1 w-[38px] rounded-full bg-hairline" />
        </div>
        {children}
      </div>
    </>,
    document.body,
  )
}

/** The sheet's own header: title on the left, a way out on the right. */
export function SheetHeader({
  title,
  onClose,
  right,
}: {
  title: string
  onClose?: () => void
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
      {right ??
        (onClose && (
          <button
            type="button"
            onClick={onClose}
            className="press min-h-8 px-2.5 text-[13.5px] text-muted"
          >
            Cancel
          </button>
        ))}
    </div>
  )
}

/**
 * A choice you make with one tap instead of a dropdown and a keyboard.
 *
 * Deliberately at least 44px tall even though the label is small: this is used
 * with cold hands in a car park, which is the whole design constraint for
 * this app.
 */
export function Chip({
  children,
  selected,
  onClick,
}: {
  children: ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`press min-h-11 flex-1 rounded-xl border px-3 text-[13px] font-semibold transition-colors ${
        selected
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-edge bg-void text-muted'
      }`}
    >
      {children}
    </button>
  )
}

export function ChipRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <p className="mb-[7px] text-xs text-muted">{label}</p>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

/**
 * A time, changed in half-hours by thumb.
 *
 * A native time input on Android opens a clock dialog that takes four taps to
 * move a shift by thirty minutes. Most corrections are exactly that, so the
 * steppers are the fast path and the underlying value stays a plain HH:MM
 * string the form already understands.
 */
export function Stepper({
  label,
  value,
  onStep,
}: {
  label: string
  value: string
  onStep: (deltaMinutes: number) => void
}) {
  return (
    <div>
      <p className="mb-[7px] text-xs text-muted">{label}</p>
      <div className="flex items-center rounded-xl border border-edge bg-void">
        <button
          type="button"
          onClick={() => onStep(-30)}
          aria-label={`${label} thirty minutes earlier`}
          className="press min-h-12 w-10 text-lg text-muted"
        >
          −
        </button>
        <span className="flex-1 text-center font-mono text-[17px] font-semibold">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onStep(30)}
          aria-label={`${label} thirty minutes later`}
          className="press min-h-12 w-10 text-lg text-muted"
        >
          +
        </button>
      </div>
    </div>
  )
}

/**
 * A shift's pay, as a bar divided by how it was earned.
 *
 * Two colours only, because the question it answers is binary: how much of
 * this was ordinary, and how much was the unsocial hours you actually did it
 * for. The widths come straight off the pricing breakdown — there is no
 * second calculation here that could disagree with the figures beside it.
 *
 * Base rate is matched by label because the breakdown carries no kind: the
 * engine emits exactly one line called "Base rate" and names every premium
 * after the rule that produced it.
 */
export function RateBands({
  breakdown,
  paidMinutes,
  height = 3,
}: {
  breakdown: readonly BreakdownLine[]
  paidMinutes: number
  height?: number
}) {
  if (paidMinutes <= 0 || breakdown.length === 0) return null
  return (
    <div className="flex gap-[2px]" aria-hidden>
      {breakdown.map((line, i) => (
        <span
          key={`${line.label}-${i}`}
          className={`rounded-full ${
            line.label === 'Base rate' ? 'bg-accent' : 'bg-positive'
          }`}
          style={{
            width: `${((line.minutes / paidMinutes) * 100).toFixed(2)}%`,
            height,
          }}
        />
      ))}
    </div>
  )
}

/** Said once at the bottom of a list, not repeated against every bar. */
export function RateBandsLegend() {
  return (
    <div className="mt-1 flex items-center gap-3.5 text-[11px] text-faint">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-[3px] w-3.5 rounded-full bg-accent" />
        base rate
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-[3px] w-3.5 rounded-full bg-positive" />
        night &amp; weekend
      </span>
    </div>
  )
}
