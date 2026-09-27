import mongoose from 'mongoose'

/**
 * Transaction Model — Vertex Trade
 *
 * Records every wallet mutation for full audit trail.
 * All monetary values (amount, balanceAfter) are stored in RUPEES.
 * No paise conversion needed.
 *
 * amount is ALWAYS positive — the type field determines debit/credit:
 *   BID_PLACED       → debit  (wallet decreases by `amount`)
 *   BID_WON          → credit (wallet increases by `amount`)
 *   BID_LOST         → no wallet change (amount = 0, just a record)
 *   BID_PARTIAL_LOSS  → credit (partial return, wallet increases by `amount`)
 *   BID_CANCELLED    → credit (refund, wallet increases by `amount`)
 *   BID_REFUNDED     → credit (system refund, wallet increases by `amount`)
 *   DEPOSIT          → credit
 *   WITHDRAWAL       → debit
 */

const TransactionSchema = new mongoose.Schema({
  operationKey: String,
  requestHash: String,
  amountPaise: { type: Number, validate: Number.isSafeInteger },
  balanceAfterPaise: { type: Number, validate: Number.isSafeInteger },
  reservedAfterPaise: { type: Number, validate: Number.isSafeInteger },

  // ─── User Reference ──────────────────────────
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'userId is required'],
    index: true,
  },

  // ─── Transaction Type ────────────────────────
  type: {
    type: String,
    required: [true, 'type is required'],
    enum: {
      values: [
        'BID_PLACED', // User placed a bid (deduction)
        'BID_WON', // Settlement — user predicted correctly (credit)
        'BID_LOST', // Settlement — user predicted wrong (no credit, record only)
        'BID_PARTIAL_LOSS', // Settlement — partial return (credit, less than stake)
        'BID_CANCELLED', // User cancelled before expiry (full refund)
        'BID_REFUNDED', // System refund (e.g. stock data unavailable)
        'DEPOSIT', // Funds added to wallet
        'BID_BREAKEVEN',
        'WITHDRAWAL', // Funds withdrawn from wallet
      ],
      message: 'Invalid transaction type',
    },
  },

  // ─── Amount (ALWAYS positive, in RUPEES) ─────
  amount: {
    type: Number,
    required: [true, 'amount is required'],
    min: [0, 'amount must be non-negative'],
  },

  // ─── Wallet ──────────────────────────────────
  walletType: {
    type: String,
    required: [true, 'walletType is required'],
    enum: {
      values: ['REAL', 'VIRTUAL'],
      message: 'walletType must be REAL or VIRTUAL',
    },
    index: true,
  },

  // ─── Related Bid (optional) ──────────────────
  relatedBidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    default: null,
  },

  // ─── Timestamp ───────────────────────────────
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },

  // ─── Balance After (in RUPEES) ───────────────
  balanceAfter: {
    type: Number,
    required: [true, 'balanceAfter is required'],
  },

  // ─── Human-Readable Description ──────────────
  description: {
    type: String,
    default: '',
    // e.g. "Bid placed on RELIANCE", "Won ₹1,500 on TCS (94.7% accuracy)"
  },
})

// ─── Indexes ─────────────────────────────────────
TransactionSchema.index({ userId: 1, timestamp: -1 }) // User's transaction history (newest first)
TransactionSchema.index({ userId: 1, walletType: 1, timestamp: -1 }) // Filter by wallet type
TransactionSchema.index({ relatedBidId: 1 }) // Find transactions for a specific bid

TransactionSchema.index(
  { operationKey: 1 },
  { unique: true, partialFilterExpression: { operationKey: { $type: 'string' } } },
)

// Prevent model recompilation in Next.js hot reload
export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema)
