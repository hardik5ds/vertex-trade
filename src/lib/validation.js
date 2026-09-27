export function validEmail(value) {
  return (
    typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  )
}
export function validPassword(value) {
  return (
    typeof value === 'string' && value.length >= 10 && new TextEncoder().encode(value).length <= 72
  )
}
export function toPaise(value, min = 1, max = 1000000) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
  )
    throw new Error(`Enter an amount between ₹${min} and ₹${max}, with at most two decimal places`)
  return Math.round(value * 100)
}
export function validDuration(value) {
  return Number.isSafeInteger(value) && value >= 3600000 && value <= 10 * 365 * 86400000
}
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const validId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
export const validKey = (value) => typeof value === 'string' && /^[\w-]{16,100}$/.test(value)
export function pagination(url) {
  const params = new URL(url).searchParams
  const page = Number(params.get('page') || 1),
    limit = Number(params.get('limit') || 20)
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new Error('Invalid pagination')
  return { page, limit, skip: (page - 1) * limit }
}
