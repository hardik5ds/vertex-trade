# Vertex Trade

A stock-price prediction simulation with a minimal black interface. Explore Indian and US equities, place time-bound predictions, and track outcomes using virtual credits. **All payments and wallets are simulations. No real money moves and no securities are traded.**

Live website: **https://vertex-trade-ten.vercel.app**. Email-verified signup, login, market data, predictions, settlement, demo payments, portfolio and admin controls have been checked on the deployed application. See [the verification record](docs/VERIFICATION.md) for the test conditions and limits.

## What works

- Email OTP signup, login, logout and password recovery. Session cookies are HttpOnly; logout, reset and suspension revoke access.
- Yahoo Finance quotes and actual candle history, exchange filters, search, pagination and freshness indicators. Unavailable data is never replaced by invented prices.
- Predictions from 1 hour to 10 years, ₹100–₹1,00,000 stakes, shared return preview and server validation.
- Atomic placement, reservations, cancellation before expiry, settlement and refunds. Request keys prevent duplicate placement/payment charges.
- Practice wallet with ₹1,00,000 opening credits, and a separately labeled demo cash wallet with simulated deposits/withdrawals.
- Paginated transaction and prediction histories, result receipts, persistent notifications, portfolio statistics, available-balance curves and sector allocation.
- Verified-admin workspace: user suspension/reactivation, bid/transaction inspection, bidding pause/resume, manual settlement and an audit log.
- Responsive desktop/mobile layouts, accessible labels and dialogs, loading/empty/error states, keyboard focus and reduced motion.

The configured administrator is `singhalhardik044@gmail.com`. The account must verify its email; there is no built-in admin password.

## Stack

Next.js 15 App Router, React 18, JavaScript ES modules, Redux Toolkit, CSS/Tailwind, Recharts and TradingView Lightweight Charts. The server uses Mongoose/MongoDB transactions, bcrypt, signed JWT session cookies, Nodemailer/Brevo and the Yahoo chart endpoint. Tests use Node's test runner, a disposable MongoDB replica set, and Playwright Chromium.

Node 24 LTS is recommended (`.nvmrc`). Node 22.13+ is required. MongoDB must support transactions: Atlas M0 free clusters or a local replica set work; a standalone server does not.

## Local setup

```bash
npm ci
cp .env.local.example .env.local
# Fill the environment values in your editor.
npm run migrate
npm run seed
npm run dev
```

Open http://localhost:3000. Create and verify an account. Practice credits are granted in the same transaction that creates the account.

`npm run seed` inserts the catalog and refreshes a bounded batch of quotes. Catalog entries start unavailable until a real provider response arrives. Visiting a market page refreshes its quotes, at most once per minute per stock across instances.

Market lists display the saved database snapshot first, then update prices in the background. A short-lived, bounded browser-memory cache keeps public market cards visible when returning to the page. Old quotes are labeled as last-known data; prediction placement still validates prices on the server. Private wallet and account responses are not cached across page visits. Static card/table/chart placeholders replace spinning loaders, and a failed background refresh keeps existing data visible with a Retry notice.

To run a continuously available local settlement/market worker in a second terminal:

```bash
npm run worker
```

The worker targets 30-second settlement cycles and periodically refreshes catalog batches. Slow provider responses can extend a cycle. Shutting down your computer stops this worker.

## Environment

| Variable              | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `MONGODB_URI`         | Free Atlas or replica-set URI, including the database name           |
| `JWT_SECRET`          | Random secret, minimum 32 characters; no fallback exists             |
| `CRON_SECRET`         | Separate random secret, minimum 32 characters                        |
| `NEXT_PUBLIC_APP_URL` | Exact origin for CSRF checks, e.g. `https://your-project.vercel.app` |
| `ADMIN_EMAIL`         | Verified email allowed to operate the admin workspace                |
| `BREVO_SMTP_USER`     | SMTP login from Brevo's SMTP settings                                |
| `BREVO_SMTP_PASSWORD` | Brevo SMTP key (not an API key or account password)                  |
| `EMAIL_FROM`          | Verified sender, with `Vertex Trade` display name                    |

Generate each secret independently:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Secrets belong in `.env.local` locally and encrypted hosting environment settings in production. `.gitignore` and `.vercelignore` exclude local secrets. Never expose them in `NEXT_PUBLIC_*` variables.

```bash
npm run services:check
```

This checks database/replica-set support, a real Yahoo quote and SMTP authentication without sending an email. SMTP authentication alone does not verify deliverability or sender verification; complete a real OTP signup after deployment.

### Email verification and recovery

- Signup is for new addresses. A registered address receives an explicit account-exists message with sign-in and password-reset links; the app does not pretend a signup code was sent.
- Use `/forgot-password` for an existing account, including a legacy unverified account. Recovery uses a separate OTP purpose and revokes old sessions after a successful password change. Unknown addresses receive the same conditional recovery response to protect account privacy.
- Check the inbox and Spam folder. Codes expire after 10 minutes, allow three verification attempts, and can be resent after 60 seconds. The UI displays the resend countdown and honors server rate-limit retry times. Only the latest code is valid.
- SMTP rejection does not advance to verification. Failed challenges are removed so the user can retry. Server logs record `smtp_accepted` or a safe `smtp_failed` code without email addresses, OTPs or credentials. SMTP acceptance confirms handoff to Brevo, not final inbox delivery; investigate Brevo's transactional logs if an accepted message does not arrive.

## Existing data migration

