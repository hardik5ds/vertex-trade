import { api } from '@/lib/server/api'
import { getStockDetails } from '@/lib/market'
export const GET = api(
  async (_, { params }) => ({ stock: await getStockDetails((await params).symbol.toUpperCase()) }),
  { public: true },
)
