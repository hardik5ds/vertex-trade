'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import useResource from '@/hooks/useResource'
import { request, money, dateTime, walletName, refreshResources } from '@/lib/client'
import {
  PageHeading,
  Button,
  Empty,
  Loading,
  ResourceError,
  Pagination,
  Modal,
  Message,
} from '@/components/ui/Common'
import Icon from '@/components/ui/Icon'
function Countdown({ expiresAt }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const seconds = Math.max(0, Math.floor((new Date(expiresAt) - now) / 1000))
  return (
    <span>
      {!seconds
        ? 'Awaiting settlement'
        : seconds >= 86400
          ? `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h left`
          : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s left`}
    </span>
  )
}
export default function BiddingPage() {
  const [tab, setTab] = useState('active'),
    [page, setPage] = useState(1),
    [cancel, setCancel] = useState(null),
    [detail, setDetail] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const resource = useResource(`/api/bid/${tab}?page=${page}&limit=20`, 10000)
  async function doCancel() {
    setBusy(true)
    setError('')
    try {
      await request(`/api/bid/${cancel.id}/cancel`, { method: 'POST' })
      setCancel(null)
      setNotice('Prediction cancelled. Your stake has been returned.')
      refreshResources()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Your perspective in action"
        title="Predictions"
        text="Every prediction, from first thought to final result."
      >
        <Link href="/dashboard" className="button">
          New prediction <Icon name="arrow" size={15} />
        </Link>
      </PageHeading>
      <Message success>{notice}</Message>
      <div className="toolbar">
        <div className="tabs">
          {[
            ['active', 'Active predictions'],
            ['history', 'History'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? 'active' : ''}
              onClick={() => {
                setTab(value)
                setPage(1)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <small>Updates every 10 seconds</small>
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ResourceError error={resource.error} retry={resource.refresh} />
      ) : !resource.data?.bids.length ? (
        <div className="panel">
          <Empty
            title={
              tab === 'active' ? 'Your next prediction starts here' : 'Your story is just beginning'
            }
            text={
              tab === 'active'
                ? 'Explore a stock, choose a future price, and put your perspective to the test.'
                : 'Settled, cancelled, and refunded predictions will appear here.'
            }
            href="/dashboard"
          />
        </div>
      ) : tab === 'active' ? (
        <div className="stack">
          {resource.data.bids.map((b) => (
            <article className="prediction-card" key={b.id}>
              <div className="row spread">
                <div className="row">
                  <span className="market-icon">{b.stockSymbol.slice(0, 2)}</span>
                  <div>
                    <h3>{b.stockSymbol}</h3>
                    <small>{b.stockName}</small>
                  </div>
                </div>
                <span className="badge">{walletName(b.walletType)}</span>
              </div>
              <div className="prediction-values">
                <div>
                  <small>Your target</small>
                  <strong>{money(b.predictedPrice, b.currency)}</strong>
                </div>
                <div>
                  <small>Entry price</small>
                  <strong>{money(b.priceAtBid, b.currency)}</strong>
                </div>
                <div>
                  <small>Stake</small>
                  <strong>{money(b.bidAmount)}</strong>
                </div>
              </div>
              <div className="prediction-footer">
                <span className="row">
                  <Icon name="clock" size={14} />
                  <Countdown expiresAt={b.expiresAt} />
                </span>
                <span>Expires {dateTime(b.expiresAt)}</span>
                <Button
                  secondary
                  onClick={() => {
                    setCancel(b)
                    setError('')
                  }}
                  disabled={new Date(b.expiresAt) <= new Date()}
                >
                  Cancel prediction
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>Result</th>
                <th>Stake / returned</th>
                <th>Accuracy</th>
                <th>Net result</th>
                <th>Settled</th>
              </tr>
            </thead>
            <tbody>
              {resource.data.bids.map((b) => (
                <tr key={b.id}>
                  <td>
                    <button className="table-action" onClick={() => setDetail(b)}>
                      {b.stockSymbol} ↗
                    </button>
                    <small>{walletName(b.walletType)}</small>
                  </td>
                  <td>
                    <span className="badge">
                      {b.status === 'SETTLED'
                        ? b.outcome?.replace('_', ' ') || 'SETTLED'
                        : b.status}
                    </span>
                  </td>
                  <td>
                    {money(b.bidAmount)}
                    <small>{money(b.returnAmount)} returned</small>
                  </td>
                  <td>{b.accuracyPercent == null ? '—' : `${b.accuracyPercent.toFixed(3)}%`}</td>
                  <td className={b.pnl > 0 ? 'positive' : b.pnl < 0 ? 'negative' : ''}>
                    {money(b.pnl ?? b.netResult)}
                  </td>
                  <td>
                    <small>{dateTime(b.settledAt)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={resource.data?.total} onPage={setPage} />
      {cancel && (
        <Modal
          title="Cancel this prediction?"
          onClose={() => {
            if (!busy) setCancel(null)
          }}
        >
          <div className="modal-content">
            <p>
              Your full {money(cancel.bidAmount)} stake on {cancel.stockSymbol} will return to your{' '}
              {walletName(cancel.walletType).toLowerCase()} wallet.
            </p>
            <div style={{ marginTop: 15 }}>
              <Message>{error}</Message>
            </div>
            <div className="modal-actions">
              <Button secondary disabled={busy} onClick={() => setCancel(null)}>
                Keep prediction
              </Button>
              <Button disabled={busy} onClick={doCancel}>
                {busy ? 'Cancelling…' : 'Confirm cancellation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {detail && (
        <Modal title={`${detail.stockSymbol} · Prediction result`} onClose={() => setDetail(null)}>
          <div className="modal-content">
            <dl className="details-grid">
              {[
                ['Predicted price', money(detail.predictedPrice, detail.currency)],
                [
                  'Settlement price',
                  detail.actualSettlementPrice
                    ? money(detail.actualSettlementPrice, detail.currency)
                    : 'Not applicable',
                ],
                ['Accuracy', detail.accuracyPercent == null ? '—' : `${detail.accuracyPercent}%`],
                [
                  'Multiplier',
                  detail.profitMultiplier == null ? '—' : `${detail.profitMultiplier.toFixed(6)}×`,
                ],
                ['Stake', money(detail.bidAmount)],
                ['Return', money(detail.returnAmount)],
                ['Provider quote', dateTime(detail.settlementQuoteAsOf)],
                ['Processed at', dateTime(detail.settledAt)],
                ['Rule version', detail.formulaVersion || 'Legacy V2'],
                ['Reference', detail.id],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {detail.refundReason && (
              <p className="note" style={{ marginTop: 20 }}>
                {detail.refundReason}
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
