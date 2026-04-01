import { Component } from 'react'

const REPORTING_ENDPOINT = 'https://gujgtjqqurildqurpffh.supabase.co/functions/v1/error-reporting-service/report-batch'

const DEFAULT_BATCH_SIZE = 10
const DEFAULT_FLUSH_INTERVAL_MS = 30_000
const MAX_QUEUE_SIZE = 100
const DEDUP_WINDOW_MS = 60_000
const HTTP_ERROR_THRESHOLD = 400

const BROWSER_PATTERNS = [
    [/Edg\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/Version\/(\d+).*Safari/, 'Safari']
]

const OS_PATTERNS = [
    [/Windows NT 10/, 'Windows 10/11'],
    [/Mac OS X (\d+[._]\d+)/, 'macOS'],
    [/Android (\d+)/, 'Android'],
    [/iPhone OS (\d+)/, 'iOS'],
    [/Linux/, 'Linux']
]

/** @param {string} userAgent */
function parseBrowserFromUserAgent(userAgent) {
    for (const [pattern, name] of BROWSER_PATTERNS) {
        const match = userAgent.match(pattern)
        if (match) return `${name} ${match[1]}`
    }
    return 'Unknown'
}

/** @param {string} userAgent */
function parseOperatingSystemFromUserAgent(userAgent) {
    for (const [pattern, name] of OS_PATTERNS) {
        const match = userAgent.match(pattern)
        if (match) return match[1] ? `${name} ${match[1].replace(/_/g, '.')}` : name
    }
    return 'Unknown'
}

/**
 * Generates a simple hash string for client-side deduplication.
 * Not cryptographic — just enough to identify duplicate errors within a short window.
 * @param {string} project
 * @param {string} message
 * @param {string|null} file
 * @param {number|null} line
 * @returns {string}
 */
function generateClientDedupKey(project, message, file, line) {
    return `${project}|${message}|${file ?? ''}|${line ?? ''}`
}

/** @type {{ project: string, endpoint: string, batchSize: number, flushIntervalMs: number, enabled: boolean } | null} */
let configuration = null

/** @type {Array<Record<string, unknown>>} */
let errorQueue = []

/** @type {Map<string, { count: number, lastSeen: number }>} */
const recentErrorDedupMap = new Map()

let flushTimerId = null
let isFlushing = false

function buildErrorPayload(message, source, line, column, componentStack) {
    const userAgent = navigator.userAgent ?? ''
    return {
        project: configuration.project,
        error_message: String(message ?? 'Unknown error'),
        source_file: source ?? null,
        line_number: typeof line === 'number' ? line : null,
        column_number: typeof column === 'number' ? column : null,
        component_stack: componentStack ?? null,
        url: window.location.href,
        user_agent: userAgent,
        browser: parseBrowserFromUserAgent(userAgent),
        os: parseOperatingSystemFromUserAgent(userAgent)
    }
}

function enqueueError(payload) {
    if (!configuration?.enabled) return

    const dedupKey = generateClientDedupKey(
        payload.project,
        payload.error_message,
        payload.source_file,
        payload.line_number
    )

    const now = Date.now()
    const existingDedupEntry = recentErrorDedupMap.get(dedupKey)
    if (existingDedupEntry && now - existingDedupEntry.lastSeen < DEDUP_WINDOW_MS) {
        existingDedupEntry.count++
        existingDedupEntry.lastSeen = now
        return
    }

    recentErrorDedupMap.set(dedupKey, { count: 1, lastSeen: now })

    if (errorQueue.length >= MAX_QUEUE_SIZE) {
        errorQueue.shift()
    }
    errorQueue.push(payload)

    if (errorQueue.length >= configuration.batchSize) {
        flush()
    }
}

async function flush() {
    if (isFlushing || errorQueue.length === 0 || !configuration) return

    isFlushing = true
    const batch = errorQueue.splice(0, configuration.batchSize)
    const body = JSON.stringify({ errors: batch })

    try {
        const sendViaBeacon = navigator.sendBeacon?.(
            configuration.endpoint,
            new Blob([body], { type: 'application/json' })
        )
        if (!sendViaBeacon) {
            await fetch(configuration.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true
            })
        }
    } catch {
        // Silently drop — prevent recursive reporting of network failures
    } finally {
        isFlushing = false
    }
}

/** Extracts the endpoint name from a URL path (e.g. '/functions/v1/verify-password' → 'verify-password'). */
function extractEndpointFromUrl(url) {
    try {
        const pathname = new URL(url, window.location.origin).pathname
        return pathname.split('/').filter(Boolean).pop() ?? pathname
    } catch {
        return url
    }
}

function isReportingEndpoint(url) {
    return typeof url === 'string' && url.includes('error-reporting-service')
}

