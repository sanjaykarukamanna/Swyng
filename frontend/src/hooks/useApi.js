import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

export function useApi(url, options = {}) {
  const { params = {}, autoFetch = true, interval = null } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const paramsRef = useRef(params)
  paramsRef.current = params

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(url, { params: paramsRef.current })
      setData(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (autoFetch) {
      fetch()
    }
  }, [fetch, autoFetch])

  useEffect(() => {
    if (interval && autoFetch) {
      const id = setInterval(fetch, interval)
      return () => clearInterval(id)
    }
  }, [fetch, interval, autoFetch])

  return { data, loading, error, refetch: fetch }
}

export default useApi
