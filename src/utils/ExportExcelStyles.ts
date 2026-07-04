import { COLORS, FONT_CALIBRI } from './ExportConstants'

/**
 * Reusable ExcelJS style builders — fonts, fills, alignments, borders, and
 * header/change-indicator helpers. All visual style decisions for exported
 * workbooks flow through this module so palette or typeface changes happen
 * in one place.
 */

/**
 * Build a Calibri font descriptor. Every font in the workbook flows through here
 * so a typeface change only requires editing one line.
 * @param {number} size - Font size in points
 * @param {string} colorArgb - ARGB hex string from COLORS
 * @param {{ bold?: boolean, italic?: boolean, underline?: boolean }} [options]
 */
export function buildFont(size, colorArgb, { bold, italic, underline } = {}) {
    const font = { color: { argb: colorArgb }, name: FONT_CALIBRI, size }
    if (bold) font.bold = true
    if (italic) font.italic = true
    if (underline) font.underline = true
    return font
}

export function solidFill(argb) {
    return { fgColor: { argb }, pattern: 'solid', type: 'pattern' }
}

export function alignMiddle(horizontal) {
    return { horizontal, vertical: 'middle' }
}

export const HEADER_FONT = buildFont(10, COLORS.slate700, { bold: true })
export const HEADER_FILL = solidFill(COLORS.slate100)
export const HEADER_BORDER = { bottom: { color: { argb: COLORS.slate300 }, style: 'thin' } }
export const TOTAL_BORDER = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
export const BRAND_UNDERLINE_BORDER = { bottom: { color: { argb: COLORS.brand }, style: 'medium' } }
export const DATA_FONT = buildFont(11, COLORS.slate700)

export function applyHeaderStyle(cell, label, alignment = 'center') {
    cell.value = label
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = alignMiddle(alignment)
    cell.border = HEADER_BORDER
}

export function resolveChangeColor(direction, invertColors) {
    if (direction === 'up') return invertColors ? COLORS.danger : COLORS.success
    if (direction === 'down') return invertColors ? COLORS.success : COLORS.danger
    return COLORS.slate300
}

/**
 * Resolve the background highlight for a change indicator cell.
 * Success/danger get a light tint; neutral cells fall back to the alt-row stripe.
 */
export function resolveChangeBgColor(changeColorArgb, isAltRow) {
    if (changeColorArgb === COLORS.success) return COLORS.successLight
    if (changeColorArgb === COLORS.danger) return COLORS.dangerLight
    return isAltRow ? COLORS.snow : null
}
