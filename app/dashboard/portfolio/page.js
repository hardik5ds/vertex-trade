'use client'
import { useSelector } from 'react-redux'
import useResource from '@/hooks/useResource'
import { money, walletName } from '@/lib/client'
import { BalanceChart } from '@/components/ui/Charts'
import { PageHeading, Stat, Empty, Loading, ResourceError } from '@/components/ui/Common'
export default function PortfolioPage() {
  const wallet = useSelector((s) => s.wallet.selectedWallet),
    resource = useResource(`/api/portfolio/stats?wallet=${wallet}`, 15000),
    data = resource.data,
    s = data?.summary
  return (
    <>
      <PageHeading
        eyebrow="Your progress, in perspective"
        title="Portfolio"
        text={`Performance and exposure in your ${walletName(wallet).toLowerCase()} wallet.`}
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ResourceError error={resource.error} retry={resource.refresh} />
      ) : (
        <div className="stack">
          <div className="stats">
            <Stat
              label="Wallet equity"
              value={money(s.equity)}
              detail="Available credits + active stakes"
            />
            <Stat
              label="Realized result"
              value={money(s.pnl)}
              detail={`${s.settledBids} settled predictions`}
              tone={s.pnl > 0 ? 'positive' : s.pnl < 0 ? 'negative' : ''}
            />
            <Stat
              label="Win rate"
              value={`${s.winRate.toFixed(1)}%`}
              detail={`${s.wins} profitable outcomes`}
            />
            <Stat
              label="Active exposure"
              value={`${s.exposurePercent.toFixed(1)}%`}
              detail={`${money(s.reserved)} in predictions`}
            />
          </div>
          <div className="split">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Available balance</h3>
                  <p className="note" style={{ marginTop: 7 }}>
                    Last seven days · daily balance in UTC
                  </p>
                </div>
                <span className="badge">7 days</span>
              </div>
              <div className="panel-body">
                <BalanceChart data={data.equityCurve} />
                <p className="note" style={{ marginTop: 15 }}>
                  Includes credits, withdrawals, and prediction activity. This is your available
                  balance, not an investment return chart.
                </p>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h3>Active allocation</h3>
              </div>
              {!data.sectors.length ? (
                <Empty
                  title="Room to explore"
                  text="Sector allocation appears when you place a prediction."
                />
              ) : (
                <div className="panel-body stack">
                  {data.sectors.map((sec) => (
                    <div key={sec.name}>
                      <div className="row spread" style={{ marginBottom: 10 }}>
                        <span>{sec.name}</span>
                        <small>{((sec.value / s.reserved) * 100).toFixed(1)}%</small>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${(sec.value / s.reserved) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="note">Allocation by company sector, based on active stakes.</p>
                </div>
              )}
            </section>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h3>Your strongest markets</h3>
              <small>Ranked by realized result</small>
            </div>
            {!data.topStocks.length ? (
              <Empty
                title="A track record takes time"
                text="Your top markets appear after your first prediction settles."
                href="/dashboard"
              />
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Settled predictions</th>
                      <th>Net result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topStocks.map((t) => (
                      <tr key={t.symbol}>
                        <td>{t.symbol}</td>
                        <td>{t.count}</td>
                        <td className={t.pnl >= 0 ? 'positive' : 'negative'}>{money(t.pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
