import { NavLink, Outlet } from 'react-router-dom'
import { useIsOnline, useQueuedWriteCount } from '../lib/offline'
import { GearIcon, ListIcon, PlusIcon, RatesIcon, WalletIcon } from './icons'

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
        ? `Offline — ${queued} ${
            queued === 1 ? 'change' : 'changes'
          } will sync when you reconnect`
        : 'Offline — your shifts are saved on this device'}
    </div>
  )
}

/**
 * One app, two shapes.
 *
 * On a phone it is what it has always been: a single column with the tabs
 * under your thumb. From `md` up — which is where payweek.app is usually
 * opened — the same navigation becomes a sidebar and the column gets room to
 * breathe, because a 448px strip floating in a field of black is a phone app
 * someone has left on a monitor, not a website.
 *
 * Deliberately one set of markup with responsive classes rather than two
 * trees: the screens themselves stay identical, so there is no second version
 * of anything to keep in step.
 */
export function Shell() {
  return (
    <div className="md:flex">
      <nav
        className="
          fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-void
          pb-[env(safe-area-inset-bottom)]
          supports-[backdrop-filter]:bg-void/72 supports-[backdrop-filter]:backdrop-blur-xl
          md:inset-y-0 md:right-auto md:w-60 md:border-r md:border-t-0 md:pb-0
          md:bg-void md:backdrop-blur-none
        "
      >
        {/* Content used to stop dead at the bar's top border. This fades the
            last few millimetres out instead, so the list reads as continuing
            underneath the blur rather than being cut off by it. Sidebar
            layouts have nothing scrolling under them, so it goes away. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-void to-transparent md:hidden"
        />
        <div className="mx-auto flex max-w-md md:h-full md:max-w-none md:flex-col md:gap-1 md:p-4">
          <p className="mb-6 hidden px-3 pt-2 text-lg font-semibold tracking-tight md:block">
            Payweek<span className="text-accent">.</span>
          </p>
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors
                 md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-sm ${
                   isActive
                     ? 'text-accent md:bg-accent/10'
                     : 'text-muted md:hover:bg-surface md:hover:text-ink'
                 }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="md:ml-60 md:min-w-0 md:flex-1">
        {/* Bottom padding clears the tab bar *and* the gesture bar underneath
            it; the top respects a notch. viewport-fit=cover means the WebView
            hands us the whole screen, so this is ours to get right. Neither
            applies once the tabs are a sidebar. */}
        <main
          className="
            mx-auto min-h-dvh w-full max-w-md px-5
            pb-[calc(7rem+env(safe-area-inset-bottom))]
            pt-[calc(2rem+env(safe-area-inset-top))]
            md:max-w-2xl md:px-8 md:pb-20 md:pt-12
          "
        >
          <OfflineBar />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
