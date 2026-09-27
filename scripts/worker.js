import { settleExpiredBids } from '../src/lib/services/bidSettlement.js'
import { refreshMarket } from '../src/lib/market.js'
import System from '../src/lib/models/System.js'
import mongoose from 'mongoose'
let stopped = false,
  marketAt = 0,
  wake
const stop = () => {
  stopped = true
  wake?.()
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
while (!stopped) {
  const started = Date.now()
  try {
    const result = await settleExpiredBids(50)
    console.log('Settlement', JSON.stringify(result))
    if (Date.now() - marketAt >= 60000) {
      await refreshMarket()
      marketAt = Date.now()
    }
    await System.updateOne(
      { _id: 'platform' },
      { $set: { workerHeartbeat: new Date() } },
      { upsert: true },
    )
  } catch (error) {
    console.error('Worker cycle failed:', error.name)
  }
  if (!stopped)
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, Math.max(1000, 30000 - (Date.now() - started)))
      wake = () => {
        clearTimeout(timer)
        resolve()
      }
    })
}
await mongoose.disconnect()
