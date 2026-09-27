import mongoose from 'mongoose'
const schema = new mongoose.Schema(
  {
    _id: { type: String, default: 'platform' },
    biddingPaused: { type: Boolean, default: false },
    revision: { type: Number, default: 0 },
    lastMarketRefresh: Date,
    lastSettlement: Date,
    marketLeaseUntil: Date,
    marketLeaseOwner: String,
    workerHeartbeat: Date,
  },
  { timestamps: true },
)
export default mongoose.models.System || mongoose.model('System', schema)
