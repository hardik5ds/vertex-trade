import { api } from '@/lib/server/api'
import User from '@/lib/models/User'
import Bid from '@/lib/models/Bid'
import Transaction from '@/lib/models/Transaction'
import System from '@/lib/models/System'
import AdminAudit from '@/lib/models/AdminAudit'
export const GET = api(
  async () => {
    const [users, activeBids, overdueBids, transactions, system, audit] = await Promise.all([
      User.countDocuments(),
      Bid.countDocuments({ status: 'ACTIVE' }),
      Bid.countDocuments({ status: 'ACTIVE', expiresAt: { $lt: new Date() } }),
      Transaction.countDocuments(),
      System.findById('platform').lean(),
      AdminAudit.find().sort({ createdAt: -1 }).limit(20).lean(),
    ])
    return { stats: { users, activeBids, overdueBids, transactions }, system, audit }
  },
  { admin: true },
)
