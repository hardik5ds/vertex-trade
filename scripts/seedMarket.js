import mongoose from 'mongoose'
import { ensureCatalog, refreshMarket } from '../src/lib/market.js'
try {
  await ensureCatalog()
  console.log('Stock catalog initialized without synthetic prices.')
  console.log(await refreshMarket())
} catch (e) {
  console.error('Market initialization failed:', e.name)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
