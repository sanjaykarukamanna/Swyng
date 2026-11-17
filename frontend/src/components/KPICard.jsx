import React from 'react'

export default function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }

  const iconClasses = colorMap[color] || colorMap.blue

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800/90 p-3.5 shadow-xs transition-colors hover:border-slate-600/80">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`flex h-6.5 w-6.5 items-center justify-center rounded-md border ${iconClasses}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold tracking-tight text-slate-100">{value}</span>
        {trend && (
          <span className={`text-[11px] font-semibold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>}
    </div>
  )
}
