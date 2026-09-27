import mongoose from 'mongoose'

const WalletSchema = new mongoose.Schema(
  {
    balancePaise: { type: Number, min: 0, validate: Number.isSafeInteger },
    reservedPaise: { type: Number, min: 0, validate: Number.isSafeInteger },
    ledgerVersion: Number,
    lastFaucetAt: Date,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['REAL', 'VIRTUAL'],
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    lockedBalance: {
      type: Number,
      default: 0,
      min: [0, 'Locked balance cannot be negative'],
    },
  },
  {
    timestamps: true,
  },
)

// Ensure each user has only one wallet per type
WalletSchema.index({ userId: 1, type: 1 }, { unique: true })

// Virtual field for available balance
WalletSchema.virtual('availableBalance').get(function () {
  return (this.balancePaise ?? 0) / 100
})

// Ensure virtuals are included when converting to JSON
WalletSchema.set('toJSON', { virtuals: true })
WalletSchema.set('toObject', { virtuals: true })

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema)
