import { api } from '@/lib/server/api'
import { getFullStats } from '@/lib/services/portfolioService'
export const GET = api(async (request, { user }) =>
  getFullStats(user._id, new URL(request.url).searchParams.get('wallet') || 'VIRTUAL'),
)
