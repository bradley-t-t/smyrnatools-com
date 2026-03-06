import {
    applySubtleBackground,
    createWorkbook,
    downloadWorkbook,
    getDefaultColumnWidths,
    loadLogo,
    setDefaultPageSetup
} from '../../../../utils/ExportUtility'
export { exportGeneralManagerReport } from './reports/GeneralManagerExport'
/**
 * Initializes an Excel workbook with optional logo and subject metadata.
 * @param {Object} [options]
 * @param {string} [options.subject] - Workbook subject property.
 * @param {boolean} [options.skipLogo] - Skips logo loading when true.
 * @param {string} [options.logoPath] - Custom logo file path.
 * @returns {Promise<{wb: Object, ExcelLib: Object, logoBase64: string|null}>}
 */
export async function initExport(options = {}) {
    const { wb, ExcelLib } = await createWorkbook()
    if (options.subject) {
        wb.properties.subject = options.subject
    }
    const logoBase64 = options.skipLogo ? null : await loadLogo(options.logoPath)
    return { ExcelLib, logoBase64, wb }
}
/**
 * Adds a worksheet to the workbook with grid lines hidden.
 * @param {Object} wb - ExcelJS workbook.
 * @param {string} sheetName - Tab label for the new sheet.
 * @param {Object} [options] - Optional columns and defaultRowHeight.
 * @returns {Object} The created worksheet.
 */
export function createSheet(wb, sheetName, options = {}) {
    const ws = wb.addWorksheet(sheetName, {
        properties: { defaultRowHeight: options.defaultRowHeight || 18 },
        views: [{ showGridLines: false }]
    })
    ws.columns = options.columns || getDefaultColumnWidths()
    return ws
}
/** Applies page setup and optional subtle background fill to a completed worksheet. */
export function finalizeSheet(ws, options = {}) {
    setDefaultPageSetup(ws)
    if (options.applyBackground !== false) {
        applySubtleBackground(ws, options.maxRow, options.maxCol)
    }
}
/** Downloads the completed workbook as an .xlsx file. */
export async function exportWorkbook(wb, filename) {
    return downloadWorkbook(wb, filename)
}
/** Builds a filename with an optional MM-DD-YYYY date suffix from an ISO date string. */
export function generateFilename(baseName, dateIso) {
    if (!dateIso) {
        return `${baseName}.xlsx`
    }
    const [year, month, day] = dateIso.split('-')
    return `${baseName} ${month}-${day}-${year}.xlsx`
}
