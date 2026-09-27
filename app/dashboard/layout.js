'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { loginSuccess, logoutSuccess } from '@/redux/slices/authSlice'
import { setSelectedWallet } from '@/redux/slices/walletSlice'
import useResource from '@/hooks/useResource'
import { request, money, dateTime, refreshResources } from '@/lib/client'
import Brand from '@/components/ui/Brand'
import Icon from '@/components/ui/Icon'
import { Loading, ResourceError, Modal, Empty, Button, Message } from '@/components/ui/Common'
const links = [
  ['Markets', '/dashboard', 'market'],
  ['Predictions', '/dashboard/bidding', 'predictions'],
  ['Portfolio', '/dashboard/portfolio', 'portfolio'],
  ['Wallet', '/dashboard/wallet', 'wallet'],
]
export default function DashboardLayout({ children }) {
  const router = useRouter(),
    path = usePathname(),
    dispatch = useDispatch()
  const me = useResource('/api/auth/me'),
    balances = useResource(me.data ? '/api/wallet/balance' : null, 15000),
    notifications = useResource(me.data ? '/api/notifications' : null, 15000)
  const selected = useSelector((s) => s.wallet.selectedWallet)
  const [menu, setMenu] = useState(false),
    [showNotifications, setShowNotifications] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    if (me.data) dispatch(loginSuccess(me.data))
    if (me.error?.status === 401) router.replace('/login')
  }, [me.data, me.error, dispatch, router])
  useEffect(() => {
    const expired = () => {
      dispatch(logoutSuccess())
      router.replace('/login')
    }
    window.addEventListener('vertex:session-expired', expired)
    ;['authToken', 'userId', 'userEmail', 'userName'].forEach((k) => localStorage.removeItem(k))
    return () => window.removeEventListener('vertex:session-expired', expired)
  }, [dispatch, router])
  useEffect(() => setMenu(false), [path])
  useEffect(() => {
    if (!me.data?.user?.id) return
    let active = false,
      disposed = false
    const sync = async () => {
      if (active || document.hidden || disposed) return
      active = true
      try {
        const result = await request('/api/bid/sync', { method: 'POST' })
        if (!disposed && (result.settled || result.refunded)) refreshResources()
      } catch {
      } finally {
        active = false
      }
    }
    sync()
    const timer = setInterval(sync, 30000)
    return () => {
      disposed = true
      clearInterval(timer)
    }
  }, [me.data?.user?.id])
  async function logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' })
      dispatch(logoutSuccess())
      router.replace('/login')
    } catch (e) {
      setError(e.message)
    }
  }
  async function markRead() {
    try {
      await request('/api/notifications', { method: 'POST' })
      refreshResources()
    } catch (e) {
      setError(e.message)
    }
  }
  if (me.loading) return <Loading label="Opening your workspace…" />
  if (!me.data)
    return me.error?.status === 401 ? (
      <Loading label="Returning to sign in…" />
    ) : (
      <ResourceError error={me.error} retry={me.refresh} />
    )
  const user = me.data.user,
    nav = user.role === 'ADMIN' ? [...links, ['Admin', '/dashboard/admin', 'admin']] : links
  const wallet = balances.data?.wallets.find((w) => w.type === selected)
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Brand />
        <button
          className="icon-button sidebar-close"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <Icon name="close" />
        </button>
        <div className="eyebrow" style={{ paddingLeft: 14, fontSize: 10 }}>
          Workspace
        </div>
        <nav>
          {nav.map(([label, href, icon]) => (
            <Link
              href={href}
              key={href}
              className={`nav-link ${path === href ? 'active' : ''}`}
              aria-current={path === href ? 'page' : undefined}
            >
              <Icon name={icon} size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="practice-note">
            <span className="badge badge-blue">Simulation mode</span>
            <p>
              A place to build perspective.
              <br />
              All wallet funds are virtual.
            </p>
            <Link
              className="link"
              href="/terms"
              style={{ fontSize: 11, display: 'block', marginTop: 10 }}
            >
              How predictions work ↗
            </Link>
          </div>
          <div className="profile">
            <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
            <div className="profile-copy">
              <strong>{user.name}</strong>
              <small>{user.role === 'ADMIN' ? 'Administrator' : 'Personal workspace'}</small>
            </div>
            <button className="icon-button" title="Sign out" aria-label="Sign out" onClick={logout}>
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            Workspace <span style={{ margin: '0 12px', color: '#555562' }}>/</span>{' '}
            {nav.find((n) => n[1] === path)?.[0] || 'Overview'}
          </div>
          <div className="topbar-right">
            <div className="wallet-select" aria-label="Selected wallet">
              {[
                ['VIRTUAL', 'Practice'],
                ['REAL', 'Demo cash'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={selected === value ? 'active' : ''}
                  aria-pressed={selected === value}
                  onClick={() => dispatch(setSelectedWallet(value))}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="topbar-balance">
              <small>Available credits</small>
              <strong>{wallet ? money(wallet.balance) : '—'}</strong>
            </div>
            <button
              className="icon-button notification-button"
              aria-label={`Notifications${notifications.data?.unread ? `, ${notifications.data.unread} unread` : ''}`}
              onClick={() => setShowNotifications(true)}
            >
              <Icon name="bell" />
              {!!notifications.data?.unread && <span className="notification-dot" />}
            </button>
          </div>
        </header>
        <main className="workspace">
          <Message>{error}</Message>
          {children}
        </main>
      </div>
      {showNotifications && (
        <Modal title="Notifications" onClose={() => setShowNotifications(false)}>
          <div className="modal-content">
            {notifications.loading ? (
              <Loading />
            ) : notifications.error ? (
              <ResourceError error={notifications.error} retry={notifications.refresh} />
            ) : notifications.data?.notifications.length ? (
              <>
                <Button secondary onClick={markRead}>
                  Mark all as read
                </Button>
                {notifications.data.notifications.map((n) => (
                  <article key={n._id} className={`notification-item ${!n.readAt ? 'unread' : ''}`}>
                    <h3>{n.title}</h3>
                    <p>{n.message}</p>
                    <small>{dateTime(n.createdAt)}</small>
                  </article>
                ))}
              </>
            ) : (
              <Empty
                title="You’re all caught up"
                text="Prediction results and account updates will appear here."
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
