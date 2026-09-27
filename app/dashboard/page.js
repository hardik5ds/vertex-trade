'use client'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import useResource from '@/hooks/useResource'
import { money } from '@/lib/client'
import {
  PageHeading,
  Stat,
  Button,
  Loading,
  ResourceError,
  Empty,
  Pagination,
  Message,
} from '@/components/ui/Common'
import Icon from '@/components/ui/Icon'
import { Sparkline } from '@/components/ui/Charts'
import StockDetailModal from '@/components/dashboard/StockDetailModal'
export default function DashboardPage() {
  const selected = useSelector((s) => s.wallet.selectedWallet),
    user = useSelector((s) => s.auth.user)
  const [exchange, setExchange] = useState('ALL'),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [stock, setStock] = useState(null),
    [notice, setNotice] = useState('')
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])
  const market = useResource(
      `/api/market/prices?limit=24&page=${page}&exchange=${exchange}&q=${encodeURIComponent(query)}`,
      60000,
    ),
    stats = useResource(`/api/portfolio/stats?wallet=${selected}`, 15000)
  const summary = stats.data?.summary
  return (
    <>
      <PageHeading
        eyebrow="Your market workspace"
        title={`A new perspective${user?.name ? `, ${user.name.split(' ')[0]}` : ''}.`}
        text="Explore the market. Find your next prediction."
      >
        <span className="badge badge-blue">Simulation mode</span>
      </PageHeading>
      <div className="stack">
        <div className="stats">
          <Stat
            label="Available credits"
            value={summary ? money(summary.available) : '—'}
            detail={selected === 'VIRTUAL' ? 'Practice wallet' : 'Demo cash wallet'}
          />
          <Stat
            label="Active predictions"
            value={summary?.activeBids ?? '—'}
            detail={summary ? `${money(summary.reserved)} committed` : 'Your open positions'}
          />
          <Stat
            label="Realized result"
            value={summary ? money(summary.pnl) : '—'}
            detail="From settled predictions"
            tone={summary?.pnl > 0 ? 'positive' : summary?.pnl < 0 ? 'negative' : ''}
          />
          <Stat
            label="Prediction win rate"
            value={summary ? `${summary.winRate.toFixed(1)}%` : '—'}
            detail={
              summary ? `${summary.settledBids} settled predictions` : 'Build your track record'
            }
          />
        </div>
        <Message success>{notice}</Message>
      </div>
      <div style={{ marginTop: 34 }}>
        <div className="row spread">
          <h2>Explore markets</h2>
          <Button secondary onClick={market.refresh} disabled={market.loading}>
            <Icon name="refresh" size={15} />
            Refresh
          </Button>
        </div>
        <div className="toolbar">
          <div className="tabs">
            {['ALL', 'NSE', 'NASDAQ', 'NYSE', 'CRYPTO'].map((e) => (
              <button
                key={e}
                className={exchange === e ? 'active' : ''}
                aria-pressed={exchange === e}
                onClick={() => {
                  setExchange(e)
                  setPage(1)
                }}
              >
                {e === 'ALL' ? 'All markets' : e === 'CRYPTO' ? 'Crypto' : e}
              </button>
            ))}
          </div>
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search markets"
              placeholder="Search symbol or company"
              value={search}
              maxLength={80}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="market-notice">
          <span>
            <span className="status-dot" />
            Market data by Yahoo Finance · Quotes may be delayed
          </span>
          <span>Refreshes every minute while this page is open</span>
        </div>
        {market.loading ? (
          <Loading label="Fetching market quotes…" />
        ) : market.error ? (
          <ResourceError error={market.error} retry={market.refresh} />
        ) : !market.data?.stocks.length ? (
          <Empty
            title="No matching markets"
            text="Try another company name, symbol, or exchange."
          />
        ) : (
          <>
            <div className="market-grid">
              {market.data.stocks.map((s) => (
                <button
                  className="stock-card"
                  key={s.symbol}
                  onClick={() => {
                    setStock(s)
                    setNotice('')
                  }}
                  aria-label={`View ${s.symbol} and make a prediction`}
                >
                  <div className="stock-card-top">
                    <div className="row">
                      <span className="market-icon">{s.symbol.slice(0, 2)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="stock-symbol">{s.symbol}</div>
                        <p className="stock-name">{s.name}</p>
                      </div>
                    </div>
                    <small>{s.exchange}</small>
                  </div>
                  <div className="row spread" style={{ alignItems: 'end' }}>
                    <div>
                      <div className="stock-price">
                        {s.currentPrice ? money(s.currentPrice, s.currency) : '—'}
                      </div>
                      <span
                        className={s.priceChangePercent >= 0 ? 'positive' : 'negative'}
                        style={{ fontSize: 12 }}
                      >
                        {s.currentPrice
                          ? `${s.priceChangePercent >= 0 ? '+' : ''}${s.priceChangePercent.toFixed(2)}%`
                          : 'Price unavailable'}
                      </span>
                    </div>
                    <Sparkline history={s.priceHistory} />
                  </div>
                  <div className="stock-meta" style={{ marginTop: 18 }}>
                    <small>
                      {s.marketState === 'STALE'
                        ? 'Last known quote'
                        : s.marketState === 'UNAVAILABLE'
                          ? 'Waiting for data'
                          : s.marketState === 'OPEN'
                            ? 'Market open'
                            : 'Market closed'}
                    </small>
                    <Icon name="arrow" size={15} />
                  </div>
                </button>
              ))}
            </div>
            <Pagination page={page} limit={24} total={market.data.total} onPage={setPage} />
          </>
        )}
      </div>
      {stock && (
        <StockDetailModal
          stock={stock}
          onClose={() => setStock(null)}
          onPlaceBid={() => {
            setStock(null)
            setNotice('Prediction placed. Track it in Predictions.')
          }}
        />
      )}
    </>
  )
}
