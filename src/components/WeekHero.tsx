import { useState } from 'react'
import { format, parseISO } from 'date-fns'
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
 *
 * The seven flat segments that used to sit at the bottom said only which day
 * it was, which the date already says. They are now seven bars of what each
 * day actually earned, which turns the same strip into the shape of the week:
 * where the money came from, and which night was worth doing.
 */
export function WeekHero({ pulse }: { pulse: WeekPulse }) {
  const shown = useCountUp(pulse.grossPence, 620)
  const { previousGrossPence: previous, perDay } = pulse
  const delta = previous === null ? null : pulse.grossPence - previous
  const days = Math.min(Math.max(pulse.dayOfWeek, 1), 7)

  // Tapping a bar answers "which day was that?" without leaving the screen.
  // Tapping it again clears, so it can't get stuck showing Tuesday.
  const [picked, setPicked] = useState<number | null>(null)
  const chosen = picked === null ? null : perDay[picked]

  const most = Math.max(...perDay.map((d) => d.pence), 1)

  return (
    <section className="card-raised relative overflow-hidden rounded-[22px] border border-edge bg-surface px-[18px] pb-4 pt-[18px]">
      {/* The one ornament on the screen. It lifts the corner the figure sits
          in without putting anything there to read. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[50px] -top-[70px] size-[190px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(94,155,255,0.13), rgba(94,155,255,0) 70%)',
        }}
      />

      <div className="relative flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          This pay week
        </p>
        {pulse.shiftCount > 0 && (
          <p className="font-mono text-[11px] text-faint">
            {pulse.shiftCount} {pulse.shiftCount === 1 ? 'shift' : 'shifts'}
          </p>
        )}
      </div>

      <p className="figure-week relative mt-1.5">{formatPence(shown)}</p>

      <div className="relative mt-2.5 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="font-mono">
          {formatMinutes(pulse.paidMinutes)} logged
        </span>
        {delta !== null && delta !== 0 && (
          <span
            className={`rounded-[7px] px-2 py-[3px] font-mono text-[11.5px] font-semibold ${
              delta > 0 ? 'bg-positive/10 text-positive' : 'bg-edge text-muted'
            }`}
          >
            {delta > 0 ? '+' : '−'}
            {formatPence(Math.abs(delta))} on last week
          </span>
        )}
      </div>

      {/* Bars, not a chart: no axis, no gridlines, no numbers. It is read as a
          shape at a glance and only interrogated by tapping. */}
      <div className="relative mt-5 flex h-[70px] items-end gap-1.5">
        {perDay.map((day, i) => {
          const height =
            day.pence === 0
              ? '3px'
              : `${Math.round(14 + 86 * (day.pence / most))}%`
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setPicked(picked === i ? null : i)}
              aria-label={`${format(parseISO(day.date), 'EEEE d MMMM')}, ${
                day.pence === 0 ? 'nothing logged' : formatPence(day.pence)
              }`}
              aria-pressed={picked === i}
              className="flex h-full flex-1 flex-col justify-end p-0"
            >
              <span
                className={`grow-bar block w-full rounded-md ${
                  day.pence === 0
                    ? 'bg-edge'
                    : day.isToday
                    ? 'bg-accent shadow-[0_0_16px_rgba(94,155,255,0.45)]'
                    : 'bg-accent/55'
                } ${picked === i ? 'ring-2 ring-accent/60' : ''}`}
                style={{ height }}
              />
            </button>
          )
        })}
      </div>
      <div className="relative mt-[7px] flex gap-1.5" aria-hidden>
        {perDay.map((day) => (
          <span
            key={day.date}
            className={`flex-1 text-center text-[10px] font-semibold tracking-[0.04em] ${
              day.isToday ? 'text-accent' : 'text-faint'
            }`}
          >
            {format(parseISO(day.date), 'EEEEE')}
          </span>
        ))}
      </div>

      {/* min-w-0 and truncate together: without both, a long selected-day line
          wraps and the card grows a row at 402px. */}
      <div className="relative mt-3.5 flex items-center justify-between gap-2.5 border-t border-edge pt-3">
        <p className="min-w-0 flex-1 truncate whitespace-nowrap font-mono text-xs text-muted">
          {chosen
            ? `${format(parseISO(chosen.date), 'EEE d MMM')} · ${
                chosen.pence === 0
                  ? 'nothing logged'
                  : formatPence(chosen.pence)
              }`
            : `Day ${days} of 7 · tap a bar`}
        </p>
        <span className="flex-none whitespace-nowrap rounded-lg bg-accent-soft px-2.5 py-1 font-mono text-[11.5px] font-semibold text-accent">
          {chosen
            ? 'clear'
            : pulse.daysToPayday === null
            ? `week to ${format(parseISO(pulse.weekEnd), 'EEE d MMM')}`
            : pulse.daysToPayday === 0
            ? 'pays today'
            : pulse.daysToPayday === 1
            ? 'pays tomorrow'
            : `pays in ${pulse.daysToPayday} days`}
        </span>
      </div>
    </section>
  )
}
