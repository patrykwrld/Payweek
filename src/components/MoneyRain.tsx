import { useEffect, useMemo, useState } from 'react'

/**
 * The moment the confirmation link lands: notes falling past a "You're in".
 *
 * The whole thing is one CSS animation per note on `transform` and `opacity`,
 * started once and never touched again. There is no per-frame JavaScript, no
 * canvas, no requestAnimationFrame loop — thirty elements handed to the
 * compositor cost a texture each and nothing per frame after that, which is
 * the difference between "cinematic" and "the app is hot and stuttering" on a
 * £150 Android.
 *
 * Positions and timings are drawn once with useMemo. Re-rolling them on a
 * render would restart every animation mid-fall.
 */

const NOTES = ['💷', '💰', '💵', '🪙', '💸']

/** Enough to read as a shower, few enough to stay one composited layer each. */
const COUNT = 26

/** How long the whole thing is on screen before it lets go by itself. */
const LIFETIME_MS = 5200

interface Note {
  id: number
  emoji: string
  /** vw from the left. */
  left: number
  delay: number
  duration: number
  size: number
  drift: number
  spin: number
}

function makeNotes(): Note[] {
  return Array.from({ length: COUNT }, (_, id) => ({
    id,
    emoji: NOTES[id % NOTES.length] ?? '💷',
    // Spread across the width with a jitter, so it doesn't read as a grid.
    left: (id / COUNT) * 100 + (Math.random() * 8 - 4),
    delay: Math.random() * 1.6,
    // A spread of speeds is most of what makes falling look like falling.
    duration: 2.6 + Math.random() * 2.2,
    size: 1.4 + Math.random() * 1.6,
    drift: Math.random() * 80 - 40,
    spin: Math.random() * 540 - 270,
  }))
}

export function MoneyRain({
  username,
  onDone,
}: {
  username: string | null
  onDone: () => void
}) {
  const notes = useMemo(makeNotes, [])
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Two timers: one to start the fade, one to actually unmount, so the
    // overlay is never yanked off mid-transition.
    const fade = setTimeout(() => setLeaving(true), LIFETIME_MS)
    const gone = setTimeout(onDone, LIFETIME_MS + 400)
    return () => {
      clearTimeout(fade)
      clearTimeout(gone)
    }
  }, [onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className={`fixed inset-0 z-50 overflow-hidden bg-void ${leaving ? 'exit' : ''}`}
    >
      {/* aria-hidden: a screen reader announcing twenty-six banknotes is not
          a celebration. The heading below carries the message. */}
      {/* z-0 against z-10 below, explicitly. Both layers are stacking
          contexts of their own — the notes because they animate transform,
          the text because it animates opacity — so leaving it to paint order
          puts banknotes over the one sentence that matters. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {notes.map((note) => (
          <span
            key={note.id}
            className="note absolute top-0 select-none"
            style={{
              left: `${note.left}vw`,
              fontSize: `${note.size}rem`,
              animationDelay: `${note.delay}s`,
              animationDuration: `${note.duration}s`,
              // Read by the keyframes, so each note falls its own way without
              // needing a stylesheet entry of its own.
              ['--drift' as string]: `${note.drift}px`,
              ['--spin' as string]: `${note.spin}deg`,
            }}
          >
            {note.emoji}
          </span>
        ))}
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="rise text-5xl font-semibold tracking-tight">
          You&rsquo;re in<span className="text-accent">.</span>
        </p>
        {username && (
          <p
            className="rise font-mono text-lg text-muted"
            style={{ animationDelay: '0.12s' }}
          >
            {username}
          </p>
        )}
        <p
          className="rise max-w-[28ch] text-balance text-muted"
          style={{ animationDelay: '0.22s' }}
        >
          Your account is confirmed. Log a shift and Payweek starts counting
          what you&rsquo;re owed.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="rise press mt-4 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-void"
          style={{ animationDelay: '0.32s' }}
        >
          Let&rsquo;s go
        </button>
      </div>
    </div>
  )
}
