# Vertex Trade contributor notes

Use README.md for current architecture, setup and behavior, and docs/AUDIT.md for the initial findings. The older architecture and schema descriptions have been superseded.

- This is a prediction simulation. All deposits, withdrawals and wallet balances are virtual. Never add real-money collection without an explicit new user request.
- Keep provider failures visible. Never replace real quotes/history with synthetic data in the application.
- All balance-changing operations belong in `src/lib/server/ledger.js` and MongoDB transactions. `balancePaise` is available cash; `reservedPaise` is active stakes. Do not double-deduct reservations.
- OTPs are purpose-scoped, hashed, expiring and single-use. Browser auth uses an HttpOnly cookie and a revocable database session; no auth tokens in localStorage.
- Every privileged API must use `api(..., { admin: true })`. Never trust a browser-provided role.
- Preserve existing V2 formula semantics unless the owner explicitly chooses replacement rules. Use the shared formula for previews and settlement.
- Run lint, unit tests, integration tests, production build and relevant browser journeys for substantive changes.
- No paid services/plans. Secrets belong only in ignored local environment files or encrypted hosting settings.
