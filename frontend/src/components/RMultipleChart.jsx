import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

export default function RMultipleChart({ data = [] }) {
  // Aggregate into buckets
  const buckets = [
    { range: '< -1R', count: 0, color: '#ef4444' },
    { range: '-1R to 0R', count: 0, color: '#f87171' },
    { range: '0R to 1R', count: 0, color: '#38bdf8' },
    { range: '1R to 2R', count: 0, color: '#4ade80' },
    { range: '> 2R', count: 0, color: '#22c55e' },
  ]

  data.forEach((item) => {
    const r = item.r_multiple
    if (r == null) return
    if (r < -1) buckets[0].count++
    else if (r < 0) buckets[1].count++
    else if (r < 1) buckets[2].count++
    else if (r <= 2) buckets[3].count++
    else buckets[4].count++
  })

  return (
    <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800 p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">R-Multiple Distribution</h3>
        <p className="text-xs text-slate-400">Distribution of realized risk-reward units across closed trades</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value} trades`, 'Count']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {buckets.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
