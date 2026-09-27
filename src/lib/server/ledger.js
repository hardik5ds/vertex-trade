import { createHash } from 'node:crypto'
import { inTransaction } from '../db.js'
import Wallet from '../models/Wallet.js'
import User from '../models/User.js'
import Bid from '../models/Bid.js'
import Transaction from '../models/Transaction.js'
import Notification from '../models/Notification.js'
import System from '../models/System.js'
import { validDuration, validKey, toPaise, validId } from '../validation.js'
import { stockConfig, getStockDetails } from '../market.js'
import { calculateSettlement } from '../services/settlementFormula.js'
import { invariant, AppError } from './errors.js'

export const hashRequest = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const serializeBid = (bid) => ({
  ...(bid.toObject ? bid.toObject() : bid),
  id: String(bid._id),
})
export function money(value, min = 1, max = 1000000) {
  try {
    return toPaise(value, min, max)
  } catch (e) {
    throw new AppError(e.message)
  }
}
export async function requireActiveUser(userId, session) {
  const user = await User.findOneAndUpdate(
    { _id: userId, isVerified: true, status: { $ne: 'SUSPENDED' } },
    { $inc: { sessionRevision: 1 } },
    { new: true, session },
  )
  invariant(user, 'Account is unavailable', 403)
}
export async function recordTransaction(
  { wallet, userId, type, amountPaise, operationKey, relatedBidId, description, requestHash },
  session,
) {
  const [record] = await Transaction.create(
    [
      {
        userId,
        type,
        walletType: wallet.type,
        amountPaise,
        amount: amountPaise / 100,
        balanceAfterPaise: wallet.balancePaise,
        balanceAfter: wallet.balancePaise / 100,
        reservedAfterPaise: wallet.reservedPaise,
        operationKey,
        relatedBidId,
        description,
        requestHash,
      },
    ],
    { session },
  )
  return record
}
export async function ensureWallet(userId, type, session) {
  const wallet = await Wallet.findOne({ userId, type }).session(session)
  invariant(wallet, 'Wallet not found', 404)
  invariant(
    wallet.ledgerVersion === 1 &&
      Number.isSafeInteger(wallet.balancePaise) &&
      Number.isSafeInteger(wallet.reservedPaise),
    'Wallet migration is required. Contact the administrator',
    503,
  )
  return wallet
}
export async function placePrediction(userId, body, key, getQuote = getStockDetails) {
  invariant(validKey(key), 'A valid Idempotency-Key is required')
  invariant(typeof body.stockSymbol === 'string', 'Select a stock')
  const config = stockConfig(body.stockSymbol.toUpperCase())
  invariant(config, 'Stock is not available')
  invariant(['VIRTUAL', 'REAL'].includes(body.walletType), 'Choose a wallet')
  invariant(
    typeof body.predictedPrice === 'number' &&
      Number.isFinite(body.predictedPrice) &&
      body.predictedPrice > 0 &&
      body.predictedPrice <= 1e9,
    'Enter a valid predicted price',
  )
  const stake = money(body.bidAmountRupees, 100, 100000)
  invariant(
    validDuration(body.timespan?.durationMs),
    'Duration must be between 1 hour and 10 years',
  )
  const terms = {
    stock: config.symbol,
    wallet: body.walletType,
    predictedPrice: body.predictedPrice,
    stake,
    durationMs: body.timespan.durationMs,
  }
  const hash = hashRequest(terms)
  const previous = await Bid.findOne({ userId, requestKey: key })
  if (previous) {
    invariant(
      previous.requestHash === hash,
      'Request key was already used with different inputs',
      409,
    )
    return { bid: serializeBid(previous), replayed: true }
  }
  const quote = await getQuote(config.symbol)
  invariant(
    quote.currentPrice > 0 &&
      !quote.stale &&
      quote.marketState !== 'UNAVAILABLE' &&
      quote.quoteAsOf,
    'A fresh provider quote is unavailable. Try again later',
    503,
  )
  await System.updateOne(
    { _id: 'platform' },
    { $setOnInsert: { biddingPaused: false } },
    { upsert: true },
  )
  try {
    return await inTransaction(async (session) => {
      await requireActiveUser(userId, session)
      const replay = await Bid.findOne({ userId, requestKey: key }).session(session)
      if (replay) {
        invariant(replay.requestHash === hash, 'Request key conflict', 409)
        return { bid: serializeBid(replay), replayed: true }
      }
      // Writing this document serializes placement with the admin pause control.
      const state = await System.findOneAndUpdate(
        { _id: 'platform', biddingPaused: false },
        { $inc: { revision: 1 } },
        { session, new: true },
      )
      invariant(state, 'New predictions are temporarily paused', 409)
      await ensureWallet(userId, body.walletType, session)
      const wallet = await Wallet.findOneAndUpdate(
        { userId, type: body.walletType, balancePaise: { $gte: stake } },
        { $inc: { balancePaise: -stake, reservedPaise: stake } },
        { new: true, session },
      )
      invariant(wallet, 'Insufficient balance. Add demo credits in your wallet', 409)
      const stats = await Bid.aggregate([
        { $match: { userId: wallet.userId, status: 'SETTLED' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          },
        },
      ]).session(session)
      const count = stats[0]?.count || 0,
        winRate = count ? stats[0].wins / count : 0
      const placedAt = new Date()
      const [bid] = await Bid.create(
        [
          {
            userId,
            stockSymbol: config.symbol,
            stockName: config.name,
            exchange: config.exchange,
            currency: config.currency,
            predictedPrice: body.predictedPrice,
            priceAtBid: quote.currentPrice,
            quoteAsOf: quote.quoteAsOf,
            walletType: body.walletType,
            bidAmount: stake / 100,
            stakePaise: stake,
            timespan: {
              durationMs: terms.durationMs,
              label: `${terms.durationMs / 3600000} hours`,
            },
            placedAt,
            expiresAt: new Date(placedAt.getTime() + terms.durationMs),
            status: 'ACTIVE',
            requestKey: key,
            requestHash: hash,
            formulaVersion: 'V2',
            termsFrozen: true,
            userWinRateAtPlacement: winRate,
            settledCountAtPlacement: count,
          },
        ],
        { session },
      )
      await recordTransaction(
        {
          wallet,
          userId,
          type: 'BID_PLACED',
          amountPaise: stake,
          operationKey: `place:${bid._id}`,
          relatedBidId: bid._id,
          description: `Prediction on ${config.symbol}`,
        },
        session,
      )
      return { bid: serializeBid(bid), balanceAfter: wallet.balancePaise / 100 }
    })
  } catch (error) {
    if (error.code === 11000) {
      const replay = await Bid.findOne({ userId, requestKey: key })
      if (replay && replay.requestHash === hash)
        return { bid: serializeBid(replay), replayed: true }
    }
    throw error
  }
}
export async function finishPrediction(id, { userId, cancel = false, quote, reason } = {}) {
  invariant(validId(String(id)), 'Invalid prediction ID')
  return inTransaction(async (session) => {
    if (cancel) await requireActiveUser(userId, session)
    const now = new Date()
    const bid = await Bid.findOne({ _id: id, ...(cancel ? { userId } : {}) }).session(session)
    invariant(bid, 'Prediction not found', 404)
    if (bid.status !== 'ACTIVE') return { bid: serializeBid(bid), replayed: true }
    invariant(
      cancel ? bid.expiresAt > now : bid.expiresAt <= now,
      cancel ? 'This prediction has expired and cannot be cancelled' : 'Prediction has not expired',
      409,
    )
    const stake = bid.stakePaise ?? Math.round(bid.bidAmount * 100)
    const refund = !cancel && !quote
    let winRate = bid.userWinRateAtPlacement || 0
    let settledCount = bid.settledCountAtPlacement || 0
    // Existing bids used history at settlement. Only new bids freeze these terms.
    if (!cancel && !refund && !bid.termsFrozen) {
      const [history] = await Bid.aggregate([
        { $match: { userId: bid.userId, status: 'SETTLED' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            wins: { $sum: { $cond: [{ $eq: ['$outcome', 'WIN'] }, 1, 0] } },
          },
        },
      ]).session(session)
      settledCount = history?.count || 0
      winRate = settledCount ? history.wins / settledCount : 0
    }
    const calculation =
      !cancel && !refund
        ? calculateSettlement({
            bidAmount: stake / 100,
            predictedPrice: bid.predictedPrice,
            actualPrice: quote.currentPrice,
            durationMs: bid.timespan.durationMs,
            userWinRate: winRate,
            totalSettledBids: settledCount,
          })
        : null
    const returned = calculation ? Math.round(calculation.returnAmount * 100) : stake
    invariant(Number.isSafeInteger(returned) && returned >= 0, 'Invalid settlement result', 503)
    const status = cancel ? 'CANCELLED' : refund ? 'REFUNDED' : 'SETTLED'
    const outcome = cancel || refund ? 'REFUNDED' : calculation.outcome
    const type = cancel
      ? 'BID_CANCELLED'
      : refund
        ? 'BID_REFUNDED'
        : outcome === 'WIN'
          ? 'BID_WON'
          : outcome === 'BREAKEVEN'
            ? 'BID_BREAKEVEN'
            : returned
              ? 'BID_PARTIAL_LOSS'
              : 'BID_LOST'
    await ensureWallet(bid.userId, bid.walletType, session)
    const wallet = await Wallet.findOneAndUpdate(
      { userId: bid.userId, type: bid.walletType, reservedPaise: { $gte: stake } },
      { $inc: { balancePaise: returned, reservedPaise: -stake } },
      { new: true, session },
    )
    invariant(wallet, 'Wallet reservation does not match the prediction', 503)
    const updated = await Bid.findOneAndUpdate(
      { _id: bid._id, status: 'ACTIVE' },
      {
        $set: {
          status,
          outcome,
          settledAt: now,
          returnPaise: returned,
          returnAmount: returned / 100,
          pnl: (returned - stake) / 100,
          netResult: (returned - stake) / 100,
          ...(calculation
            ? {
                accuracyPercent: calculation.accuracy,
                userBonusApplied: calculation.userBonus,
                multiplierApplied: calculation.profitMultiplier,
                profitMultiplier: calculation.profitMultiplier,
                accuracyZone: calculation.accuracyZone,
                actualSettlementPrice: quote.currentPrice,
                settlementQuoteAsOf: quote.quoteAsOf,
              }
            : {
                refundReason: cancel
                  ? 'Cancelled before expiry'
                  : reason || 'Market data unavailable',
              }),
        },
      },
      { new: true, session },
    )
    invariant(updated, 'Prediction has already been processed', 409)
    await recordTransaction(
      {
        wallet,
        userId: bid.userId,
        type,
        amountPaise: returned,
        operationKey: `finish:${bid._id}`,
        relatedBidId: bid._id,
        description: `${bid.stockSymbol} · ${status.toLowerCase()}${refund ? ' — market data unavailable' : ''}`,
      },
      session,
    )
    await Notification.create(
      [
        {
          userId: bid.userId,
          title: `${bid.stockSymbol} prediction ${status.toLowerCase()}`,
          message: `₹${(returned / 100).toLocaleString('en-IN')} returned to your ${bid.walletType === 'REAL' ? 'demo cash' : 'practice'} wallet.`,
          href: '/dashboard/bidding',
        },
      ],
      { session },
    )
    return { bid: serializeBid(updated), balanceAfter: wallet.balancePaise / 100 }
  })
}
export async function demoPayment(userId, body, key) {
  invariant(validKey(key), 'A valid Idempotency-Key is required')
  invariant(['deposit', 'withdraw'].includes(body.action), 'Choose deposit or withdrawal')
  const paise = money(body.amount, 1, 100000),
    type = body.action === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL'
  const hash = hashRequest({ action: body.action, paise }),
    operationKey = `payment:${userId}:${key}`
  try {
    return await inTransaction(async (session) => {
      await requireActiveUser(userId, session)
      const previous = await Transaction.findOne({ operationKey }).session(session)
      if (previous) {
        invariant(previous.requestHash === hash, 'Request key conflict', 409)
        return { transaction: previous, replayed: true }
      }
      await ensureWallet(userId, 'REAL', session)
      const condition =
        type === 'DEPOSIT'
          ? { $expr: { $lte: [{ $add: ['$balancePaise', '$reservedPaise', paise] }, 100000000] } }
          : { balancePaise: { $gte: paise } }
      const wallet = await Wallet.findOneAndUpdate(
        { userId, type: 'REAL', ...condition },
        { $inc: { balancePaise: type === 'DEPOSIT' ? paise : -paise } },
        { session, new: true },
      )
      invariant(
        wallet,
        type === 'DEPOSIT'
          ? 'Demo wallet limit is ₹10,00,000 including active stakes'
          : 'Insufficient available demo balance',
        409,
      )
      const transaction = await recordTransaction(
        {
          wallet,
          userId,
          type,
          amountPaise: paise,
          operationKey,
          requestHash: hash,
          description: `Simulated ${body.action} — no real money transferred`,
        },
        session,
      )
      return { transaction, balanceAfter: wallet.balancePaise / 100, simulated: true }
    })
  } catch (error) {
    if (error.code === 11000) {
      const previous = await Transaction.findOne({ operationKey })
      if (previous?.requestHash === hash)
        return { transaction: previous, replayed: true, simulated: true }
    }
    throw error
  }
}
export async function refillPractice(userId) {
  return inTransaction(async (session) => {
    await requireActiveUser(userId, session)
    const current = await ensureWallet(userId, 'VIRTUAL', session)
    invariant(
      !current.lastFaucetAt || Date.now() - current.lastFaucetAt.getTime() >= 86400000,
      'Practice credits can be refilled once every 24 hours',
      429,
    )
    const added = 10000000 - current.balancePaise - current.reservedPaise
    invariant(added > 0, 'Your practice funds already total ₹1,00,000 or more')
    const wallet = await Wallet.findByIdAndUpdate(
      current._id,
      { $inc: { balancePaise: added }, $set: { lastFaucetAt: new Date() } },
      { session, new: true },
    )
    await recordTransaction(
      {
        wallet,
        userId,
        type: 'DEPOSIT',
        amountPaise: added,
        operationKey: `faucet:${userId}:${wallet.lastFaucetAt.getTime()}`,
        description: 'Practice credits refilled — no monetary value',
      },
      session,
    )
    return { amountAdded: added / 100, newBalance: wallet.balancePaise / 100 }
  })
}
