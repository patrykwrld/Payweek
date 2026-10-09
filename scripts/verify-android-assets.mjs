/**
 * Refuses an Android bundle that has the marketing page in it.
 *
 * `npm run vercel-build` swaps the landing page over dist/index.html, and
 * Capacitor loads index.html from whatever is in dist at the time — so a
 * `cap sync` after a web build ships payweek.app as the app. The result is a
 * signed, installable bundle that opens on a "Notify me" email form, and
 * every check in the release script passes, because nothing about it is
 * broken. It is just the wrong app.
 *
 * This was a comment in two documents until it actually happened during an
 * audit, which is the point at which a comment stops being good enough.
 *
 *   node scripts/verify-android-assets.mjs
 */
import { existsSync, readFileSync } from 'node:fs'

const index = 'android/app/src/main/assets/public/index.html'

if (!existsSync(index)) {
  console.error(`✗ ${index} is missing — run: npm run build && npx cap sync android`)
  process.exit(1)
}

const html = readFileSync(index, 'utf8')
const isApp = html.includes('Payweek — Hours')
const isLanding = /know what you&rsquo;re owed|know what you're owed/i.test(html)

if (isLanding || !isApp) {
  console.error('✗ The Android bundle contains the landing page, not the app.')
  console.error('  You ran the web build before cap sync. Fix it with:')
  console.error('    npm run build && npx cap sync android')
  console.error('  (npm run build — never npm run vercel-build — for Android.)')
  process.exit(1)
}

// The worker is registered only on the web, so one riding along in the APK
// is inert — but say so, because finding it there later looks alarming.
const sw = 'android/app/src/main/assets/public/sw.js'
if (existsSync(sw)) {
  console.log('  note: sw.js is in the bundle but never registered on native')
}

console.log('✓ Android bundle contains the app')
