/** Vertex Trade V2. Existing exponential rules, preserved and centralized.
 * Accuracy is never rounded; only monetary returns round to integer paise.
 */
export function calculateAccuracy(predictedPrice, actualPrice) {
  if (
    !Number.isFinite(actualPrice) ||
    actualPrice <= 0 ||
    !Number.isFinite(predictedPrice) ||
    predictedPrice <= 0
  )
    return 0
  return Math.min(
    100,
    Math.max(
      0,
      100 * Math.exp(((-0.09 * Math.abs(predictedPrice - actualPrice)) / actualPrice) * 100),
    ),
  )
}
const TIME_FACTORS = [
  [1, 0.02],
  [6, 0.08],
  [24, 0.25],
  [72, 0.6],
  [168, 1.1],
  [720, 2.5],
  [2160, 5],
  [4380, 8],
  [8760, 14],
  [17520, 20],
  [26280, 25],
  [43800, 28],
]
export function calculateTimeFactor(durationMs) {
  return TIME_FACTORS.find(([hours]) => durationMs / 3600000 <= hours)?.[1] ?? 30
}
export function calculateUserAccuracyBonus(winRate = 0, total = 0) {
  if (total < 10) return 1
  return winRate >= 0.9 ? 1.15 : winRate >= 0.8 ? 1.1 : winRate >= 0.7 ? 1.05 : 1
}
export function getProfitMultiplier(
  accuracy,
  durationMs,
  { userWinRate = 0, totalSettledBids = 0 } = {},
) {
  const time = calculateTimeFactor(durationMs),
    bonus = calculateUserAccuracyBonus(userWinRate, totalSettledBids)
  if (accuracy < 50) return 0
  if (accuracy < 75)
    return Math.min(1, (0.05 + 0.95 * ((accuracy - 50) / 25) ** 2) * (1 + time * 0.03))
  if (accuracy < 90) return (1 + ((accuracy - 75) / 15) ** 1.5 * 0.3 * time) * bonus
  return Math.min(30, (1 + (0.3 + ((accuracy - 90) / 10) ** 0.4) * time) * bonus)
}
export function calculateSettlement({
  bidAmount,
  predictedPrice,
  actualPrice,
  durationMs,
  userWinRate = 0,
  totalSettledBids = 0,
}) {
  if (
    !Number.isFinite(bidAmount) ||
    bidAmount < 0 ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  )
    throw new Error('Invalid settlement input')
  const accuracy = calculateAccuracy(predictedPrice, actualPrice)
  const profitMultiplier = getProfitMultiplier(accuracy, durationMs, {
    userWinRate,
    totalSettledBids,
  })
  const returned = Math.round(bidAmount * profitMultiplier * 100),
    stake = Math.round(bidAmount * 100)
  const pnl = (returned - stake) / 100
  return {
    accuracy,
    profitMultiplier,
    returnAmount: returned / 100,
    pnl,
    outcome: returned === 0 ? 'LOSS' : pnl > 0 ? 'WIN' : pnl === 0 ? 'BREAKEVEN' : 'LOSS',
    accuracyZone:
      accuracy >= 90 ? 'EXCELLENT' : accuracy >= 75 ? 'GOOD' : accuracy >= 50 ? 'POOR' : 'MISS',
    timeFactor: calculateTimeFactor(durationMs),
    userBonus: calculateUserAccuracyBonus(userWinRate, totalSettledBids),
  }
}
export function generatePreviewTable(bidAmount, durationMs, terms = {}) {
  return [99, 95, 90, 75, 65, 45].map((accuracy) => {
    const multiplier = getProfitMultiplier(accuracy, durationMs, terms),
      returnAmount = Math.round(bidAmount * multiplier * 100) / 100
    return {
      accuracy,
      multiplier,
      returnAmount,
      pnl: Math.round((returnAmount - bidAmount) * 100) / 100,
    }
  })
}
