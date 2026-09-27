# Vertex Trade verification

Date: 27 September 2026.

## Local release checks

| Check                   | Result    | Coverage                                                                                                                                                                                         |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ESLint                  | Passed    | Application, API, scripts and tests                                                                                                                                                              |
| Unit tests              | 8 passed  | V2 formula, precision, bounds, input validation                                                                                                                                                  |
| Replica-set integration | 15 passed | OTP, sessions, concurrent placement/cancellation/settlement, duplicate requests, rollback, demo payments, refill limits, rate limiting, CSRF, portfolio, legacy migration and bonus preservation |
| Production build        | Passed    | Next.js 15.5.26, all 44 routes/pages generated or compiled                                                                                                                                       |
| Browser journeys        | 8 passed  | Desktop/mobile signup through local SMTP, login, market, placement, cancellation, settlement, notifications, payments, portfolio, admin suspension/pause, logout and network recovery            |

Browser tests use an isolated MongoDB replica set, local SMTP inbox and fixture quote provider. Those results establish application behavior, not external-service readiness. The test harness can print an ECONNREFUSED message during shutdown after Playwright terminates the disposable database; all assertions and the test command exit successfully.

Screenshots of landing, dashboard, wallet, portfolio and admin are produced under `docs/screenshots/` and ignored by Git. Desktop dashboard and mobile wallet were visually inspected for spacing, branding, readable content and responsive layout.

## External checks

- Yahoo Finance: real AAPL response received with 391 candles and provider timestamp `2026-09-25T20:00:01.000Z`.
- MongoDB: current Atlas SRV hostname does not resolve (`ENOTFOUND`). No production migration or seed has run.
- Brevo: current SMTP credentials rejected (`EAUTH`). No production verification email has been sent.
- Vercel: existing Hobby account authenticated; Vertex Trade project created with Next.js and Node 24.
- GitHub: private repository created at https://github.com/hardik5ds/vertex-trade.

## Remaining release gates

1. Supply a working Atlas M0 URI and valid Brevo SMTP login/key plus verified sender in `.env.local`; never paste secrets into chat or commit them.
2. Recheck connectivity, back up any existing data, run migration and seed, and update encrypted Vercel environment values.
3. Complete real email signup on the deployed origin, including verification of the configured admin email.
4. Verify a real-provider prediction, scheduled expiry, transaction history, admin controls and production worker/cron behavior.

Production readiness is not claimed until those gates pass. Payments are intentionally simulated. The existing V2 rules are retained; the academic report's different formula remains an explicit product decision.
