import React from 'react'

export default function RatingBadge({ rating, score }) {
  const r = (rating || '').toUpperCase()
  const isStrong = r.includes('STRONG')
  const isBuy = r.includes('BUY')

  let colorClasses = 'bg-slate-700 text-slate-300 border-slate-600'
  if (isStrong) {
    colorClasses = 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  } else if (isBuy) {
    colorClasses = 'bg-teal-500/15 text-teal-400 border-teal-500/30'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${colorClasses}`}>
      <span>{rating || 'BUY'}</span>
      {score != null && <span className="opacity-75">({score}/100)</span>}
    </span>
  )
}
