import { NavLink, Outlet } from 'react-router-dom'
import { useIsOnline, useQueuedWriteCount } from '../lib/offline'

const tabs = [
  { to: '/', label: 'Add' },
  { to: '/shifts', label: 'Shifts' },
  { to: '/payday', label: 'Payday' },
  { to: '/check', label: 'Check' },
  { to: '/settings', label: 'Settings' },
]

function OfflineBar() {
  const online = useIsOnline()
  const queued = useQueuedWriteCount()

  if (online && queued === 0) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-10 -mx-5 mb-4 border-b border-edge bg-surface px-5 py-2 text-center text-xs text-muted"
    >
      {online
        ? `Syncing ${queued} ${queued === 1 ? 'change' : 'changes'}…`
        : queued > 0
          ? `Offline — ${queued} ${queued === 1 ? 'change' : 'changes'} will sync when you reconnect`
          : 'Offline — your shifts are saved on this device'}
    </div>
  )
}

export function Shell() {
  return (
    <div className="mx-auto w-full max-w-md">
      <main className="min-h-dvh px-5 pb-28 pt-8">
        <OfflineBar />
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-edge bg-void/95 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex-1 py-4 text-center text-sm font-semibold ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
