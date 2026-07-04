import { useCallback, useEffect, useMemo, useRef } from 'react'

import { collectPageview } from './collect'
import { DEFAULT_API_URL } from './constants'
import { SundayAnalyticsContext } from './context'
import { subscribeToRouteChanges } from './history'
import { sendHit } from './transport'

/**
 * SundayAnalyticsProvider — drop-in, router-agnostic pageview tracking.
 *
 * Auto-tracks a pageview on mount and on every History API navigation
 * (pushState / replaceState / popstate). Cookieless: a session id lives in
 * sessionStorage and rolls after 30 minutes of inactivity. Hits are sent via
 * navigator.sendBeacon with a fetch keepalive fallback.
 *
 * @param {object} props
 * @param {string} props.siteKey - public site key from analytics_sites
 * @param {string} [props.apiUrl] - ingest endpoint; defaults to Sunday Analyzer's hosted function
 * @param {import('react').ReactNode} props.children
 */
export function SundayAnalyticsProvider({ siteKey, apiUrl = DEFAULT_API_URL, children }) {
  // Dedupe consecutive hits for the same path — replaceState often fires for
  // in-place state updates that aren't real navigations.
  const lastPathRef = useRef(null)

  useEffect(() => {
    if (!siteKey || typeof window === 'undefined') return undefined

    const trackPageview = () => {
      const path = `${window.location.pathname}${window.location.search}`
      if (path === lastPathRef.current) return
      lastPathRef.current = path
      sendHit(apiUrl, collectPageview(siteKey))
    }

    trackPageview()
    return subscribeToRouteChanges(trackPageview)
  }, [siteKey, apiUrl])

  // Reserved custom-event API. v1 stores pageviews only, so track() is an
  // intentional no-op exposed for forward-compatibility.
  const track = useCallback(() => {}, [])

  const api = useMemo(() => ({ track }), [track])

  return <SundayAnalyticsContext.Provider value={api}>{children}</SundayAnalyticsContext.Provider>
}

export default SundayAnalyticsProvider
