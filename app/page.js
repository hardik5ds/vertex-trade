import Link from 'next/link'
import Brand from '@/components/ui/Brand'
import Icon from '@/components/ui/Icon'
export default function HomePage() {
  return (
    <>
      <header className="site-nav">
        <Brand />
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="#practice">Built for practice</a>
        </nav>
        <div className="row">
          <Link href="/login" className="login-link">
            Sign in
          </Link>
          <Link href="/signup" className="button-secondary">
            Get started <Icon name="arrow" size={15} />
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div>
            <span className="badge badge-blue">A different way to read the market</span>
            <h1>
              Your perspective.
              <br />
              <span>Your next move.</span>
            </h1>
            <p>
              Turn market curiosity into a clearer point of view. Predict stock prices, follow your
              progress, and practice without risking real money.
            </p>
            <div className="row">
              <Link href="/signup" className="button">
                Start with ₹1,00,000 <Icon name="arrow" size={17} />
              </Link>
              <a href="#how-it-works" className="muted">
                Explore the idea
              </a>
            </div>
            <small style={{ display: 'block', marginTop: 20 }}>
              Virtual credits. Free to use. No card required.
            </small>
          </div>
          <div className="hero-demo" aria-label="Illustrative price prediction preview">
            <div className="hero-demo-header">
              <div className="row">
                <span className="market-icon">A</span>
                <div>
                  <strong>AAPL</strong>
                  <small style={{ display: 'block' }}>Apple Inc. · NASDAQ</small>
                </div>
              </div>
              <span className="badge">Illustration</span>
            </div>
            <div className="hero-demo-price">$228.40</div>
            <small>Explore a price. Form a prediction.</small>
            <svg
              viewBox="0 0 430 185"
              fill="none"
              role="img"
              aria-label="Illustrative chart showing a price moving toward a predicted target"
            >
              <path d="M0 35H430M0 90H430M0 145H430" stroke="#2a2a32" />
              <path
                d="M8 149 24 139 39 151 58 122 75 130 94 100 110 117 128 87 142 101 160 75 179 86 198 53 216 69 230 60 249 78 264 56 281 62 300 43"
                stroke="#bfc8d8"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="m300 43 50-14 66-13"
                stroke="#4795ff"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <path d="M300 3v178" stroke="#444451" strokeDasharray="3 5" />
              <circle cx="300" cy="43" r="5" fill="#e7e7eb" />
              <circle cx="416" cy="16" r="5" fill="#4795ff" />
              <text x="275" y="180" fill="#838391" fontSize="10">
                NOW
              </text>
            </svg>
            <div className="hero-demo-target">
              <div>
                <small>Your price prediction</small>
                <strong style={{ fontSize: 23, fontWeight: 500 }}>$235.00</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small>Your time horizon</small>
                <strong>1 week</strong>
              </div>
            </div>
            <div className="hero-demo-footer">One prediction. A new perspective.</div>
          </div>
        </section>
        <div className="landing-markets">
          <span>INDIAN EQUITIES</span>
          <span>NSE</span>
          <span>US EQUITIES</span>
          <span>NASDAQ</span>
          <span>NYSE</span>
        </div>
        <section className="landing-section" id="how-it-works">
          <div className="eyebrow">From curiosity to conviction</div>
          <h2>
            A market experience
            <br />
            you can make your own.
          </h2>
          <p>No order books to decode. Choose a stock, a price, and a point in time.</p>
          <div className="steps">
            {[
              [
                '01',
                'Find your focus',
                'Browse Indian and US stocks, compare recent price movements, and explore real market charts.',
              ],
              [
                '02',
                'Make your prediction',
                'Choose a future price and time horizon. Review the potential outcomes before committing virtual credits.',
              ],
              [
                '03',
                'Learn from the result',
                'See your prediction accuracy, understand your return, and build a history you can learn from.',
              ],
            ].map(([n, title, text]) => (
              <div className="step" key={n}>
                <div className="step-number">{n}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-section landing-feature" id="practice">
          <div className="feature-panel">
            <div className="row spread">
              <span className="eyebrow" style={{ margin: 0 }}>
                Your practice wallet
              </span>
              <Icon name="wallet" />
            </div>
            <div className="stat">
              <p>Start with virtual credits</p>
              <strong style={{ fontSize: 48 }}>₹1,00,000</strong>
              <small>No deposits. No real financial loss.</small>
            </div>
            <div className="stat">
              <p>Choose your pace</p>
              <strong>1 hour → 10 years</strong>
              <small>Explore short and long prediction horizons.</small>
            </div>
            <div className="stat">
              <p>Understand every outcome</p>
              <strong>Complete history</strong>
              <small>Your predictions, results, and wallet activity.</small>
            </div>
          </div>
          <div className="feature-copy">
            <div className="eyebrow">Space to learn</div>
            <h2>
              Build confidence.
              <br />
              Keep the stakes virtual.
            </h2>
            <p>
              Practice with a dedicated virtual wallet, or try simulated deposits and withdrawals in
              demo cash mode. Every balance is a simulation, with no real money involved.
            </p>
            <p>
              Market data comes from Yahoo Finance and may be delayed. Predictions use published
              rules, with full results and an auditable transaction history.
            </p>
            <Link href="/signup" className="button-secondary">
              Create your account <Icon name="arrow" size={17} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Brand />
        <p>Practice predictions. No securities are bought or sold.</p>
        <div className="row">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </>
  )
}
