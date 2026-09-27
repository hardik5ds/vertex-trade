import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import connectDB from '../../src/lib/db.js'
import User from '../../src/lib/models/User.js'
import Wallet from '../../src/lib/models/Wallet.js'
import Bid from '../../src/lib/models/Bid.js'
import Transaction from '../../src/lib/models/Transaction.js'
import OTP from '../../src/lib/models/OTP.js'
import Session from '../../src/lib/models/Session.js'
import RateLimit from '../../src/lib/models/RateLimit.js'
import System from '../../src/lib/models/System.js'
import Notification from '../../src/lib/models/Notification.js'
import {
  placePrediction,
  finishPrediction,
  demoPayment,
  refillPractice,
} from '../../src/lib/server/ledger.js'
import {
  requestCode,
  consumeCode,
  verifySignup,
  register,
  login,
  resetPassword,
} from '../../src/lib/server/authService.js'
import { authenticate, signingSecret, COOKIE, signRegistration } from '../../src/lib/server/auth.js'
import { rateLimit, assertOrigin } from '../../src/lib/server/api.js'
import { getFullStats } from '../../src/lib/services/portfolioService.js'
import { migrate } from '../../scripts/migrate.js'
let mongo, user
const quote = async () => ({
  currentPrice: 100,
  quoteAsOf: new Date(),
  stale: false,
  marketState: 'OPEN',
})
const body = (amount = 100) => ({
  stockSymbol: 'AAPL',
  predictedPrice: 100,
  bidAmountRupees: amount,
  walletType: 'VIRTUAL',
  timespan: { durationMs: 3600000 },
})
async function place(amount = 100, key = randomUUID()) {
  return placePrediction(user._id, body(amount), key, quote)
}
before(async () => {
  process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  process.env.MONGODB_URI = mongo.getUri('vertex_integration')
  await connectDB()
  for (const model of [
    User,
    Wallet,
    Bid,
    Transaction,
    OTP,
    Session,
    RateLimit,
    System,
    Notification,
  ])
    await model.init()
})
beforeEach(async () => {
  for (const model of [
    User,
    Wallet,
    Bid,
    Transaction,
    OTP,
    Session,
    RateLimit,
    System,
    Notification,
  ])
    await model.deleteMany({})
  const result = await register({
    name: 'Test Trader',
    password: 'password-for-testing',
    registrationToken: signRegistration('trader@example.test'),
  })
  user = await User.findById(result.user.id)
})
after(async () => {
  await mongoose.disconnect()
  await mongo?.stop()
})
test('verified signup atomically creates wallets and opening ledger', async () => {
  assert.equal(await Wallet.countDocuments({ userId: user._id }), 2)
  assert.equal(await Transaction.countDocuments({ userId: user._id }), 1)
  assert.equal((await Wallet.findOne({ userId: user._id, type: 'VIRTUAL' })).balancePaise, 10000000)
  await assert.rejects(
    register({
      name: 'Other',
      password: 'password-for-testing',
      registrationToken: signRegistration(user.email),
    }),
  )
  assert.equal(await Wallet.countDocuments({ userId: user._id }), 2)
})
test('parallel bids cannot overspend available funds', async () => {
  await Wallet.updateOne({ userId: user._id, type: 'VIRTUAL' }, { $set: { balancePaise: 15000 } })
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => place(100)))
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  const wallet = await Wallet.findOne({ userId: user._id, type: 'VIRTUAL' })
  assert.equal(wallet.balancePaise, 5000)
  assert.equal(wallet.reservedPaise, 10000)
  assert.equal(await Bid.countDocuments(), 1)
})
test('replayed placement is charged once and conflicting payloads are rejected', async () => {
  const key = randomUUID(),
    results = await Promise.all(Array.from({ length: 6 }, () => place(200, key)))
  assert.equal(new Set(results.map((r) => r.bid.id)).size, 1)
  assert.equal(await Transaction.countDocuments({ type: 'BID_PLACED' }), 1)
  await assert.rejects(place(300, key), /conflict|different inputs/i)
})
test('cancellation refunds exactly once and cannot cancel after expiry', async () => {
  const { bid } = await place(200)
  await Promise.all(
    Array.from({ length: 6 }, () => finishPrediction(bid.id, { userId: user._id, cancel: true })),
  )
  assert.equal(await Transaction.countDocuments({ type: 'BID_CANCELLED' }), 1)
  assert.equal((await Wallet.findOne({ userId: user._id, type: 'VIRTUAL' })).balancePaise, 10000000)
  const next = (await place()).bid
  await Bid.updateOne({ _id: next.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
  await assert.rejects(finishPrediction(next.id, { userId: user._id, cancel: true }), /expired/)
})
test('parallel settlement and refund attempts produce one terminal ledger entry', async () => {
  const { bid } = await place(500)
  await Bid.updateOne({ _id: bid.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
  await Promise.all([
    finishPrediction(bid.id, { quote: await quote() }),
    finishPrediction(bid.id, { quote: null }),
    finishPrediction(bid.id, { quote: await quote() }),
  ])
  assert.equal(await Transaction.countDocuments({ operationKey: `finish:${bid.id}` }), 1)
  const result = await Bid.findById(bid.id),
    wallet = await Wallet.findOne({ userId: user._id, type: 'VIRTUAL' })
  assert.equal(wallet.balancePaise, 9950000 + result.returnPaise)
  assert.equal(wallet.reservedPaise, 0)
})
test('ledger write failure rolls back bid and balance mutation', async () => {
  const original = Transaction.create
  Transaction.create = async () => {
    throw new Error('Injected database failure')
  }
  try {
    await assert.rejects(place(200), /Injected/)
  } finally {
    Transaction.create = original
  }
  assert.equal(await Bid.countDocuments(), 0)
  assert.equal((await Wallet.findOne({ userId: user._id, type: 'VIRTUAL' })).balancePaise, 10000000)
})
test('demo payments deduplicate retries and reject overdraw', async () => {
  const key = randomUUID()
  await Promise.all(
    Array.from({ length: 6 }, () =>
      demoPayment(user._id, { action: 'deposit', amount: 1000 }, key),
    ),
  )
  assert.equal((await Wallet.findOne({ userId: user._id, type: 'REAL' })).balancePaise, 100000)
  await assert.rejects(
    demoPayment(user._id, { action: 'withdraw', amount: 1001 }, randomUUID()),
    /Insufficient/,
  )
  await demoPayment(user._id, { action: 'withdraw', amount: 500 }, randomUUID())
  assert.equal((await Wallet.findOne({ userId: user._id, type: 'REAL' })).balancePaise, 50000)
})
test('faucet includes active reservations and enforces cooldown atomically', async () => {
  await place(1000)
  await assert.rejects(refillPractice(user._id), /already total/)
  const wallet = await Wallet.findOne({ userId: user._id, type: 'VIRTUAL' })
  await Wallet.updateOne({ _id: wallet._id }, { $inc: { balancePaise: -10000 } })
  const results = await Promise.allSettled([refillPractice(user._id), refillPractice(user._id)])
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal((await Wallet.findById(wallet._id)).balancePaise, 9900000)
})
test('OTP is hashed, purpose-scoped, single-use and bounded under concurrency', async () => {
  let code
  await requestCode({ email: 'new@example.test', purpose: 'SIGNUP' }, async (_e, c) => {
    code = c
  })
  const otp = await OTP.findOne({ email: 'new@example.test' })
  assert.notEqual(otp.digest, code)
  assert.equal(otp.otp, undefined)
  await assert.rejects(consumeCode('new@example.test', code, 'PASSWORD_RESET'))
  const r = await Promise.allSettled([
    verifySignup({ email: 'new@example.test', otp: code }),
    verifySignup({ email: 'new@example.test', otp: code }),
  ])
  assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1)
  await requestCode({ email: 'brute@example.test' }, async () => {})
  await Promise.allSettled(
    Array.from({ length: 8 }, () => consumeCode('brute@example.test', '000000', 'SIGNUP')),
  )
  assert.equal((await OTP.findOne({ email: 'brute@example.test' })).attempts, 3)
})
test('password reset revokes existing sessions and cannot use signup codes', async () => {
  const auth = await login({ email: user.email, password: 'password-for-testing' })
  const req = new Request('http://localhost:3000/api/auth/me', {
    headers: { cookie: `${COOKIE}=${auth.token}` },
  })
  assert.equal(String((await authenticate(req)).user._id), String(user._id))
  let code
  await requestCode({ email: user.email, purpose: 'PASSWORD_RESET' }, async (_e, c) => {
    code = c
  })
  await resetPassword({ email: user.email, otp: code, newPassword: 'a-new-password-for-tests' })
  await assert.rejects(authenticate(req), /expired|sign in/)
  await assert.rejects(login({ email: user.email, password: 'password-for-testing' }), /Invalid/)
  assert.ok((await login({ email: user.email, password: 'a-new-password-for-tests' })).token)
})
test('suspended accounts and paused bidding reject new financial actions', async () => {
  await User.updateOne({ _id: user._id }, { $set: { status: 'SUSPENDED' } })
  await assert.rejects(place(), /unavailable/)
  await User.updateOne({ _id: user._id }, { $set: { status: 'ACTIVE' } })
  await System.updateOne({ _id: 'platform' }, { $set: { biddingPaused: true } }, { upsert: true })
  await assert.rejects(place(), /paused/)
})
test('shared rate limits count parallel requests and CSRF rejects foreign origins', async () => {
  const r = await Promise.allSettled(Array.from({ length: 10 }, () => rateLimit('parallel', 3)))
  assert.equal(r.filter((x) => x.status === 'fulfilled').length, 3)
  assert.throws(
    () =>
      assertOrigin(
        new Request('http://localhost:3000', { headers: { origin: 'https://attacker.test' } }),
      ),
    /origin/,
  )
  assert.doesNotThrow(() =>
    assertOrigin(
      new Request('http://localhost:3000', { headers: { origin: 'http://localhost:3000' } }),
    ),
  )
  assert.ok(signingSecret())
})
test('portfolio cash curve includes debits and reservations', async () => {
  await place(250)
  const stats = await getFullStats(user._id, 'VIRTUAL')
  assert.equal(stats.summary.available, 99750)
  assert.equal(stats.summary.reserved, 250)
  assert.equal(stats.summary.equity, 100000)
  assert.equal(stats.equityCurve.at(-1).balance, 99750)
  assert.equal(stats.sectors[0].name, 'Technology')
})
test('migration preserves debited legacy balances and is repeatable', async () => {
  const { bid } = await place(250)
  const filter = { userId: user._id, type: 'VIRTUAL' }
  await Wallet.updateOne(filter, {
    $set: { balance: 99750 },
    $unset: { ledgerVersion: '', balancePaise: '', reservedPaise: '' },
  })
  await Bid.updateOne({ _id: bid.id }, { $unset: { stakePaise: '', termsFrozen: '' } })
  assert.equal((await migrate()).migratedWallets, 1)
  assert.equal((await migrate()).migratedWallets, 0)
  const wallet = await Wallet.findOne(filter)
  assert.equal(wallet.balancePaise, 9975000)
  assert.equal(wallet.reservedPaise, 25000)
  assert.equal((await Bid.findById(bid.id)).termsFrozen, false)
  await finishPrediction(bid.id, { userId: user._id, cancel: true })
  assert.equal((await Wallet.findOne(filter)).balancePaise, 10000000)
})
test('migration adds OTP uniqueness alongside a legacy non-unique email index', async () => {
  await OTP.collection.dropIndex('otp_email_unique_v1')
  await OTP.collection.createIndex({ email: 1 }, { name: 'email_1' })
  await migrate()
  const indexes = await OTP.collection.indexes()
  assert.equal(indexes.find((i) => i.name === 'email_1').unique, undefined)
  assert.equal(indexes.find((i) => i.name === 'otp_email_unique_v1').unique, true)
  await requestCode({ email: 'migration@example.test' }, async () => {})
  await assert.rejects(
    requestCode({ email: 'migration@example.test' }, async () => {}),
    /Wait one minute/,
  )
  assert.equal(await OTP.countDocuments({ email: 'migration@example.test' }), 1)
})
test('new bids freeze history bonuses while legacy bids preserve settlement-time history', async () => {
  const frozen = (await place()).bid
  const legacy = (await place()).bid
  await Bid.updateOne({ _id: legacy.id }, { $unset: { termsFrozen: '' } })
  const template = await Bid.findById(frozen.id).lean()
  const { _id, requestKey, requestHash, ...fields } = template
  assert.ok(_id && requestKey && requestHash)
  await Bid.insertMany(
    Array.from({ length: 10 }, () => ({ ...fields, status: 'SETTLED', outcome: 'WIN', pnl: 1 })),
  )
  await Bid.updateMany({ status: 'ACTIVE' }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
  const newResult = await finishPrediction(frozen.id, { quote: await quote() })
  const oldResult = await finishPrediction(legacy.id, { quote: await quote() })
  assert.equal(newResult.bid.userBonusApplied, 1)
  assert.equal(oldResult.bid.userBonusApplied, 1.15)
})
