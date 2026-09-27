import { randomInt, randomUUID, createHmac, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { inTransaction } from '../db.js'
import OTP from '../models/OTP.js'
import User from '../models/User.js'
import Wallet from '../models/Wallet.js'
import Session from '../models/Session.js'
import Transaction from '../models/Transaction.js'
import { validEmail, validPassword } from '../validation.js'
import { invariant, AppError } from './errors.js'
import {
  signingSecret,
  createSession,
  signRegistration,
  verifyRegistration,
  publicUser,
} from './auth.js'
import { rateLimit } from './api.js'
import { sendCode } from '../emailService.js'

const digest = (email, purpose, challenge, code) =>
  createHmac('sha256', signingSecret())
    .update(`${email}:${purpose}:${challenge}:${code}`)
    .digest('hex')
export function emailInput(value) {
  invariant(validEmail(value), 'Enter a valid email address')
  return value.trim().toLowerCase()
}
export function passwordInput(value) {
  invariant(
    validPassword(value),
    'Use at least 10 characters and at most 72 bytes for your password',
  )
  return value
}
export async function requestCode(body, deliver = sendCode) {
  const email = emailInput(body.email),
    purpose = body.purpose || 'SIGNUP'
  invariant(['SIGNUP', 'PASSWORD_RESET'].includes(purpose), 'Invalid verification purpose')
  await rateLimit(`otp-email:${email}`, 5, 3600000)
  const user = await User.findOne({ email }).lean()
  if ((purpose === 'SIGNUP' && user) || (purpose === 'PASSWORD_RESET' && !user))
    return { message: 'If this address is eligible, a verification code has been sent' }
  const code = String(randomInt(100000, 1000000)),
    challengeId = randomUUID(),
    now = new Date()
  try {
    await OTP.findOneAndUpdate(
      { email, updatedAt: { $lte: new Date(Date.now() - 60000) } },
      {
        $set: {
          email,
          purpose,
          challengeId,
          digest: digest(email, purpose, challengeId, code),
          attempts: 0,
          expiresAt: new Date(Date.now() + 600000),
          updatedAt: now,
        },
      },
      { upsert: true, new: true },
    )
  } catch (error) {
    if (error.code === 11000)
      throw new AppError('Wait one minute before requesting another code', 429)
    throw error
  }
  try {
    await deliver(email, code, purpose)
  } catch {
    await OTP.deleteOne({ email, challengeId })
    throw new AppError('Email could not be delivered. Please try again shortly', 503)
  }
  return {
    message: 'If this address is eligible, a verification code has been sent',
    expiresIn: 600,
  }
}
export async function consumeCode(email, code, purpose) {
  invariant(typeof code === 'string' && /^\d{6}$/.test(code), 'Enter the six-digit code')
  // Increment before comparing: concurrent incorrect attempts cannot exceed the limit.
  const otp = await OTP.findOneAndUpdate(
    { email, purpose, attempts: { $lt: 3 }, expiresAt: { $gt: new Date() } },
    { $inc: { attempts: 1 } },
    { new: true },
  )
  invariant(otp, 'Code expired or attempts exhausted. Request a new code')
  const actual = Buffer.from(otp.digest, 'hex'),
    expected = Buffer.from(digest(email, purpose, otp.challengeId, code), 'hex')
  invariant(
    actual.length === expected.length && timingSafeEqual(actual, expected),
    'Incorrect verification code',
  )
  const deleted = await OTP.deleteOne({ _id: otp._id, challengeId: otp.challengeId, purpose })
  invariant(deleted.deletedCount === 1, 'This code has already been used')
}
export async function verifySignup(body) {
  const email = emailInput(body.email)
  await consumeCode(email, body.otp, 'SIGNUP')
  return { registrationToken: signRegistration(email), message: 'Email verified' }
}
export async function register(body) {
  invariant(typeof body.registrationToken === 'string', 'Verify your email first')
  const { email } = verifyRegistration(body.registrationToken)
  invariant(
    typeof body.name === 'string' && body.name.trim().length >= 2 && body.name.trim().length <= 80,
    'Name must be between 2 and 80 characters',
  )
  const password = await bcrypt.hash(passwordInput(body.password), 12)
  return inTransaction(async (session) => {
    const [user] = await User.create(
      [{ name: body.name.trim(), email, password, isVerified: true, verifiedAt: new Date() }],
      { session },
    )
    await Wallet.create(
      ['VIRTUAL', 'REAL'].map((type) => ({
        userId: user._id,
        type,
        balancePaise: type === 'VIRTUAL' ? 10000000 : 0,
        reservedPaise: 0,
        ledgerVersion: 1,
      })),
      { session, ordered: true },
    )
    await Transaction.create(
      [
        {
          userId: user._id,
          type: 'DEPOSIT',
          walletType: 'VIRTUAL',
          amount: 100000,
          amountPaise: 10000000,
          balanceAfter: 100000,
          balanceAfterPaise: 10000000,
          reservedAfterPaise: 0,
          operationKey: `opening:${user._id}`,
          description: 'Opening practice credits — no monetary value',
        },
      ],
      { session },
    )
    const token = await createSession(user, session)
    return { user: publicUser(user), token }
  })
}
export async function login(body) {
  const email = emailInput(body.email)
  invariant(
    typeof body.password === 'string' && Buffer.byteLength(body.password) <= 72,
    'Invalid email or password',
    401,
  )
  await rateLimit(`login-email:${email}`, 10, 900000)
  const user = await User.findOne({ email })
  // A dummy hash keeps the expensive comparison on both account-existence paths.
  const correct = await bcrypt.compare(
    body.password,
    user?.password || '$2a$12$C6UzMDM.H6dfI/f/IKcEe.6UD7lPp7dUcYG6TnmQKNlVZzZHJhwG6',
  )
  invariant(user && correct, 'Invalid email or password', 401)
  invariant(user.isVerified, 'Verify your email before signing in', 403)
  invariant(user.status !== 'SUSPENDED', 'This account is suspended', 403)
  return inTransaction(async (session) => {
    const current = await User.findOneAndUpdate(
      { _id: user._id, password: user.password, status: { $ne: 'SUSPENDED' } },
      { $inc: { sessionRevision: 1 } },
      { new: true, session },
    )
    invariant(current, 'Account changed. Please sign in again', 401)
    return { user: publicUser(current), token: await createSession(current, session) }
  })
}
export async function resetPassword(body) {
  const email = emailInput(body.email),
    password = await bcrypt.hash(passwordInput(body.newPassword), 12)
  await consumeCode(email, body.otp, 'PASSWORD_RESET')
  await inTransaction(async (session) => {
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: { password, isVerified: true, verifiedAt: new Date() },
        $inc: { authVersion: 1, sessionRevision: 1 },
      },
      { new: true, session },
    )
    invariant(user, 'Unable to reset password')
    await Session.deleteMany({ userId: user._id }).session(session)
  })
  return { message: 'Password updated. Sign in with your new password' }
}
