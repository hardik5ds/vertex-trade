import mongoose from 'mongoose'
const schema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: String,
    targetId: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
)
schema.index({ createdAt: -1 })
export default mongoose.models.AdminAudit || mongoose.model('AdminAudit', schema)
