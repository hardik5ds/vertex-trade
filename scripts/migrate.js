import mongoose from 'mongoose'
import connectDB, { inTransaction } from '../src/lib/db.js'
import Wallet from '../src/lib/models/Wallet.js'
import Bid from '../src/lib/models/Bid.js'
import User from '../src/lib/models/User.js'
import Transaction from '../src/lib/models/Transaction.js'
import OTP from '../src/lib/models/OTP.js'
import Session from '../src/lib/models/Session.js'
import Notification from '../src/lib/models/Notification.js'
import System from '../src/lib/models/System.js'
import RateLimit from '../src/lib/models/RateLimit.js'
import AdminAudit from '../src/lib/models/AdminAudit.js'
import Stock from '../src/lib/models/Stock.js'

export async function migrate() {
  await connectDB()
  // Legacy code stored available (already debited) rupees. Reservations are reconstructed,
  // not deducted again. Invalid values stop migration instead of guessing balances.
  let migrated = 0
  const candidates = await Wallet.find({ ledgerVersion: { $ne: 1 } }).lean()
  for (const old of candidates) {
    await inTransaction(async (session) => {
      const wallet = await Wallet.findOne({ _id: old._id, ledgerVersion: { $ne: 1 } }).session(
        session,
      )
      if (!wallet) return
      if (!Number.isFinite(wallet.balance) || wallet.balance < 0)
        throw new Error('Invalid legacy balance; manual reconciliation required')
      const active = await Bid.find({
        userId: wallet.userId,
        walletType: wallet.type,
        status: 'ACTIVE',
      }).session(session)
      const balancePaise = Math.round(wallet.balance * 100),
        reservedPaise = active.reduce((sum, b) => sum + Math.round(b.bidAmount * 100), 0)
      if (![balancePaise, reservedPaise].every(Number.isSafeInteger))
        throw new Error('Unsafe legacy amount')
      await Wallet.updateOne(
        { _id: wallet._id },
        { $set: { balancePaise, reservedPaise, ledgerVersion: 1 } },
      ).session(session)
      for (const bid of active)
        await Bid.updateOne(
          { _id: bid._id },
          { $set: { stakePaise: Math.round(bid.bidAmount * 100), formulaVersion: 'V2' } },
        ).session(session)
    })
    migrated++
  }
  await User.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'ACTIVE', authVersion: 0 } },
  )
  await System.updateOne(
    { _id: 'platform' },
    { $setOnInsert: { biddingPaused: false } },
    { upsert: true },
  )
  // Create missing indexes, without dropping existing indexes or records.
  for (const model of [
    User,
    Wallet,
    Bid,
    Transaction,
    OTP,
    Session,
    Notification,
    System,
    RateLimit,
    AdminAudit,
    Stock,
  ])
    await model.createIndexes()
  return { migratedWallets: migrated }
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    console.log(JSON.stringify(await migrate()))
  } catch (e) {
    console.error('Migration failed:', e.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}
