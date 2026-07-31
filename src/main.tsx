import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
