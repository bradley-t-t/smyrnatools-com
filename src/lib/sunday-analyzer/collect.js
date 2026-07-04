import { resolveSessionId } from './session'

/** Read a UTM param, returning null when absent so the server stores null. */
function utm(params, key) {
  const value = params.get(key)
  return value && value.trim() ? value.trim() : null
}

/**
 * Build the pageview payload for the current document state. Captures path
 * (+search), referrer, parsed UTM params, screen size, language, and the raw
 * user-agent (parsed server-side into browser/os/device).
 *
 * @param {string} siteKey - the public site key from analytics_sites
 * @returns {Record<string, unknown>} the hit payload
 */
export function collectPageview(siteKey) {
  const { location, document, navigator, screen } = window
  const params = new URLSearchParams(location.search)
  return {
    language: navigator.language || null,
    path: `${location.pathname}${location.search}`,
    referrer: document.referrer || null,
    screen: screen ? `${screen.width}x${screen.height}` : null,
    sessionId: resolveSessionId(),
    siteKey,
    userAgent: navigator.userAgent || null,
    utmCampaign: utm(params, 'utm_campaign'),
    utmContent: utm(params, 'utm_content'),
    utmMedium: utm(params, 'utm_medium'),
    utmSource: utm(params, 'utm_source'),
    utmTerm: utm(params, 'utm_term'),
  }
}
