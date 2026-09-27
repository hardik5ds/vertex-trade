import { api, readBody } from '@/lib/server/api'
import User from '@/lib/models/User'
import Session from '@/lib/models/Session'
import AdminAudit from '@/lib/models/AdminAudit'
import { inTransaction } from '@/lib/db'
import { pagination, validId, escapeRegex } from '@/lib/validation'
import { AppError, invariant } from '@/lib/server/errors'
export const GET = api(
  async (request) => {
    let paging
    try {
      paging = pagination(request.url)
    } catch (e) {
      throw new AppError(e.message)
    }
    const q = new URL(request.url).searchParams.get('q') || ''
    invariant(q.length <= 80, 'Search is too long')
    const query = q
      ? {
          $or: [
            { email: { $regex: escapeRegex(q), $options: 'i' } },
            { name: { $regex: escapeRegex(q), $options: 'i' } },
          ],
        }
      : {}
    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email status isVerified createdAt')
        .sort({ createdAt: -1 })
        .skip(paging.skip)
        .limit(paging.limit)
        .lean(),
      User.countDocuments(query),
    ])
    return { users, total, page: paging.page, limit: paging.limit }
  },
  { admin: true },
)
export const POST = api(
  async (request, { user }) => {
    const body = await readBody(request)
    invariant(
      validId(body.userId) && ['ACTIVE', 'SUSPENDED'].includes(body.status),
      'Invalid user action',
    )
    invariant(body.userId !== String(user._id), 'You cannot change your own account status')
    await inTransaction(async (session) => {
      const before = await User.findById(body.userId).session(session)
      invariant(before, 'User not found', 404)
      await User.updateOne(
        { _id: before._id },
        { $set: { status: body.status }, $inc: { authVersion: 1 } },
      ).session(session)
      await Session.deleteMany({ userId: before._id }).session(session)
      await AdminAudit.create(
        [
          {
            actorId: user._id,
            action: 'USER_STATUS',
            targetId: body.userId,
            before: before.status || 'ACTIVE',
            after: body.status,
          },
        ],
        { session },
      )
    })
    return { message: 'User status updated' }
  },
  { admin: true, limit: 20 },
)
