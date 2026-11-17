import React from 'react'

export default function StatusBadge({ status }) {
  const isA = (status || '').toUpperCase() === 'ACTIVE'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border ${
        isA
          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
          : 'border-slate-600/50 bg-slate-700/60 text-slate-300'
      }`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isA ? 'animate-pulse bg-emerald-400' : 'bg-slate-400'}`} />
      {status || 'UNKNOWN'}
    </span>
  )
}
