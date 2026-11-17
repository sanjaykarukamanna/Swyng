import React from 'react'
import { Target, Shield, Clock, CheckCircle2, XCircle } from 'lucide-react'
import RatingBadge from './RatingBadge'
import StatusBadge from './StatusBadge'
import { formatCurrency, formatPercent, getPnlColor } from '../utils/formatters'

export default function TradeCard({ trade }) {
  const currentPrice = trade.current_price ?? trade.entry_price ?? 0
  const entryPrice = trade.entry_price || 0
  const stopLoss = trade.stop_loss || 0
  const targetPrice = trade.target_price || 0
  const pnl = trade.pnl ?? 0
  const pnlPct = trade.pnl_pct ?? 0
  const rMultiple = trade.r_multiple ?? 0

  // Progress towards 2R: -1R = 0%, 0R = 33%, 2R = 100%
  const clampedR = Math.max(-1, Math.min(2.5, rMultiple))
  const progressPct = Math.round(((clampedR - (-1)) / (2 - (-1))) * 100)

  return (
    <div className="bg-[#1e293b] border border-slate-700/70 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-slate-100">
              {trade.symbol}
            </h3>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {trade.sector || 'Stock'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <RatingBadge rating={trade.rating} score={trade.rating_score} />
            {trade.entry_met ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Entry Met
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <XCircle className="w-3 h-3" /> Entry Missed
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={trade.status} />
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 my-3">
        <div>
          <div className="text-xs text-slate-400">Entry Setup</div>
          <div className="text-sm font-semibold text-slate-200">{formatCurrency(entryPrice)}</div>
          {trade.entry_ceiling && (
            <div className="text-[11px] text-slate-400">Ceil: {formatCurrency(trade.entry_ceiling)}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Current Price</div>
          <div className="text-sm font-semibold text-slate-100">{formatCurrency(currentPrice)}</div>
          <div className={`text-xs font-bold ${getPnlColor(pnlPct)}`}>
            {formatPercent(pnlPct)} ({formatCurrency(pnl)})
          </div>
        </div>
      </div>

      {/* R-Multiple Progress Bar */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            R-Multiple:
            <strong className={`font-semibold ${rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {rMultiple >= 0 ? `+${rMultiple.toFixed(2)}R` : `${rMultiple.toFixed(2)}R`}
            </strong>
          </span>
          <span className="text-[11px] text-slate-400">Target: 2R</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              rMultiple >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
          />
        </div>
      </div>

      {/* Targets & SL Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <span className="flex items-center gap-1 text-rose-400">
          <Shield className="w-3.5 h-3.5" /> SL: {formatCurrency(stopLoss)}
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <Target className="w-3.5 h-3.5" /> Target: {formatCurrency(targetPrice)}
        </span>
        {trade.days_held != null && (
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3" /> {trade.days_held}d
          </span>
        )}
      </div>
    </div>
  )
}
