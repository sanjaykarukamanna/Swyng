import React from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function EquityCurve({ data = [] }) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    pnl: d.cumulative_pnl || 0,
    pct: d.cumulative_return_pct || 0,
  }))

  return (
    <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800 p-4 shadow-xs">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Equity Curve (Cumulative P&L)</h3>
        <p className="text-xs text-slate-400">Total realized paper trading profit and loss progression</p>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No closed trades yet to plot equity curve
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '12px',
                }}
                formatter={(val) => [formatCurrency(val), 'Cumulative P&L']}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#pnlGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
