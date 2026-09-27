export function formatSymbolForYahoo(symbol, exchange) {
  if (exchange === 'NSE') return `${symbol}.NS`
  if (exchange === 'BSE') return `${symbol}.BO`
  if (exchange === 'CRYPTO') return `${symbol}-USD`
  return symbol
}
async function chart(symbol, query = 'interval=1m&range=1d') {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(decodeURIComponent(symbol))}?${query}`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0 VertexTrade/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    },
  )
  if (!res.ok) throw new Error(`Market provider HTTP ${res.status}`)
  const data = await res.json(),
    result = data?.chart?.result?.[0]
  if (!result) throw new Error('Market quote unavailable')
  return result
}
export async function fetchSingleQuote(symbol) {
  const result = await chart(symbol),
    meta = result.meta,
    q = result.indicators?.quote?.[0] || {}
  if (
    !Number.isFinite(meta.regularMarketPrice) ||
    meta.regularMarketPrice <= 0 ||
    !meta.regularMarketTime
  )
    throw new Error('Invalid market quote')
  const candles = (result.timestamp || [])
    .map((time, i) => ({
      time,
      open: q.open?.[i],
      high: q.high?.[i],
      low: q.low?.[i],
      close: q.close?.[i],
    }))
    .filter((c) => [c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v) && v > 0))
    .slice(-1000)
  return {
    currentPrice: meta.regularMarketPrice,
    openPrice: candles[0]?.open ?? meta.chartPreviousClose ?? meta.regularMarketPrice,
    highPrice: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
    lowPrice: meta.regularMarketDayLow ?? meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
    volume: meta.regularMarketVolume || 0,
    currency: meta.currency || 'USD',
    quoteAsOf: new Date(meta.regularMarketTime * 1000),
    fetchedAt: new Date(),
    candles,
    priceHistory: candles.map((c) => ({ price: c.close, timestamp: new Date(c.time * 1000) })),
    marketState:
      Date.now() / 1000 >= meta.currentTradingPeriod?.regular?.start &&
      Date.now() / 1000 < meta.currentTradingPeriod?.regular?.end
        ? 'OPEN'
        : 'CLOSED',
  }
}
export async function fetchMultipleQuotes(symbols, { batchSize = 8 } = {}) {
  const output = {}
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize),
      results = await Promise.allSettled(batch.map(fetchSingleQuote))
    results.forEach((r, j) => {
      output[batch[j]] = r.status === 'fulfilled' ? r.value : null
    })
  }
  return output
}
