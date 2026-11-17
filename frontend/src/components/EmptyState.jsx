import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = 'No Data', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-800/50 p-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-slate-200">{title}</h3>
      {description && <p className="mb-5 max-w-sm text-sm text-slate-400">{description}</p>}
      {action}
    </div>
  )
}
