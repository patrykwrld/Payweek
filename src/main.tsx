import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { registerAuthDeepLinks } from './auth/redirects'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerMutationDefaults } from './lib/offline'
import { supabase } from './lib/supabase'
import './index.css'

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
  key: 'payweek-cache',
})

// The cache is written to disk so the app opens with no signal, which means
// one person's shifts would otherwise still be sitting there for whoever signs
// in next. Wipe it on sign-out, and on any sign-in that isn't the same account.
const LAST_USER_KEY = 'payweek-last-user'

function forgetCachedData() {
  queryClient.clear()
  void persister.removeClient()
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem(LAST_USER_KEY)
    forgetCachedData()
    return
  }
  const userId = session?.user.id
  if (!userId) return
  if (localStorage.getItem(LAST_USER_KEY) !== userId) {
    forgetCachedData()
    localStorage.setItem(LAST_USER_KEY, userId)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 7 * DAY_MS }}
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
