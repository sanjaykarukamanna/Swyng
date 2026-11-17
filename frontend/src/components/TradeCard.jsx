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
    <div className="rounded-xl border border-slate-700/70 bg-slate-800 p-5 shadow-xs">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100">
              {trade.symbol}
            </h3>
            <span className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs text-slate-400">
              {trade.sector || 'Stock'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <RatingBadge rating={trade.rating} score={trade.rating_score} />
            {trade.entry_met ? (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Entry Met
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
                <XCircle className="h-3 w-3" /> Entry Missed
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={trade.status} />
      </div>

      {/* Price comparison */}
      <div className="my-3 grid grid-cols-2 gap-3 border-y border-slate-700/60 py-3">
        <div>
          <div className="text-xs text-slate-400">Entry Setup</div>
          <div className="text-sm font-semibold text-slate-200">{formatCurrency(entryPrice)}</div>
          {trade.entry_ceiling && (
            <div className="text-xs text-slate-400">Ceil: {formatCurrency(trade.entry_ceiling)}</div>
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
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-400">
            R-Multiple:
            <strong className={`font-semibold ${rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {rMultiple >= 0 ? `+${rMultiple.toFixed(2)}R` : `${rMultiple.toFixed(2)}R`}
            </strong>
          </span>
          <span className="text-xs text-slate-400">Target: 2R</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
          <div
            className={`h-full transition-all duration-500 ${
              rMultiple >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
          />
        </div>
      </div>

      {/* Targets & SL Footer */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
        <span className="flex items-center gap-1 text-rose-400">
          <Shield className="h-3.5 w-3.5" /> SL: {formatCurrency(stopLoss)}
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <Target className="h-3.5 w-3.5" /> Target: {formatCurrency(targetPrice)}
        </span>
        {trade.days_held != null && (
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="h-3 w-3" /> {trade.days_held}d
          </span>
        )}
      </div>
    </div>
  )
}
