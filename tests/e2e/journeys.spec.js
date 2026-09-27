import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
async function signup(page, request) {
  const email = `trader-${Date.now()}@example.test`
  await page.goto('/signup')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send verification code' }).click()
  await expect(page.getByLabel('Verification code')).toBeVisible()
  await expect(page.getByRole('button', { name: /Resend in \d+s/ })).toBeDisabled()
  const { code } = await (
    await request.get(`http://127.0.0.1:3101/inbox?email=${encodeURIComponent(email)}`)
  ).json()
  expect(code).toMatch(/^\d{6}$/)
  await page.getByLabel('Verification code').fill(code)
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await page.getByLabel('Full name').fill('Jordan Lee')
  await page.getByLabel('Password', { exact: true }).fill('strong-test-password')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
  return email
}
async function makePrediction(page) {
  await page.getByRole('textbox', { name: 'Search markets' }).fill('AAPL')
  await page.getByRole('button', { name: 'View AAPL and make a prediction' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Place prediction' })).toBeEnabled()
  await dialog.getByLabel('Predicted price (USD)').fill('100')
  await dialog.getByLabel('Stake (virtual ₹)').fill('500')
  await dialog.getByRole('button', { name: 'Place prediction' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Prediction placed. Track it in Predictions.')).toBeVisible()
}
test('landing, responsive navigation, and anonymous protection', async ({
  page,
  request,
}, info) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your perspective.')
  await fs.mkdir('docs/screenshots', { recursive: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `docs/screenshots/landing-${info.project.name}.png`,
    fullPage: true,
  })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  const leaked = await request.get('/api/wallet/balance?userId=507f1f77bcf86cd799439011')
  expect(leaked.status()).toBe(401)
  const bypass = await request.post('/api/auth/signup', {
    headers: { Origin: 'http://localhost:3100' },
    data: { name: 'Bypass', email: 'bypass@example.test', password: 'valid-password' },
  })
  expect((await bypass.json()).token).toBeUndefined()
  await page.goto('/dashboard/admin')
  await expect(page).toHaveURL('/login')
})
test('signup, prediction, settlement notifications, demo payments, history and logout', async ({
  page,
  request,
}, info) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await signup(page, request)
  await makePrediction(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `docs/screenshots/dashboard-${info.project.name}.png`,
    fullPage: true,
  })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.goto('/dashboard/bidding')
  await expect(page.getByRole('heading', { name: 'AAPL', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm cancellation' }).click()
  await expect(page.getByText('Prediction cancelled. Your stake has been returned.')).toBeVisible()
  await page.goto('/dashboard')
  await makePrediction(page)
  await request.post('http://127.0.0.1:3101/settle')
  await page.goto('/dashboard/bidding')
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'WIN', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Notifications/ }).click()
  await expect(page.getByRole('heading', { name: 'AAPL prediction settled' })).toBeVisible()
  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.goto('/dashboard/wallet')
  await page.getByRole('button', { name: 'Demo deposit', exact: true }).click()
  await page.getByLabel('Amount (virtual ₹)').fill('1000')
  await page.getByRole('button', { name: 'Simulate deposit' }).click()
  await expect(page.getByRole('dialog', { name: 'Transaction receipt' })).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Demo withdrawal' }).click()
  await page.getByLabel('Amount (virtual ₹)').fill('250')
  await page.getByRole('button', { name: 'Simulate withdraw' }).click()
  await expect(page.getByRole('dialog', { name: 'Transaction receipt' })).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `docs/screenshots/wallet-${info.project.name}.png`,
    fullPage: true,
  })
  await page.goto('/dashboard/portfolio')
  await expect(page.getByRole('heading', { name: 'Portfolio', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Available balance' })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `docs/screenshots/portfolio-${info.project.name}.png`,
    fullPage: true,
  })
  const deny = await page.request.get('/api/admin/overview')
  expect(deny.status()).toBe(403)
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/login')
  expect(errors).toEqual([])
})
test('admin authorization, pause control and audited user suspension', async ({ page }, info) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@example.test')
  await page.getByLabel('Password', { exact: true }).fill('admin-test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
  await page.goto('/dashboard/admin')
  await expect(page.getByRole('heading', { name: 'Admin workspace' })).toBeVisible()
  await page.getByRole('button', { name: 'Pause predictions' }).click()
  await page.getByRole('button', { name: 'Confirm action' }).click()
  await expect(page.getByRole('heading', { name: 'New predictions are paused' })).toBeVisible()
  await page.getByRole('button', { name: 'Resume predictions' }).click()
  await page.getByRole('button', { name: 'Confirm action' }).click()
  await expect(page.getByRole('heading', { name: 'Predictions are open' })).toBeVisible()
  await page
    .getByRole('row')
    .filter({ hasText: 'Jordan Lee' })
    .getByRole('button', { name: 'Suspend', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Confirm action' }).click()
  await expect(page.getByRole('button', { name: 'Reactivate' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Reactivate' }).first().click()
  await page.getByRole('button', { name: 'Confirm action' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `docs/screenshots/admin-${info.project.name}.png`, fullPage: true })
})
test('network errors show a recovery path', async ({ page, request }) => {
  await signup(page, request)
  await page.route('**/api/wallet/balance', (route) => route.abort())
  await page.goto('/dashboard/wallet')
  await expect(page.getByRole('alert').filter({ hasText: 'Connection lost' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await page.unroute('**/api/wallet/balance')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Demo deposit', exact: true })).toBeVisible()
})
test('existing signup offers recovery and a real reset email restores login', async ({
  page,
  request,
}, info) => {
  const email = await signup(page, request)
  await page.request.post('/api/auth/logout', {
    headers: { Origin: 'http://localhost:3100' },
    data: {},
  })
  await page.goto('/signup')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send verification code' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'already has an account' })).toBeVisible()
  await expect(page.getByLabel('Verification code')).not.toBeVisible()
  await page.screenshot({
    path: `docs/screenshots/signup-recovery-${info.project.name}.png`,
    fullPage: true,
  })
  await page.getByRole('link', { name: 'Reset password', exact: true }).click()
  await expect(page).toHaveURL('/forgot-password')
  await expect(page.getByRole('heading', { name: 'A fresh start.' })).toBeVisible()
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send verification code' }).click()
  await expect(page.getByLabel('Verification code')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('If this email has an account')
  await expect(page.getByRole('button', { name: /Resend in \d+s/ })).toBeDisabled()
  const { code } = await (
    await request.get(`http://127.0.0.1:3101/inbox?email=${encodeURIComponent(email)}`)
  ).json()
  expect(code).toMatch(/^\d{6}$/)
  await page.getByLabel('Verification code').fill(code)
  await page.getByLabel('New password').fill('updated-test-password')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByRole('status')).toContainText('Password updated')
  await page.getByRole('link', { name: 'Return to sign in' }).click()
  await expect(page).toHaveURL('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('updated-test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
})
test('failed OTP request stays on email entry and supports retry', async ({ page }) => {
  await page.goto('/signup')
  await page.route('**/api/auth/send-otp', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'Email could not be delivered. Please try again shortly',
      }),
    }),
  )
  await page.getByLabel('Email address').fill(`retry-${Date.now()}@example.test`)
  await page.getByRole('button', { name: 'Send verification code' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Email could not be delivered' }),
  ).toBeVisible()
  await expect(page.getByLabel('Verification code')).not.toBeVisible()
  await page.unroute('**/api/auth/send-otp')
  await page.getByRole('button', { name: 'Send verification code' }).click()
  await expect(page.getByLabel('Verification code')).toBeVisible()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Email could not be delivered' }),
  ).not.toBeVisible()
})
test('markets stay visible during slow quotes, refresh failures and return navigation', async ({
  page,
}, info) => {
  const login = await page.request.post('/api/auth/login', {
    headers: { Origin: 'http://localhost:3100' },
    data: { email: 'admin@example.test', password: 'admin-test-password' },
  })
  expect(login.ok()).toBeTruthy()
  let releaseSnapshot,
    releaseQuotes,
    offline = false,
    snapshots = 0
  const snapshotGate = new Promise((resolve) => {
    releaseSnapshot = resolve
  })
  let quotesGate = new Promise((resolve) => {
    releaseQuotes = resolve
  })
  await page.route('**/api/market/prices?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('cached') === '1') {
      snapshots++
      await snapshotGate
    } else {
      await quotesGate
      if (offline) return route.abort()
    }
    await route.continue()
  })
  try {
    await page.goto('/dashboard')
    await expect(page.getByRole('status', { name: 'Loading markets', exact: true })).toBeVisible()
    expect(await page.locator('.spinner').count()).toBe(0)
    await page.screenshot({
      path: `docs/screenshots/market-placeholder-${info.project.name}.png`,
      fullPage: true,
    })
    releaseSnapshot()
    const cards = page.getByRole('button', { name: /View .+ and make a prediction/ })
    await expect(cards.first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Updating…', exact: true })).toBeDisabled()
    await expect(
      page.getByRole('status', { name: 'Loading markets', exact: true }),
    ).not.toBeVisible()
    releaseQuotes()
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    offline = true
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(page.getByText('Couldn’t refresh. Showing the last update.')).toBeVisible()
    await expect(cards.first()).toBeVisible()
    offline = false
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(page.getByText('Couldn’t refresh. Showing the last update.')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    if (info.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('link', { name: 'Wallet', exact: true }).click()
    await expect(page).toHaveURL('/dashboard/wallet')
    await expect(page.getByRole('button', { name: 'Demo deposit', exact: true })).toBeVisible()
    const previousSnapshots = snapshots
    quotesGate = new Promise((resolve) => {
      releaseQuotes = resolve
    })
    if (info.project.name === 'mobile')
      await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('link', { name: 'Markets', exact: true }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(cards.first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Updating…', exact: true })).toBeDisabled()
    expect(snapshots).toBe(previousSnapshots)
    await expect(
      page.getByRole('status', { name: 'Loading markets', exact: true }),
    ).not.toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy()
  } finally {
    releaseSnapshot()
    releaseQuotes()
    await page.unrouteAll({ behavior: 'wait' })
  }
})
