import type { ReactNode } from 'react'
import { useIsOnline } from '../lib/offline'

/** Grey blocks standing in for content while it loads — steadier than a
 * spinner because the layout doesn't jump when data lands. */
export function Skeleton({ className = '' }: { className?: string }) {
  // animate-pulse is an opacity keyframe, which the compositor handles on its
  // own thread. A shimmer sweep would repaint a gradient every frame instead.
  return <div className={`animate-pulse rounded-xl bg-edge/50 ${className}`} />
}

export function ScreenSkeleton({ rows = 3 }: { rows?: number }) {
  const online = useIsOnline()
  // A skeleton is a promise that data is on its way. With no signal and
  // nothing cached on this device the query is paused, not loading, so that
  // promise is never kept — the blocks would pulse until the app is closed.
  // Every screen already shows this component in exactly that situation, so
  // saying so here fixes all of them at once.
  if (!online) return <NothingCachedYet />

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

/**
 * Offline, and this device has never held a copy — a first launch on the
 * Underground, or the first open after the cache was cleared. There is
 * genuinely nothing to show, so it must not promise "what was saved".
 */
function NothingCachedYet() {
  return (
    <div className="card-raised rounded-2xl border border-edge bg-surface p-6 text-center">
      <p className="font-semibold">No connection</p>
      <p className="mx-auto mt-1 max-w-[34ch] text-sm text-muted">
        Payweek needs signal the first time it opens on a phone. After that it
        works without — log your shifts anywhere and they&rsquo;ll sync when
        you&rsquo;re back.
      </p>
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
