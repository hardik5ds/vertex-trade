import { api, readBody } from '@/lib/server/api'
import { resetPassword } from '@/lib/server/authService'
export const POST = api(async (request) => resetPassword(await readBody(request)), {
  public: true,
  limit: 10,
  windowMs: 900000,
})
