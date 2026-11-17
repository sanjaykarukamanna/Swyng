import { useState, useEffect, useCallback } from 'react'
import { getTrades, getTrade, getAnalytics } from '../services/api'

export function useAllTrades(params = {}) {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getTrades(params)
      setTrades(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { trades, loading, error, refetch: fetch }
}

export function useActiveTrades() {
  return useAllTrades({ status: 'ACTIVE' })
}

export function useTradeDetail(id) {
  const [trade, setTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const response = await getTrade(id)
      setTrade(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load trade')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { trade, loading, error, refetch: fetch }
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAnalytics()
      setAnalytics(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { analytics, loading, error, refetch: fetch }
}
