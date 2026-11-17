import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '₹0.00'
  return currencyFormatter.format(value)
}

export function formatCompactCurrency(value) {
  if (value == null || isNaN(value)) return '₹0'
  return compactCurrencyFormatter.format(value)
}

export function formatPercent(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0.00%'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0'
  return value.toFixed(decimals)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'dd MMM yyyy, HH:mm')
  } catch {
    return dateStr
  }
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function getDaysHeld(signalDate) {
  if (!signalDate) return 0
  try {
    const date = typeof signalDate === 'string' ? parseISO(signalDate) : signalDate
    return differenceInDays(new Date(), date)
  } catch {
    return 0
  }
}

export function getPnlColor(value) {
  if (value > 0) return 'text-green-500'
  if (value < 0) return 'text-red-500'
  return 'text-slate-400'
}

export function getPnlBgColor(value) {
  if (value > 0) return 'bg-green-500/10 text-green-500'
  if (value < 0) return 'bg-red-500/10 text-red-500'
  return 'bg-slate-700 text-slate-400'
}
