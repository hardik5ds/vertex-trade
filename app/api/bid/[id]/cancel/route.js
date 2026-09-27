import { api } from '@/lib/server/api'
import { finishPrediction } from '@/lib/server/ledger'
export const POST = api(
  async (_, { user, params }) =>
    finishPrediction((await params).id, { userId: user._id, cancel: true }),
  { limit: 20 },
)
