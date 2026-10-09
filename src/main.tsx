import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { registerAuthDeepLinks } from './auth/redirects'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  CACHE_KEY,
  forgetLastUser,
  noteSignedInUser,
  purgeCacheIfAccountChanged,
} from './lib/deviceCache'
import { registerMutationDefaults } from './lib/offline'
import { supabase } from './lib/supabase'
import './index.css'

// Before anything reads the cache back: if the account on this device isn't
// the one the cache belongs to, it never gets loaded in the first place.
purgeCacheIfAccountChanged()

registerAuthDeepLinks()

const DAY_MS = 1000 * 60 * 60 * 24

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data has to outlive the process for the app to open
      // usefully with no signal.
      gcTime: 7 * DAY_MS,
      staleTime: 30_000,
      retry: 2,
      refetchOnReconnect: true,
    },
    mutations: { retry: 2 },
  },
})

registerMutationDefaults(queryClient)

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: CACHE_KEY,
})

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Deliberately does not clear: a session can end because it expired, and
    // shifts logged offline are still queued in here waiting for signal —
    // they go out the moment the same person signs back in. The launch-time
    // check is what stops a handed-on phone showing the last account's data.
    forgetLastUser()
    return
  }
  const userId = session?.user.id
  // A different account signing in without a reload — drop what's in memory
  // as well as on disk, so nothing of the previous one is on screen.
  if (userId && noteSignedInUser(userId)) queryClient.clear()
})

/**
 * Register the service worker — on the web only.
 *
 * Under Capacitor the shell already comes out of the APK, so there is
 * nothing for a worker to make available offline and a cache in front of
 * local files is only a way to serve a stale app after an update.
 *
 * After the render, and failing quietly: a browser that refuses to register
 * one (private windows, old WebViews, no HTTPS) should still get the app,
 * just without the offline part.
 */
function registerServiceWorker() {
  if (Capacitor.isNativePlatform()) return
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    // Scoped to /app, not /. The landing page at the root is marketing and
    // has nothing to do offline; a worker over the whole origin would serve
    // the app shell to somebody who opened payweek.app with no signal.
    // Requests the app makes for /assets and /fonts are still intercepted —
    // scope decides which pages a worker controls, not which URLs it sees.
    void navigator.serviceWorker.register('/sw.js', { scope: '/app' }).catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * DAY_MS,
          // Bump when the cached shape changes, so an old cache is discarded
          // rather than fed to code that no longer understands it.
          buster: 'v2',
        }}
        onSuccess={() => {
          // Cache restored: flush anything logged while offline.
          void queryClient.resumePausedMutations()
        }}
      >
        <AuthProvider>
          <App />
        </AuthProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

registerServiceWorker()
