import { api, readBody } from '@/lib/server/api'
import { verifySignup } from '@/lib/server/authService'
export const POST = api(async (request) => verifySignup(await readBody(request)), {
  public: true,
  limit: 10,
  windowMs: 900000,
})
