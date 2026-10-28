import { format, parseISO } from 'date-fns'
import { formatMinutes, formatPence } from './money'
import type { WeekPulse } from './weekPulse'

/**
 * Draws the week as a picture somebody can send to a friend.
 *
 * Hand-drawn on a canvas rather than screenshotting the DOM. html2canvas and
 * its relatives are a megabyte of dependency that re-implement a layout
 * engine, choke on the modern CSS this app is written in — `oklch`, `env()`,
 * container queries — and fail by producing a blank or subtly wrong image
 * rather than an error. Drawing it costs about two hundred lines, renders the
 * same on every phone, needs no network, and cannot silently disagree with
 * itself.
 *
 * 1080x1350 is the 4:5 portrait that Instagram, WhatsApp and Messages all
 * show without cropping. A square would waste the space the bars want.
 *
 * It carries only what the card on screen carries. No agency name, no
 * employer, nothing the person did not already have in front of them when
 * they decided to share it — this is a picture of somebody's wages, and the
 * only safe rule is that sharing it reveals exactly what they were looking at.
 */

const W = 1080
const H = 1350
const PAD = 84

const VOID = '#0b0f14'
const SURFACE = '#131a22'
const EDGE = '#242e3a'
const INK = '#eef3f8'
const MUTED = '#8f9bab'
const FAINT = '#7d8a99'
const ACCENT = '#5e9bff'
const POSITIVE = '#3ad29f'

/** The five bars of the app icon, shortest to tallest, in its own blues. */
const LOGO_BARS = [
  { h: 0.26, fill: '#233757' },
  { h: 0.45, fill: '#2d4873' },
  { h: 0.66, fill: '#395c96' },
  { h: 0.89, fill: '#4774be' },
  { h: 1.0, fill: ACCENT },
]

const SANS = '"Inter var", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** The app icon, drawn rather than fetched, so this works offline. */
function drawLogoMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save()
  roundRect(ctx, x, y, size, size, size * 0.22)
  ctx.fillStyle = '#0d1117'
  ctx.fill()

  const inset = size * 0.2
  const barW = size * 0.09
  const gap = (size - inset * 2 - barW * 5) / 4
  const floor = y + size - inset
  const tallest = size - inset * 2

  LOGO_BARS.forEach((bar, i) => {
    const bx = x + inset + i * (barW + gap)
    const bh = tallest * bar.h
    roundRect(ctx, bx, floor - bh, barW, bh, barW / 2)
    ctx.fillStyle = bar.fill
    ctx.fill()
  })
  ctx.restore()
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  opts: {
    size: number
    weight?: number
    colour?: string
    align?: CanvasTextAlign
    tracking?: number
  },
): number {
  ctx.save()
  ctx.font = `${opts.weight ?? 500} ${opts.size}px ${SANS}`
  ctx.fillStyle = opts.colour ?? INK
  ctx.textAlign = opts.align ?? 'left'
  ctx.textBaseline = 'alphabetic'

  // Canvas has no letter-spacing in every engine this has to run on, so wide
  // tracking is drawn a character at a time.
  if (opts.tracking) {
    let cursor = x
    for (const ch of value) {
      ctx.fillText(ch, cursor, y)
      cursor += ctx.measureText(ch).width + opts.tracking
    }
    ctx.restore()
    return cursor - x
  }

  ctx.fillText(value, x, y)
  const width = ctx.measureText(value).width
  ctx.restore()
  return width
}

/**
 * Renders the week card to a PNG.
 *
 * Waits on document.fonts before drawing: canvas silently falls back to a
 * system font for anything not yet loaded, and the first share of a session
 * would otherwise come out in a different typeface from every later one.
 */
