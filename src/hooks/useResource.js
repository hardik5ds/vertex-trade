'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '@/lib/client'
// Opt-in only for public market lists. Wallets, identity and other private data
// are never kept here across page visits. Entries are bounded and short-lived.
const marketCache = new Map()
function cached(url, enabled) {
  if (!enabled || !url?.startsWith('/api/market/prices?')) return null
  const entry = marketCache.get(url)
  if (entry && Date.now() - entry.at < 300000)
    return {
      ...entry.data,
      stocks: entry.data.stocks.map((stock) =>
        Date.now() - new Date(stock.fetchedAt || 0).getTime() > 120000
          ? { ...stock, stale: true, marketState: stock.currentPrice > 0 ? 'STALE' : 'UNAVAILABLE' }
          : stock,
      ),
    }
  marketCache.delete(url)
  return null
}
export default function useResource(url, interval = 0, { cache = false, initialUrl } = {}) {
  const [state, setState] = useState({ url, data: cached(url, cache), error: null, pending: !!url })
  const active = useRef(null)
  const refresh = useCallback(async () => {
    if (!url || active.current) return
    const controller = new AbortController()
    active.current = controller
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 35000)
    setState((previous) => ({
      url,
      data: previous.url === url ? previous.data : cached(url, cache),
      error: previous.url === url ? previous.error : null,
      pending: true,
    }))
    const publish = (result) => {
      if (controller.signal.aborted) return
      if (cache && url.startsWith('/api/market/prices?')) {
        marketCache.delete(url)
        marketCache.set(url, { data: result, at: Date.now() })
        if (marketCache.size > 8) marketCache.delete(marketCache.keys().next().value)
      }
      setState({ url, data: result, error: null, pending: true })
    }
    try {
      // Show the database snapshot before waiting for external price providers.
      if (initialUrl && !cached(url, cache))
        publish(await request(initialUrl, { signal: controller.signal }))
      publish(await request(url, { signal: controller.signal }))
    } catch (e) {
      if (active.current === controller && (!controller.signal.aborted || timedOut))
        setState((previous) => ({
          ...previous,
          data: [401, 403].includes(e.status) ? null : previous.data,
          error: timedOut ? new Error('The request took too long. Please try again.') : e,
        }))
    } finally {
      clearTimeout(timeout)
      if (active.current === controller) {
        active.current = null
        setState((previous) => ({ ...previous, pending: false }))
      }
    }
  }, [url, cache, initialUrl])
  useEffect(() => {
    setState({ url, data: cached(url, cache), error: null, pending: !!url })
    refresh()
    const onRefresh = () => refresh()
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    const timer = interval ? setInterval(onVisible, interval) : null
    window.addEventListener('vertex:refresh', onRefresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      active.current?.abort()
      active.current = null
      window.removeEventListener('vertex:refresh', onRefresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [url, interval, refresh, cache])
  const current =
    state.url === url ? state : { data: cached(url, cache), error: null, pending: !!url }
  return {
    data: current.data,
    error: current.error,
    loading: current.pending && !current.data && !current.error,
    refreshing: current.pending,
    refresh,
  }
}
