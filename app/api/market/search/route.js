import { api } from '@/lib/server/api'
import { getMarketSnapshot } from '@/lib/market'
export const GET = api(
  async (request) => {
    const result = await getMarketSnapshot({
      search: new URL(request.url).searchParams.get('q') || '',
      limit: 10,
      refresh: false,
    })
    return { results: result.stocks }
  },
  { public: true },
)
