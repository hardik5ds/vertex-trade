import { api } from '@/lib/server/api'
import Wallet from '@/lib/models/Wallet'
import { invariant } from '@/lib/server/errors'
export const GET = api(async (_, { user }) => {
  const wallets = await Wallet.find({ userId: user._id }).lean()
  invariant(
    wallets.length === 2 && wallets.every((w) => w.ledgerVersion === 1),
    'Wallet migration required',
    503,
  )
  return {
    wallets: wallets.map((w) => ({
      type: w.type,
      balance: w.balancePaise / 100,
      reserved: w.reservedPaise / 100,
      lastFaucetAt: w.lastFaucetAt,
    })),
    paymentMode: 'DEMO',
  }
})
