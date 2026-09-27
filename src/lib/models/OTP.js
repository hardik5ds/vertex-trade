import mongoose from 'mongoose'
const schema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    digest: { type: String, required: true },
    challengeId: { type: String, required: true },
    purpose: { type: String, enum: ['SIGNUP', 'PASSWORD_RESET'], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
)
// Keep the legacy non-unique email_1 index; this adds the new uniqueness rule safely.
schema.index({ email: 1 }, { unique: true, name: 'otp_email_unique_v1' })
export default mongoose.models.OTP || mongoose.model('OTP', schema)
