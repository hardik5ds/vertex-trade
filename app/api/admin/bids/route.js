import { api } from '@/lib/server/api'
import Bid from '@/lib/models/Bid'
import { pagination } from '@/lib/validation'
import { AppError } from '@/lib/server/errors'
export const GET = api(
  async (request) => {
    let p
    try {
      p = pagination(request.url)
    } catch (e) {
      throw new AppError(e.message)
    }
    return {
      bids: await Bid.find().sort({ placedAt: -1 }).skip(p.skip).limit(p.limit).lean(),
      total: await Bid.countDocuments(),
      page: p.page,
      limit: p.limit,
    }
  },
  { admin: true },
)
