import { DEFAULT_ACCENT_COLOR } from '../constants/themeConstants'
import { usePreferences } from '../context/PreferencesContext'

/** Applies the user's accent color as a CSS custom property on the document root. */
export function useAccentColor() {
    const { preferences } = usePreferences()
    return preferences.accentColor || DEFAULT_ACCENT_COLOR
}
