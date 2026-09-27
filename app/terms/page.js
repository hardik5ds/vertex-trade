import Brand from '@/components/ui/Brand'
export const metadata = { title: 'Simulation terms' }
export default function Terms() {
  return (
    <main className="legal">
      <Brand />
      <h1 style={{ marginTop: 48 }}>Simulation terms</h1>
      <p>
        Vertex Trade is a learning project for price predictions. All balances, deposits,
        withdrawals, stakes, and returns are simulated credits with no monetary value. No securities
        are bought or sold. These predictions are not investment advice.
      </p>
      <h2>Your prediction</h2>
      <p>
        Choose a listed market, a positive target price, a duration from 1 hour to 10 years, and a
        stake of ₹100–₹1,00,000 in virtual credits. Stakes are removed from available credits and
        recorded as reserved funds. You may cancel before expiry for a full refund.
      </p>
      <h2>Settlement rules · Version 2</h2>
      <p>
        The current rules preserve the project’s existing exponential accuracy formula: accuracy =
        100 × exp(−0.09 × absolute percentage price error). A 1% price error produces about 91.39%
        accuracy; it does not produce 99% accuracy. Returns depend on accuracy and duration, and can
        range from zero to 30 times the stake.
      </p>
      <p>
        Below 50% accuracy the full stake is lost. Between 50% and 75%, the return follows a
        quadratic loss curve with a duration adjustment. From 75% to 90%, a power curve increases
        the profit score; from 90% upward, a steeper curve applies. After at least 10 settled
        predictions, historical win-rate bonuses can affect profitable-zone returns. Your applicable
        history is captured when the prediction is placed.
      </p>
      <p>
        The preview shows representative outcomes, including the applicable bonus. Monetary returns
        round to the nearest paise. Accuracy is retained without display rounding in the
        calculation. The history view shows the applied multiplier, provider timestamp, settlement
        price, and returned amount.
      </p>
      <h2>Market data and timing</h2>
      <p>
        Yahoo Finance quotes may be delayed, unavailable, or show the previous session’s closing
        price. Prices are displayed in their quoted currency; wallet stakes remain simulated INR
        units. Scheduled processing uses the available provider quote when the job executes, not a
        guaranteed exchange price at the exact expiry second. A processing delay can therefore
        affect the result. If no valid quote is available during processing, the stake is refunded.
      </p>
      <h2>Practice and demo cash</h2>
      <p>
        New accounts receive ₹1,00,000 in practice credits. A refill restores total available plus
        reserved practice credits to ₹1,00,000 at most once every 24 hours. Demo cash supports
        simulated deposits and withdrawals of ₹1–₹1,00,000 per request, with a deposit ceiling of
        ₹10,00,000 including reserved stakes. Credits cannot be exchanged for money.
      </p>
      <h2>Account controls</h2>
      <p>
        Keep your login and verification codes private. Administrators may pause new predictions or
        suspend accounts to operate the project. These actions are audited. Active predictions
        continue to settlement while an account is suspended.
      </p>
    </main>
  )
}