/** Wraps window.fetch to capture HTTP error responses (4xx/5xx). */
function interceptFetch() {
    const originalFetch = window.fetch
    window.fetch = async function patchedFetch(...args) {
        const [input] = args
        const requestUrl = typeof input === 'string' ? input : (input?.url ?? '')

        if (isReportingEndpoint(requestUrl)) return originalFetch.apply(this, args)

        const response = await originalFetch.apply(this, args)
        if (response.status >= HTTP_ERROR_THRESHOLD) {
            const endpointName = extractEndpointFromUrl(requestUrl)
            const payload = buildErrorPayload(
                `HTTP ${response.status} ${response.statusText} — ${endpointName}`,
                requestUrl,
                null,
                null,
                null
            )
            enqueueError(payload)
        }
        return response
    }
}

/** Wraps XMLHttpRequest to capture HTTP error responses (4xx/5xx). */
function interceptXmlHttpRequest() {
    const OriginalXhrOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
        this._errorReporterUrl = typeof url === 'string' ? url : String(url)
        return OriginalXhrOpen.call(this, method, url, ...rest)
    }

    const OriginalXhrSend = XMLHttpRequest.prototype.send
    XMLHttpRequest.prototype.send = function patchedSend(...args) {
        this.addEventListener('loadend', function onLoadEnd() {
            if (isReportingEndpoint(this._errorReporterUrl)) return
            if (this.status >= HTTP_ERROR_THRESHOLD) {
                const endpointName = extractEndpointFromUrl(this._errorReporterUrl)
                const payload = buildErrorPayload(
                    `HTTP ${this.status} ${this.statusText} — ${endpointName}`,
                    this._errorReporterUrl,
                    null,
                    null,
                    null
                )
                enqueueError(payload)
            }
        })
        return OriginalXhrSend.apply(this, args)
    }
}

function handleWindowError(message, source, lineno, colno, error) {
    // Prevent recursive reporting if the error involves our own endpoint
    if (typeof message === 'string' && message.includes('error-reporting-service')) return

    const payload = buildErrorPayload(error?.message ?? message, source, lineno, colno, error?.stack ?? null)
    enqueueError(payload)
}

function handleUnhandledRejection(event) {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection')
    const stack = reason instanceof Error ? reason.stack : null

    if (message.includes('error-reporting-service')) return

    const payload = buildErrorPayload(message, null, null, null, stack)
    enqueueError(payload)
}

function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') flush()
}

function startFlushTimer() {
    stopFlushTimer()
    flushTimerId = setInterval(flush, configuration?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS)
}

function stopFlushTimer() {
    if (flushTimerId !== null) {
        clearInterval(flushTimerId)
        flushTimerId = null
    }
}

/**
 * Cross-project client-side error reporter.
 * Captures browser errors, batches them, and sends to the centralized error-reporting-service.
 *
 * @example
 * ErrorReporterUtility.init({ project: 'mysite.com' })
 */
const ErrorReporterUtility = {
    /**
     * Initialize the error reporter. Call once in the app entry point.
     * @param {{ project: string, endpoint?: string, batchSize?: number, flushIntervalMs?: number, enabled?: boolean }} options
     */
    init({
        project,
        endpoint = REPORTING_ENDPOINT,
        batchSize = DEFAULT_BATCH_SIZE,
        flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
        enabled = true
    }) {
        if (configuration) return

        configuration = { project, endpoint, batchSize, flushIntervalMs, enabled }

        if (!enabled) return

        window.addEventListener('error', (event) => {
            handleWindowError(event.message, event.filename, event.lineno, event.colno, event.error)
        })
        window.addEventListener('unhandledrejection', handleUnhandledRejection)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        interceptFetch()
        interceptXmlHttpRequest()

        startFlushTimer()
    },

    /**
     * Manually report an error.
     * @param {Error} error
     * @param {{ context?: string }} [metadata]
     */
    reportError(error, metadata) {
        if (!configuration?.enabled) return

        const payload = buildErrorPayload(error.message, null, null, null, error.stack ?? null)
        if (metadata?.context) {
            payload.component_stack = `Context: ${metadata.context}\n${payload.component_stack ?? ''}`
        }
        enqueueError(payload)
    },

    /** Force flush all queued errors immediately. */
    flush,

    /** Tear down all listeners and timers. */
    destroy() {
        stopFlushTimer()
        flush()
        configuration = null
        errorQueue = []
        recentErrorDedupMap.clear()
    }
}

/**
 * React ErrorBoundary that captures render errors and reports them.
 * Wrap your top-level `<App />` with this component.
 *
 * @example
 * <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *   <App />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        if (!configuration?.enabled) return

        const payload = buildErrorPayload(error.message, null, null, null, null)
        payload.component_stack = errorInfo?.componentStack ?? null
        payload.stack_trace = error.stack ?? null
        enqueueError(payload)
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? null
        }
        return this.props.children
    }
}

export default ErrorReporterUtility
export { ErrorBoundary }
