import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateAccuracy,
  calculateSettlement,
  getProfitMultiplier,
} from '../src/lib/services/settlementFormula.js'
const priceAtAccuracy = (a) => 100 - Math.log(a / 100) / 0.09
const settle = (accuracy, hours = 24, extra = {}) =>
  calculateSettlement({
    bidAmount: 500,
    predictedPrice: priceAtAccuracy(accuracy),
    actualPrice: 100,
    durationMs: hours * 3600000,
    ...extra,
  })
test('v2 exponential accuracy is preserved without percentage rounding', () => {
  assert.equal(calculateAccuracy(100, 100), 100)
  assert.ok(Math.abs(calculateAccuracy(101, 100) - 91.39311852712282) < 1e-10)
  assert.equal(calculateAccuracy(1, 0), 0)
})
test('wipeout, partial return and base break-even boundaries', () => {
  assert.equal(settle(49).returnAmount, 0)
  assert.ok(settle(65).returnAmount > 0 && settle(65).returnAmount < 500)
  assert.ok(Math.abs(settle(75).returnAmount - 500) < 0.01)
  assert.ok(settle(90).returnAmount > 500)
})
test('all times and accuracy levels return bounded integer-paise amounts', () => {
  for (const hours of [1, 6, 24, 72, 168, 720, 2160, 4380, 8760, 43800, 87600])
    for (let a = 1; a <= 100; a++) {
      const result = settle(a, hours, { userWinRate: 0.95, totalSettledBids: 20 })
      assert.ok(result.returnAmount >= 0 && result.returnAmount <= 15000)
      assert.ok(Math.abs(result.returnAmount * 100 - Math.round(result.returnAmount * 100)) < 1e-6)
    }
})
test('base preview multiplier matches settlement for unbonused users', () => {
  for (const a of [49, 50, 65, 75, 80, 90, 95, 99, 100])
    for (const h of [1, 24, 168, 8760]) {
      assert.ok(
        Math.abs(
          settle(a, h).profitMultiplier - getProfitMultiplier(settle(a, h).accuracy, h * 3600000),
        ) < 1e-7,
      )
    }
})

test('exact 50% and sub-threshold accuracy remain distinct', () => {
  assert.equal(getProfitMultiplier(49.99999999999997, 3600000), 0)
  assert.ok(getProfitMultiplier(50, 3600000) > 0)
})
