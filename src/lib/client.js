export async function request(url, { method = 'GET', body, key, signal } = {}) {
  let response
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      signal,
      headers: {
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Connection lost. Check your internet and try again')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Could not complete the request. Please try again')
    error.status = response.status
    error.code = data.code
    error.retryAfter = Number(response.headers.get('Retry-After')) || 0
    if (response.status === 401 && typeof window !== 'undefined')
      window.dispatchEvent(new Event('vertex:session-expired'))
    throw error
  }
  return data
}
export function refreshResources() {
  window.dispatchEvent(new Event('vertex:refresh'))
}
export const money = (value, currency = 'INR') =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0)
export const dateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
export const walletName = (type) => (type === 'REAL' ? 'Demo cash' : 'Practice')
