import { useCallback, useEffect } from 'react'

import { DEFAULT_THEME_MODE } from '../constants/themeConstants'
import { usePreferences } from '../context/PreferencesContext'
/**
 * Applies the user's theme mode (light/dark) by toggling the `dark` class on <html>.
 * Adds a brief transition class for smooth color animation during switches.
 */
export function useThemeMode() {
    const { preferences, updatePreferences } = usePreferences()
    const themeMode = preferences.themeMode || DEFAULT_THEME_MODE
    useEffect(() => {
        const root = document.documentElement
        const isDark = themeMode === 'dark'
        root.classList.add('theme-transitioning')
        if (isDark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 450)
        return () => clearTimeout(timer)
    }, [themeMode])
    const toggleTheme = useCallback(() => {
        updatePreferences('themeMode', themeMode === 'dark' ? 'light' : 'dark')
    }, [themeMode, updatePreferences])
    return { themeMode, toggleTheme }
}
