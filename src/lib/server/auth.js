import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import Session from '../models/Session.js'
import User from '../models/User.js'
import { invariant } from './errors.js'

export const COOKIE = 'vertex_session'
export function signingSecret() {
  const secret = process.env.JWT_SECRET
  invariant(
    typeof secret === 'string' &&
      secret.length >= 32 &&
      !/fallback|change.me|super.secret/i.test(secret),
    'Session service is not configured',
    503,
  )
  return secret
}
export const isAdmin = (user) =>
  !!user.isVerified &&
  user.email === (process.env.ADMIN_EMAIL || 'singhalhardik044@gmail.com').toLowerCase()
export const publicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
  role: isAdmin(user) ? 'ADMIN' : 'USER',
})
export function getCookie(request) {
  return (request.headers.get('cookie') || '')
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
}
export function readSessionToken(request) {
  try {
    return jwt.verify(getCookie(request), signingSecret(), {
      algorithms: ['HS256'],
      issuer: 'vertex-trade',
      audience: 'session',
    })
  } catch {
    return null
  }
}
export async function authenticate(request) {
  const payload = readSessionToken(request)
  invariant(payload?.sid && payload?.sub, 'Please sign in to continue', 401)
  const session = await Session.findOne({
    _id: payload.sid,
    userId: payload.sub,
    expiresAt: { $gt: new Date() },
  }).lean()
  invariant(session, 'Your session has expired. Sign in again', 401)
  const user = await User.findById(payload.sub)
  invariant(
    user && user.isVerified && (user.authVersion || 0) === payload.version,
    'Please sign in again',
    401,
  )
  invariant(user.status !== 'SUSPENDED', 'This account is suspended', 403)
  return { user, sessionId: session._id }
}
export async function createSession(user, session) {
  const sid = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 86400000)
  await Session.create([{ _id: sid, userId: user._id, expiresAt }], { session })
  return jwt.sign({ sid, version: user.authVersion || 0 }, signingSecret(), {
    subject: String(user._id),
    expiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'vertex-trade',
    audience: 'session',
  })
}
export function sessionCookie(token, clear = false) {
  return `${COOKIE}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 7 * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}
export function signRegistration(email) {
  return jwt.sign({ email, purpose: 'REGISTRATION' }, signingSecret(), {
    expiresIn: '15m',
    issuer: 'vertex-trade',
    audience: 'registration',
    jwtid: randomUUID(),
    algorithm: 'HS256',
  })
}
export function verifyRegistration(token) {
  try {
    const data = jwt.verify(token, signingSecret(), {
      algorithms: ['HS256'],
      issuer: 'vertex-trade',
      audience: 'registration',
    })
    invariant(data.purpose === 'REGISTRATION', 'Invalid verification', 401)
    return data
  } catch {
    invariant(false, 'Email verification expired. Request a new code', 401)
  }
}
