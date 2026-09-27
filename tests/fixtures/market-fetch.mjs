// Only loaded by the isolated E2E harness through NODE_OPTIONS. Never deployed.
const originalFetch = globalThis.fetch
const now = Math.floor(Date.now() / 1000),
  start = now - 1800
const timestamps = Array.from({ length: 30 }, (_, i) => start + i * 60)
globalThis.fetch = async (input, options) => {
  const url = String(input?.url || input)
  if (/^https:\/\/query[12]\.finance\.yahoo\.com\//.test(url))
    return Response.json({
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 100,
              regularMarketTime: now,
              chartPreviousClose: 98,
              regularMarketDayHigh: 102,
              regularMarketDayLow: 97,
              regularMarketVolume: 150000,
              currency: url.includes('.NS') ? 'INR' : 'USD',
              currentTradingPeriod: { regular: { start: now - 100, end: now + 3600 } },
            },
            timestamp: timestamps,
            indicators: {
              quote: [
                {
                  open: timestamps.map((_, i) => 98 + i * 0.06),
                  close: timestamps.map((_, i) => 98.1 + i * 0.06),
                  high: timestamps.map((_, i) => 98.3 + i * 0.06),
                  low: timestamps.map((_, i) => 97.8 + i * 0.06),
                },
              ],
            },
          },
        ],
      },
    })
  return originalFetch(input, options)
}
