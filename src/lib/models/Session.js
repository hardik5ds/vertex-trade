import mongoose from 'mongoose'
const schema = new mongoose.Schema(
  {
    _id: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
)
export default mongoose.models.Session || mongoose.model('Session', schema)
