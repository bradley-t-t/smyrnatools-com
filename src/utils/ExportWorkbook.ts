import { WORKBOOK_CREATOR } from './ExportConstants'

/**
 * Workbook lifecycle helpers — logo loading, ExcelJS workbook creation, blob
 * download, and the default landscape/fit-to-page setup applied to every
 * worksheet. ExcelJS is loaded lazily so the ~700KB library stays out of the
 * main bundle until an export is actually triggered.
 */

export async function loadLogo(path = '/srm-logo.png') {
    try {
        const logoResponse = await fetch(path)
        if (!logoResponse.ok) return null
        const blob = await logoResponse.blob()
        return await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

export async function createWorkbook() {
    const excelModule = await import('exceljs')
    const ExcelLib = excelModule.default || excelModule
    const workbook = new ExcelLib.Workbook()
    workbook.creator = WORKBOOK_CREATOR
    workbook.created = new Date()
    workbook.modified = new Date()
    return { ExcelLib, wb: workbook }
}

export async function downloadWorkbook(workbook, filename) {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    setTimeout(() => {
        URL.revokeObjectURL(url)
        anchor.remove()
    }, 0)
}

export function setDefaultPageSetup(worksheet) {
    worksheet.pageSetup = {
        fitToHeight: 0,
        fitToPage: true,
        fitToWidth: 1,
        margins: { bottom: 0.5, footer: 0.3, header: 0.3, left: 0.4, right: 0.4, top: 0.5 },
        orientation: 'landscape',
        paperSize: 9
    }
}

export function getDefaultColumnWidths() {
    return [
        { width: 3 },
        { width: 10 },
        { width: 20 },
        { width: 7 },
        { width: 8 },
        { width: 7 },
        { width: 8 },
        { width: 7 },
        { width: 8 },
        { width: 7 },
        { width: 10 },
        { width: 7 },
        { width: 10 },
        { width: 15 },
        { width: 15 },
        { width: 15 }
    ]
}
