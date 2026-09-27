import mongoose from 'mongoose'
import connectDB from '../db.js'
import Bid from '../models/Bid.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import { STOCK_CONFIG } from '../stockConfig.js'
import { invariant } from '../server/errors.js'

export async function getFullStats(userId, walletType = 'VIRTUAL') {
  await connectDB()
  invariant(['REAL', 'VIRTUAL'].includes(walletType), 'Invalid wallet')
  const oid = new mongoose.Types.ObjectId(String(userId)),
    query = { userId: oid, walletType }
  const [facets, wallets, daily, top, exposure] = await Promise.all([
    Bid.aggregate([
      { $match: query },
      {
        $facet: {
          all: [
            { $group: { _id: '$status', count: { $sum: 1 }, invested: { $sum: '$bidAmount' } } },
          ],
          settled: [
            { $match: { status: 'SETTLED' } },
            {
              $group: {
                _id: null,
                pnl: { $sum: { $ifNull: ['$pnl', '$netResult'] } },
                total: { $sum: 1 },
                wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
                averageAccuracy: { $avg: '$accuracyPercent' },
                returns: { $sum: '$returnAmount' },
                invested: { $sum: '$bidAmount' },
              },
            },
          ],
        },
      },
    ]),
    Wallet.find({ userId: oid, type: walletType }).lean(),
    Transaction.aggregate([
      { $match: { ...query, timestamp: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      {
        $group: {
          _id: { $dateToString: { date: '$timestamp', format: '%Y-%m-%d', timezone: 'UTC' } },
          net: {
            $sum: {
              $cond: [
                { $in: ['$type', ['BID_PLACED', 'WITHDRAWAL']] },
                { $multiply: ['$amount', -1] },
                '$amount',
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Bid.aggregate([
      { $match: { ...query, status: 'SETTLED' } },
      {
        $group: {
          _id: '$stockSymbol',
          pnl: { $sum: { $ifNull: ['$pnl', '$netResult'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { pnl: -1 } },
      { $limit: 5 },
    ]),
    Bid.aggregate([
      { $match: { ...query, status: 'ACTIVE' } },
      { $group: { _id: '$stockSymbol', stake: { $sum: '$bidAmount' }, count: { $sum: 1 } } },
      { $sort: { stake: -1 } },
    ]),
  ])
  const settled = facets[0]?.settled[0] || {},
    all = facets[0]?.all || [],
    wallet = wallets[0]
  const available = (wallet?.balancePaise || 0) / 100,
    reserved = (wallet?.reservedPaise || 0) / 100
  const dates = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
  )
  const byDate = Object.fromEntries(daily.map((d) => [d._id, d.net]))
  let running = available - dates.reduce((sum, date) => sum + (byDate[date] || 0), 0)
  const curve = dates.map((date) => {
    running += byDate[date] || 0
    return { date, balance: Math.round(running * 100) / 100 }
  })
  const sectors = {}
  exposure.forEach((e) => {
    const sector = STOCK_CONFIG.find((c) => c.symbol === e._id)?.sector || 'Other'
    sectors[sector] = (sectors[sector] || 0) + e.stake
  })
  return {
    summary: {
      totalBids: all.reduce((sum, a) => sum + a.count, 0),
      settledBids: settled.total || 0,
      activeBids: all.find((a) => a._id === 'ACTIVE')?.count || 0,
      pnl: settled.pnl || 0,
      wins: settled.wins || 0,
      winRate: settled.total ? (settled.wins / settled.total) * 100 : 0,
      averageAccuracy: settled.averageAccuracy || 0,
      available,
      reserved,
      equity: available + reserved,
      totalInvested: settled.invested || 0,
      exposurePercent: available + reserved ? (reserved / (available + reserved)) * 100 : 0,
    },
    equityCurve: curve,
    topStocks: top.map((t) => ({ symbol: t._id, pnl: t.pnl, count: t.count })),
    sectors: Object.entries(sectors).map(([name, value]) => ({ name, value })),
    positions: exposure.map((e) => ({ symbol: e._id, stake: e.stake, count: e.count })),
  }
}
const service = { getFullStats }

export default service
