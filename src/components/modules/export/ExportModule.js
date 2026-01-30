import {
    applySubtleBackground,
    createWorkbook,
    downloadWorkbook,
    getDefaultColumnWidths,
    loadLogo,
    setDefaultPageSetup
} from '../../../utils/ExportUtility'

export { exportGeneralManagerReport } from './reports/GeneralManagerExport'

export async function initExport(options = {}) {
    const { wb, ExcelLib } = await createWorkbook()

    if (options.subject) {
        wb.properties.subject = options.subject
    }

    const logoBase64 = options.skipLogo ? null : await loadLogo(options.logoPath)

    return { ExcelLib, logoBase64, wb }
}

export function createSheet(wb, sheetName, options = {}) {
    const ws = wb.addWorksheet(sheetName, {
        properties: { defaultRowHeight: options.defaultRowHeight || 18 },
        views: [{ showGridLines: false }]
    })

    ws.columns = options.columns || getDefaultColumnWidths()

    return ws
}

export function finalizeSheet(ws, options = {}) {
    setDefaultPageSetup(ws)
    if (options.applyBackground !== false) {
        applySubtleBackground(ws, options.maxRow, options.maxCol)
    }
}

export async function exportWorkbook(wb, filename) {
    return downloadWorkbook(wb, filename)
}

export function generateFilename(baseName, dateIso) {
    if (!dateIso) {
        return `${baseName}.xlsx`
    }
    const [year, month, day] = dateIso.split('-')
    return `${baseName} ${month}-${day}-${year}.xlsx`
}
