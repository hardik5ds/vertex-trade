'use client'
import { useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import useResource from '@/hooks/useResource'
import { request, money, dateTime, walletName, refreshResources } from '@/lib/client'
import { generatePreviewTable } from '@/lib/services/settlementFormula'
import { Modal, Button, Loading, ResourceError, Message } from '@/components/ui/Common'
import { CandleChart } from '@/components/ui/Charts'
import Icon from '@/components/ui/Icon'
const durations = [
  [1, '1 hour'],
  [24, '1 day'],
  [168, '1 week'],
  [720, '1 month'],
  [2160, '3 months'],
  [8760, '1 year'],
  [43800, '5 years'],
  [87600, '10 years'],
]
export default function StockDetailModal({ stock, onClose, onPlaceBid }) {
  const quote = useResource(`/api/market/stock/${encodeURIComponent(stock.symbol)}`, 60000),
    terms = useResource('/api/bid/terms'),
    balances = useResource('/api/wallet/balance')
  const selected = useSelector((s) => s.wallet.selectedWallet)
  const [predicted, setPredicted] = useState(
      stock.currentPrice > 0 ? String(stock.currentPrice) : '',
    ),
    [amount, setAmount] = useState('500'),
    [hours, setHours] = useState('24'),
    [custom, setCustom] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const pending = useRef(null),
    current = quote.data?.stock || stock
  const preview = useMemo(
    () =>
      generatePreviewTable(Math.max(0, Number(amount) || 0), (Number(hours) || 1) * 3600000, {
        userWinRate: terms.data?.winRate || 0,
        totalSettledBids: terms.data?.totalSettled || 0,
      }),
    [amount, hours, terms.data],
  )
  const wallet = balances.data?.wallets.find((w) => w.type === selected)
  async function place(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const body = {
      stockSymbol: stock.symbol,
      predictedPrice: Number(predicted),
      bidAmountRupees: Number(amount),
      walletType: selected,
      timespan: { durationMs: Math.round(Number(hours) * 3600000) },
    }
    const fingerprint = JSON.stringify(body)
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, key: crypto.randomUUID() }
    try {
      const result = await request('/api/bid/place', {
        method: 'POST',
        body,
        key: pending.current.key,
      })
      refreshResources()
      onPlaceBid(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={`${stock.symbol} · Price prediction`} onClose={onClose} wide>
      <div className="bid-grid">
        <section className="bid-chart">
          <div className="row spread">
            <div>
              <div className="eyebrow">
                {stock.exchange} · {stock.currency}
              </div>
              <h2>{stock.name}</h2>
            </div>
            <span className="badge">{current.marketState || 'Loading'}</span>
          </div>
          <div className="bid-price">
            {current.currentPrice ? money(current.currentPrice, current.currency) : '—'}
          </div>
          <p className="note">Provider quote · {dateTime(current.quoteAsOf)}</p>
          {quote.loading ? (
            <Loading label="Loading price history…" />
          ) : quote.error ? (
            <ResourceError error={quote.error} retry={quote.refresh} />
          ) : (
            <div style={{ marginTop: 28 }}>
              <CandleChart candles={quote.data.stock.candles} />
            </div>
          )}
          <p className="note" style={{ marginTop: 20 }}>
            Yahoo Finance data may be delayed. Predictions settle using the available provider quote
            when the settlement job runs, which can be after expiry.
          </p>
          <div style={{ marginTop: 28 }}>
            <h3>Understand the outcome</h3>
            <p className="note" style={{ marginTop: 9 }}>
              Exponential accuracy measures how close your prediction is to the settlement price.
              Results below 50% accuracy lose the full stake. Review all return amounts before
              placing a prediction.
            </p>
            <div style={{ marginTop: 15 }}>
              {preview.map((p) => (
                <div className="preview-row" key={p.accuracy}>
                  <span className="muted">{p.accuracy}% accuracy</span>
                  <span className={p.pnl > 0 ? 'positive' : p.pnl < 0 ? 'negative' : ''}>
                    {money(p.returnAmount)} <span className="muted">returned</span>
                  </span>
                </div>
              ))}
            </div>
            <small style={{ display: 'block', marginTop: 10 }}>
              Includes your current history bonus, if eligible. Terms are saved at placement.
            </small>
          </div>
        </section>
        <form className="bid-form" onSubmit={place}>
          <div className="eyebrow">Your perspective</div>
          <h2 style={{ marginBottom: 25 }}>Make a prediction</h2>
          <Message>{error}</Message>
          <div className="field" style={{ marginTop: 20 }}>
            <label htmlFor="prediction">Predicted price ({stock.currency})</label>
            <input
              id="prediction"
              type="number"
              min="0.000001"
              max="1000000000"
              step="any"
              required
              value={predicted}
              onChange={(e) => setPredicted(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="horizon">Time horizon</label>
            {!custom ? (
              <select id="horizon" value={hours} onChange={(e) => setHours(e.target.value)}>
                {durations.map(([h, label]) => (
                  <option key={h} value={h}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="horizon"
                type="number"
                required
                min="1"
                max="87600"
                step=".25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            )}
            <button
              type="button"
              className="table-action"
              onClick={() => {
                setCustom(!custom)
                setHours('24')
              }}
            >
              {custom ? 'Choose a preset' : 'Set a custom duration in hours'}
            </button>
          </div>
          <div className="field">
            <label htmlFor="stake">Stake (virtual ₹)</label>
            <input
              id="stake"
              type="number"
              min="100"
              max="100000"
              step=".01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <small className="field-help">Minimum ₹100 · Maximum ₹1,00,000 per prediction</small>
          </div>
          <div className="panel" style={{ padding: 17, marginBottom: 24 }}>
            <div className="row spread">
              <span>{walletName(selected)} wallet</span>
              <Icon name="wallet" size={17} />
            </div>
            <strong style={{ display: 'block', fontSize: 22, marginTop: 12, fontWeight: 500 }}>
              {wallet ? money(wallet.balance) : '—'}
            </strong>
            <small>Available virtual credits</small>
          </div>
          <p className="note" style={{ marginBottom: 20 }}>
            The stake is reserved immediately. You can cancel before expiry for a full refund. No
            actual securities or real money are involved.
          </p>
          <Button
            style={{ width: '100%' }}
            type="submit"
            disabled={
              busy || quote.loading || !terms.data || current.stale || !current.currentPrice
            }
          >
            {busy ? 'Placing prediction…' : 'Place prediction'} <Icon name="arrow" size={16} />
          </Button>
          {current.stale && (
            <p className="note" style={{ marginTop: 12 }}>
              Wait for a fresh quote before placing a prediction.
            </p>
          )}
        </form>
      </div>
    </Modal>
  )
}
