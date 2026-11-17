import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, BarChart3, Settings, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trades', icon: List, label: 'Trades' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-700 bg-slate-800">
      <div className="border-b border-slate-700 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">SwingTrader</h1>
            <p className="text-xs text-slate-400">Paper Trading</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'border border-blue-500/20 bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <p className="text-center text-xs text-slate-500">
          Swing Trading Dashboard v1.0
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
