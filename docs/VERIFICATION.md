# Vertex Trade verification

Verified on 27 September 2026.

Live website: https://vertex-trade-ten.vercel.app

Private repository: https://github.com/hardik5ds/vertex-trade

## Automated checks

| Check                       | Result                       | Coverage                                                                                                                                                                                                     |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ESLint                      | Passed                       | Application, API, scripts and tests                                                                                                                                                                          |
| Unit tests                  | 11 passed                    | V2 formula, precision, bounds, input validation, SMTP recipient acceptance and redacted delivery diagnostics                                                                                                 |
| Replica-set integration     | 19 passed                    | OTP, existing-account recovery, failed delivery retry, resend cooldown, sessions, concurrent placement/cancellation/settlement, replay protection, rollback, payments, rate limiting, CSRF and migration     |
| Production build            | Passed locally and on Vercel | Next.js 15.5.26, all 44 routes/pages compiled or generated                                                                                                                                                   |
| Browser journeys            | 14 passed                    | Desktop/mobile signup, account recovery, OTP retry, markets, predictions, payments, portfolio, admin, logout, slow quote loading, retained data during refresh failures and return navigation                |
| Production dependency audit | 0 vulnerabilities reported   | `npm audit --omit=dev --audit-level=high`                                                                                                                                                                    |

[CI run for the legacy migration fix](https://github.com/hardik5ds/vertex-trade/actions/runs/36298506852) passed. The workflow runs on every push to `main`; Vercel Git integration is connected and its automatic production deployment was observed.

Automated browser tests use an isolated MongoDB replica set, local SMTP inbox and fixture quote provider. The harness can print an ECONNREFUSED message during shutdown after Playwright terminates the disposable database; all assertions and the test command exit successfully. Live checks below use the actual deployed services instead.

## Repaired external services

- The original Atlas M0 cluster was paused. It was resumed without a paid upgrade. Before migration, a backup of the fully restored database was saved under the owner's private `.vertex-trade/backups/` directory.
- A dedicated database user now has read/write access only to the application database on the intended cluster. Database credentials are stored in ignored local configuration and encrypted Vercel settings.
- Migration completed successfully. All 11 existing users retained their two wallets. A legacy non-unique OTP email index was preserved while a new unique index was added. The market catalog was initialized and a bounded batch of 40 symbols refreshed.
- Working Brevo SMTP settings were recovered from the owner's local configuration and verified. Real verification messages were delivered, and the owner supplied the codes for the QA and administrator accounts.
- Yahoo Finance returned real AAPL data with 391 candles and provider timestamp `2026-09-25T20:00:01.000Z`. Closed-market timestamps are displayed explicitly.
- Both the deployed `/api/health` and local `http://localhost:3000/api/health` returned HTTP 200 with application status `ok`.

## Live application checks

The following passed on the public HTTPS deployment using an isolated QA account and simulated funds:

1. Real email OTP verification and account creation; HttpOnly and Secure session-cookie flags verified.
2. Login through the actual browser form, followed by dashboard access.
3. ₹1,00,000 opening practice balance and a separate demo cash wallet.
4. Real Yahoo quote and candlestick chart rendering.
5. Rejection of negative stakes and foreign request origins.
6. Prediction placement, repeated-request deduplication, and full cancellation refund.
7. Demo deposit deduplication, withdrawal, transaction history and receipt data.
8. Settlement through the authenticated production endpoint, followed by a wallet credit, history entry, portfolio result and persistent notification.
9. Mobile wallet layout without document overflow and desktop chart/portfolio rendering without page errors.
10. Anonymous requests denied for wallets/admin; ordinary users denied admin access.
11. Logout revocation: the former session could no longer access authenticated endpoints.
12. The cron endpoint rejected a request without its secret (HTTP 401); an authorized run returned HTTP 200 and processed one due prediction with zero failures.

**Settlement test condition:** only the newly created QA bid's placement/expiry timestamps were backdated to exercise the expiry path without waiting an hour. The deployed processor fetched an actual Yahoo quote and settled it: one settled, zero refunded, zero failed. No other user's bid was modified for this test. This verifies processing behavior, not a measured guarantee of scheduled execution latency.

The configured administrator, `singhalhardik044@gmail.com`, was separately email-verified and activated. Live checks confirmed:

- Browser login and admin workspace access.
- Pausing predictions blocked a QA placement, and resuming restored availability.
- Suspending only the QA account revoked its sessions; reactivation allowed a fresh login.
- Each administrative change appeared in the audit log.
- Temporary test sessions were revoked after verification. Predictions were left enabled.

The administrator's generated password is saved privately on the owner's Mac and is not included in Git, screenshots or this report. An account named **Vertex QA** remains for its clearly identifiable test history; its funds have no monetary value.

Screenshots are generated under `docs/screenshots/` and ignored by Git. Live candlestick and mobile wallet screenshots were visually reviewed.

## OTP follow-up repair

The prior signup handler silently returned a generic success response when the email already belonged to an account. The UI then displayed a verification form even though no email had been requested. Both previously reported owner addresses were already registered; recent production signup requests returned HTTP 200 without delivery errors.

Registered-address signup now returns HTTP 409 with a stable `ACCOUNT_EXISTS` code and visible sign-in/password-reset links. It does not consume the per-email recovery allowance. Password reset retains conditional, identical responses for known and unknown accounts. The UI respects a 60-second resend delay and server rate-limit headers, and failed SMTP requests stay on email entry. Email input is normalized before validation.

New tests cover SMTP acceptance/rejection, safe diagnostic logging, failed-delivery cleanup, recovery allowance preservation, account privacy, cooldown behavior and complete desktop/mobile password recovery using the disposable SMTP inbox. The recovery and retry journeys pass on desktop and mobile; the CI workflow runs the complete suite on push. No production password was changed by these regression tests.

## Loading and refresh behavior

Loading behavior is checked on both viewport sizes by delaying quote requests: static placeholders appear during the first database read, market cards become usable before external refresh completes, and a refresh failure preserves the cards with a Retry notice. Returning from Wallet to Markets reuses the public market snapshot while revalidating it. Screenshot checks cover the new placeholder layout; no rotating loader is rendered.

## Operational limits

- All funds, deposits and withdrawals are simulations. No paid service or payment gateway was enabled.
- An open authenticated dashboard checks that user's expired predictions every 30 seconds. The Vercel Hobby configuration supplies a daily global cron fallback. A continuously running worker or separately configured free scheduler is needed for frequent unattended settlement; a daily fallback does not guarantee 30-second offline processing.
- Quotes come from Yahoo's unofficial endpoint and can be delayed, unavailable, or from the previous market session. Settlement uses the provider quote when processing occurs, not guaranteed exact-expiry historical pricing.
- V2 settlement rules from the original code are preserved. The supplied academic report describes a different formula; that alternative is not the current implementation.
- The checks are functional release evidence, not a load test, penetration test, uptime guarantee or approval for real-money operation.
