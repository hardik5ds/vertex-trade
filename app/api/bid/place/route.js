import { api, readBody } from '@/lib/server/api'
import { placePrediction } from '@/lib/server/ledger'
export const POST = api(
  async (request, { user }) =>
    placePrediction(user._id, await readBody(request), request.headers.get('idempotency-key')),
  { limit: 20 },
)
