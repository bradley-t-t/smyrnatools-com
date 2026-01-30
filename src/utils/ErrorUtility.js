const ERROR_LOG_LIMIT = 20

const storageAvailable = () => {
    try {
        return typeof localStorage !== 'undefined'
    } catch (e) {
        return false
    }
}

const getLogsInternal = () => {
    if (!storageAvailable()) return []
    try {
        return JSON.parse(localStorage.getItem('app_error_logs') || '[]')
    } catch (e) {
        return []
    }
}

const persistLogsInternal = (logs) => {
    if (!storageAvailable()) return
    try {
        localStorage.setItem('app_error_logs', JSON.stringify(logs.slice(-ERROR_LOG_LIMIT)))
    } catch (e) {}
}

const ErrorUtility = {
    clearLogs() {
        if (!storageAvailable()) return
        try {
            localStorage.removeItem('app_error_logs')
        } catch (e) {}
    },
    getLatestLog() {
        const logs = getLogsInternal()
        return logs[logs.length - 1] || null
    },
    getStoredLogs() {
        return getLogsInternal()
    },
    logError(source, error, context = {}) {
        if (!source || !error) throw new Error('Source and error are required')
        const err =
            error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error))
        const errorId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
        console.error(`[${source}] Error ${errorId}:`, err)
        if (context && Object.keys(context).length) console.error(`Context for error ${errorId}:`, context)
        const errorLog = {
            context: context || {},
            id: errorId,
            message: err.message,
            source,
            stack: err.stack,
            timestamp: new Date().toISOString()
        }
        const logs = getLogsInternal()
        logs.push(errorLog)
        persistLogsInternal(logs)
        return errorId
    },
    parseSupabaseError(error) {
        if (!error) return { message: 'Unknown error' }
        const message = error.message || error.error_description || 'Unknown error'
        const hint = error.hint || error.details || error.detail
        return {
            code: error.code || error.status,
            details: error.details || error.detail,
            formatted: `${message}${hint ? ` (Hint: ${hint})` : ''}`,
            hint,
            message
        }
    },
    prune(predicate) {
        const logs = getLogsInternal()
        if (typeof predicate === 'function') {
            const filtered = logs.filter((l) => predicate(l) !== false)
            persistLogsInternal(filtered)
            return filtered
        }
        persistLogsInternal(logs.slice(-ERROR_LOG_LIMIT))
        return logs
    }
}

export default ErrorUtility
export { ErrorUtility }
