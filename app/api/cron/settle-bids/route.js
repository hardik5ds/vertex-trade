import { timingSafeEqual } from 'node:crypto'
import { api } from '@/lib/server/api'
import { invariant } from '@/lib/server/errors'
import { settleExpiredBids } from '@/lib/services/bidSettlement'
import { refreshMarket } from '@/lib/market'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const handler = async (request) => {
  const secret = process.env.CRON_SECRET,
    given = request.headers.get('authorization') || ''
  invariant(secret?.length >= 32, 'Scheduler is not configured', 503)
  const actual = Buffer.from(given),
    expected = Buffer.from(`Bearer ${secret}`)
  invariant(
    actual.length === expected.length && timingSafeEqual(actual, expected),
    'Unauthorized',
    401,
  )
  const result = await settleExpiredBids(20)
  if (new URL(request.url).searchParams.get('market') === '1') await refreshMarket()
  return result
}
export const GET = api(handler, { public: true, cron: true, limit: 5 })
export const POST = GET
