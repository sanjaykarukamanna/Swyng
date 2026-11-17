import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency, formatPercent } from '../utils/formatters'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b']

export default function SectorBreakdown({ sectors = [] }) {
  const chartData = sectors.map((s) => ({
    name: s.sector || 'Unassigned',
    value: s.count || 0,
    winRate: s.win_rate || 0,
    avgReturn: s.avg_return || 0,
    totalPnl: s.total_pnl || 0,
  }))

  return (
    <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800 p-4 shadow-xs">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Sector Allocation & Performance</h3>
        <p className="text-xs text-slate-400">Distribution of trade candidates across industry sectors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="h-56 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No sector data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '12px',
                  }}
                  formatter={(val, name, item) => [
                    `${val} trades (Win Rate: ${item.payload.winRate}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
          {sectors.map((s, index) => (
            <div
              key={s.sector}
              className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium text-slate-200">{s.sector}</span>
                <span className="text-slate-500">({s.count})</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-semibold">{s.win_rate}% win</span>
                <span className="text-slate-400 block text-[10px]">{formatCurrency(s.total_pnl)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
