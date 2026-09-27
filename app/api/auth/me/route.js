import { api } from '@/lib/server/api'
import { publicUser } from '@/lib/server/auth'
export const GET = api(async (_, { user }) => ({ user: publicUser(user) }))
