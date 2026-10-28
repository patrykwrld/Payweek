import { useEffect, useState } from 'react'
import { saveImageFile, shareImageFile } from '../lib/download'
import { renderWeekCard, weekCardFilename, weekCardMessage } from '../lib/shareCard'
import type { WeekPulse } from '../lib/weekPulse'
import { GhostButton, PrimaryButton, Sheet, SheetHeader } from './ui'

/**
 * Turns the week into a picture and hands it to the share sheet.
 *
 * It shows the image before it goes anywhere, which is not politeness — this
 * is a picture of somebody's wages, and "share" on a phone is one tap away
 * from a group chat. Seeing the thing first is the difference between sharing
 * and finding out what you shared.
 *
 * The trigger lives in the corner of the card it copies rather than as a
 * button under it: the primary action on this screen is Add a shift, and a
 * second full-width button beside it would make neither of them primary.
 */
export function ShareWeek({ pulse }: { pulse: WeekPulse }) {
  const [open, setOpen] = useState(false)
  const [image, setImage] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  // The object URL is revoked when the sheet closes or the week changes.
  // Without this every open leaks a megabyte of bitmap for the session.
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function openSheet() {
    setOpen(true)
    setError(null)
    setDone(null)
    if (image) return
    setBusy(true)
    try {
      const blob = await renderWeekCard(pulse)
      setImage(blob)
      setPreview(URL.createObjectURL(blob))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not make the image.')
    } finally {
      setBusy(false)
    }
  }

  function closeSheet() {
    setOpen(false)
    setDone(null)
    setError(null)
  }

  async function act(what: 'share' | 'save') {
    if (!image) return
    setError(null)
    setDone(null)
    const filename = weekCardFilename(pulse)
    try {
      if (what === 'save') {
        await saveImageFile(filename, image)
        setDone('Saved.')
        return
      }
      const how = await shareImageFile(filename, image, weekCardMessage(pulse))
      setDone(how === 'shared' ? 'Sent.' : 'Your browser can’t share files, so it downloaded instead.')
    } catch (e) {
      // Dismissing the share sheet rejects, and that is not a failure worth
      // telling anybody about.
      const name = e instanceof Error ? e.name : ''
      const message = e instanceof Error ? e.message : String(e)
      if (name === 'AbortError' || /cancel|abort/i.test(message)) return
      setError(message)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label="Share this week as an image"
        className="press -my-1.5 -mr-1.5 flex size-9 items-center justify-center rounded-xl text-muted transition-colors hover:text-accent"
      >
        <ShareIcon />
      </button>

      <Sheet open={open} onClose={closeSheet} title="Share your week">
        <SheetHeader title="Share your week" onClose={closeSheet} />
        {busy && <p className="py-10 text-center text-sm text-muted">Drawing it…</p>}

        {preview && (
          <>
            <img
              src={preview}
              alt="Your pay week as a shareable picture"
              className="mx-auto max-h-[46vh] w-auto rounded-2xl border border-edge"
            />
            <p className="mt-3 text-center text-xs text-faint">
              Shows what this card shows — nothing about who you work for.
            </p>

            <div className="mt-5 space-y-2.5">
              <PrimaryButton type="button" onClick={() => void act('share')}>
                Share
              </PrimaryButton>
              <GhostButton onClick={() => void act('save')}>Save the image</GhostButton>
            </div>
          </>
        )}

        {done && <p className="mt-3 text-center text-sm text-positive">{done}</p>}
        {error && <p className="mt-3 text-center text-sm text-negative">{error}</p>}
      </Sheet>
    </>
  )
}

/** The standard three-node share glyph, at the 24px the rest of the app uses. */
function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}
