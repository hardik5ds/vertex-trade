import { api, json } from '@/lib/server/api'
import { readSessionToken, sessionCookie } from '@/lib/server/auth'
import Session from '@/lib/models/Session'
export const POST = api(
  async (request) => {
    const token = readSessionToken(request)
    if (token?.sid) await Session.deleteOne({ _id: token.sid })
    return json({ success: true }, 200, { 'Set-Cookie': sessionCookie('', true) })
  },
  { public: true },
)
