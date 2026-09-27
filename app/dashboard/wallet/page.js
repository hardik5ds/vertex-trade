'use client'
import { useRef, useState } from 'react'
import useResource from '@/hooks/useResource'
import { request, money, dateTime, walletName, refreshResources } from '@/lib/client'
import {
  PageHeading,
  Button,
  Empty,
  Loading,
  ResourceError,
  ResourceNotice,
  Pagination,
  Modal,
  Message,
} from '@/components/ui/Common'
import Icon from '@/components/ui/Icon'
export default function WalletPage() {
  const [page, setPage] = useState(1),
    [filter, setFilter] = useState('ALL'),
    [payment, setPayment] = useState(null),
    [amount, setAmount] = useState('1000'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [receipt, setReceipt] = useState(null)
  const pending = useRef(null),
    balances = useResource('/api/wallet/balance', 15000),
    history = useResource(`/api/wallet/transactions?page=${page}&wallet=${filter}`, 15000)
  async function refill() {
    setBusy(true)
    setError('')
    try {
      const result = await request('/api/wallet/demo', { method: 'POST' })
      setNotice(`${money(result.amountAdded)} added to your practice wallet.`)
      refreshResources()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function pay(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const body = { action: payment, amount: Number(amount) },
      fingerprint = JSON.stringify(body)
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, key: crypto.randomUUID() }
    try {
      const result = await request('/api/wallet/payment', {
        method: 'POST',
        body,
        key: pending.current.key,
      })
      setReceipt(result.transaction)
      setPayment(null)
      pending.current = null
      setNotice(`Demo ${body.action} completed. No real money was transferred.`)
      refreshResources()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  function open(action) {
    setError('')
    setPayment(action)
    setAmount('1000')
    pending.current = null
  }
  return (
    <>
      <PageHeading
        eyebrow="Make room for your next idea"
        title="Wallet"
        text="Two ways to practice. All funds are simulated."
      />
      <Message success>{notice}</Message>
      {!payment && <Message>{error}</Message>}
      <ResourceNotice resource={balances} />
      {balances.loading ? (
        <Loading label="Loading wallets" variant="wallet" />
      ) : balances.error && !balances.data ? (
        <ResourceError error={balances.error} retry={balances.refresh} />
      ) : (
        <div className="wallet-grid" style={{ marginTop: 20 }}>
          {[...balances.data.wallets]
            .sort((a, b) => (a.type === 'VIRTUAL' ? -1 : 1))
            .map((w) => (
              <section className="panel wallet-card" key={w.type}>
                <div className="row spread" style={{ margin: 0 }}>
                  <span className="eyebrow" style={{ margin: 0 }}>
                    {walletName(w.type)} wallet
                  </span>
                  <Icon name="wallet" />
                </div>
                <div className="wallet-amount">{money(w.balance)}</div>
                <p className="note">
                  Available credits · {money(w.reserved)} in active predictions
                </p>
                {w.type === 'VIRTUAL' ? (
                  <>
                    <div className="row">
                      <Button
                        secondary
                        onClick={refill}
                        disabled={busy || w.balance + w.reserved >= 100000}
                      >
                        Refill practice credits
                      </Button>
                    </div>
                    <p className="note" style={{ marginTop: 16 }}>
                      Refill up to ₹1,00,000 including active stakes, once every 24 hours.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="row">
                      <Button onClick={() => open('deposit')}>Demo deposit</Button>
                      <Button secondary onClick={() => open('withdraw')}>
                        Demo withdrawal
                      </Button>
                    </div>
                    <p className="note" style={{ marginTop: 16 }}>
                      Simulated payments. No card, bank details, or real money required.
                    </p>
                  </>
                )}
              </section>
            ))}
        </div>
      )}
      <section style={{ marginTop: 36 }}>
        <div className="row spread">
          <h2>Transaction history</h2>
          <small>A record of every balance change</small>
        </div>
        <div className="toolbar">
          <div className="tabs">
            {[
              ['ALL', 'All wallets'],
              ['VIRTUAL', 'Practice'],
              ['REAL', 'Demo cash'],
            ].map(([k, label]) => (
              <button
                key={k}
                className={filter === k ? 'active' : ''}
                onClick={() => {
                  setFilter(k)
                  setPage(1)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResourceNotice resource={history} />
        {history.loading ? (
          <Loading label="Loading transactions" />
        ) : history.error && !history.data ? (
          <ResourceError error={history.error} retry={history.refresh} />
        ) : !history.data?.transactions.length ? (
          <div className="panel">
            <Empty
              title="A clean slate"
              text="Your deposits, prediction stakes, and returns will appear here."
            />
          </div>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Wallet</th>
                  <th>Amount</th>
                  <th>Balance after</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.data.transactions.map((t) => {
                  const debit = ['BID_PLACED', 'WITHDRAWAL'].includes(t.type)
                  return (
                    <tr key={t._id}>
                      <td>
                        <button
                          className="table-action"
                          style={{ paddingLeft: 0 }}
                          onClick={() => setReceipt(t)}
                        >
                          {t.type.replaceAll('_', ' ')} ↗
                        </button>
                        <small>{t.description}</small>
                      </td>
                      <td>{walletName(t.walletType)}</td>
                      <td className={debit ? 'negative' : t.amount > 0 ? 'positive' : ''}>
                        {debit ? '−' : t.amount > 0 ? '+' : ''}
                        {money(t.amount)}
                      </td>
                      <td>{money(t.balanceAfter)}</td>
                      <td>
                        <small>{dateTime(t.timestamp)}</small>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={history.data?.total} onPage={setPage} />
      </section>
      {payment && (
        <Modal
          title={payment === 'deposit' ? 'Demo deposit' : 'Demo withdrawal'}
          onClose={() => {
            if (!busy) setPayment(null)
          }}
        >
          <form className="modal-content" onSubmit={pay}>
            <span className="badge badge-blue">Simulation only</span>
            <p style={{ margin: '16px 0 24px' }}>
              This updates your demo cash balance. No real funds are charged, transferred, or
              withdrawn.
            </p>
            <Message>{error}</Message>
            <div className="field" style={{ marginTop: 20 }}>
              <label htmlFor="payment-amount">Amount (virtual ₹)</label>
              <input
                id="payment-amount"
                type="number"
                min="1"
                max="100000"
                step=".01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <small className="field-help">₹1–₹1,00,000 per demo transaction</small>
            </div>
            <Button style={{ width: '100%' }} disabled={busy} type="submit">
              {busy ? 'Processing…' : `Simulate ${payment}`}
            </Button>
          </form>
        </Modal>
      )}
      {receipt && (
        <Modal title="Transaction receipt" onClose={() => setReceipt(null)}>
          <div className="modal-content">
            <span className="badge badge-blue">Virtual funds · No monetary value</span>
            <div className="wallet-amount">{money(receipt.amount)}</div>
            <p style={{ marginBottom: 24 }}>{receipt.description}</p>
            <dl className="details-grid">
              {[
                ['Wallet', walletName(receipt.walletType)],
                ['Balance after', money(receipt.balanceAfter)],
                ['Date', dateTime(receipt.timestamp)],
                ['Reference', receipt._id],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Modal>
      )}
    </>
  )
}
