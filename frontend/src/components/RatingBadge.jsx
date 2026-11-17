import React from 'react'

export default function RatingBadge({ rating, score }) {
  const r = (rating || '').toUpperCase()
  const isStrong = r.includes('STRONG')
  const isBuy = r.includes('BUY')

  let colorClasses = 'border-slate-600 bg-slate-700 text-slate-300'
  if (isStrong) {
    colorClasses = 'border-blue-500/30 bg-blue-500/15 text-blue-400'
  } else if (isBuy) {
    colorClasses = 'border-teal-500/30 bg-teal-500/15 text-teal-400'
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}>
      <span>{rating || 'BUY'}</span>
      {score != null && <span className="opacity-75">({score}/100)</span>}
    </span>
  )
}
