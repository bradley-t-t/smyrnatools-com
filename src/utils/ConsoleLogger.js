/**
 * Console logger that captures errors and warnings from all users.
 * In development: also writes to /__console_log for local file monitoring.
 * In all environments: reports to Supabase client_errors table via ErrorReporterService.
 */
import ErrorReporterService from '../services/ErrorReporterService'

const isDev = process.env.NODE_ENV === 'development'
const devBuffer = []
let devFlushTimer = null

function devFlush() {
    if (!isDev || devBuffer.length === 0) return
    const entries = devBuffer.splice(0)
    try {
        navigator.sendBeacon('/__console_log', JSON.stringify(entries))
    } catch {
        fetch('/__console_log', {
            body: JSON.stringify(entries),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST'
        }).catch(() => {})
    }
}

function devScheduleFlush() {
    if (!isDev) return
    if (!devFlushTimer) {
        devFlushTimer = setTimeout(() => {
            devFlushTimer = null
            devFlush()
        }, 2000)
    }
}

const capture = (level, originalFn) => {
    return (...args) => {
        originalFn.apply(console, args)
        const message = args
            .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
            .join(' ')
            .slice(0, 4000)

        // Report to Supabase for all environments
        ErrorReporterService.report(level, message)

        // Also write to local file in dev
        if (isDev) {
            devBuffer.push({ level, message })
            devScheduleFlush()
        }
    }
}

console.error = capture('error', console.error)
console.warn = capture('warn', console.warn)

window.addEventListener('error', (event) => {
    const message = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`
    ErrorReporterService.report('uncaught', message)
    if (isDev) {
        devBuffer.push({ level: 'uncaught', message })
        devScheduleFlush()
    }
})

window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason)
    ErrorReporterService.report('unhandled-rejection', message.slice(0, 4000))
    if (isDev) {
        devBuffer.push({ level: 'unhandled-rejection', message: message.slice(0, 4000) })
        devScheduleFlush()
    }
})
