import mongoose from 'mongoose'

/**
 * Bid Model — Vertex Trade
 *
 * Canonical stake/return values use integer paise. Legacy display fields
 * (bidAmount, returnAmount, netResult, pnl) remain in rupees.
 *
 * accuracyPercent is stored as a full floating-point number — NEVER rounded.
 */

const BidSchema = new mongoose.Schema({
  requestKey: String,
  requestHash: String,
  formulaVersion: { type: String, default: 'V2' },
  termsFrozen: { type: Boolean, default: false },
  userBonusApplied: Number,
  userWinRateAtPlacement: { type: Number, default: 0 },
  settledCountAtPlacement: { type: Number, default: 0 },
  stakePaise: { type: Number, validate: Number.isSafeInteger },
  returnPaise: { type: Number, validate: Number.isSafeInteger },
  quoteAsOf: Date,
  settlementQuoteAsOf: Date,
  refundReason: String,

  // ─── User Reference ──────────────────────────
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'userId is required'],
    index: true,
  },

  // ─── Stock Snapshot (at time of bid) ─────────
  stockSymbol: {
    type: String,
    required: [true, 'stockSymbol is required'],
    uppercase: true,
    trim: true,
  },
  stockName: {
    type: String,
    required: [true, 'stockName is required'],
    trim: true,
  },
  exchange: {
    type: String,
    required: [true, 'exchange is required'],
    enum: {
      values: ['NSE', 'NASDAQ', 'NYSE', 'CRYPTO'],
      message: 'exchange must be NSE, NASDAQ, NYSE, or CRYPTO',
    },
    trim: true,
  },
  currency: {
    type: String,
    required: [true, 'currency is required'],
    enum: {
      values: ['INR', 'USD'],
      message: 'currency must be INR or USD',
    },
    default: 'INR',
  },

  // ─── Price Data ──────────────────────────────
  priceAtBid: {
    type: Number,
    required: [true, 'priceAtBid is required'],
  },
  predictedPrice: {
    type: Number,
    required: [true, 'predictedPrice is required'],
    validate: {
      validator: function (v) {
        return v > 0
      },
      message: 'predictedPrice must be a positive number',
    },
  },
  actualSettlementPrice: {
    type: Number,
    default: null,
  },

  // ─── Legacy financial display fields (RUPEES) ─────────────
  // ₹200 = 200,  ₹1,500 = 1500
  bidAmount: {
    type: Number,
    required: [true, 'bidAmount is required'],
    validate: {
      validator: function (v) {
        return v >= 100 // Minimum ₹100
      },
      message: 'bidAmount must be at least ₹100',
    },
  },
  returnAmount: {
    type: Number,
    default: null,
  },
  netResult: {
    type: Number,
    default: null,
  },
  pnl: {
    type: Number,
    default: null,
    // Profit or loss amount in RUPEES (returnAmount - bidAmount)
  },

  // ─── Settlement Audit ────────────────────────
  accuracyPercent: {
    type: Number,
    default: null,
    // Stored as full float, e.g. 94.7312 — NEVER rounded before storage
  },
  multiplierApplied: {
    type: Number,
    default: null,
    // e.g. 8.91 — stored for audit trail
  },
  profitMultiplier: {
    type: Number,
    default: null,
    // Same as multiplierApplied — new canonical name
  },
  outcome: {
    type: String,
    enum: {
      values: ['WIN', 'LOSS', 'BREAKEVEN', 'PARTIAL_LOSS', 'REFUNDED'],
      message: 'outcome must be WIN, LOSS, BREAKEVEN, PARTIAL_LOSS, or REFUNDED',
    },
    default: null,
  },
  accuracyZone: {
    type: String,
    enum: {
      values: ['EXCELLENT', 'GOOD', 'POOR', 'MISS'],
      message: 'accuracyZone must be EXCELLENT, GOOD, POOR, or MISS',
    },
    default: null,
  },

  // ─── Wallet ──────────────────────────────────
  walletType: {
    type: String,
    required: [true, 'walletType is required'],
    enum: {
      values: ['REAL', 'VIRTUAL'],
      message: 'walletType must be REAL or VIRTUAL',
    },
  },

  // ─── Timestamps ──────────────────────────────
  placedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: [true, 'expiresAt is required'],
    index: true,
  },
  settledAt: {
    type: Date,
    default: null,
  },

  // ─── Status ──────────────────────────────────
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'SETTLED', 'CANCELLED', 'REFUNDED'],
      message: 'status must be ACTIVE, SETTLED, CANCELLED, or REFUNDED',
    },
    default: 'ACTIVE',
    index: true,
  },

  // ─── Timespan ────────────────────────────────
  timespan: {
    label: {
      type: String,
      required: [true, 'timespan.label is required'],
      // e.g. "1 Day", "3 Months", "1 Hour"
    },
    durationMs: {
      type: Number,
      required: [true, 'timespan.durationMs is required'],
      validate: {
        validator: function (v) {
          return v >= 3600000 // Minimum 1 hour
        },
        message: 'durationMs must be at least 3600000 (1 hour)',
      },
    },
  },
})

// ─── Compound Indexes (fast cron settlement queries) ─────
BidSchema.index({ status: 1, expiresAt: 1 }) // settleExpiredBids: { status: 'ACTIVE', expiresAt: { $lte: now } }
BidSchema.index({ userId: 1, status: 1 }) // fetchActiveBids / fetchHistory per user
BidSchema.index({ userId: 1, placedAt: -1 }) // user bid listing sorted by date

BidSchema.index(
  { userId: 1, requestKey: 1 },
  { unique: true, partialFilterExpression: { requestKey: { $type: 'string' } } },
)

// Prevent model recompilation in Next.js hot reload
export default mongoose.models.Bid || mongoose.model('Bid', BidSchema)
