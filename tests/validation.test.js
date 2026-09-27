import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validEmail,
  validPassword,
  toPaise,
  validDuration,
  escapeRegex,
  pagination,
} from '../src/lib/validation.js'
test('money rejects coercion, invalid precision, nonfinite and out-of-bounds amounts', () => {
  for (const n of [NaN, Infinity, -1, 0, '100', {}, 1.001, 1000001]) assert.throws(() => toPaise(n))
  assert.equal(toPaise(100.01), 10001)
  assert.equal(toPaise(0.29, 0.01), 29)
})
test('structured input cannot become a database operator', () => {
  assert.equal(validEmail({ $ne: null }), false)
  assert.equal(validPassword({ $gt: '' }), false)
  assert.equal(validEmail('person@example.com'), true)
  assert.equal(validPassword('long-password-123'), true)
  assert.equal(validPassword('😀'.repeat(20)), false)
  assert.equal(new RegExp(escapeRegex('a.*[b]')).test('a.*[b]'), true)
  assert.equal(new RegExp(escapeRegex('a.*[b]')).test('axb'), false)
})
test('duration and pagination are bounded', () => {
  assert.equal(validDuration(3600000), true)
  assert.equal(validDuration(3599999), false)
  assert.equal(validDuration(Infinity), false)
  for (const query of ['page=-1', 'limit=101', 'page=NaN', 'page=1.5'])
    assert.throws(() => pagination(`https://example.test?${query}`))
})
