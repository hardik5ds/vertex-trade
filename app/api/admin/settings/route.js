import { api, readBody } from '@/lib/server/api'
import { inTransaction } from '@/lib/db'
import System from '@/lib/models/System'
import AdminAudit from '@/lib/models/AdminAudit'
import { invariant } from '@/lib/server/errors'
export const POST = api(
  async (request, { user }) => {
    const { biddingPaused } = await readBody(request)
    invariant(typeof biddingPaused === 'boolean', 'Invalid setting')
    await inTransaction(async (session) => {
      const before = await System.findById('platform').session(session)
      await System.updateOne(
        { _id: 'platform' },
        { $set: { biddingPaused }, $inc: { revision: 1 } },
        { upsert: true, session },
      )
      await AdminAudit.create(
        [
          {
            actorId: user._id,
            action: 'BIDDING_PAUSE',
            before: before?.biddingPaused || false,
            after: biddingPaused,
          },
        ],
        { session },
      )
    })
    return { message: biddingPaused ? 'New predictions paused' : 'New predictions resumed' }
  },
  { admin: true },
)
