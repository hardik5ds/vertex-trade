import { api } from '@/lib/server/api'
import Bid from '@/lib/models/Bid'
export const GET = api(async (_, { user }) => {
  const [stats] = await Bid.aggregate([
    { $match: { userId: user._id, status: 'SETTLED' } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        wins: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
      },
    },
  ])
  return {
    formulaVersion: 'V2',
    totalSettled: stats?.count || 0,
    winRate: stats?.count ? stats.wins / stats.count : 0,
  }
})
