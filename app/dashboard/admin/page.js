'use client'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import useResource from '@/hooks/useResource'
import { request, money, dateTime, walletName, refreshResources } from '@/lib/client'
import {
  PageHeading,
  Stat,
  Button,
  Loading,
  ResourceError,
  ResourceNotice,
  Pagination,
  Modal,
  Message,
  Empty,
} from '@/components/ui/Common'
export default function AdminPage() {
  const user = useSelector((s) => s.auth.user),
    allowed = user?.role === 'ADMIN'
  const [tab, setTab] = useState('users'),
    [page, setPage] = useState(1),
    [action, setAction] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const overview = useResource(allowed ? '/api/admin/overview' : null, 15000),
    list = useResource(allowed ? `/api/admin/${tab}?page=${page}` : null, 15000)
  async function execute() {
    setBusy(true)
    setError('')
    try {
      if (action.kind === 'user')
        await request('/api/admin/users', {
          method: 'POST',
          body: {
            userId: action.user._id,
            status: action.user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
          },
        })
      if (action.kind === 'pause')
        await request('/api/admin/settings', {
          method: 'POST',
          body: { biddingPaused: !overview.data?.system?.biddingPaused },
        })
      if (action.kind === 'settle') {
        const r = await request('/api/admin/settle', { method: 'POST' })
        setNotice(
          `Settlement processed: ${r.settled} settled, ${r.refunded} refunded, ${r.failed} failed.`,
        )
      } else setNotice('Admin action completed and recorded in the audit log.')
      setAction(null)
      refreshResources()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  if (!allowed)
    return (
      <Empty
        title="Administrator access required"
        text="This workspace is only available to the verified administrator."
        href="/dashboard"
      />
    )
  const state = overview.data?.system,
    items = list.data?.[tab] || []
  return (
    <>
      <PageHeading
        eyebrow="Platform operations"
        title="Admin workspace"
        text="Keep the platform healthy. Every control action is recorded."
      />
      <Message success>{notice}</Message>
      <ResourceNotice resource={overview} />
      {overview.loading || (!overview.data && !overview.error) ? (
        <Loading label="Loading platform overview" variant="stats" />
      ) : overview.error && !overview.data ? (
        <ResourceError error={overview.error} retry={overview.refresh} />
      ) : (
        <div className="stack">
          <div className="stats">
            {Object.entries({
              Users: overview.data.stats.users,
              'Active predictions': overview.data.stats.activeBids,
              'Awaiting settlement': overview.data.stats.overdueBids,
              'Ledger entries': overview.data.stats.transactions,
            }).map(([label, value]) => (
              <Stat key={label} label={label} value={value} />
            ))}
          </div>
          <div className="panel panel-body admin-controls">
            <div>
              <h3>
                {state?.biddingPaused ? 'New predictions are paused' : 'Predictions are open'}
              </h3>
              <p className="note" style={{ marginTop: 8 }}>
                Last settlement: {dateTime(state?.lastSettlement)}
                <br />
                Worker heartbeat: {dateTime(state?.workerHeartbeat)}
              </p>
            </div>
            <div className="row">
              <Button
                secondary
                onClick={() => {
                  setAction({ kind: 'pause' })
                  setError('')
                }}
              >
                {state?.biddingPaused ? 'Resume predictions' : 'Pause predictions'}
              </Button>
              <Button
                onClick={() => {
                  setAction({ kind: 'settle' })
                  setError('')
                }}
              >
                Run settlement
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="toolbar">
        <div className="tabs">
          {['users', 'bids', 'transactions'].map((t) => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => {
                setTab(t)
                setPage(1)
              }}
            >
              {t === 'bids' ? 'Predictions' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <span className="badge">Demo payments only</span>
      </div>
      <ResourceNotice resource={list} />
      {list.loading ? (
        <Loading label="Loading platform records" />
      ) : list.error && !list.data ? (
        <ResourceError error={list.error} retry={list.refresh} />
      ) : !items.length ? (
        <Empty title="No records yet" text="Platform activity will appear here." />
      ) : (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                {(tab === 'users'
                  ? ['User', 'Verified', 'Status', 'Joined', 'Control']
                  : tab === 'bids'
                    ? ['Market / user', 'Stake', 'Wallet', 'Status', 'Expires']
                    : ['Activity / user', 'Amount', 'Wallet', 'Balance after', 'Date']
                ).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) =>
                tab === 'users' ? (
                  <tr key={item._id}>
                    <td>
                      {item.name}
                      <small>{item.email}</small>
                    </td>
                    <td>{item.isVerified ? 'Yes' : 'No'}</td>
                    <td>
                      <span className="badge">{item.status || 'ACTIVE'}</span>
                    </td>
                    <td>{dateTime(item.createdAt)}</td>
                    <td>
                      <Button
                        secondary
                        disabled={item._id === user.id}
                        onClick={() => {
                          setAction({ kind: 'user', user: item })
                          setError('')
                        }}
                      >
                        {item.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      </Button>
                    </td>
                  </tr>
                ) : tab === 'bids' ? (
                  <tr key={item._id}>
                    <td>
                      {item.stockSymbol}
                      <small>{item.userId}</small>
                    </td>
                    <td>{money(item.bidAmount)}</td>
                    <td>{walletName(item.walletType)}</td>
                    <td>{item.status}</td>
                    <td>{dateTime(item.expiresAt)}</td>
                  </tr>
                ) : (
                  <tr key={item._id}>
                    <td>
                      {item.type}
                      <small>{item.userId}</small>
                    </td>
                    <td>{money(item.amount)}</td>
                    <td>{walletName(item.walletType)}</td>
                    <td>{money(item.balanceAfter)}</td>
                    <td>{dateTime(item.timestamp)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={list.data?.total} onPage={setPage} />
      <section className="panel" style={{ marginTop: 28 }}>
        <div className="panel-heading">
          <h3>Recent admin activity</h3>
        </div>
        {!overview.data?.audit.length ? (
          <Empty title="No administrative changes" text="Control actions will be recorded here." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {overview.data.audit.map((a) => (
                  <tr key={a._id}>
                    <td>{a.action.replaceAll('_', ' ')}</td>
                    <td>{a.targetId || 'Platform'}</td>
                    <td>{dateTime(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {action && (
        <Modal
          title="Confirm admin action"
          onClose={() => {
            if (!busy) setAction(null)
          }}
        >
          <div className="modal-content">
            <p>
              {action.kind === 'user'
                ? `${action.user.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'} ${action.user.email}? Existing sessions will be revoked. Active predictions will still settle.`
                : action.kind === 'pause'
                  ? `${state?.biddingPaused ? 'Resume' : 'Pause'} new predictions? Existing predictions will continue through their lifecycle.`
                  : 'Process up to 20 expired predictions using available provider quotes. Unavailable quotes result in refunds.'}
            </p>
            <div style={{ marginTop: 20 }}>
              <Message>{error}</Message>
            </div>
            <div className="modal-actions">
              <Button secondary disabled={busy} onClick={() => setAction(null)}>
                Go back
              </Button>
              <Button disabled={busy} onClick={execute}>
                {busy ? 'Processing…' : 'Confirm action'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
