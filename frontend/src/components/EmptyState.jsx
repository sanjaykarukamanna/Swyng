import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = 'No Data', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#1e293b]/50 border border-dashed border-slate-700/80 rounded-2xl">
      <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  )
}
