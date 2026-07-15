import { Link, useLocation } from 'react-router-dom'

const ITEMS = [
  { to: '/dashboard', icon: '🏠', label: 'Home' },
  { to: '/dashboard/interactions', icon: '⚠️', label: 'Alerts' },
  { to: '/add', icon: '➕', label: 'Add', accent: true },
  { to: '/caregiver', icon: '👁️', label: 'Care' },
  { to: '/chat', icon: '💬', label: 'Chat' },
]

// Routes where the tab bar is hidden (entry + focused task screens with their
// own bottom action bar).
export function navHiddenFor(pathname) {
  return (
    pathname === '/' ||
    pathname.startsWith('/add') ||
    pathname.startsWith('/edit') ||
    pathname === '/chat'
  )
}

export default function BottomNav() {
  const { pathname } = useLocation()
  if (navHiddenFor(pathname)) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5">
        {ITEMS.map((item) => {
          const active = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-0.5"
            >
              {item.accent ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-xl text-white">
                  ＋
                </span>
              ) : (
                <span className="text-2xl leading-none" aria-hidden="true">{item.icon}</span>
              )}
              <span
                className={
                  'text-sm ' +
                  (active
                    ? 'font-semibold text-[var(--color-primary)]'
                    : 'text-[var(--color-uncertain-text)]')
                }
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
