import { useState } from 'react'
import { markIntroSeen } from '../lib/intro'

interface Slide {
  title: string
  body: string
  tip: string
}

/**
 * Four cards, shown once.
 *
 * Deliberately not a tour with arrows pointing at buttons: those interrupt
 * the thing you came to do and are read by nobody twice. This says what the
 * app is for, gets out of the way, and can be reopened from Settings by
 * anyone who wants it again.
 */
const SLIDES: Slide[] = [
  {
    title: 'Know what’s in your packet',
    body: 'Log the hours you work and Payweek works out what you’re owed — before the payslip turns up.',
    tip: 'It’s built for agency work: several employers, different rates, weeks that don’t line up.',
  },
  {
    title: 'Tell it what you’re paid',
    body: 'Add who you work for and your normal hourly rate. If nights or weekends pay more, tick the box and put the figure in.',
    tip: 'You can change any of it later from the Rates tab. Nothing is set in stone.',
  },
  {
    title: 'Log a shift in seconds',
    body: 'Start, finish, any unpaid break. The total appears as you type, split into the hours that paid what.',
    tip: 'No signal? Log it anyway. It saves on the phone and syncs itself when you’re back.',
  },
  {
    title: 'Check the payslip',
    body: 'Payday shows what each week should come to and when it lands. When you’re paid, put the figure in and Payweek tells you if it adds up.',
    tip: 'Underpayment is easiest to argue while you can still point at the day.',
  },
]

export function Intro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  if (!slide) return null
  const last = index === SLIDES.length - 1

  function finish() {
    markIntroSeen()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-void">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-10">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight">
            Payweek<span className="text-accent">.</span>
          </p>
          <button
            type="button"
            onClick={finish}
            className="text-sm text-muted underline underline-offset-4"
          >
            Skip
          </button>
        </div>

        <div key={index} className="rise mt-12 flex-1">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">
            {slide.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {slide.body}
          </p>
          <p className="card-raised mt-6 rounded-2xl border border-edge bg-surface p-4 text-sm text-muted">
            <span className="font-semibold text-ink">Tip · </span>
            {slide.tip}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div className="flex justify-center gap-2" aria-hidden>
            {SLIDES.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-accent' : 'w-1.5 bg-edge'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : setIndex(index + 1))}
            className="press w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-void shadow-lg shadow-accent/20"
          >
            {last ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
