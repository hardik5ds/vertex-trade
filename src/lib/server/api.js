import { createHash } from 'node:crypto'
import connectDB from '../db.js'
import RateLimit from '../models/RateLimit.js'
import { authenticate, isAdmin } from './auth.js'
import { AppError, invariant } from './errors.js'

export const json = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
export async function readBody(request) {
  invariant(
    request.headers.get('content-type')?.includes('application/json'),
    'Content-Type must be application/json',
    415,
  )
  invariant(
    Number(request.headers.get('content-length') || 0) <= 16384,
    'Request is too large',
    413,
  )
  const reader = request.body?.getReader()
  invariant(reader, 'Request body is required')
  let bytes = 0,
    text = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.length
      if (bytes > 16384) {
        await reader.cancel()
        throw new AppError('Request is too large', 413)
      }
      text += decoder.decode(value, { stream: true })
    }
    const body = JSON.parse(text + decoder.decode())
    invariant(body && typeof body === 'object' && !Array.isArray(body), 'Invalid JSON object')
    return body
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Invalid JSON body')
  } finally {
    reader.releaseLock()
  }
}
export function assertOrigin(request) {
  const origin = request.headers.get('origin')
  const expected = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : new URL(request.url).origin
  invariant(origin === expected, 'Request origin is not allowed', 403)
}
export async function rateLimit(key, limit = 60, windowMs = 60000) {
  const now = Date.now(),
    bucket = Math.floor(now / windowMs)
  const id = createHash('sha256').update(`${key}:${bucket}`).digest('hex')
  let doc
  try {
    doc = await RateLimit.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * windowMs) } },
      { upsert: true, new: true },
    )
  } catch (error) {
    if (error.code !== 11000) throw error
    doc = await RateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true })
  }
  invariant(doc.count <= limit, 'Too many requests. Please try again shortly', 429)
}
export function api(handler, options = {}) {
  return async (request, context = {}) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method) && !options.cron) assertOrigin(request)
      await connectDB()
      const identity = options.public ? {} : await authenticate(request)
      if (options.admin) invariant(isAdmin(identity.user), 'Administrator access required', 403)
      const ip =
        request.headers.get('x-vercel-forwarded-for') ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'local'
      await rateLimit(
        `${new URL(request.url).pathname}:${identity.user?._id || ip}`,
        options.limit || 120,
        options.windowMs || 60000,
      )
      const result = await handler(request, { ...context, ...identity })
      return result instanceof Response ? result : json({ success: true, ...result })
    } catch (error) {
      const status =
        error instanceof AppError
          ? error.status
          : error.code === 11000
            ? 409
            : error.name === 'ValidationError' || error.name === 'CastError'
              ? 400
              : 503
      if (status >= 500)
        console.error(
          '[api]',
          error.name,
          error.code || '',
          error instanceof AppError ? error.message : 'Service request failed',
        )
      return json(
        {
          success: false,
          message:
            error instanceof AppError
              ? error.message
              : status === 409
                ? 'This request was already processed. Refresh and try again'
                : status === 400
                  ? 'Invalid input'
                  : 'Service temporarily unavailable. Please try again',
        },
        status,
        status === 429 ? { 'Retry-After': '60' } : {},
      )
    }
  }
}
