import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  Award,
  Clock,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  BarChart2,
} from 'lucide-react'
import KPICard from '../components/KPICard'
import RMultipleChart from '../components/RMultipleChart'
import EquityCurve from '../components/EquityCurve'
import SectorBreakdown from '../components/SectorBreakdown'
import {
  getAnalyticsSummary,
  getRMultiples,
  getSectorAnalytics,
  getReturnsAnalytics,
} from '../services/api'
import { formatCurrency, formatPercent } from '../utils/formatters'

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [rMultiples, setRMultiples] = useState([])
  const [sectors, setSectors] = useState([])
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true)
        const [sumRes, rRes, secRes, retRes] = await Promise.all([
          getAnalyticsSummary(),
          getRMultiples(),
          getSectorAnalytics(),
          getReturnsAnalytics(),
        ])
        setSummary(sumRes.data)
        setRMultiples(rRes.data)
        setSectors(secRes.data)
        setReturns(retRes.data)
      } catch (err) {
        console.error('Failed to load analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Strategy Analytics</h1>
        <p className="text-xs text-slate-400">
          Risk-adjusted performance, edge expectancy, and win-rate analysis for swing setups
        </p>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Win Rate"
          value={`${(summary?.win_rate ?? 0).toFixed(1)}%`}
          subtitle={`${summary?.closed_trades ?? 0} closed trades`}
          icon={Award}
          color="green"
        />
        <KPICard
          title="Total Realized P&L"
          value={formatCurrency(summary?.total_pnl ?? 0)}
          subtitle="Closed outcomes"
          icon={TrendingUp}
          color={(summary?.total_pnl ?? 0) >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Avg Return %"
          value={formatPercent(summary?.avg_return_pct ?? 0)}
          subtitle="Per trade"
          icon={BarChart2}
          color={(summary?.avg_return_pct ?? 0) >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Trade Expectancy"
          value={formatCurrency(summary?.expectancy ?? 0)}
          subtitle="Mathematical edge"
          icon={Briefcase}
          color={(summary?.expectancy ?? 0) >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Avg Holding Days"
          value={`${(summary?.avg_holding_days ?? 0).toFixed(0)}d`}
          subtitle="Duration per swing"
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Max Drawdown"
          value={`-${Math.abs(summary?.max_drawdown_pct ?? 0).toFixed(1)}%`}
          subtitle="Peak-to-trough"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RMultipleChart data={rMultiples} />
        <EquityCurve data={returns} />
      </div>

      {/* Sector Breakdown */}
      <SectorBreakdown sectors={sectors} />
    </div>
  )
}
