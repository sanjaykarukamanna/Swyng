import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Activity,
  Award,
  Clock,
  Briefcase,
  Layers,
  RefreshCw,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import KPICard from '../components/KPICard'
import TradeCard from '../components/TradeCard'
import EmptyState from '../components/EmptyState'
import { getDashboardSummary, getActiveTrades, refreshPrices } from '../services/api'
import { formatCurrency, formatRelativeDate } from '../utils/formatters'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [activeTrades, setActiveTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setError(null)
      const [sumRes, actRes] = await Promise.all([
        getDashboardSummary(),
        getActiveTrades(),
      ])
      setSummary(sumRes.data)
      setActiveTrades(actRes.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load dashboard data. Ensure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh active trade data every 60s
    const timer = setInterval(() => {
      fetchData()
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true)
      await refreshPrices()
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Loading market positions...</p>
        </div>
      </div>
    )
  }

  const botStatus = summary?.bot_status || {}

  return (
    <div className="space-y-4">
      {/* Top Banner / Actions */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Swing Trading Dashboard</h1>
          <p className="text-xs text-slate-400">Automated paper trade strategy verification & tracking</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Bot Status Indicator */}
          <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs">
            <Radio
              className={`h-3.5 w-3.5 ${botStatus.running ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`}
            />
            <span className="text-slate-300">
              Bot: <strong className={botStatus.running ? 'text-emerald-400' : 'text-slate-400'}>
                {botStatus.running ? 'Online' : 'Standby'}
              </strong>
            </span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Prices'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard
          title="Active Trades"
          value={summary?.active_count ?? 0}
          subtitle="Positions open"
          icon={Layers}
          color="blue"
        />
        <KPICard
          title="Total P&L"
          value={formatCurrency(summary?.total_pnl ?? 0)}
          subtitle="Realized + Unrealized"
          icon={TrendingUp}
          color={(summary?.total_pnl ?? 0) >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Win Rate"
          value={`${(summary?.win_rate ?? 0).toFixed(1)}%`}
          subtitle="Closed trades"
          icon={Award}
          color="green"
        />
        <KPICard
          title="Avg R-Multiple"
          value={
            summary?.avg_r_multiple != null
              ? `${summary.avg_r_multiple >= 0 ? '+' : ''}${summary.avg_r_multiple.toFixed(2)}R`
              : '—'
          }
          subtitle="Risk-adjusted return"
          icon={Activity}
          color="purple"
        />
        <KPICard
          title="Avg Holding"
          value={`${(summary?.avg_holding_days ?? 0).toFixed(0)}d`}
          subtitle="Days per swing"
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Expectancy"
          value={formatCurrency(summary?.expectancy ?? 0)}
          subtitle="Expected ₹ / trade"
          icon={Briefcase}
          color={(summary?.expectancy ?? 0) >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Active Trades Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">Active Positions</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              {activeTrades.length}
            </span>
          </div>
          <Link
            to="/trades?status=ACTIVE"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            View in table →
          </Link>
        </div>

        {activeTrades.length === 0 ? (
          <EmptyState
            title="No Active Positions"
            description="Forward a swing trading digest message to your Telegram bot to automatically generate paper trades."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTrades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </div>

      {/* Today's Digest summary banner */}
      {summary?.todays_signals > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">
                {summary.todays_signals} Candidates Shortlisted Today
              </div>
              <div className="text-xs text-slate-400">
                Last bot activity: {formatRelativeDate(botStatus.last_message_at)}
              </div>
            </div>
          </div>
          <Link
            to="/trades"
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Review All Picks
          </Link>
        </div>
      )}
    </div>
  )
}
