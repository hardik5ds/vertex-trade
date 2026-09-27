import { api } from '@/lib/server/api'
import { getMarketSnapshot } from '@/lib/market'
import { pagination } from '@/lib/validation'
import { AppError } from '@/lib/server/errors'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const GET = api(
  async (request) => {
    const params = new URL(request.url).searchParams
    let paging
    try {
      paging = pagination(request.url)
    } catch (e) {
      throw new AppError(e.message)
    }
    return getMarketSnapshot({
      ...paging,
      limit: Math.min(paging.limit, 24),
      search: params.get('q') || '',
      exchange: params.get('exchange') || 'ALL',
      refresh: params.get('cached') !== '1',
    })
  },
  { public: true, limit: 60 },
)
