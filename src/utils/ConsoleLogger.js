/**
 * Dev-only console logger that captures errors and warnings and
 * flushes them to /__console_log so they can be written to a file
 * by setupProxy.js. Strips React noise (e.g. component stacks).
 */
if (process.env.NODE_ENV === 'development') {
    const buffer = []
    let flushTimer = null
    const FLUSH_INTERVAL = 2000

    const flush = () => {
        if (buffer.length === 0) return
        const entries = buffer.splice(0)
        try {
            navigator.sendBeacon('/__console_log', JSON.stringify(entries))
        } catch {
            // Fallback to fetch if sendBeacon unavailable
            fetch('/__console_log', {
                body: JSON.stringify(entries),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }).catch(() => {})
        }
    }

    const scheduleFlush = () => {
        if (!flushTimer) {
            flushTimer = setTimeout(() => {
                flushTimer = null
                flush()
            }, FLUSH_INTERVAL)
        }
    }

    const capture = (level, originalFn) => {
        return (...args) => {
            originalFn.apply(console, args)
            const message = args
                .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
                .join(' ')
                .slice(0, 2000)
            buffer.push({ level, message })
            scheduleFlush()
        }
    }

    console.error = capture('error', console.error)
    console.warn = capture('warn', console.warn)

    window.addEventListener('error', (event) => {
        buffer.push({
            level: 'uncaught',
            message: `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`
        })
        scheduleFlush()
    })

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason
        const message = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason)
        buffer.push({ level: 'unhandled-rejection', message: message.slice(0, 2000) })
        scheduleFlush()
    })
}
