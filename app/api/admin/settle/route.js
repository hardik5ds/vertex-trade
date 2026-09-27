import { api } from '@/lib/server/api'
import { settleExpiredBids } from '@/lib/services/bidSettlement'
import AdminAudit from '@/lib/models/AdminAudit'
export const maxDuration = 60
export const POST = api(
  async (_, { user }) => {
    await AdminAudit.create({ actorId: user._id, action: 'SETTLEMENT_REQUESTED' })
    const result = await settleExpiredBids(20)
    await AdminAudit.create({ actorId: user._id, action: 'SETTLEMENT_COMPLETED', after: result })
    return result
  },
  { admin: true, limit: 2 },
)
