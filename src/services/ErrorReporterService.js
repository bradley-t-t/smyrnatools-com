import { supabase } from './DatabaseService'
/**
 * Collects client-side errors from all users and writes them to the
 * client_errors Supabase table. Batches entries and flushes periodically
 * to avoid excessive writes. Works in both dev and production.
 */
const FLUSH_INTERVAL = 5000
const MAX_BUFFER = 50
const DEDUPE_WINDOW = 30000
let buffer = []
let flushTimer = null
let recentHashes = new Map()
function hashMessage(msg) {
    let h = 0
    for (let i = 0; i < msg.length; i++) {
        h = ((h << 5) - h + msg.charCodeAt(i)) | 0
    }
    return h
}
function isDuplicate(message) {
    const hash = hashMessage(message)
    const now = Date.now()
    if (recentHashes.has(hash) && now - recentHashes.get(hash) < DEDUPE_WINDOW) return true
    recentHashes.set(hash, now)
    if (recentHashes.size > 200) {
        const cutoff = now - DEDUPE_WINDOW
        for (const [k, v] of recentHashes) {
            if (v < cutoff) recentHashes.delete(k)
        }
    }
    return false
}
async function flush() {
    if (buffer.length === 0) return
    const entries = buffer.splice(0, MAX_BUFFER)
    try {
        await supabase.from('client_errors').insert(entries)
    } catch {
        // Silently fail — error reporting should never break the app
    }
}
function scheduleFlush() {
    if (!flushTimer) {
        flushTimer = setTimeout(() => {
            flushTimer = null
            flush()
        }, FLUSH_INTERVAL)
    }
}
function getUserId() {
    return sessionStorage.getItem('userId') || null
}
function report(level, message, meta = {}) {
    if (!message || isDuplicate(message)) return
    buffer.push({
        level,
        message: String(message).slice(0, 4000),
        metadata: {
            pathname: window.location.pathname,
            userAgent: navigator.userAgent,
            ...meta
        },
        url: window.location.href,
        user_id: getUserId()
    })
    if (buffer.length >= MAX_BUFFER) {
        flush()
    } else {
        scheduleFlush()
    }
}
const ErrorReporterService = { flush, report }
export default ErrorReporterService
