import connectDB from '@/lib/db'
import { json } from '@/lib/server/api'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const db = await connectDB()
    await db.connection.db.admin().ping()
    return json({ status: 'ok', application: 'Vertex Trade' })
  } catch {
    return json({ status: 'unavailable' }, 503)
  }
}
