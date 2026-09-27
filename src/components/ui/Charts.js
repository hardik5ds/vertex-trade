'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { money } from '@/lib/client'
export function Sparkline({ history = [] }) {
  const values = history.map((p) => p.price).filter(Number.isFinite)
  if (values.length < 2) return <span className="note">No history</span>
  const min = Math.min(...values),
    range = Math.max(...values) - min || 1
  return (
    <svg viewBox="0 0 100 40" className="spark" aria-hidden="true">
      <polyline
        points={values
          .map((p, i) => `${(i / (values.length - 1)) * 100},${35 - ((p - min) / range) * 30}`)
          .join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
export function CandleChart({ candles = [] }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
    let disposed = false,
      chart,
      observer
    import('lightweight-charts')
      .then(({ createChart, CandlestickSeries }) => {
        if (disposed || !ref.current || !candles.length) return
        chart = createChart(ref.current, {
          height: 290,
          width: ref.current.clientWidth,
          layout: { background: { color: '#111114' }, textColor: '#91919e' },
          grid: { vertLines: { color: '#232329' }, horzLines: { color: '#232329' } },
          timeScale: { timeVisible: true, borderColor: '#303039' },
          rightPriceScale: { borderColor: '#303039' },
        })
        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#70d6a6',
          downColor: '#ff8a94',
          borderVisible: false,
          wickUpColor: '#70d6a6',
          wickDownColor: '#ff8a94',
        })
        const unique = [
          ...new Map(
            candles.map((c) => [
              c.time,
              { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close },
            ]),
          ).values(),
        ].sort((a, b) => a.time - b.time)
        series.setData(unique)
        chart.timeScale().fitContent()
        observer = new ResizeObserver(() => {
          if (ref.current) chart.applyOptions({ width: ref.current.clientWidth })
        })
        observer.observe(ref.current)
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      observer?.disconnect()
      chart?.remove()
    }
  }, [candles])
  return failed ? (
    <div className="chart-empty" role="status">
      Chart could not load. Close and reopen this stock to retry.
    </div>
  ) : candles.length ? (
    <div ref={ref} className="chart-wrap" aria-label="Stock candlestick chart" />
  ) : (
    <div className="chart-empty">Price history is currently unavailable</div>
  )
}
export function BalanceChart({ data }) {
  return (
    <div
      style={{ height: 260, width: '100%', minWidth: 0 }}
      role="img"
      aria-label="Available wallet balance over the last seven days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 10, top: 16, bottom: 0 }}>
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4795ff" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#4795ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#28282f" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) =>
              new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            }
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#91919e' }}
            dy={10}
          />
          <YAxis
            width={55}
            tickFormatter={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : n)}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#91919e' }}
          />
          <Tooltip
            contentStyle={{
              background: '#1c1c22',
              border: '1px solid #3a3a44',
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(v) => [money(v), 'Available balance']}
          />
          <Area
            dataKey="balance"
            type="monotone"
            stroke="#4795ff"
            strokeWidth={2}
            fill="url(#balance-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