export async function renderWeekCard(pulse: WeekPulse): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot draw the image.')

  // Background, with the same cold glow the card has on screen.
  ctx.fillStyle = VOID
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W - 120, -60, 0, W - 120, -60, 620)
  glow.addColorStop(0, 'rgba(94,155,255,0.20)')
  glow.addColorStop(1, 'rgba(94,155,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // ── the logo, top left ────────────────────────────────────────────────
  const markSize = 72
  drawLogoMark(ctx, PAD, PAD, markSize)
  const wordX = PAD + markSize + 22
  const wordWidth = text(ctx, 'Payweek', wordX, PAD + 52, { size: 46, weight: 800 })
  text(ctx, '.', wordX + wordWidth + 2, PAD + 52, { size: 46, weight: 800, colour: ACCENT })

  // ── the figure ────────────────────────────────────────────────────────
  let y = PAD + 230
  text(ctx, 'THIS PAY WEEK', PAD, y, {
    size: 26,
    weight: 600,
    colour: MUTED,
    tracking: 3.6,
  })

  y += 128
  text(ctx, formatPence(pulse.grossPence), PAD, y, { size: 150, weight: 800 })

  // ── hours, shifts and the comparison ──────────────────────────────────
  y += 74
  const shiftWord = pulse.shiftCount === 1 ? 'shift' : 'shifts'
  const meta = `${formatMinutes(pulse.paidMinutes)} logged · ${pulse.shiftCount} ${shiftWord}`
  const metaWidth = text(ctx, meta, PAD, y, { size: 32, colour: MUTED })

  const delta =
    pulse.previousGrossPence === null ? null : pulse.grossPence - pulse.previousGrossPence
  if (delta !== null && delta !== 0) {
    const label = `${delta > 0 ? '+' : '−'}${formatPence(Math.abs(delta))} on last week`
    ctx.save()
    ctx.font = `600 28px ${SANS}`
    const chipW = ctx.measureText(label).width + 36
    ctx.restore()
    const chipX = PAD + metaWidth + 26
    // Drops to its own line rather than running off the edge on a big week.
    const fits = chipX + chipW <= W - PAD
    const cx = fits ? chipX : PAD
    const cy = fits ? y - 30 : y + 22
    roundRect(ctx, cx, cy, chipW, 46, 13)
    ctx.fillStyle = delta > 0 ? 'rgba(58,210,159,0.12)' : EDGE
    ctx.fill()
    text(ctx, label, cx + 18, cy + 32, {
      size: 28,
      weight: 600,
      colour: delta > 0 ? POSITIVE : MUTED,
    })
    if (!fits) y += 68
  }

  // ── the week, as bars ─────────────────────────────────────────────────
  const { perDay } = pulse
  const most = Math.max(...perDay.map((d) => d.pence), 1)
  const gap = 20
  const barW = (W - PAD * 2 - gap * 6) / 7
  const barTop = y + 110
  const barMax = 360
  const floor = barTop + barMax

  perDay.forEach((day, i) => {
    const x = PAD + i * (barW + gap)

    if (day.pence > 0) {
      text(ctx, `£${Math.round(day.pence / 100)}`, x + barW / 2, barTop - 22, {
        size: 26,
        weight: 700,
        colour: day.isToday ? ACCENT : FAINT,
        align: 'center',
      })
    }

    const h = day.pence === 0 ? 8 : Math.round(barMax * (0.14 + 0.86 * (day.pence / most)))
    roundRect(ctx, x, floor - h, barW, h, Math.min(14, h / 2))
    ctx.fillStyle =
      day.pence === 0 ? EDGE : day.isToday ? ACCENT : 'rgba(94,155,255,0.55)'
    ctx.fill()

    text(ctx, format(parseISO(day.date), 'EEEEE'), x + barW / 2, floor + 46, {
      size: 28,
      weight: 700,
      colour: day.isToday ? ACCENT : FAINT,
      align: 'center',
    })
  })

  // ── footer: what it is, and where to get it ───────────────────────────
  const footY = floor + 110
  ctx.fillStyle = EDGE
  ctx.fillRect(PAD, footY, W - PAD * 2, 2)

  const weekEnding = `Week to ${format(parseISO(pulse.weekEnd), 'EEE d MMM')}`
  text(ctx, weekEnding, PAD, footY + 62, { size: 30, colour: MUTED })

  // The call to action. Anyone who sees this picture should be able to find
  // the thing that made it without having to ask.
  ctx.save()
  ctx.font = `700 30px ${SANS}`
  const ctaW = ctx.measureText('payweek.app').width + 44
  ctx.restore()
  roundRect(ctx, W - PAD - ctaW, footY + 26, ctaW, 54, 15)
  ctx.fillStyle = 'rgba(94,155,255,0.13)'
  ctx.fill()
  text(ctx, 'payweek.app', W - PAD - ctaW + 22, footY + 62, {
    size: 30,
    weight: 700,
    colour: ACCENT,
  })

  // Anchored near the bottom edge rather than flowed off the footer: the
  // bars change height with the week, and letting this follow them left a
  // bandful of dead space under a quiet week.
  text(ctx, 'Tracked with Payweek — free shift and pay tracker', PAD, H - 128, {
    size: 26,
    colour: FAINT,
  })

  // Card surface edge, so the composition reads as one object on a light
  // background like a Messages thread.
  ctx.strokeStyle = SURFACE
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, W - 2, H - 2)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not make the image.'))),
      'image/png',
    )
  })
}

/** `payweek-week-2026-11-01.png` — sorts chronologically in a gallery. */
export function weekCardFilename(pulse: WeekPulse): string {
  return `payweek-week-${pulse.weekEnd}.png`
}

/** What rides along with the image in a share sheet or an email body. */
export function weekCardMessage(pulse: WeekPulse): string {
  return `${formatPence(pulse.grossPence)} this pay week, ${formatMinutes(
    pulse.paidMinutes,
  )} logged. Tracked with Payweek — payweek.app`
}
