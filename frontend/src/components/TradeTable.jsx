import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ChevronRight } from 'lucide-react'
import RatingBadge from './RatingBadge'
import StatusBadge from './StatusBadge'
import { formatCurrency, formatPercent, formatDate, getPnlColor } from '../utils/formatters'

export default function TradeTable({ trades = [] }) {
  const navigate = useNavigate()
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
      const aCurr = a.close_price ?? a.current_price ?? a.entry_price ?? 0
      const bCurr = b.close_price ?? b.current_price ?? b.entry_price ?? 0
      aVal = a.entry_price > 0 ? (aCurr - a.entry_price) / a.entry_price : 0
      bVal = b.entry_price > 0 ? (bCurr - b.entry_price) / b.entry_price : 0
    }

    if (aVal == null) return 1
    if (bVal == null) return -1
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-[#1e293b]">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('symbol')}>
              <div className="flex items-center gap-1.5">
                Symbol <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </th>
            <th className="py-3.5 px-4">Sector</th>
            <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('rating_score')}>
              <div className="flex items-center gap-1.5">
                Rating <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </th>
            <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('entry_price')}>
              <div className="flex items-center justify-end gap-1.5">
                Entry <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </th>
            <th className="py-3.5 px-4 text-right">Current / Close</th>
            <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('pnl')}>
              <div className="flex items-center justify-end gap-1.5">
                Return % <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </th>
            <th className="py-3.5 px-4 text-center">R-Multiple</th>
            <th className="py-3.5 px-4 text-center">Status</th>
            <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('signal_date')}>
              <div className="flex items-center gap-1.5">
                Date <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </th>
            <th className="py-3.5 px-4 text-center"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-200">
          {sortedTrades.map((t) => {
            const isClosed = t.status === 'CLOSED'
            const currentPrice = isClosed ? t.close_price : (t.current_price ?? t.price_at_signal ?? t.entry_price)
            const entryPrice = t.entry_price || 0
            const pnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0
            const rUnit = entryPrice - (t.stop_loss || 0)
            const rMultiple = rUnit > 0 ? (currentPrice - entryPrice) / rUnit : null

            return (
              <tr
                key={t.id}
                onClick={() => navigate(`/trades/${t.id}`)}
                className="hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{t.symbol}</span>
                    {t.signal_count > 1 && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-mono" title={`Repeated ${t.signal_count} times`}>
                        x{t.signal_count}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{t.sector || '—'}</td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <RatingBadge rating={t.rating} score={t.rating_score} />
                </td>
                <td className="py-3 px-4 text-right font-medium whitespace-nowrap">{formatCurrency(entryPrice)}</td>
                <td className="py-3 px-4 text-right font-medium whitespace-nowrap">
                  {formatCurrency(currentPrice)}
                </td>
                <td className={`py-3 px-4 text-right font-semibold whitespace-nowrap ${getPnlColor(pnlPct)}`}>
                  {formatPercent(pnlPct)}
                </td>
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  {rMultiple != null ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      rMultiple >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {rMultiple >= 0 ? `+${rMultiple.toFixed(2)}R` : `${rMultiple.toFixed(2)}R`}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <StatusBadge status={t.status} />
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                  {formatDate(t.signal_date || t.created_at)}
                </td>
                <td className="py-3 px-4 text-right text-slate-500">
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
