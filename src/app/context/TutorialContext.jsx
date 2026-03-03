import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import TutorialService from '../../services/TutorialService'

/**
 * Tutorial dismissal context managing which in-app tutorials have been seen.
 * Supports delayed triggering, per-tutorial reset, and respects the user's
 * global tutorials-enabled preference.
 */
const TutorialContext = createContext({
    activeTutorial: null,
    dismissedTutorials: [],
    dismissTutorial: () => {},
    isMobile: false,
    isTutorialDismissed: () => false,
    resetAllTutorials: () => {},
    resetTutorial: () => {},
    showTutorial: () => {},
    triggerTutorial: () => {}
})

/**
 * Tutorial provider that loads dismissed state from TutorialService on mount,
 * persists dismissals to both localStorage and the database, and provides
 * show/dismiss/trigger/reset methods to the component tree.
 */
export function TutorialProvider({ children }) {
    const [dismissedTutorials, setDismissedTutorials] = useState([])
    const [activeTutorial, setActiveTutorial] = useState(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [_tutorialsEnabled, setTutorialsEnabled] = useState(true)
    const dismissedRef = useRef([])
    const tutorialsEnabledRef = useRef(true)

    useEffect(() => {
        const checkTutorialsEnabled = async () => {
            try {
                const { UserPreferencesService } = await import('../../services/UserPreferencesService')
                const { UserService } = await import('../../services/UserService')
                const user = await UserService.getCurrentUser()
                if (user?.id) {
                    const prefs = await UserPreferencesService.getUserPreferences(user.id)
                    const enabled = prefs?.tutorials !== false
                    setTutorialsEnabled(enabled)
                    tutorialsEnabledRef.current = enabled
                }
            } catch {}
        }
        checkTutorialsEnabled()

        const handlePrefsChange = (e) => {
            if (e.detail?.key === 'tutorials') {
                const enabled = e.detail.value !== false
                setTutorialsEnabled(enabled)
                tutorialsEnabledRef.current = enabled
                if (!enabled && activeTutorial) {
                    setActiveTutorial(null)
                }
            }
        }
        window.addEventListener('preferences-updated', handlePrefsChange)
        return () => window.removeEventListener('preferences-updated', handlePrefsChange)
    }, [activeTutorial])

    useEffect(() => {
        dismissedRef.current = dismissedTutorials
    }, [dismissedTutorials])

    useEffect(() => {
        const loadDismissed = async () => {
            try {
                const dismissed = await TutorialService.getDismissedTutorials()
                setDismissedTutorials(dismissed || [])
                dismissedRef.current = dismissed || []
            } catch {
                setDismissedTutorials([])
            }
            setIsLoaded(true)
        }
        loadDismissed()
    }, [])

    const isTutorialDismissed = useCallback(
        (tutorialId) => {
            return dismissedTutorials.includes(tutorialId)
        },
        [dismissedTutorials]
    )

    const dismissTutorial = useCallback(async (tutorialId) => {
        await TutorialService.dismissTutorial(tutorialId)
        setDismissedTutorials((prev) => [...prev, tutorialId])
        dismissedRef.current = [...dismissedRef.current, tutorialId]
        setActiveTutorial(null)
    }, [])

    const showTutorial = useCallback(
        (tutorialId) => {
            if (!isLoaded) return
            if (!tutorialsEnabledRef.current) return
            if (dismissedRef.current.includes(tutorialId)) return
            setActiveTutorial(tutorialId)
        },
        [isLoaded]
    )

    const triggerTutorial = useCallback(
        (tutorialId, delay = 0) => {
            if (!isLoaded) {
                setTimeout(() => triggerTutorial(tutorialId, delay), 100)
                return
            }
            if (!tutorialsEnabledRef.current) return
            if (dismissedRef.current.includes(tutorialId)) return

            if (delay > 0) {
                setTimeout(() => {
                    if (!tutorialsEnabledRef.current) return
                    if (!dismissedRef.current.includes(tutorialId)) {
                        setActiveTutorial(tutorialId)
                    }
                }, delay)
            } else {
                setActiveTutorial(tutorialId)
            }
        },
        [isLoaded]
    )

    const resetTutorial = useCallback(async (tutorialId) => {
        await TutorialService.resetTutorial(tutorialId)
        setDismissedTutorials((prev) => prev.filter((id) => id !== tutorialId))
        dismissedRef.current = dismissedRef.current.filter((id) => id !== tutorialId)
    }, [])

    const resetAllTutorials = useCallback(async () => {
        await TutorialService.resetAllTutorials()
        setDismissedTutorials([])
        dismissedRef.current = []
    }, [])

    return (
        <TutorialContext.Provider
            value={{
                activeTutorial,
                dismissTutorial,
                dismissedTutorials,
                isLoaded,
                isTutorialDismissed,
                resetAllTutorials,
                resetTutorial,
                showTutorial,
                triggerTutorial
            }}
        >
            {children}
        </TutorialContext.Provider>
    )
}

/** Hook to access tutorial context (activeTutorial, trigger, dismiss, reset). */
export function useTutorial() {
    return useContext(TutorialContext)
}

export default TutorialContext
