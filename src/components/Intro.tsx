import { useState } from 'react'
import { markIntroSeen } from '../lib/intro'

interface Slide {
  title: string
  body: string
  tip: string
  /** Where the glow sits behind this card, as a CSS position. */
  glow: string
}

/**
 * Four cards, shown once.
 *
 * Deliberately not a tour with arrows pointing at buttons: those interrupt the
 * thing you came to do and are read by nobody twice. This says what the app is
 * for, gets out of the way, and can be reopened from Settings.
 *
 * The motion is doing a job. Each card's parts arrive in reading order, which
 * paces someone through the sentence instead of dropping a wall of text on
 * them; the glow moves so the four cards feel like one continuous thing rather
 * than four screens; and the whole overlay lets go at the end so arriving in
 * the app reads as a destination. All of it is transform and opacity only, so
 * it runs on the compositor and stays smooth on a cheap phone — and all of it
 * is off under prefers-reduced-motion, where the words alone still work.
 */
const SLIDES: Slide[] = [
  {
    title: 'Know what’s in your packet',
    body: 'Log the hours you work and Payweek works out what you’re owed — before the payslip turns up.',
    tip: 'It’s built for agency work: several employers, different rates, weeks that don’t line up.',
    glow: '18% 12%',
  },
  {
    title: 'Tell it what you’re paid',
    body: 'Add who you work for and your normal hourly rate. If nights or weekends pay more, tick the box and put the figure in.',
    tip: 'You can change any of it later from the Rates tab. Nothing is set in stone.',
    glow: '78% 26%',
  },
  {
    title: 'Log a shift in seconds',
    body: 'Start, finish, any unpaid break. The total appears as you type, split into the hours that paid what.',
    tip: 'No signal? Log it anyway. It saves on the phone and syncs itself when you’re back.',
    glow: '22% 62%',
  },
  {
    title: 'Check the payslip',
    body: 'Payday shows what each week should come to and when it lands. When you’re paid, put the figure in and Payweek tells you if it adds up.',
    tip: 'Underpayment is easiest to argue while you can still point at the day.',
    glow: '76% 74%',
  },
]

const EXIT_MS = 320

export function Intro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const slide = SLIDES[index]
  if (!slide) return null
  const last = index === SLIDES.length - 1

  function finish() {
    markIntroSeen()
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onDone()
      return
    }
    setLeaving(true)
    setTimeout(onDone, EXIT_MS)
  }

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-void ${
        leaving ? 'exit' : ''
      }`}
    >
      {/* Backdrop. A single wide radial gradient, moved with transform — no
          blur filter, which is what makes this kind of thing expensive. */}
      <div
        aria-hidden
        className="drift pointer-events-none absolute inset-[-25%]"
        style={{
          background: `radial-gradient(closest-side, color-mix(in srgb, var(--color-accent) 26%, transparent), transparent 72%)`,
          transformOrigin: slide.glow,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at ${slide.glow}, color-mix(in srgb, var(--color-accent) 13%, transparent), transparent 60%)`,
          transition: 'background 700ms ease',
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight">
            Payweek<span className="text-accent">.</span>
          </p>
          <button
            type="button"
            onClick={finish}
            className="-mr-2 px-2 py-2 text-sm text-muted underline underline-offset-4"
          >
            Skip
          </button>
        </div>

        {/* Content sits in the lower third rather than marooned at the top:
            closer to the thumb, and it leaves the drifting light room to be
            seen. Keyed on the index so every part replays as the card
            changes. */}
        <div className="flex-1" />
        <div key={index}>
          <h1
            className="enter text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em]"
            style={{ animationDelay: '40ms' }}
          >
            {slide.title}
          </h1>
          <p
            className="enter mt-4 text-base leading-relaxed text-muted"
            style={{ animationDelay: '130ms' }}
          >
            {slide.body}
          </p>
          <p
            className="enter card-raised mt-7 rounded-2xl border border-edge bg-surface/80 p-4 text-sm text-muted"
            style={{ animationDelay: '230ms' }}
          >
            <span className="font-semibold text-ink">Tip · </span>
            {slide.tip}
          </p>
        </div>

        <div className="mt-10 space-y-5">
          <div className="flex justify-center gap-2" aria-hidden>
            {SLIDES.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-7 bg-accent' : 'w-1.5 bg-edge'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : setIndex(index + 1))}
            className="press w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-void shadow-lg shadow-accent/25"
          >
            {last ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
