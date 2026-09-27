import { api } from '@/lib/server/api'
import Transaction from '@/lib/models/Transaction'
import { pagination } from '@/lib/validation'
import { AppError, invariant } from '@/lib/server/errors'
export const GET = api(async (request, { user }) => {
  let paging
  try {
    paging = pagination(request.url)
  } catch (e) {
    throw new AppError(e.message)
  }
  const wallet = new URL(request.url).searchParams.get('wallet') || 'ALL'
  invariant(['ALL', 'REAL', 'VIRTUAL'].includes(wallet), 'Invalid wallet')
  const query = { userId: user._id, ...(wallet === 'ALL' ? {} : { walletType: wallet }) }
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ timestamp: -1, _id: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    Transaction.countDocuments(query),
  ])
  return { transactions, total, page: paging.page, limit: paging.limit }
})
