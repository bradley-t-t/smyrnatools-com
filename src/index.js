import './app/index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './app/App.js'
import { AuthProvider } from './app/context/AuthContext'
import { PreferencesProvider } from './app/context/PreferencesContext'
import { TutorialProvider } from './app/context/TutorialContext'
import { databaseKey, databaseUrl } from './services/DatabaseService'
import ErrorReporterUtility, { ErrorBoundary } from './utils/ErrorReporterUtility'
ErrorReporterUtility.init({ project: 'smyrnatools.com', apiKey: databaseKey, baseUrl: databaseUrl })
document.head.appendChild(
    Object.assign(document.createElement('meta'), {
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        name: 'viewport'
    })
)
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <PreferencesProvider>
                    <TutorialProvider>
                        <ErrorBoundary>
                            <App />
                        </ErrorBoundary>
                    </TutorialProvider>
                </PreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
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
