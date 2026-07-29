/** '£512.30'; negative amounts render as '-£38.40'. */
export function formatPence(pence: number): string {
  const sign = pence < 0 ? '-' : ''
  const abs = Math.abs(Math.round(pence))
  const pounds = Math.floor(abs / 100)
  const rest = String(abs % 100).padStart(2, '0')
  return `${sign}£${pounds}.${rest}`
}

/** Hourly rate for display: '£14.50/h'. Fractional-pence rates (from
 * multipliers) round to the nearest penny for display only. */
export function formatRate(ratePence: number): string {
  return `${formatPence(Math.round(ratePence))}/h`
}

/** '480' -> '8h', '510' -> '8.5h', '505' -> '8h 25m'. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  if (m % 30 === 0) return `${h}.5h`
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

/** '12', '12.5', '£12.50' -> pence. No floats: string arithmetic only.
 * Returns null for anything unparseable. */
export function parsePoundsToPence(input: string): number | null {
  const match = /^£?\s*(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim())
  if (!match) return null
  const pounds = Number(match[1])
  const pencePart = match[2] ?? '0'
  const pence = Number(pencePart.length === 1 ? `${pencePart}0` : pencePart)
  return pounds * 100 + pence
}

/** Pence -> editable pounds string: 1250 -> '12.50'. */
export function penceToPoundsInput(pence: number): string {
  return (Math.round(pence) / 100).toFixed(2)
}
