import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Settings, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/90">
      <div className="border-b border-slate-800 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 shadow-xs">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100">SwingTrader</h1>
            <p className="text-[11px] font-medium text-slate-500">Paper Trading</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                isActive
                  ? 'border border-blue-500/20 bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <p className="text-center text-[11px] text-slate-500">
          Swing Trading Dashboard v1.0
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
