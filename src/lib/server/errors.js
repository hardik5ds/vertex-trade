export class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}
export function invariant(condition, message, status = 400) {
  if (!condition) throw new AppError(message, status)
}
