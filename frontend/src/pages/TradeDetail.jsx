import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Shield,
  Target,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react'
import PriceChart from '../components/PriceChart'
import StatusBadge from '../components/StatusBadge'
import RatingBadge from '../components/RatingBadge'
import { getTrade, closeTrade } from '../services/api'
import { formatCurrency, formatPercent, formatDate, getPnlColor } from '../utils/formatters'

export default function TradeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trade, setTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Close modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [closeReason, setCloseReason] = useState('TARGET_HIT')
  const [closePriceInput, setClosePriceInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const res = await getTrade(id)
      setTrade(res.data)
      const curr = res.data.current_price ?? res.data.price_at_signal ?? res.data.entry_price
      setClosePriceInput(curr ? curr.toString() : '')
    } catch (err) {
      console.error(err)
      setError('Could not find the requested trade record.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  const handleCloseTrade = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const priceNum = parseFloat(closePriceInput)
      await closeTrade(id, {
        close_reason: closeReason,
        close_price: isNaN(priceNum) ? undefined : priceNum,
      })
      setIsCloseModalOpen(false)
      await fetchDetail()
    } catch (err) {
      console.error('Failed to close trade:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !trade) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-6 rounded-xl">
          {error || 'Trade not found.'}
        </div>
      </div>
    )
  }

  const isClosed = trade.status === 'CLOSED'
  const currentPrice = trade.current_price ?? trade.entry_price ?? 0
  const entryPrice = trade.entry_price || 0
  const stopLoss = trade.stop_loss || 0
  const targetPrice = trade.target_price || 0
  const pnl = trade.pnl ?? 0
  const pnlPct = trade.pnl_pct ?? 0
  const rUnit = entryPrice - stopLoss
  const rMultiple = trade.r_multiple

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Trades
        </button>

        {!isClosed && (
          <button
            onClick={() => setIsCloseModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm shadow-rose-600/20"
          >
            Close Position
          </button>
        )}
      </div>

      {/* Main Trade Banner */}
      <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-slate-100">{trade.symbol}</h1>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                {trade.sector || 'Equities'}
              </span>
              <StatusBadge status={trade.status} />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RatingBadge rating={trade.rating} score={trade.rating_score} />
              <span>•</span>
              <span>Regime: <strong className="text-slate-200">{trade.market_regime || '—'}</strong></span>
              <span>•</span>
              <span>Signaled: {formatDate(trade.signal_date || trade.created_at)}</span>
            </div>
          </div>

          {/* Current P&L Card */}
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl text-right">
            <div className="text-xs text-slate-400">
              {isClosed ? 'Realized P&L' : 'Unrealized P&L'}
            </div>
            <div className={`text-xl font-extrabold ${getPnlColor(pnlPct)}`}>
              {formatPercent(pnlPct)}
            </div>
            <div className={`text-xs font-semibold ${getPnlColor(pnl)}`}>
              {formatCurrency(pnl)}
            </div>
          </div>
        </div>

        {/* Key Trade Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <div className="text-xs text-slate-400">Entry Setup</div>
            <div className="text-base font-bold text-slate-200">{formatCurrency(entryPrice)}</div>
            {trade.entry_ceiling && (
              <div className="text-[11px] text-slate-500">Ceil: {formatCurrency(trade.entry_ceiling)}</div>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-400 flex items-center gap-1 text-rose-400">
              <Shield className="w-3.5 h-3.5" /> Stop Loss (1R)
            </div>
            <div className="text-base font-bold text-rose-400">{formatCurrency(stopLoss)}</div>
            <div className="text-[11px] text-slate-500">Risk: {formatCurrency(rUnit)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 flex items-center gap-1 text-emerald-400">
              <Target className="w-3.5 h-3.5" /> Target (2R)
            </div>
            <div className="text-base font-bold text-emerald-400">{formatCurrency(targetPrice)}</div>
            <div className="text-[11px] text-slate-500">Reward: {formatCurrency(rUnit * 2)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 flex items-center gap-1 text-purple-400">
              <Activity className="w-3.5 h-3.5" /> R-Multiple
            </div>
            <div className={`text-base font-bold ${rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {rMultiple != null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isClosed ? `Closed: ${trade.close_reason || '—'}` : 'Current Multiple'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Price Chart with snapshots */}
      <PriceChart trade={trade} snapshots={trade.price_snapshots || []} />

      {/* Technicals & Sizing Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entry Verification & Sizing */}
        <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Execution & Sizing Verification</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Entry Condition Verification</span>
              <div>
                {trade.entry_met ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Met (Price ≤ Ceiling)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Gap up beyond ceiling
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Price at Signal Time</span>
              <span className="font-semibold text-slate-200">
                {formatCurrency(trade.price_at_signal || entryPrice)}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Suggested Shares (1.5% Risk)</span>
              <span className="font-semibold text-slate-200">{trade.suggested_shares || 0} shares</span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-400">Total Position Capital</span>
              <span className="font-semibold text-slate-200">
                {formatCurrency(trade.suggested_value || (entryPrice * (trade.suggested_shares || 0)))}
              </span>
            </div>
          </div>
        </div>

        {/* Technical Indicators & Engine Noise Filter */}
        <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Technical Context & Engine Signals</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">RSI Indicator</span>
              <span className="font-semibold text-slate-200">{trade.rsi || '—'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Moving Averages</span>
              <span className="font-semibold text-slate-200">{trade.ema_trend || '—'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Engine Signal Deduplication</span>
              <span className="font-semibold text-blue-400">
                Repeated {trade.signal_count || 1} day(s) (Filtered)
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-400">First Signal → Last Signal</span>
              <span className="font-medium text-slate-300">
                {formatDate(trade.first_signal_date)} → {formatDate(trade.last_signal_date)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Close Trade Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">Close Position ({trade.symbol})</h3>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseTrade} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Exit Reason</label>
                <select
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="TARGET_HIT">🎯 Target Hit (2R)</option>
                  <option value="SL_HIT">🛑 Stop Loss Hit (-1R)</option>
                  <option value="MANUAL">✋ Manual Exit</option>
                  <option value="EXPIRED">⌛ Expired / Time Stop</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Exit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closePriceInput}
                  onChange={(e) => setClosePriceInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 1243.64"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Confirm Exit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
