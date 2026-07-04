// @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions } from '../_shared/cors.ts'

/**
 * Streaming audio proxy. Forwards a single audio GET (or HEAD / OPTIONS)
 * request to a strictly-allowlisted upstream host, passing through Range
 * headers so the browser's `<audio>` element can scrub through long files.
 *
 * Required because Buzzsprout's audio CDN sits behind Cloudflare and
 * Cloudflare's WAF blocks some client browser fingerprints from reaching
 * `audio.buzzsprout.com` directly. Routing through this edge function
 * means the request originates from a Supabase datacenter IP that
 * Cloudflare consistently allows, so playback works regardless of the
 * caller's IP / UA.
 *
 * Public on purpose — podcast audio is public content and we strictly
 * allowlist the upstream hostname so this can't be abused as a generic
 * open proxy. Pattern matches `geocode-service` / `crypto-utility` in the
 * CLAUDE.md utility-function exception list.
 */

const ALLOWED_HOSTS = new Set([
    'audio.buzzsprout.com',
    'www.buzzsprout.com',
    'rss.buzzsprout.com',
    'chrt.fm'
])

const PASS_THROUGH_RESPONSE_HEADERS = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'last-modified',
    'etag'
]

function isAllowedUpstream(target: string): boolean {
    try {
        const parsed = new URL(target)
        if (parsed.protocol !== 'https:') return false
        return ALLOWED_HOSTS.has(parsed.hostname)
    } catch {
        return false
    }
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const corsHeaders = getCorsHeaders(origin)

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return errorResponse('Method not allowed', corsHeaders, 405)
    }

    try {
        const url = new URL(req.url)
        const target = url.searchParams.get('url')
        if (!target) return errorResponse('Missing url param', corsHeaders, 400)
        if (!isAllowedUpstream(target)) {
            return errorResponse('Upstream host not allowed', corsHeaders, 403)
        }

        // Forward the Range header so the browser can seek; Cloudflare
        // is happy with any modern UA + the Buzzsprout-friendly Referer.
        const upstreamHeaders: Record<string, string> = {
            'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            Referer: 'https://www.buzzsprout.com/'
        }
        const range = req.headers.get('range')
        if (range) upstreamHeaders['Range'] = range
        const ifNoneMatch = req.headers.get('if-none-match')
        if (ifNoneMatch) upstreamHeaders['If-None-Match'] = ifNoneMatch
        const ifModified = req.headers.get('if-modified-since')
        if (ifModified) upstreamHeaders['If-Modified-Since'] = ifModified

        const upstream = await fetch(target, {
            headers: upstreamHeaders,
            method: req.method,
            redirect: 'follow'
        })

        // Build a response with the streaming body + CORS + cache hints +
        // the upstream's content metadata so the browser can render a
        // proper scrubber, ETag-revalidate, and partial-content responses.
        const responseHeaders = new Headers()
        for (const [key, value] of Object.entries(corsHeaders)) {
            responseHeaders.set(key, value)
        }
        responseHeaders.delete('content-type') // upstream knows better
        for (const name of PASS_THROUGH_RESPONSE_HEADERS) {
            const value = upstream.headers.get(name)
            if (value) responseHeaders.set(name, value)
        }
        responseHeaders.set('Cache-Control', 'public, max-age=3600')

        return new Response(upstream.body, {
            headers: responseHeaders,
            status: upstream.status,
            statusText: upstream.statusText
        })
    } catch (err) {
        console.error('[audio-proxy] failure:', err)
        return errorResponse('Proxy request failed', corsHeaders, 502)
    }
})