Back up the database before a deployment. Run `npm run migrate` against the intended database. The migration is repeatable, creates missing indexes and converts each legacy wallet inside a transaction:

- Legacy `balance` is available rupees, already reduced at placement. It becomes integer `balancePaise` without a second deduction.
- Active prediction stakes become `reservedPaise`.
- Invalid balances stop migration for manual reconciliation. It does not invent credits to repair historically inconsistent ledgers.
- Existing bids retain V2 settlement rules. Legacy sessions and plaintext OTPs are no longer accepted. Legacy unverified users can prove email ownership using password reset.
- OTP email uniqueness uses a separately named index, allowing legacy non-unique indexes to remain without deleting records. Duplicate legacy email records must be reconciled before a unique index can be built.
- Original report PDF/ODT files remain historical artifacts; this README describes the running implementation.

Wallet accounting uses integer paise. Bid prices and accuracy remain floating point. `Transaction.amount` and `balanceAfter` are retained in rupees for compatibility, alongside their integer-paise values. Available plus reserved funds equals wallet equity at stake cost, not a mark-to-market valuation.

## Prediction rules

The repository's existing **V2 exponential formula** is preserved. The supplied academic report describes a materially different linear-error formula; that alternative has not been silently substituted.

`accuracy = 100 × exp(-0.09 × absolute percentage price error)`

For example, a 1% price error gives approximately 91.39% accuracy. The return formula combines this score, duration tiers, and the existing historical win-rate bonus after 10 settlements. Return is capped at 30× the stake. The shared module is `src/lib/services/settlementFormula.js`; all preview and settlement calculations use it. History inputs are frozen at placement for new bids; legacy bids preserve their settlement-time history bonus. The applied bonus is recorded in each settled bid. Accuracy is never rounded before calculations; returned credits round once to the nearest paise.

The 75% base break-even point is subject to the existing historical bonus. The V2 time tier and loss rules are intentionally documented rather than described as the report's alternative rules. Review `/terms` and the preview before placing predictions.

Settlement uses the valid provider quote fetched **when processing occurs**, not a guaranteed exchange price at the exact expiry second. Closed markets can return the most recent session quote. Provider timestamps and processing timestamps are recorded separately. If the provider cannot supply a valid quote, the entire stake is refunded atomically.

## Free deployment

The project targets a **Vercel Hobby** account and **MongoDB Atlas M0**, with Brevo's free email allowance. Do not activate a paid upgrade. These services impose usage limits; this is a demo/educational deployment, without a paid availability guarantee.

1. Create or recover a working Atlas free cluster, database user and network access configuration. Copy its current connection string into `MONGODB_URI`.
2. Configure a verified Brevo sender and valid SMTP credentials. Check the free sending allowance in your account.
3. Run migration and seed using the production database configuration.
4. Connect the Git repository to Vercel, choose Next.js and Node 24, and add all environment variables from the table above.
5. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS project origin. Configure `CRON_SECRET` in Vercel; scheduled calls send it in `Authorization: Bearer ...`.
6. Deploy, then verify `/api/health`, actual email signup, login, predictions, demo payments, history and admin authorization on the public URL.
7. Record the verified URL and results in this README and `docs/VERIFICATION.md`.

The Vercel CLI can deploy with `npx vercel --prod`. The included GitHub Actions workflow runs lint, unit/integration/browser tests, dependency checks and the production build. The Vercel Git integration provides deploy-on-push; protect `main` with the CI check if other contributors can push.

### Scheduling on free hosting

- While a signed-in workspace is open, it checks **only that user's** expired bids every 30 seconds. The endpoint requires authentication, CSRF validation and a rate limit.
- `vercel.json` configures a daily global fallback compatible with Hobby cron limits.
- For more frequent unattended settlement, run the included worker on an existing always-on machine, or configure a free external scheduler to call `/api/cron/settle-bids` with the authorization header. Never put the secret in a URL. A scheduler account is not provisioned by this repository.
- A daily cron does not guarantee 30-second offline settlement. Provider failures, backlog and serverless limits can also delay processing. The admin page shows overdue bids and last processing time.

References: [Vercel Hobby cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Atlas free clusters](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/).

## Verification commands

```bash
npm run lint
npm test
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Integration tests use a temporary MongoDB replica set and never connect to `.env.local`. Browser tests use disposable accounts, a local SMTP inbox and a fixture market provider. There is no production verification bypass or public test-mail endpoint. Live external services must be checked separately. The E2E harness listens on local ports 3100/3101.

## Layout

```text
app/                  Pages, layouts and thin API handlers
src/components/ui/    Shared controls, auth, brand and charts
src/lib/server/       Sessions, validation wrappers, OTP flow and transactional ledger
src/lib/services/     Settlement formula, processor and portfolio aggregation
src/lib/models/       Database schemas and indexes
src/hooks/            Abortable API loading/polling
src/redux/            Session identity and selected-wallet state
scripts/              Migrations, market seed, worker and verification harness
tests/                Unit, concurrency and browser tests
docs/                 Audit, verification and deployment notes
```

## Practical limits and future work

This remains a simulation, not a live-money financial service. Yahoo's unofficial endpoint has no availability guarantee. All 300+ catalog symbols are not promised a global 60-second refresh; the bounded worker rotates through batches, while viewed quotes refresh on demand. Exchange calendars/corporate-action normalization, exact-expiry historical pricing, WebSocket delivery and live payments are future work. No claims of guaranteed fairness, profitability, regulatory exemption, millions of users, or fixed settlement latency are made.
