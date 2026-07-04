/** Fallback accent color used when user has no custom preference. */
export const DEFAULT_ACCENT_COLOR = '#1e3a5f'
/** Fallback theme mode used when user has no custom preference. */
export const DEFAULT_THEME_MODE = 'light'

/** Theme modes that should render the UI as a dark-like surface. Both
 *  the fully dark theme and the lighter "Grayed Out" variant use light
 *  text on darker chrome, so any callsite that currently special-cases
 *  `themeMode === 'dark'` for tint logic should switch to
 *  `isDarkLikeTheme(themeMode)` to pick up the grayed variant too. */
export const DARK_LIKE_THEMES = new Set(['dark', 'grayed'])

export const isDarkLikeTheme = (mode) => DARK_LIKE_THEMES.has(mode)
