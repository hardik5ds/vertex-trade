import mongoose from 'mongoose'
const schema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    digest: { type: String, required: true },
    challengeId: { type: String, required: true },
    purpose: { type: String, enum: ['SIGNUP', 'PASSWORD_RESET'], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
)
export default mongoose.models.OTP || mongoose.model('OTP', schema)
