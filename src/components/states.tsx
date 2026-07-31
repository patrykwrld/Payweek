import type { ReactNode } from 'react'

/** Grey blocks standing in for content while it loads — steadier than a
 * spinner because the layout doesn't jump when data lands. */
export function Skeleton({ className = '' }: { className?: string }) {
  // animate-pulse is an opacity keyframe, which the compositor handles on its
  // own thread. A shimmer sweep would repaint a gradient every frame instead.
  return <div className={`animate-pulse rounded-xl bg-edge/50 ${className}`} />
}

export function ScreenSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  )
}

/** Something failed to load. Offline is a separate, calmer message —
 * there's nothing wrong, there's just no signal. */
export function LoadFailed({
  onRetry,
  offline,
}: {
  onRetry?: () => void
  offline?: boolean
}) {
  return (
    <div className="card-raised rounded-2xl border border-edge bg-surface p-6 text-center">
      <p className="font-semibold">
        {offline ? 'No connection' : 'Couldn’t load your data'}
      </p>
      <p className="mx-auto mt-1 max-w-[34ch] text-sm text-muted">
        {offline
          ? 'Showing what was saved on this device. It’ll refresh when you’re back online.'
          : 'Something went wrong reaching Payweek.'}
      </p>
      {onRetry && !offline && (
        <button
          type="button"
          onClick={onRetry}
          className="press mt-4 rounded-xl border border-edge px-4 py-2.5 text-sm font-semibold hover:border-accent"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </h2>
  )
}
