# Vertex Trade — initial audit

Audit date: 27 September 2026. This records the baseline before implementation.

## Existing implementation

- Next.js 15 / React 18 application with landing, login, signup, password reset, market dashboard, bidding, portfolio and wallet screens.
- MongoDB models for users, wallets, bids, transactions, stocks and OTPs; Redux slices for auth, wallets, bids, stocks and markets.
- Yahoo chart API integration, a stock catalog larger than the 50-stock report, email templates and a settlement formula.
- Repository has substantial uncommitted work and no Git remote. Existing work must be preserved. No README, automated tests or deployment pipeline was present. CLAUDE.md describes an older schema and is not reliable implementation documentation.

## Critical defects

1. `/api/wallet/balance?userId=...` exposes balances without authentication.
2. `/api/auth/signup` bypasses email verification. Signup and reset OTPs are interchangeable; codes use Math.random, are stored in plaintext, and are printed to logs. Attempt increments and consumption are not atomic.
3. JWT signing uses known fallback secrets. Tokens in localStorage are exposed to injected JavaScript, logout does not revoke sessions, and password resets do not invalidate existing sessions.
4. Bid placement trusts client stock metadata, substitutes the prediction for an unavailable entry price, and uses separate balance checks/debits. Concurrent bids can overspend; errors leave partial writes.
5. Cancellation does not check expiry. Settlement/cancellation/refunds are not atomic or idempotent, allowing double credits, lost credits and inconsistent ledgers. In-process flags do not protect multiple instances.
6. Cron authentication is optional and uses a query-string secret. Browsers directly trigger global settlement. No reliable autonomous scheduler exists.
7. Wallet reservations are described but not maintained. Faucet concurrent calls can over-credit. Account creation omits the opening ledger entry.

## Functional defects and omissions

- Portfolio summary uses removed fields (`amount`, `quantity`, `profitLoss`) and obsolete statuses; history uses nonexistent transaction timestamps and incorrect debit signs.
- Market snapshot generates random prices; charts also generate synthetic series. Separate market implementations disagree. Failed prices are sometimes stamped as newly updated. Stock search thunks call missing endpoints.
- Formula duplicates diverge between preview and settlement. Existing v2 formula differs materially from the supplied report, including accuracy, time anchors and historical bonus. Final formula choice requires user clarification; existing active bids need versioned terms.
- No admin authorization/control surface, persistent notifications, completed demo payment workflow, accessible responsive system, input schemas, shared rate limiting, CI, health checks or deployment documentation.
- Claimed sub-5-second settlement, 60fps, financial-grade precision and production readiness have no measurements/tests to support them.

## Agreed scope

- Rename active source, UI, metadata, icons and emails to **Vertex Trade**.
- Use only free tools/services. Payments simulate deposits/withdrawals and must clearly state that no real funds move. No live payment credentials or paid plans.
- Admin email: `singhalhardik044@gmail.com`; verify email ownership before admin access. No default admin password.
- This is price-prediction bidding, not a securities exchange. Order matching is not applicable to its defined mechanism.
- Preserve original academic report artifacts as historical source material; current behavior is documented in README.
- Implement database transactions, bounded/validated APIs, secure sessions and OTPs, audited admin actions, real provider timestamps/history, notifications and a consistent minimal UI.
- Validate with unit, integration/concurrency, build/lint and browser checks. Report external service/deployment blockers honestly; do not label untested behavior production-ready.
