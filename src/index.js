import './app/index.css'
import './utils/APIErrorHandler'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './app/App.js'
import { AuthProvider } from './app/context/AuthContext'
import { PreferencesProvider } from './app/context/PreferencesContext'
import vitalsUtility from './utils/VitalsUtility'

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
                    <App />
                </PreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)

vitalsUtility()

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {})
            .catch((error) => {})
    })
}
