import { useEffect, useState } from 'react'

/**
 * A short-lived bar offering to reverse the last destructive action.
 * Forgiving beats "are you sure?": the action happens immediately and the
 * way out stays visible for a few seconds.
 */
export function UndoBar({
  message,
  onUndo,
  onDismiss,
  seconds = 6,
}: {
  message: string
  onUndo: () => void
  onDismiss: () => void
  seconds?: number
}) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
    const tick = setInterval(() => setRemaining((r) => r - 1), 1000)
    const done = setTimeout(onDismiss, seconds * 1000)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
    // Restart the countdown whenever a new message replaces the old one.
  }, [message, seconds, onDismiss])

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mx-auto flex w-full max-w-md items-center justify-between gap-3 px-5"
    >
      <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-edge bg-surface px-4 py-3 shadow-lg shadow-black/40">
        <span className="text-sm">{message}</span>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-xs text-muted">{remaining}s</span>
          <button
            type="button"
            onClick={onUndo}
            className="text-sm font-semibold text-accent underline underline-offset-4"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  )
}
