import { api } from '@/lib/server/api'
import Transaction from '@/lib/models/Transaction'
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
      transactions: await Transaction.find()
        .sort({ timestamp: -1 })
        .skip(p.skip)
        .limit(p.limit)
        .lean(),
      total: await Transaction.countDocuments(),
      page: p.page,
      limit: p.limit,
    }
  },
  { admin: true },
)
