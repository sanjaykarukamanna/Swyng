import React, { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import RatingBadge from './RatingBadge'
import StatusBadge from './StatusBadge'
import { formatCurrency, formatPercent, formatDate, getPnlColor } from '../utils/formatters'

export default function TradeTable({ trades = [] }) {
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedTrades = [...trades].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]

    if (sortField === 'pnl') {
      aVal = a.pnl_pct ?? 0
      bVal = b.pnl_pct ?? 0
    }

    if (aVal == null) return 1
    if (bVal == null) return -1
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-800/90 shadow-xs">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="cursor-pointer px-3.5 py-2.5 select-none hover:text-slate-200" onClick={() => handleSort('symbol')}>
              <div className="flex items-center gap-1">
                Symbol <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th className="px-3.5 py-2.5">Sector</th>
            <th className="cursor-pointer px-3.5 py-2.5 select-none hover:text-slate-200" onClick={() => handleSort('rating_score')}>
              <div className="flex items-center gap-1">
                Rating <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th className="cursor-pointer px-3.5 py-2.5 text-right select-none hover:text-slate-200" onClick={() => handleSort('entry_price')}>
              <div className="flex items-center justify-end gap-1">
                Entry <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th className="px-3.5 py-2.5 text-right">Current / Close</th>
            <th className="cursor-pointer px-3.5 py-2.5 text-right select-none hover:text-slate-200" onClick={() => handleSort('pnl')}>
              <div className="flex items-center justify-end gap-1">
                Return % <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th className="px-3.5 py-2.5 text-center">R-Multiple</th>
            <th className="px-3.5 py-2.5 text-center">Status</th>
            <th className="cursor-pointer px-3.5 py-2.5 select-none hover:text-slate-200" onClick={() => handleSort('signal_date')}>
              <div className="flex items-center gap-1">
                Date <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50 text-slate-200">
          {sortedTrades.map((t) => {
            const currentPrice = t.current_price ?? t.entry_price ?? 0
            const entryPrice = t.entry_price || 0
            const pnlPct = t.pnl_pct ?? 0
            const rMultiple = t.r_multiple

            return (
              <tr
                key={t.id}
                className="transition-colors hover:bg-slate-700/40"
              >
                <td className="px-3.5 py-2 font-semibold text-slate-100 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{t.symbol}</span>
                    {t.signal_count > 1 && (
                      <span className="rounded bg-blue-500/20 px-1 py-0.2 font-mono text-[10px] text-blue-400" title={`Repeated ${t.signal_count} times`}>
                        x{t.signal_count}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3.5 py-2 text-[11px] text-slate-400 whitespace-nowrap">{t.sector || '—'}</td>
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <RatingBadge rating={t.rating} score={t.rating_score} />
                </td>
                <td className="px-3.5 py-2 text-right font-medium whitespace-nowrap">{formatCurrency(entryPrice)}</td>
                <td className="px-3.5 py-2 text-right font-medium whitespace-nowrap">
                  {formatCurrency(currentPrice)}
                </td>
                <td className={`px-3.5 py-2 text-right font-semibold whitespace-nowrap ${getPnlColor(pnlPct)}`}>
                  {formatPercent(pnlPct)}
                </td>
                <td className="px-3.5 py-2 text-center whitespace-nowrap">
                  {rMultiple != null ? (
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      rMultiple >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {rMultiple >= 0 ? `+${rMultiple.toFixed(2)}R` : `${rMultiple.toFixed(2)}R`}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3.5 py-2 text-center whitespace-nowrap">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-3.5 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                  {formatDate(t.signal_date || t.created_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
