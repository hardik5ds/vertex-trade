import mongoose from 'mongoose'
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: String,
    href: { type: String, default: '/dashboard/bidding' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
)
schema.index({ userId: 1, createdAt: -1 })
export default mongoose.models.Notification || mongoose.model('Notification', schema)
