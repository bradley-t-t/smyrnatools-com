import { useCallback, useEffect } from 'react'

import { DEFAULT_THEME_MODE, isDarkLikeTheme } from '../constants/themeConstants'
import { usePreferences } from '../context/PreferencesContext'

/**
 * Applies the user's theme mode (light / dark / grayed) by toggling
 * the `dark` and `theme-grayed` classes on `<html>`. Adds a brief
 * transition class for smooth color animation during switches.
 *
 * The `dark` class drives Tailwind's `dark:` variants AND the dark CSS
 * token block in `index.css`. `theme-grayed` lives alongside `dark`
 * (so dark-mode utilities still apply) and overrides the dark tokens
 * with the gray palette in a more-specific selector.
 */
export function useThemeMode() {
    const { preferences, updatePreferences } = usePreferences()
    const themeMode = preferences.themeMode || DEFAULT_THEME_MODE
    useEffect(() => {
        const root = document.documentElement
        root.classList.add('theme-transitioning')
        if (isDarkLikeTheme(themeMode)) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        if (themeMode === 'grayed') {
            root.classList.add('theme-grayed')
        } else {
            root.classList.remove('theme-grayed')
        }
        const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 450)
        return () => clearTimeout(timer)
    }, [themeMode])
    const toggleTheme = useCallback(() => {
        updatePreferences('themeMode', isDarkLikeTheme(themeMode) ? 'light' : 'dark')
    }, [themeMode, updatePreferences])
    return { themeMode, toggleTheme }
}
