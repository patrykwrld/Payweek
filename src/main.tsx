import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { registerAuthDeepLinks } from './auth/redirects'
import { registerMutationDefaults } from './lib/offline'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
