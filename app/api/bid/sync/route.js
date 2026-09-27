import { api } from '@/lib/server/api'
import { settleExpiredBids } from '@/lib/services/bidSettlement'
export const maxDuration = 60
export const POST = api(async (_, { user }) => settleExpiredBids(20, user._id), { limit: 4 })
