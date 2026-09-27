import { api } from '@/lib/server/api'
import Bid from '@/lib/models/Bid'
import { pagination } from '@/lib/validation'
import { AppError } from '@/lib/server/errors'
import { serializeBid } from '@/lib/server/ledger'
export const GET = api(async (request, { user }) => {
  let paging
  try {
    paging = pagination(request.url)
  } catch (e) {
    throw new AppError(e.message)
  }
  const query = { userId: user._id, status: 'ACTIVE' }
  const [bids, total] = await Promise.all([
    Bid.find(query).sort({ placedAt: -1 }).skip(paging.skip).limit(paging.limit),
    Bid.countDocuments(query),
  ])
  return { bids: bids.map(serializeBid), total, page: paging.page, limit: paging.limit }
})
