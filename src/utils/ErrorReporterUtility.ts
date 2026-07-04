import * as Sentry from '@sentry/react'

/** Thin facade over Sentry — call `ErrorReporterUtility.reportError(error, metadata)` from feature code. */
const ErrorReporterUtility = {
    reportError(error, metadata) {
        Sentry.captureException(error, { extra: metadata })
    }
}

export default ErrorReporterUtility
