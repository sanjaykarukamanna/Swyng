import React from 'react'

export default function StatusBadge({ status }) {
  const isA = (status || '').toUpperCase() === 'ACTIVE'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
        isA
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-slate-700/60 text-slate-300 border border-slate-600/50'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isA ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
      {status || 'UNKNOWN'}
    </span>
  )
}
