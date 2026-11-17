import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, Search, RefreshCw } from 'lucide-react'
import TradeTable from '../components/TradeTable'
import EmptyState from '../components/EmptyState'
import { getTrades } from '../services/api'

export default function Trades() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || ''

  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [sectorFilter, setSectorFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchTradesList = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (sectorFilter) params.sector = sectorFilter
      if (searchQuery) params.symbol = searchQuery
      const res = await getTrades(params)
      setTrades(res.data)
    } catch (err) {
      console.error('Failed to load trades:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTradesList()
  }, [statusFilter, sectorFilter, searchQuery])

  // Extract unique sectors from trades for filter dropdown
  const sectors = Array.from(new Set(trades.map((t) => t.sector).filter(Boolean))).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">All Trades</h1>
          <p className="text-sm text-slate-400">Complete log of active and historical swing opportunities</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800 p-4 shadow-xs">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search symbol (e.g. CYIENT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pr-3 pl-9 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus-visible:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus-visible:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="CLOSED">Closed Only</option>
          </select>
        </div>

        {/* Sector Filter */}
        <div className="flex items-center gap-2">
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus-visible:outline-none"
          >
            <option value="">All Sectors</option>
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {/* Count */}
        <span className="text-xs text-slate-400 font-medium ml-auto">
          {trades.length} trades recorded
        </span>
      </div>

      {/* Table or Empty */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : trades.length === 0 ? (
        <EmptyState
          title="No Trades Found"
          description="Try adjusting your filters or send a Telegram digest to start receiving picks."
        />
      ) : (
        <TradeTable trades={trades} />
      )}
    </div>
  )
}
