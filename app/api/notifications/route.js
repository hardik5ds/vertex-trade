import { api } from '@/lib/server/api'
import Notification from '@/lib/models/Notification'
export const GET = api(async (_, { user }) => ({
  notifications: await Notification.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean(),
  unread: await Notification.countDocuments({ userId: user._id, readAt: null }),
}))
export const POST = api(async (_, { user }) => {
  await Notification.updateMany(
    { userId: user._id, readAt: null },
    { $set: { readAt: new Date() } },
  )
  return { message: 'Notifications marked as read' }
})
