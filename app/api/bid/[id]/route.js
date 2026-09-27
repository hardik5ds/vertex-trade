import { api } from '@/lib/server/api'
import Bid from '@/lib/models/Bid'
import { validId } from '@/lib/validation'
import { invariant } from '@/lib/server/errors'
import { serializeBid } from '@/lib/server/ledger'
export const GET = api(async (_, { user, params }) => {
  const { id } = await params
  invariant(validId(id), 'Invalid prediction ID')
  const bid = await Bid.findOne({ _id: id, userId: user._id })
  invariant(bid, 'Prediction not found', 404)
  return { bid: serializeBid(bid) }
})
