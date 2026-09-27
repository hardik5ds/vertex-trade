import connectDB from '../db.js'
import Bid from '../models/Bid.js'
import System from '../models/System.js'
import { stockConfig } from '../market.js'
import { fetchMultipleQuotes } from '../yahooFinance.js'
import { finishPrediction } from '../server/ledger.js'

export async function settleExpiredBids(limit = 50, userId = null) {
  await connectDB()
  const bids = await Bid.find({
    status: 'ACTIVE',
    expiresAt: { $lte: new Date() },
    ...(userId ? { userId } : {}),
  })
    .sort({ expiresAt: 1 })
    .limit(limit)
    .lean()
  const symbols = [...new Set(bids.map((b) => stockConfig(b.stockSymbol)?.yahoo).filter(Boolean))]
  const quotes = await fetchMultipleQuotes(symbols)
  let settled = 0,
    refunded = 0,
    failed = 0
  for (const bid of bids) {
    try {
      const quote = quotes[stockConfig(bid.stockSymbol)?.yahoo]
      const result = await finishPrediction(bid._id, {
        quote,
        reason: 'Provider quote unavailable during settlement',
      })
      if (!result.replayed) {
        if (result.bid.status === 'REFUNDED') refunded++
        else settled++
      }
    } catch {
      failed++
    }
  }
  await System.updateOne(
    { _id: 'platform' },
    { $set: { lastSettlement: new Date() } },
    { upsert: true },
  )
  return { settled, refunded, failed, examined: bids.length }
}
const service = { settleExpiredBids }

export default service
