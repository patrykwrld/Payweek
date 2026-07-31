/**
 * A random UUID that works on every device the app supports.
 *
 * `crypto.randomUUID` needs a secure context and a reasonably current engine.
 * Both hold in the Capacitor WebView (the app is served over the https scheme)
 * and on payweek.app — but the minimum supported Android goes back far enough
 * that a stale System WebView could still be missing it, and shift ids are on
 * the path that saves someone's hours. Falling back beats throwing.
 */
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  // Version 4, variant 10xx — Postgres rejects anything that isn't a uuid.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
