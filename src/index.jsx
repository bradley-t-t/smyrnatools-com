import './app/index.css'

import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import packageJson from '../package.json'
import App from './app/App'
import { AuthProvider } from './app/context/AuthContext'
import { ConfirmProvider } from './app/context/ConfirmContext'
import { PreferencesProvider } from './app/context/PreferencesContext'
import { TutorialProvider } from './app/context/TutorialContext'
import { SundayAnalyticsProvider } from './lib/sunday-analyzer'
import { getSessionUserId } from './services/SessionService'

const SENTRY_DSN = import.meta.env.REACT_APP_SENTRY_DSN

if (SENTRY_DSN) {
    Sentry.init({
        beforeSend(event) {
            if (event.user) {
                delete event.user.email
                delete event.user.ip_address
                delete event.user.username
            }
            return event
        },
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        integrations: [Sentry.browserTracingIntegration()],
        release: `smyrnatools@${packageJson.version}`,
        sendDefaultPii: false
    })
}

/** Minimal full-screen error fallback shown when the root ErrorBoundary catches. */
function ErrorFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6 dark:bg-gray-900">
            <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
                <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">Something went wrong</h1>
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                    An unexpected error occurred. Please reload the page to try again.
                </p>
                <button type="button"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={() => window.location.reload()}
                >
                    Reload Page
                </button>
            </div>
        </div>
    )
}

/** Attaches user id and region to Sentry scope on login; clears on logout. */
function configureSentryUserScope() {
    if (!SENTRY_DSN) return

    const attachUser = () => {
        const userId = getSessionUserId()
        if (userId) Sentry.setUser({ id: userId })
    }

    const detachUser = () => {
        Sentry.setUser(null)
    }

    const attachRegion = (event) => {
        const region = event?.detail
        if (region?.code) {
            Sentry.setTag('region.code', region.code)
            Sentry.setTag('region.name', region.name)
            Sentry.setTag('region.type', region.type)
        }
    }

    window.addEventListener('authSuccess', attachUser)
    window.addEventListener('authSignOut', detachUser)
    window.addEventListener('region-changed', attachRegion)

    attachUser()
}

configureSentryUserScope()

document.head.appendChild(
    Object.assign(document.createElement('meta'), {
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        name: 'viewport'
    })
)
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <SundayAnalyticsProvider siteKey="sa_7bcbf8f895fbbf056ce0cbc4a8b92531">
            <BrowserRouter>
                <AuthProvider>
                    <PreferencesProvider>
                        <TutorialProvider>
                            <ConfirmProvider>
                                <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
                                    <App />
                                </Sentry.ErrorBoundary>
                            </ConfirmProvider>
                        </TutorialProvider>
                    </PreferencesProvider>
                </AuthProvider>
            </BrowserRouter>
        </SundayAnalyticsProvider>
    </React.StrictMode>
)
const runWhenIdle = (callback) => {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout: 2000 })
    } else {
        setTimeout(callback, 1)
    }
}
runWhenIdle(() => {
    import('./utils/VitalsUtility').then((module) => {
        module.default()
    })
})
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        runWhenIdle(() => {
            navigator.serviceWorker.register('/sw.js').catch((error) => {
                console.error('Service worker registration failed:', error)
            })
        })
    })
}
