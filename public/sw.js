/**
 * Makes Payweek work with no signal, and makes it quick on a cheap phone.
 *
 * The app already kept a copy of your week on the device and queued shifts
 * logged offline — but on the web none of that ever ran, because without a
 * service worker the page itself cannot load without a connection. Opening
 * payweek.app/app in a dead spot gave a blank screen and the careful offline
 * data layer behind it never got the chance to do anything.
 *
 * Three rules, and the differences between them are the whole design:
 *
 *  - **Pages: network first.** A warehouse has patchy signal, not no signal,
 *    so try the network briefly and fall back to the last good copy. Doing
 *    it the other way round would serve a stale app to somebody who is
 *    perfectly online.
 *
 *  - **Hashed assets: cache first, forever.** Vite puts a content hash in
 *    every filename, so a given URL can never mean different bytes. These
 *    are the files worth never fetching twice.
 *
 *  - **Supabase: never cached.** Pay data has one source of truth and it is
 *    not this. The app's own query cache and write queue handle being
 *    offline; a service worker guessing at it would serve yesterday's money
 *    as though it were today's.
 */

// Bump to retire every old cache at once. The install/activate pair below
// does the cleanup, so a stale bundle cannot outlive a deploy.
const VERSION = 'v1'
const SHELL = `payweek-shell-${VERSION}`
const ASSETS = `payweek-assets-${VERSION}`
const KEEP = [SHELL, ASSETS]

const APP_SHELL = '/app'

/** Filled in at build time by scripts/postbuild-web.mjs — the filenames are
 * content-hashed, so this cannot be written by hand. */
const PRECACHE = []

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL).then((c) => c.add(APP_SHELL)),
      // Individually, not addAll: addAll is all-or-nothing, so one asset
      // 404ing after a part-finished deploy would leave the worker with an
      // empty cache and the app broken offline.
      caches
        .open(ASSETS)
        .then((c) =>
          Promise.all(PRECACHE.map((u) => c.add(u).catch(() => undefined))),
        ),
    ])
      // A failed precache must not leave a broken worker installed; the
      // fetch handler fills the cache on first request anyway.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

/** Content-hashed by the build, so the URL is the version. */
function isImmutable(url) {
  return url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Supabase, Have I Been Pwned, anything that is not this origin.
  if (url.origin !== self.location.origin) return

  if (isImmutable(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              void caches.open(ASSETS).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
    return
  }

  // Navigations: the app shell, however deep the URL. React Router does the
  // rest once it boots, which is why every route can fall back to one entry.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            void caches.open(SHELL).then((c) => c.put(APP_SHELL, copy))
          }
          return res
        })
        .catch(() =>
          caches
            .match(APP_SHELL)
            .then(
              (hit) =>
                hit ??
                new Response('Offline, and nothing saved on this device yet.', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' },
                }),
            ),
        ),
    )
  }
})
