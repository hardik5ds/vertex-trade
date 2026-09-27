import { api, readBody, json } from '@/lib/server/api'
import { register } from '@/lib/server/authService'
import { sessionCookie } from '@/lib/server/auth'
export const POST = api(
  async (request) => {
    const { user, token } = await register(await readBody(request))
    return json({ success: true, user }, 201, { 'Set-Cookie': sessionCookie(token) })
  },
  { public: true, limit: 10, windowMs: 900000 },
)
