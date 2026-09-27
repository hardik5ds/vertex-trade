export class AppError extends Error {
  constructor(message, status = 400, { code, retryAfter } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}
export function invariant(condition, message, status = 400) {
  if (!condition) throw new AppError(message, status)
}
