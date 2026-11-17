import React, { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

export default function PriceChart({ trade, snapshots = [] }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const container = chartContainerRef.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 340,
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.4)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
    })
    chartRef.current = chart

    // Prepare line data from snapshots
    let dataPoints = []
    if (snapshots && snapshots.length > 0) {
      dataPoints = snapshots.map((s) => {
        // Parse timestamp or use unix seconds
        const t = Math.floor(new Date(s.timestamp).getTime() / 1000)
        return { time: t, value: s.price }
      })
      // Ensure sorted and unique times
      dataPoints.sort((a, b) => a.time - b.time)
      const uniqueData = []
      let lastTime = null
      for (const pt of dataPoints) {
        if (pt.time !== lastTime && !isNaN(pt.time)) {
          uniqueData.push(pt)
          lastTime = pt.time
        }
      }
      dataPoints = uniqueData
    }

    // If no snapshot data yet, synthesize points around entry
    if (dataPoints.length === 0 && trade) {
      const nowSec = Math.floor(Date.now() / 1000)
      const basePrice = trade.price_at_signal || trade.entry_price || 1000
      dataPoints = [
        { time: nowSec - 3600 * 24, value: trade.entry_price || basePrice },
        { time: nowSec, value: trade.current_price || basePrice },
      ]
    }

    const series = chart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.35)',
      bottomColor: 'rgba(59, 130, 246, 0.0)',
      lineWidth: 2,
    })

    if (dataPoints.length > 0) {
      try {
        series.setData(dataPoints)
      } catch (err) {
        console.warn('Chart setData error:', err)
      }
    }

    // Add horizontal price lines
    if (trade?.entry_price) {
      series.createPriceLine({
        price: trade.entry_price,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Entry',
      })
    }

    if (trade?.stop_loss) {
      series.createPriceLine({
        price: trade.stop_loss,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Stop Loss',
      })
    }

    if (trade?.target_price) {
      series.createPriceLine({
        price: trade.target_price,
        color: '#22c55e',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Target (2R)',
      })
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [trade, snapshots])

  return (
    <div className="w-full bg-[#1e293b] p-4 rounded-xl border border-slate-700/60">
      <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Price Action & Levels</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-0.5 bg-blue-500 inline-block" /> Entry
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-0.5 bg-rose-500 inline-block" /> Stop Loss
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> Target (2R)
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[340px]" />
    </div>
  )
}
