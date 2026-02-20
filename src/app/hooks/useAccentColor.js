import { DEFAULT_ACCENT_COLOR } from '../constants/themeConstants'
import { usePreferences } from '../context/PreferencesContext'

export function useAccentColor() {
    const { preferences } = usePreferences()
    return preferences.accentColor || DEFAULT_ACCENT_COLOR
}
