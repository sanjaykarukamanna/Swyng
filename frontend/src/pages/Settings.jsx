import React, { useState, useEffect } from 'react'
import {
  Radio,
  RefreshCw,
  Server,
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { getBotStatus, getHealth, refreshPrices } from '../services/api'
import { formatDateTime, formatRelativeDate } from '../utils/formatters'

export default function Settings() {
  const [botStatus, setBotStatus] = useState(null)
  const [health, setHealth] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const [botRes, healthRes] = await Promise.all([getBotStatus(), getHealth()])
      setBotStatus(botRes.data)
      setHealth(healthRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleRefreshPrices = async () => {
    try {
      setRefreshing(true)
      setRefreshResult(null)
      const res = await refreshPrices()
      setRefreshResult(`Successfully refreshed prices for ${res.data.count || 0} active positions.`)
    } catch (err) {
      setRefreshResult('Failed to refresh prices from Yahoo Finance.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100">Settings & System Status</h1>
        <p className="text-sm text-slate-400">
          Manage local Telegram bot listener, database status, and Yahoo Finance sync
        </p>
      </div>

      {/* Telegram Bot Listener Card */}
      <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-200">Telegram Bot (Long Polling)</h2>
              <p className="text-xs text-slate-400">Local background listener for forwarded trading digests</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700">
            <Radio
              className={`w-3.5 h-3.5 ${botStatus?.running ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}
            />
            <span className={botStatus?.running ? 'text-emerald-400' : 'text-slate-400'}>
              {botStatus?.running ? 'Listening (Polling)' : 'Standby / Token Not Set'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/40">
            <div className="text-slate-400">Messages Processed</div>
            <div className="text-lg font-bold text-slate-100 mt-1">
              {botStatus?.messages_processed ?? 0}
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/40">
            <div className="text-slate-400">Last Digest Received</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">
              {formatRelativeDate(botStatus?.last_message_at)}
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/40">
            <div className="text-slate-400">Connection Mode</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">
              Long Polling (No Webhook Required)
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            To activate Telegram live forwarding, configure <code className="text-blue-400">TELEGRAM_BOT_TOKEN</code> and optional <code className="text-blue-400">TELEGRAM_CHAT_ID</code> in <code className="text-slate-300">backend/.env</code>.
          </span>
        </div>
      </div>

      {/* Price Synchronization */}
      <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-200">Yahoo Finance Price Feed</h2>
              <p className="text-xs text-slate-400">Sync current prices for all open swing positions</p>
            </div>
          </div>

          <button
            onClick={handleRefreshPrices}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm shadow-blue-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating Prices...' : 'Refresh All Positions'}</span>
          </button>
        </div>

        {refreshResult && (
          <div className="text-xs p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{refreshResult}</span>
          </div>
        )}
      </div>

      {/* Backend & DB Health */}
      <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-200">Local SQLite Database</h2>
            <p className="text-xs text-slate-400">Status: <strong className="text-emerald-400">{health?.status || 'Active'}</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
