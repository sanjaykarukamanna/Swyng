import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Trades
export const getTrades = (params = {}) => api.get('/trades', { params })
export const getActiveTrades = () => api.get('/trades/active')
export const getDashboardSummary = () => api.get('/trades/dashboard')
export const closeTrade = (id, data = {}) => api.put(`/trades/${id}/close`, data)
export const reopenTrade = (id) => api.put(`/trades/${id}/reopen`)

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary')
export const getRMultiples = () => api.get('/analytics/r-multiples')
export const getSectorAnalytics = () => api.get('/analytics/sector')
export const getReturnsAnalytics = () => api.get('/analytics/returns')
export const getDrawdownAnalytics = () => api.get('/analytics/drawdown')

// Prices
export const getPrice = (symbol) => api.get(`/prices/${symbol}`)
export const refreshPrices = () => api.post('/prices/refresh')

// System & Bot
export const getHealth = () => api.get('/health')
export const getBotStatus = () => api.get('/bot/status')

export default api
