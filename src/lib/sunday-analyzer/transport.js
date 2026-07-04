/**
 * Fire one hit to the ingest endpoint. Prefers navigator.sendBeacon so the
 * request survives page unloads; falls back to fetch({keepalive:true}) when
 * sendBeacon is unavailable.
 *
 * The body is sent as a `text/plain` Blob so it stays a CORS-"simple" request
 * (no preflight) — the ingest function JSON-parses the text body regardless of
 * content-type. We never read the response, so an opaque beacon result is fine.
 *
 * @param {string} apiUrl - the ingest endpoint
 * @param {Record<string, unknown>} payload - the hit payload
 */
export function sendHit(apiUrl, payload) {
  if (typeof window === 'undefined') return
  const body = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' })
    if (navigator.sendBeacon(apiUrl, blob)) return
  }

  if (typeof fetch === 'function') {
    fetch(apiUrl, {
      body,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      keepalive: true,
      method: 'POST',
    }).catch(() => {
      // Analytics is best-effort; a dropped hit must never surface to the host app.
    })
  }
}
