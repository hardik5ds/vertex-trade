import { api, readBody, json } from '@/lib/server/api'
import { login } from '@/lib/server/authService'
import { sessionCookie } from '@/lib/server/auth'
export const POST = api(
  async (request) => {
    const { user, token } = await login(await readBody(request))
    return json({ success: true, user }, 200, { 'Set-Cookie': sessionCookie(token) })
  },
  { public: true, limit: 10, windowMs: 900000 },
)
