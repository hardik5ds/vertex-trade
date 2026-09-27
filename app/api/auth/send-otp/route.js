import { api, readBody } from '@/lib/server/api'
import { requestCode } from '@/lib/server/authService'
export const POST = api(async (request) => requestCode(await readBody(request)), {
  public: true,
  limit: 10,
  windowMs: 900000,
})
