import { COLORS } from './ExportConstants'
import { resolveChangeColor } from './ExportExcelStyles'

/**
 * Value coercion + change-percentage formatting. `ensure`/`truncateToTenth`
 * normalize raw report values before they reach a cell; `calcChange`,
 * `getChangeText`, and `getChangeValue` produce the colored delta strings
 * (e.g. "+12%", "-3") rendered next to current-period metrics.
 */

/**
 * Coerce nullish or empty values to a safe default.
 * @param {*} value - Raw form/report value
 * @param {boolean} isNumeric - true → coerce to Number (default 0); false → keep as string (default '')
 */
export function ensure(value, isNumeric) {
    if (value === null || value === undefined || value === '') return isNumeric ? 0 : ''
    return isNumeric ? Number(value) : value
}

export function truncateToTenth(n) {
    if (typeof n !== 'number' || !isFinite(n)) return n
    return Math.floor(n * 10) / 10
}

export function calcChange(current, previous) {
    if (previous === null || previous === undefined) return { diff: 0, direction: 'neutral', pct: 0 }
    const diff = current - previous
    const pct = previous === 0 ? (current === 0 ? 0 : 100) : Math.round(((current - previous) / previous) * 100)
    if (diff > 0) return { diff, direction: 'up', pct }
    if (diff < 0) return { diff: Math.abs(diff), direction: 'down', pct: Math.abs(pct) }
    return { diff: 0, direction: 'neutral', pct: 0 }
}

function formatChange(current, previous, invertColors, usePercentage) {
    const change = calcChange(current, previous)
    const isNeutral = change.direction === 'neutral' || (usePercentage ? change.pct === 0 : change.diff === 0)
    if (isNeutral) return { color: COLORS.slate300, text: usePercentage ? '0%' : '0' }
    const color = resolveChangeColor(change.direction, invertColors)
    const magnitude = usePercentage ? change.pct : change.diff
    const suffix = usePercentage ? '%' : ''
    const sign = change.direction === 'up' ? '+' : '-'
    return { color, text: `${sign}${magnitude}${suffix}` }
}

export function getChangeText(current, previous, invertColors = false) {
    return formatChange(current, previous, invertColors, true)
}

export function getChangeValue(current, previous, invertColors = false) {
    return formatChange(current, previous, invertColors, false)
}
