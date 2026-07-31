import { formatMinutes, formatPence } from '../lib/money'
import { useCountUp } from '../lib/useCountUp'
import type { WeekPulse } from '../lib/weekPulse'

/**
 * The number people open the app for.
 *
 * Everything here earns its place by answering one of three questions someone
 * actually has: how much have I made, how far through the week am I, and when
 * does it land. Anything else would compete with the figure — and a screen
 * with two focal points has none.
 */
export function WeekHero({ pulse }: { pulse: WeekPulse }) {
  const shown = useCountUp(pulse.grossPence)
  const { previousGrossPence: previous } = pulse
  const delta = previous === null ? null : pulse.grossPence - previous
  // Filled days out of seven. Progress is legible at a glance in a way that
  // "day 4 of 7" never is, and it makes an unfinished week feel unfinished.
  const days = Math.min(Math.max(pulse.dayOfWeek, 1), 7)

  return (
    <section className="card-raised rounded-2xl border border-edge bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          This pay week
        </p>
        {pulse.shiftCount > 0 && (
          <p className="text-xs text-faint">
            {pulse.shiftCount} {pulse.shiftCount === 1 ? 'shift' : 'shifts'}
          </p>
        )}
      </div>

      <p className="figure-hero mt-2">{formatPence(shown)}</p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted">
        <span className="font-mono">{formatMinutes(pulse.paidMinutes)}</span>
        <span>logged</span>
        {delta !== null && delta !== 0 && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
              delta > 0
                ? 'bg-positive/10 text-positive'
                : 'bg-edge text-muted'
            }`}
          >
            {delta > 0 ? '+' : '−'}
            <span className="font-mono">{formatPence(Math.abs(delta))}</span> on
            last week
          </span>
        )}
      </div>

      {/* Seven segments, not a bar: a week is counted in days, and discrete
          marks say which day you're on without a label. */}
      <div className="mt-5 flex gap-1" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < days ? 'bg-accent' : 'bg-edge'
            }`}
          />
        ))}
      </div>

      <p className="mt-2 text-xs text-faint">
        Day {days} of 7
        {pulse.daysToPayday !== null && (
          <>
            {' · '}
            {pulse.daysToPayday === 0
              ? 'paid today'
              : pulse.daysToPayday === 1
                ? 'paid tomorrow'
                : `paid in ${pulse.daysToPayday} days`}
          </>
        )}
      </p>
    </section>
  )
}
