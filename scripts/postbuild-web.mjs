/**
 * Web-only: make the marketing page the site root.
 *
 * Vercel checks the filesystem before it consults rewrites, so `/` resolves to
 * dist/index.html and no rewrite for `/` can ever fire. The only way to serve
 * the landing page at the root is for it to *be* index.html.
 *
 * This runs from the `vercel-build` script and never from `npm run build`,
 * because `npx cap sync android` copies dist/ into the Android bundle and
 * Capacitor loads index.html from it. Swapping there would ship the marketing
 * page as the Android app.
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const dist = 'dist'
const app = `${dist}/app.html`
const index = `${dist}/index.html`
const landing = `${dist}/landing.html`

for (const f of [index, landing]) {
  if (!existsSync(f)) {
    console.error(`postbuild-web: ${f} is missing — refusing to swap`)
    process.exit(1)
  }
}

copyFileSync(index, app) // the SPA, now served at /app
copyFileSync(landing, index) // the landing page, now served at /
console.log('postbuild-web: / is the landing page, /app is the app')

/**
 * Tell the service worker what to cache before it is asked for.
 *
 * Caching on first request means the app only works offline from the
 * *second* online visit, because the first one is what fills the cache.
 * That is the wrong way round for the actual situation: somebody checks
 * Payweek at home on wi-fi and then goes to work, where there is no signal.
 * One visit has to be enough.
 *
 * The list is written at build time because Vite hashes every filename, so
 * the worker cannot know them and a hand-maintained list would be wrong
 * the first time anybody changed a line of code.
 */
const sw = `${dist}/sw.js`
if (existsSync(sw)) {
  const precache = readdirSync(`${dist}/assets`)
    // The entry, its eager imports and the stylesheet are needed to render
    // at all. The lazy screen chunks are included too: they are small, and
    // somebody who opens Payday for the first time in a dead spot should
    // get Payday rather than a spinner that never resolves.
    .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
    .map((f) => `/assets/${f}`)
    // Only the Latin subset: the others are unicode-range gated and will
    // never be requested by this app's copy.
    .concat(
      readdirSync(`${dist}/fonts`)
        .filter((f) => f.includes('latin-wght'))
        .map((f) => `/fonts/${f}`),
    )

  const before = readFileSync(sw, 'utf8')
  const injected = before.replace(
    'const PRECACHE = []',
    `const PRECACHE = ${JSON.stringify(precache, null, 2)}`,
  )
  // Compare, rather than looking for "PRECACHE = [" in the result — the
  // empty placeholder contains that too, so the obvious check passes
  // whether or not anything was substituted, which is no check at all.
  if (injected === before) {
    console.error('postbuild-web: sw.js has no "const PRECACHE = []" to fill in')
    process.exit(1)
  }
  writeFileSync(sw, injected)
  console.log(`postbuild-web: service worker precaches ${precache.length} files`)
}
