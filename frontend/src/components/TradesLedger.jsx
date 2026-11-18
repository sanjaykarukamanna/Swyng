import React, { useState, useMemo } from 'react'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  RotateCcw,
  LogOut,
  AlertCircle,
  Hash,
  Calendar,
  X,
} from 'lucide-react'
import RatingBadge from './RatingBadge'
import StatusBadge from './StatusBadge'
import { formatCurrency, formatPercent, formatDate, getPnlColor } from '../utils/formatters'
import { closeTrade, reopenTrade } from '../services/api'

export default function TradesLedger({ trades = [], onTradeUpdated }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState('active') // 'all' | 'active' | 'entry_met' | 'ceiling_exceeded' | 'closed'
  const [sectorFilter, setSectorFilter] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [expandedTradeId, setExpandedTradeId] = useState(null)

  // Exit dialog state
  const [exitModalTrade, setExitModalTrade] = useState(null)
  const [exitPrice, setExitPrice] = useState('')
  const [exitReason, setExitReason] = useState('MANUAL')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Dynamic sectors
  const sectors = useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.sector).filter(Boolean))).sort()
  }, [trades])

  // Tab counts
  const counts = useMemo(() => {
    const total = trades.length
    const active = trades.filter((t) => t.status === 'ACTIVE').length
    const entryMet = trades.filter((t) => t.status === 'ACTIVE' && t.entry_met === 1).length
    const ceilingExceeded = trades.filter((t) => t.status === 'ACTIVE' && t.entry_met === 0).length
    const closed = trades.filter((t) => t.status === 'CLOSED').length
    return { total, active, entryMet, ceilingExceeded, closed }
  }, [trades])

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Tab filter
      if (filterTab === 'active' && t.status !== 'ACTIVE') return false
      if (filterTab === 'closed' && t.status !== 'CLOSED') return false
      if (filterTab === 'entry_met' && (t.status !== 'ACTIVE' || t.entry_met !== 1)) return false
      if (filterTab === 'ceiling_exceeded' && (t.status !== 'ACTIVE' || t.entry_met !== 0)) return false

      // Sector filter
      if (sectorFilter && t.sector !== sectorFilter) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const sym = (t.symbol || '').toLowerCase()
        const sec = (t.sector || '').toLowerCase()
        if (!sym.includes(q) && !sec.includes(q)) return false
      }

      return true
    })
  }, [trades, filterTab, sectorFilter, searchQuery])

  // Sorting
  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (sortField === 'pnl') {
        aVal = a.pnl_pct ?? 0
        bVal = b.pnl_pct ?? 0
      } else if (sortField === 'current_price') {
        aVal = a.current_price ?? a.entry_price ?? 0
        bVal = b.current_price ?? b.entry_price ?? 0
      }

      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [filteredTrades, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleExpand = (tradeId) => {
    setExpandedTradeId(expandedTradeId === tradeId ? null : tradeId)
  }

  const openExitModal = (trade, e) => {
    if (e) e.stopPropagation()
    const currentPrice = trade.current_price ?? trade.entry_price ?? 0
    setExitModalTrade(trade)
    setExitPrice(currentPrice.toString())
    setExitReason('MANUAL')
    setActionError(null)
  }

  const handleClosePosition = async () => {
    if (!exitModalTrade) return
    try {
      setIsSubmitting(true)
      setActionError(null)
      const priceNum = parseFloat(exitPrice)
      if (isNaN(priceNum) || priceNum <= 0) {
        setActionError('Please enter a valid exit price.')
        setIsSubmitting(false)
        return
      }
      await closeTrade(exitModalTrade.id, {
        close_price: priceNum,
        close_reason: exitReason,
      })
      setExitModalTrade(null)
      if (onTradeUpdated) onTradeUpdated()
    } catch (err) {
      console.error('Failed to close position:', err)
      setActionError('Failed to close position. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReopenPosition = async (tradeId, e) => {
    if (e) e.stopPropagation()
    try {
      setIsSubmitting(true)
      await reopenTrade(tradeId)
      if (onTradeUpdated) onTradeUpdated()
    } catch (err) {
      console.error('Failed to reopen position:', err)
      alert('Failed to reopen position.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-800/90 p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterTab('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              All <span className="opacity-75 font-mono text-[11px]">({counts.total})</span>
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'active'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              Active <span className="opacity-75 font-mono text-[11px]">({counts.active})</span>
            </button>
            <button
              onClick={() => setFilterTab('entry_met')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'entry_met'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-900/60 text-emerald-400/80 hover:bg-slate-700 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Entry Met</span>
              <span className="opacity-75 font-mono text-[11px]">({counts.entryMet})</span>
            </button>
            <button
              onClick={() => setFilterTab('ceiling_exceeded')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'ceiling_exceeded'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-slate-900/60 text-rose-400/80 hover:bg-slate-700 hover:text-rose-300'
              }`}
            >
              <XCircle className="h-3 w-3" />
              <span>Ceiling Exceeded</span>
              <span className="opacity-75 font-mono text-[11px]">({counts.ceilingExceeded})</span>
            </button>
            <button
              onClick={() => setFilterTab('closed')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'closed'
                  ? 'bg-slate-700 text-slate-100 font-semibold'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              Closed <span className="opacity-75 font-mono text-[11px]">({counts.closed})</span>
            </button>
          </div>

          {/* Search & Sector */}
          <div className="flex flex-1 sm:flex-initial items-center gap-2">
            {/* Sector Selector */}
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Sectors</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative min-w-[170px] flex-1 sm:w-52">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 pr-6 pl-8 text-xs text-slate-200 placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-800/90 shadow-xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="w-8 px-2 py-2.5 text-center"></th>
              <th
                className="cursor-pointer px-3 py-2.5 select-none hover:text-slate-200"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-1">
                  Symbol <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 select-none hover:text-slate-200"
                onClick={() => handleSort('rating_score')}
              >
                <div className="flex items-center gap-1">
                  Rating <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 select-none hover:text-slate-200"
                onClick={() => handleSort('entry_price')}
              >
                <div className="flex items-center gap-1">
                  Entry & Guard <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right select-none hover:text-slate-200"
                onClick={() => handleSort('current_price')}
              >
                <div className="flex items-center justify-end gap-1">
                  CMP <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right select-none hover:text-slate-200"
                onClick={() => handleSort('pnl')}
              >
                <div className="flex items-center justify-end gap-1">
                  P&L (Return) <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">2R Target Progress</th>
              <th className="px-3 py-2.5 text-right">SL & Target</th>
              <th className="px-3 py-2.5 text-right">Capital</th>
              <th className="px-3 py-2.5 text-center">Setup / RSI</th>
              <th
                className="cursor-pointer px-3 py-2.5 text-center select-none hover:text-slate-200"
                onClick={() => handleSort('days_held')}
              >
                <div className="flex items-center justify-center gap-1">
                  Held <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-slate-200">
            {sortedTrades.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers className="h-8 w-8 text-slate-500" />
                    <p className="text-sm font-medium">No matching trades found</p>
                    <p className="text-xs text-slate-500">
                      Try clearing filters or forwarding new opportunities via Telegram.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedTrades.map((t) => {
                const isExpanded = expandedTradeId === t.id
                const currentPrice = t.current_price ?? t.entry_price ?? 0
                const entryPrice = t.entry_price || 0
                const stopLoss = t.stop_loss || 0
                const targetPrice = t.target_price || 0
                const pnl = t.pnl ?? 0
                const pnlPct = t.pnl_pct ?? 0
                const rMultiple = t.r_multiple ?? 0
                const isClosed = t.status === 'CLOSED'

                // Clamped R progress: -1R = 0%, 0R = 33%, 2R = 100%
                const clampedR = Math.max(-1, Math.min(2.5, rMultiple))
                const progressPct = Math.round(((clampedR - (-1)) / (2 - (-1))) * 100)

                // SL & Target distance %
                const slDistPct = entryPrice > 0 ? ((stopLoss - entryPrice) / entryPrice) * 100 : 0
                const tgtDistPct = entryPrice > 0 ? ((targetPrice - entryPrice) / entryPrice) * 100 : 0

                // Position value & Risk
                const shares = t.suggested_shares || 0
                const positionVal = t.suggested_value || entryPrice * shares
                const riskVal = shares * Math.max(0, entryPrice - stopLoss)

                return (
                  <React.Fragment key={t.id}>
                    <tr
                      onClick={() => toggleExpand(t.id)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'
                      }`}
                    >
                      {/* Chevron */}
                      <td className="px-2 py-2.5 text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-blue-400 mx-auto" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500 mx-auto" />
                        )}
                      </td>

                      {/* Symbol & Sector */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 hover:text-blue-400">
                            {t.symbol}
                          </span>
                          {t.signal_count > 1 && (
                            <span
                              className="rounded bg-blue-500/20 px-1 py-0.5 font-mono text-[10px] font-semibold text-blue-400"
                              title={`Repeated signal: ${t.signal_count} times`}
                            >
                              x{t.signal_count}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{t.sector || '—'}</div>
                      </td>

                      {/* Rating */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <RatingBadge rating={t.rating} score={t.rating_score} />
                      </td>

                      {/* Entry & Guard */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-medium text-slate-200">
                          {formatCurrency(entryPrice)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {t.entry_met === 1 && (
                            <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-1 py-0.2 text-[10px] font-medium text-emerald-400">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Met
                            </span>
                          )}
                          {t.entry_met === 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded border border-rose-500/20 bg-rose-500/10 px-1 py-0.2 text-[10px] font-medium text-rose-400">
                              <XCircle className="h-2.5 w-2.5" /> Exceeded
                            </span>
                          )}
                          {t.entry_met == null && (
                            <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/20 bg-amber-500/10 px-1 py-0.2 text-[10px] font-medium text-amber-400">
                              <Clock className="h-2.5 w-2.5" /> Pending
                            </span>
                          )}
                          {t.entry_ceiling && (
                            <span className="text-[10px] text-slate-500">
                              Ceil: {formatCurrency(t.entry_ceiling)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CMP */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="font-semibold text-slate-100">
                          {formatCurrency(currentPrice)}
                        </div>
                        {isClosed && (
                          <div className="text-[10px] text-slate-400">Closed Price</div>
                        )}
                      </td>

                      {/* P&L */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className={`font-bold ${getPnlColor(pnlPct)}`}>
                          {formatPercent(pnlPct)}
                        </div>
                        <div className={`text-[11px] font-medium ${getPnlColor(pnl)}`}>
                          {formatCurrency(pnl)}
                        </div>
                      </td>

                      {/* 2R Target Progress */}
                      <td className="px-3 py-2.5 whitespace-nowrap min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`font-semibold font-mono ${
                                rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {rMultiple >= 0 ? `+${rMultiple.toFixed(2)}R` : `${rMultiple.toFixed(2)}R`}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Tgt: 2R</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-700/60">
                            <div
                              className={`h-full transition-all duration-500 ${
                                rMultiple >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* SL & Target */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="text-[11px] text-rose-400 font-medium">
                          SL: {formatCurrency(stopLoss)}{' '}
                          <span className="text-[10px] opacity-75">
                            ({slDistPct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-400 font-medium">
                          Tgt: {formatCurrency(targetPrice)}{' '}
                          <span className="text-[10px] opacity-75">
                            ({tgtDistPct >= 0 ? '+' : ''}
                            {tgtDistPct.toFixed(1)}%)
                          </span>
                        </div>
                      </td>

                      {/* Capital */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="text-slate-200 font-medium">
                          {formatCurrency(positionVal)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {shares} sh • Risk: {formatCurrency(riskVal)}
                        </div>
                      </td>

                      {/* Setup / RSI */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {t.rsi != null ? (
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                              t.rsi < 55
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : t.rsi <= 70
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            RSI {t.rsi.toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">—</span>
                        )}
                        <div className="text-[10px] text-slate-400 truncate max-w-[100px] mx-auto mt-0.5">
                          {t.ema_trend || 'Trend —'}
                        </div>
                      </td>

                      {/* Days Held */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono text-slate-300">
                        {t.days_held != null ? `${t.days_held}d` : '0d'}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {!isClosed ? (
                          <button
                            onClick={(e) => openExitModal(t, e)}
                            className="inline-flex items-center gap-1 rounded bg-slate-700/80 px-2 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-rose-600 hover:text-white"
                            title="Close / Exit Position"
                          >
                            <LogOut className="h-3 w-3" />
                            <span>Exit</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleReopenPosition(t.id, e)}
                            className="inline-flex items-center gap-1 rounded bg-slate-700/60 px-2 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-blue-600 hover:text-white"
                            title="Reopen Trade"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reopen</span>
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Row Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-900/60 border-b border-slate-700">
                        <td colSpan={13} className="px-5 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {/* Card 1: Risk Architecture */}
                            <div className="rounded-lg border border-slate-700/60 bg-slate-800/90 p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-700/50 pb-1.5">
                                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                  <Shield className="h-3.5 w-3.5 text-blue-400" />
                                  Risk Architecture
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">1:2 R/R Setup</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-slate-400">Entry Price:</span>{' '}
                                  <strong className="text-slate-200">{formatCurrency(entryPrice)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Ceiling:</span>{' '}
                                  <strong className="text-slate-200">{formatCurrency(t.entry_ceiling)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Stop Loss:</span>{' '}
                                  <strong className="text-rose-400">{formatCurrency(stopLoss)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Target 2R:</span>{' '}
                                  <strong className="text-emerald-400">{formatCurrency(targetPrice)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">1R Risk / Share:</span>{' '}
                                  <strong className="text-slate-200">
                                    {formatCurrency(Math.max(0, entryPrice - stopLoss))}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Total Portfolio Risk:</span>{' '}
                                  <strong className="text-rose-400">{formatCurrency(riskVal)}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Strategy & Indicators */}
                            <div className="rounded-lg border border-slate-700/60 bg-slate-800/90 p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-700/50 pb-1.5">
                                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                  <Activity className="h-3.5 w-3.5 text-purple-400" />
                                  Strategy & Timing
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {t.market_regime || 'Regime —'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-slate-400">Signal Date:</span>{' '}
                                  <strong className="text-slate-200">{formatDate(t.signal_date)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Price at Signal:</span>{' '}
                                  <strong className="text-slate-200">{formatCurrency(t.price_at_signal)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">RSI Indicator:</span>{' '}
                                  <strong className="text-slate-200">{t.rsi != null ? t.rsi.toFixed(1) : '—'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">EMA Trend:</span>{' '}
                                  <strong className="text-slate-200">{t.ema_trend || '—'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">First Signal:</span>{' '}
                                  <strong className="text-slate-200">{formatDate(t.first_signal_date || t.signal_date)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Deduplication:</span>{' '}
                                  <strong className="text-blue-400">{t.signal_count || 1} hits</strong>
                                </div>
                              </div>
                            </div>

                            {/* Card 3: Position Execution & Closure */}
                            <div className="rounded-lg border border-slate-700/60 bg-slate-800/90 p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-700/50 pb-1.5">
                                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                  <Target className="h-3.5 w-3.5 text-emerald-400" />
                                  Position Execution
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  Status: {t.status}
                                </span>
                              </div>
                              {!isClosed ? (
                                <div className="space-y-2 text-[11px]">
                                  <p className="text-slate-400">
                                    This position is currently active. You can record an exit price and reason
                                    when you close the paper trade.
                                  </p>
                                  <button
                                    onClick={(e) => openExitModal(t, e)}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
                                  >
                                    <LogOut className="h-3.5 w-3.5" />
                                    <span>Exit Position Now</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Closed Date:</span>
                                    <strong className="text-slate-200">{formatDate(t.close_date)}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Close Price:</span>
                                    <strong className="text-slate-200">{formatCurrency(t.close_price)}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Close Reason:</span>
                                    <strong className="text-amber-400">{t.close_reason || 'MANUAL'}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Realized P&L:</span>
                                    <strong className={`font-bold ${getPnlColor(pnl)}`}>
                                      {formatCurrency(pnl)} ({formatPercent(pnlPct)})
                                    </strong>
                                  </div>
                                  <button
                                    onClick={(e) => handleReopenPosition(t.id, e)}
                                    className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Reopen Back to Active</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Exit Position Modal */}
      {exitModalTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-rose-400" />
                  Exit Position: {exitModalTrade.symbol}
                </h3>
                <p className="text-xs text-slate-400">Record trade exit price and reason</p>
              </div>
              <button
                onClick={() => setExitModalTrade(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actionError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exit Price (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. 1520.50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exit Reason
                </label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="TARGET_HIT">Target Reached (+2R)</option>
                  <option value="SL_HIT">Stop Loss Triggered (-1R)</option>
                  <option value="MANUAL">Manual Discretionary Exit</option>
                  <option value="EXPIRED">Stale / Time Expiry</option>
                </select>
              </div>

              <div className="rounded-lg bg-slate-900/70 p-3 text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Entry Setup Price:</span>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(exitModalTrade.entry_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Current Market Price:</span>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(exitModalTrade.current_price ?? exitModalTrade.entry_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Stop Loss / Target:</span>
                  <span className="text-slate-300">
                    {formatCurrency(exitModalTrade.stop_loss)} / {formatCurrency(exitModalTrade.target_price)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setExitModalTrade(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleClosePosition}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Closing...' : 'Confirm Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
