'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '@/lib/client'
export default function useResource(url, interval = 0) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true)
  const active = useRef(null)
  const refresh = useCallback(async () => {
    if (!url || active.current) return
    const controller = new AbortController()
    active.current = controller
    try {
      const result = await request(url, { signal: controller.signal })
      if (!controller.signal.aborted) {
        setData(result)
        setError(null)
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e)
    } finally {
      if (active.current === controller) {
        active.current = null
        setLoading(false)
      }
    }
  }, [url])
  useEffect(() => {
    setData(null)
    setLoading(!!url)
    setError(null)
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
  }, [url, interval, refresh])
  return { data, error, loading, refresh }
}
