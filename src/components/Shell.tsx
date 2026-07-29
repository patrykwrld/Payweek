import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Add' },
  { to: '/shifts', label: 'Shifts' },
  { to: '/agencies', label: 'Agencies' },
]

export function Shell() {
  return (
    <div className="mx-auto w-full max-w-md">
      <main className="min-h-dvh px-5 pb-28 pt-8">
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
                `flex-1 py-4 text-center text-sm font-bold ${
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
