import { randomUUID } from 'node:crypto'
import connectDB from './db.js'
import Stock from './models/Stock.js'
import System from './models/System.js'
import { STOCK_CONFIG } from './stockConfig.js'
import { fetchSingleQuote } from './yahooFinance.js'
import { escapeRegex } from './validation.js'
import { invariant } from './server/errors.js'

let catalogPromise
export async function ensureCatalog() {
  await connectDB()
  catalogPromise ||= Stock.bulkWrite(
    STOCK_CONFIG.map((config) => ({
      updateOne: {
        filter: { symbol: config.symbol },
        update: {
          $setOnInsert: {
            symbol: config.symbol,
            name: config.name,
            exchange: config.exchange,
            currency: config.currency,
            sector: config.sector,
            yahooSymbol: decodeURIComponent(config.yahoo),
            currentPrice: 0,
            openPrice: 0,
            highPrice: 0,
            lowPrice: 0,
            prevClose: 0,
            marketState: 'UNAVAILABLE',
            fetchedAt: new Date(0),
            quoteAsOf: null,
            priceHistory: [],
            candles: [],
          },
        },
        upsert: true,
      },
    })),
  ).catch((error) => {
    catalogPromise = null
    throw error
  })
  await catalogPromise
}
export const stockConfig = (symbol) => STOCK_CONFIG.find((s) => s.symbol === symbol)
export async function refreshStock(stock, force = false) {
  const config = stockConfig(stock.symbol)
  if (!config) return stock
  const now = new Date()
  const locked = await Stock.findOneAndUpdate(
    {
      _id: stock._id,
      $and: [
        { $or: [{ refreshLeaseUntil: { $exists: false } }, { refreshLeaseUntil: { $lte: now } }] },
        ...(force
          ? []
          : [
              {
                $or: [
                  { fetchedAt: { $lt: new Date(Date.now() - 60000) } },
                  { fetchedAt: { $exists: false } },
                ],
              },
            ]),
      ],
    },
    { $set: { refreshLeaseUntil: new Date(Date.now() + 15000) } },
    { new: true },
  )
  if (!locked) return stock
  try {
    const quote = await fetchSingleQuote(config.yahoo)
    return await Stock.findByIdAndUpdate(
      stock._id,
      { $set: { ...quote, lastUpdated: quote.fetchedAt, refreshLeaseUntil: new Date(0) } },
      { new: true },
    )
  } catch {
    // Preserve the provider timestamp and last valid price; do not fabricate data.
    await Stock.updateOne(
      { _id: stock._id },
      {
        $set: {
          marketState: stock.currentPrice > 0 ? 'STALE' : 'UNAVAILABLE',
          refreshLeaseUntil: new Date(Date.now() + 60000),
        },
      },
    )
    return {
      ...(stock.toObject?.() || stock),
      marketState: stock.currentPrice > 0 ? 'STALE' : 'UNAVAILABLE',
    }
  }
}
export function serializeStock(doc, detailed = false) {
  const s = doc.toObject ? doc.toObject() : doc
  const stale =
    !s.fetchedAt ||
    Date.now() - new Date(s.fetchedAt).getTime() > 120000 ||
    s.marketState === 'STALE'
  const change = s.currentPrice - s.prevClose
  return {
    symbol: s.symbol,
    name: s.name,
    exchange: s.exchange,
    sector: s.sector,
    currency: s.currency,
    currentPrice: s.currentPrice,
    priceChange: change,
    priceChangePercent: s.prevClose > 0 ? (change / s.prevClose) * 100 : 0,
    openPrice: s.openPrice,
    highPrice: s.highPrice,
    lowPrice: s.lowPrice,
    volume: s.volume,
    marketState: s.currentPrice <= 0 ? 'UNAVAILABLE' : stale ? 'STALE' : s.marketState,
    stale,
    fetchedAt: s.fetchedAt,
    quoteAsOf: s.quoteAsOf,
    priceHistory: (s.priceHistory || []).slice(-48),
    ...(detailed ? { candles: s.candles || [] } : {}),
  }
}
export async function getMarketSnapshot({
  page = 1,
  limit = 24,
  search = '',
  exchange = 'ALL',
  refresh = true,
} = {}) {
  await ensureCatalog()
  invariant(search.length <= 80, 'Search must be 80 characters or fewer')
  invariant(['ALL', 'NSE', 'NASDAQ', 'NYSE', 'CRYPTO'].includes(exchange), 'Invalid exchange')
  const query = {
    ...(exchange === 'ALL' ? {} : { exchange }),
    ...(search
      ? {
          $or: [
            { symbol: { $regex: escapeRegex(search), $options: 'i' } },
            { name: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {}),
  }
  const [docs, total] = await Promise.all([
    Stock.find(query)
      .sort({ symbol: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Stock.countDocuments(query),
  ])
  const results = []
  for (let i = 0; i < docs.length; i += 8) {
    results.push(
      ...(await Promise.all(docs.slice(i, i + 8).map((s) => (refresh ? refreshStock(s) : s)))),
    )
  }
  return {
    stocks: results.map((s) => serializeStock(s)),
    total,
    page,
    limit,
    timestamp: new Date(),
    source: 'Yahoo Finance',
    delayed: true,
  }
}
export async function getStockDetails(symbol) {
  await ensureCatalog()
  const stock = await Stock.findOne({ symbol })
  invariant(stock, 'Stock not found', 404)
  return serializeStock(await refreshStock(stock), true)
}
export async function refreshMarket() {
  await ensureCatalog()
  await System.updateOne(
    { _id: 'platform' },
    { $setOnInsert: { biddingPaused: false } },
    { upsert: true },
  )
  const owner = randomUUID(),
    now = new Date()
  const lock = await System.findOneAndUpdate(
    {
      _id: 'platform',
      $or: [{ marketLeaseUntil: { $lte: now } }, { marketLeaseUntil: { $exists: false } }],
    },
    { $set: { marketLeaseUntil: new Date(Date.now() + 60000), marketLeaseOwner: owner } },
    { new: true },
  )
  if (!lock) return { refreshed: 0 }
  try {
    const stocks = await Stock.find({}).sort({ fetchedAt: 1 }).limit(40)
    for (let i = 0; i < stocks.length; i += 8)
      await Promise.all(stocks.slice(i, i + 8).map((s) => refreshStock(s)))
    await System.updateOne(
      { _id: 'platform', marketLeaseOwner: owner },
      { $set: { lastMarketRefresh: new Date() } },
    )
    return { refreshed: stocks.length }
  } finally {
    await System.updateOne(
      { _id: 'platform', marketLeaseOwner: owner },
      { $set: { marketLeaseUntil: new Date(0) } },
    )
  }
}
const service = { getMarketSnapshot, getStockDetails, updateAllPrices: refreshMarket }

export default service
