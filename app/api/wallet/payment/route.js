import { api, readBody } from '@/lib/server/api'
import { demoPayment } from '@/lib/server/ledger'
export const POST = api(
  async (request, { user }) =>
    demoPayment(user._id, await readBody(request), request.headers.get('idempotency-key')),
  { limit: 20 },
)
