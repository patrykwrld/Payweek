import { NavLink, Outlet } from 'react-router-dom'
import { useIsOnline, useQueuedWriteCount } from '../lib/offline'
import {
  GearIcon,
  ListIcon,
  PlusIcon,
  RatesIcon,
  WalletIcon,
} from './icons'

// Five tabs is the most that stays tappable on a phone. "Check a payslip"
// lives on Payday instead — it's the thing you do once the money lands, and
// Rates earns the slot: it was buried in Settings and people never found it.
const tabs = [
  { to: '/', label: 'Add', Icon: PlusIcon },
  { to: '/shifts', label: 'Shifts', Icon: ListIcon },
  { to: '/payday', label: 'Payday', Icon: WalletIcon },
  { to: '/agencies', label: 'Rates', Icon: RatesIcon },
  { to: '/settings', label: 'Settings', Icon: GearIcon },
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
      {/* Bottom padding clears the tab bar *and* the gesture bar underneath it;
          the top respects a notch. viewport-fit=cover means the WebView hands
          us the whole screen, so this is ours to get right. */}
      <main className="min-h-dvh px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
        <OfflineBar />
        <Outlet />
      </main>
      {/* Explicitly above everything: without a z-index this sits in the same
          layer as the page content and can lose taps to whatever scrolls under
          it. Solid, not translucent — a backdrop blur means the WebView
          re-blurs a strip of the page on every frame of every scroll, which is
          a real cost on a mid-range Android for an effect nobody notices. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-void pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
