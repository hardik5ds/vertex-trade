import mongoose from 'mongoose'

const PriceHistorySchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

const StockSchema = new mongoose.Schema(
  {
    yahooSymbol: String,
    currency: String,
    fetchedAt: Date,
    quoteAsOf: Date,
    refreshLeaseUntil: Date,
    marketState: { type: String, default: 'UNAVAILABLE' },
    candles: [{ _id: false, time: Number, open: Number, high: Number, low: Number, close: Number }],

    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    displaySymbol: {
      type: String,
      default: '',
      // e.g. "RELIANCE" (without .NS suffix), used in UI
    },
    name: {
      type: String,
      required: true,
    },
    exchange: {
      type: String,
      enum: ['NSE', 'BSE', 'NASDAQ', 'NYSE', 'CRYPTO'],
      required: true,
    },
    sector: {
      type: String,
      enum: [
        'Technology',
        'Finance',
        'Energy',
        'Healthcare',
        'Consumer',
        'Industrial',
        'Materials',
        'Crypto',
        'Other',
      ],
      default: 'Other',
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    openPrice: {
      type: Number,
      required: true,
    },
    highPrice: {
      type: Number,
      required: true,
    },
    lowPrice: {
      type: Number,
      required: true,
    },
    prevClose: {
      type: Number,
      required: true,
    },
    volume: {
      type: Number,
      default: 0,
    },
    marketCap: {
      type: Number,
    },
    priceHistory: {
      type: [PriceHistorySchema],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
StockSchema.index({ fetchedAt: 1 })
StockSchema.index({ exchange: 1 })

// Virtual field for price change
StockSchema.virtual('priceChange').get(function () {
  return this.currentPrice - this.prevClose
})

// Virtual field for price change percentage
StockSchema.virtual('priceChangePercent').get(function () {
  if (this.prevClose === 0) return 0
  return ((this.currentPrice - this.prevClose) / this.prevClose) * 100
})

// Ensure virtuals are included
StockSchema.set('toJSON', { virtuals: true })
StockSchema.set('toObject', { virtuals: true })

export default mongoose.models.Stock || mongoose.model('Stock', StockSchema)
