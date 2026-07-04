/* eslint-disable react/forbid-dom-props */
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { Database } from '../../../services/DatabaseService'
import { getSessionUserId } from '../../../services/SessionService'

const SUCCESS_COLOR = '#16a34a'
const DISMISS_STORAGE_KEY = 'plantManagerReminderToastDismissed'

const readDismissed = () => {
    try {
        return sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1'
    } catch {
        return false
    }
}

const persistDismissed = () => {
    try {
        sessionStorage.setItem(DISMISS_STORAGE_KEY, '1')
    } catch {
        /* sessionStorage unavailable — fall back to in-memory state only */
    }
}

const clearDismissed = () => {
    try {
        sessionStorage.removeItem(DISMISS_STORAGE_KEY)
    } catch {
        /* nothing to do */
    }
}

function PlantManagerReminderToast() {
    const [signedIn, setSignedIn] = useState(false)
    const [dismissed, setDismissed] = useState(readDismissed)

    const refreshSignedIn = useCallback(async () => {
        try {
            const { data: sessionData } = await Database.auth.getSession()
            const userId = sessionData?.session?.user?.id || getSessionUserId() || ''
            setSignedIn(!!userId)
        } catch {
            /* session check failed — don't show the toast */
        }
    }, [])

    useEffect(() => {
        refreshSignedIn()
        const handleAuthSuccess = () => {
            // Fresh login — let the reminder surface again even if a prior
            // session dismissed it within the same browser tab.
            clearDismissed()
            setDismissed(false)
            refreshSignedIn()
        }
        const handleSignOut = () => {
            clearDismissed()
            setDismissed(false)
            setSignedIn(false)
        }
        window.addEventListener('authSuccess', handleAuthSuccess)
        window.addEventListener('authSignOut', handleSignOut)
        return () => {
            window.removeEventListener('authSuccess', handleAuthSuccess)
            window.removeEventListener('authSignOut', handleSignOut)
        }
    }, [refreshSignedIn])

    const handleDismiss = useCallback(() => {
        persistDismissed()
        setDismissed(true)
    }, [])

    if (!signedIn || dismissed) return null
    if (typeof document === 'undefined' || !document.body) return null

    return ReactDOM.createPortal(
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-[9998] w-[22rem] overflow-hidden rounded-modal border border-green-600/30 bg-bg-primary shadow-modal animate-fade-slide-in motion-reduce:animate-none"
        >
            <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ backgroundColor: SUCCESS_COLOR }}
            >
                <i className="fas fa-circle-check text-sm text-white" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">Plant Manager Reminder</span>
            </div>
            <div className="px-4 py-3">
                <p className="mb-3 text-[0.8125rem] leading-relaxed text-text-secondary">
                    Plant Managers will continue to be expected to keep their assets up to date.
                    Smyrna Tools will still be used for this and will remain up and running.
                </p>
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary cursor-pointer transition-[background-color,color,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover hover:text-text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                        onClick={handleDismiss}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default PlantManagerReminderToast
