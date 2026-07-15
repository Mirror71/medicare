import { Link, useLocation } from 'react-router-dom'
import { Home, AlertTriangle, Plus, Eye, MessageCircle } from 'lucide-react'

const ITEMS = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/dashboard/interactions', icon: AlertTriangle, label: 'Alerts' },
  { to: '/add', icon: Plus, label: 'Add', accent: true },
  { to: '/caregiver', icon: Eye, label: 'Care' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
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
    <nav className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="mx-auto grid h-20 max-w-2xl grid-cols-5">
        {ITEMS.map((item) => {
          const active = pathname === item.to
          const Icon = item.icon

          if (item.accent) {
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className="flex flex-col items-center justify-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform duration-200 active:scale-95">
                  <Icon size={28} strokeWidth={2.5} />
                </span>
                <span className="text-base text-uncertain-text">Add</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center transition-transform duration-200 active:scale-95"
            >
              <span
                className={
                  'flex flex-col items-center gap-1 rounded-2xl px-4 py-1.5 transition-colors duration-200 ' +
                  (active ? 'bg-primary/10 text-primary' : 'text-uncertain-text')
                }
              >
                <Icon size={26} strokeWidth={active ? 2.5 : 2} />
                <span className={'text-base ' + (active ? 'font-semibold' : '')}>
                  {item.label}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
