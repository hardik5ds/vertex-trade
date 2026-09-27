import { api } from '@/lib/server/api'
import { refillPractice } from '@/lib/server/ledger'
export const POST = api(async (_, { user }) => refillPractice(user._id), { limit: 5 })
