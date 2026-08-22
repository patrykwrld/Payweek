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
import { copyFileSync, existsSync } from 'node:fs'

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
