import { supabase } from '../services/DatabaseService'
import { ReportUtility } from './ReportUtility'

export { exportGeneralManagerReport } from '../app/components/modules/export/ExportModule'

const LOCALE_COMPARE_OPTIONS = { numeric: true, sensitivity: 'base' }
const REPORT_COLUMNS_FULL = 'id,data,week,submitted_at,report_date_range_start,completed'
const REPORT_COLUMNS_SHORT = 'id,data,week,submitted_at,completed'
const FONT_CALIBRI = 'Calibri'
const WORKBOOK_CREATOR = 'Smyrna Ready Mix'
const SITE_URL = 'https://smyrnatools.com'

export const COLORS = {
    accent: 'FF4B7BA8',
    brand: 'FF2C4A6B',
    brandLight: 'FF3B5F8A',
    cream: 'FFF8F9FA',
    danger: 'FFB93A3A',
    dangerLight: 'FFF5D9D9',
    slate100: 'FFD0D4D8',
    slate200: 'FFC8CDD2',
    slate300: 'FFB5BBC2',
    slate500: 'FF8B949E',
    slate700: 'FF5A6672',
    slate900: 'FF2D3748',
    snow: 'FFE0E3E6',
    subtleGray: 'FFE8EAED',
    success: 'FF2D7A5F',
    successLight: 'FFD4E8E0',
    warning: 'FFCA8A2B',
    white: 'FFFFFFFF'
}

const HEADER_FONT = { bold: true, color: { argb: COLORS.slate700 }, name: FONT_CALIBRI, size: 10 }
const HEADER_FILL = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
const HEADER_BORDER = { bottom: { color: { argb: COLORS.slate300 }, style: 'thin' } }
const TOTAL_BORDER = { top: { color: { argb: COLORS.brand }, style: 'medium' } }

export function normUpper(code) {
    return String(code || '')
        .trim()
        .toUpperCase()
}

export function normNumeric(code) {
    const trimmed = String(code || '').trim()
    const stripped = trimmed.replace(/^0+/, '')
    return stripped.length ? stripped : trimmed.toUpperCase()
}

export function sameIsoDay(a, b) {
    return a && b && a.slice(0, 10) === b.slice(0, 10)
}

export function toMondayIso(dateValue) {
    if (!dateValue) return ''
    const parsed = new Date(dateValue)
    return isNaN(parsed) ? '' : ReportUtility.getMondayISO(parsed)
}

function formatDateIso(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function toMonthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function numericPlantComparator(plantCodeA, plantCodeB) {
    const numA = parseInt(plantCodeA.replace(/\D/g, ''), 10)
    const numB = parseInt(plantCodeB.replace(/\D/g, ''), 10)
    const isNumA = Number.isFinite(numA)
    const isNumB = Number.isFinite(numB)
    if (isNumA && isNumB && numA !== numB) return numA - numB
    if (isNumA && !isNumB) return -1
    if (!isNumA && isNumB) return 1
    return plantCodeA.localeCompare(plantCodeB, undefined, LOCALE_COMPARE_OPTIONS)
}

function isBetterReport(candidate, existing) {
    if (candidate.completed !== existing.completed) return candidate.completed
    return (candidate.submitted_at || '') > (existing.submitted_at || '')
}

function anchorMatchesMonday(report, targetMondayIso) {
    const weekField = report.week || report.report_date_range_start || report?.data?.report_date
    return sameIsoDay(toMondayIso(weekField), targetMondayIso)
}

function pickBestReport(reports) {
    if (!reports.length) return null
    return reports.reduce((best, current) => (isBetterReport(current, best) ? current : best))
}

function solidFill(argb) {
    return { fgColor: { argb }, pattern: 'solid', type: 'pattern' }
}

function applyHeaderStyle(cell, label, alignment = 'center') {
    cell.value = label
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = { horizontal: alignment, vertical: 'middle' }
    cell.border = HEADER_BORDER
}

function resolveChangeColor(direction, invertColors) {
    if (direction === 'up') return invertColors ? COLORS.danger : COLORS.success
    if (direction === 'down') return invertColors ? COLORS.success : COLORS.danger
    return COLORS.slate300
}

export function sortPlants(plants) {
    return [...plants].sort((a, b) =>
        numericPlantComparator(String(a.plant_code || '').trim(), String(b.plant_code || '').trim())
    )
}

export function getPreviousWeekIso(weekIso) {
    if (!weekIso) return null
    const [year, month, day] = weekIso.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() - 7)
    return formatDateIso(date)
}

export function getWeekWindow(weekIso) {
    const targetMondayIso = ReportUtility.getMondayISO(weekIso)
    if (!targetMondayIso) return null
    const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
    const prevSunday = new Date(targetMondayDate)
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
    const windowEnd = new Date(targetMondayDate)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
    return { qEnd: windowEnd.toISOString(), qStart: prevSunday.toISOString(), targetMondayIso }
}

async function fetchReportsByWeekWindow(reportName, weekIso) {
    const window = getWeekWindow(weekIso)
    if (!window) return { reports: [], targetMondayIso: '' }
    const { targetMondayIso, qStart, qEnd } = window

    const { data } = await supabase
        .from('reports')
        .select(REPORT_COLUMNS_SHORT)
        .eq('report_name', reportName)
        .gte('week', qStart)
        .lt('week', qEnd)

    const filtered = (Array.isArray(data) ? data : []).filter((report) => anchorMatchesMonday(report, targetMondayIso))
    return { reports: filtered, targetMondayIso }
}

async function fetchReportsDualQuery(reportName, weekIso) {
    const window = getWeekWindow(weekIso)
    if (!window) return { reports: [], targetMondayIso: '' }
    const { targetMondayIso, qStart, qEnd } = window

    const [byWeek, byRange] = await Promise.all([
        supabase
            .from('reports')
            .select(REPORT_COLUMNS_FULL)
            .eq('report_name', reportName)
            .gte('week', qStart)
            .lt('week', qEnd),
        supabase
            .from('reports')
            .select(REPORT_COLUMNS_FULL)
            .eq('report_name', reportName)
            .gte('report_date_range_start', qStart)
            .lt('report_date_range_start', qEnd)
    ])

    const mergedMap = new Map()
    for (const report of [...(byWeek.data || []), ...(byRange.data || [])]) {
        if (report && !mergedMap.has(report.id)) mergedMap.set(report.id, report)
    }

    const filtered = [...mergedMap.values()].filter((report) => anchorMatchesMonday(report, targetMondayIso))
    return { reports: filtered, targetMondayIso }
}

function deduplicateByWeek(reports, dateFieldExtractor, upToIso) {
    const bestByWeek = new Map()
    for (const report of reports) {
        const mondayIso = toMondayIso(dateFieldExtractor(report))
        if (!mondayIso || (upToIso && mondayIso > upToIso)) continue
        const existing = bestByWeek.get(mondayIso)
        if (!existing || isBetterReport(report, existing)) bestByWeek.set(mondayIso, report)
    }
    return bestByWeek
}

export async function fetchEfficiencyReports(plants, weekIso) {
    const plantCodes = Array.isArray(plants) ? plants.map((p) => p.plant_code).filter(Boolean) : []
    if (!weekIso || plantCodes.length === 0) return []

    const { reports } = await fetchReportsDualQuery('plant_production', weekIso)

    const upperCodeSet = new Set(plantCodes.map(normUpper))
    const numericCodeSet = new Set(plantCodes.map(normNumeric))

    const matchingReports = reports.filter((report) => {
        const plantCode = report?.data?.plant
        if (!plantCode) return false
        return upperCodeSet.has(normUpper(plantCode)) || numericCodeSet.has(normNumeric(plantCode))
    })

    const bestByPlant = new Map()
    for (const report of matchingReports) {
        const key = normUpper(report.data.plant)
        const existing = bestByPlant.get(key)
        if (!existing || isBetterReport(report, existing)) bestByPlant.set(key, report)
    }

    return [...bestByPlant.values()]
        .sort((a, b) => numericPlantComparator(String(a.data?.plant || ''), String(b.data?.plant || '')))
        .map((report) => ({
            completed: report.completed,
            data: report.data,
            id: report.id,
            plant_code: report.data.plant,
            plant_name: report.data.plant,
            report_date: report.data.report_date || '',
            rows: Array.isArray(report.data.rows) ? report.data.rows : [],
            submitted_at: report.submitted_at
        }))
}

export async function fetchAggregateProductionReport(weekIso) {
    if (!weekIso) return null
    const { reports } = await fetchReportsDualQuery('aggregate_production', weekIso)
    return pickBestReport(reports)
}

export async function fetchAllAggregateReports(upToWeekIso) {
    const { data: reports } = await supabase
        .from('reports')
        .select(REPORT_COLUMNS_FULL)
        .eq('report_name', 'aggregate_production')
        .order('week', { ascending: false })

    if (!Array.isArray(reports)) return { monthly: [], yearly: [] }

    const bestByWeek = deduplicateByWeek(
        reports,
        (report) => report.week || report.report_date_range_start,
        upToWeekIso
    )

    const currentDate = new Date(upToWeekIso + 'T00:00:00Z')
    const currentMonthKey = toMonthKey(currentDate)
    const currentYear = currentDate.getUTCFullYear()

    const monthly = []
    const yearly = []

    bestByWeek.forEach((report, mondayIso) => {
        const weekDate = new Date(mondayIso + 'T00:00:00Z')
        if (toMonthKey(weekDate) === currentMonthKey) monthly.push(report.data)
        if (weekDate.getUTCFullYear() === currentYear) yearly.push(report.data)
    })

    return { monthly, yearly }
}

export async function fetchRMIReport(weekIso) {
    if (!weekIso) return null
    const { reports } = await fetchReportsByWeekWindow('ready_mix_instructor', weekIso)
    return pickBestReport(reports)?.data ?? null
}

export async function fetchGMReportForWeek(weekIso) {
    if (!weekIso) return null
    const { reports } = await fetchReportsByWeekWindow('general_manager', weekIso)
    return pickBestReport(reports)?.data ?? null
}

export async function fetchAllMonthlyGMReports() {
    const { data: reports } = await supabase
        .from('reports')
        .select(REPORT_COLUMNS_SHORT)
        .eq('report_name', 'general_manager')
        .order('week', { ascending: false })

    if (!Array.isArray(reports)) return []

    const bestByWeek = deduplicateByWeek(reports, (report) => report.week)

    const countWeeksInMonth = (year, month) => {
        const lastDay = new Date(Date.UTC(year, month, 0))
        let count = 0
        const cursor = new Date(Date.UTC(year, month - 1, 1))
        while (cursor.getUTCDay() !== 1) cursor.setUTCDate(cursor.getUTCDate() + 1)
        while (cursor <= lastDay) {
            count++
            cursor.setUTCDate(cursor.getUTCDate() + 7)
        }
        return count || 4
    }

    let minDate = null
    let maxDate = null
    bestByWeek.forEach((_report, mondayIso) => {
        const weekDate = new Date(mondayIso + 'T00:00:00Z')
        if (!minDate || weekDate < minDate) minDate = weekDate
        if (!maxDate || weekDate > maxDate) maxDate = weekDate
    })

    const byMonth = new Map()
    if (minDate && maxDate) {
        const cursor = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), 1))
        const endBoundary = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1))
        while (cursor >= endBoundary) {
            const year = cursor.getUTCFullYear()
            const month = cursor.getUTCMonth() + 1
            const monthKey = `${year}-${String(month).padStart(2, '0')}`
            const monthName = cursor.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC', year: 'numeric' })
            byMonth.set(monthKey, {
                monthKey,
                monthName,
                reports: [],
                totalWeeks: countWeeksInMonth(year, month),
                weekIsos: new Set()
            })
            cursor.setUTCMonth(cursor.getUTCMonth() - 1)
        }
    }

    bestByWeek.forEach((report, mondayIso) => {
        const monthKey = toMonthKey(new Date(mondayIso + 'T00:00:00Z'))
        const monthEntry = byMonth.get(monthKey)
        if (monthEntry) {
            monthEntry.reports.push({ data: report.data, weekIso: mondayIso })
            monthEntry.weekIsos.add(mondayIso)
        }
    })

    return [...byMonth.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

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

export function downloadWorkbook(workbook, filename) {
    return workbook.xlsx.writeBuffer().then((buffer) => {
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
    })
}

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

export function addSectionTitle(worksheet, row, text) {
    worksheet.mergeCells(row, 2, row, 12)
    const cell = worksheet.getCell(row, 2)
    cell.value = text
    cell.font = { bold: true, color: { argb: COLORS.brand }, name: FONT_CALIBRI, size: 14 }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
    for (let col = 2; col <= 16; col++) {
        worksheet.getCell(row, col).border = { bottom: { color: { argb: COLORS.brand }, style: 'medium' } }
    }
    worksheet.getRow(row).height = 28
}

export function addTableHeaders(worksheet, row, headers, startCol = 2) {
    headers.forEach((header, idx) => applyHeaderStyle(worksheet.getCell(row, startCol + idx), header))
    worksheet.getRow(row).height = 22
}

export function addMergedTableHeaders(worksheet, row, headers, startCol = 2) {
    let col = startCol
    headers.forEach((header) => {
        const mergeCount = header.mergeCount || (header.merge ? 2 : 1)
        const alignment = header.align || 'center'

        if (mergeCount > 1) worksheet.mergeCells(row, col, row, col + mergeCount - 1)

        applyHeaderStyle(worksheet.getCell(row, col), header.label, alignment)

        for (let offset = 1; offset < mergeCount; offset++) {
            const mergedCell = worksheet.getCell(row, col + offset)
            mergedCell.fill = HEADER_FILL
            mergedCell.border = HEADER_BORDER
        }
        col += mergeCount
    })
    worksheet.getRow(row).height = 22
}

export function addChangePct(cell, changeInfo, isAlt = false) {
    if (!changeInfo?.text) {
        cell.value = ''
        if (isAlt) cell.fill = solidFill(COLORS.snow)
    } else {
        cell.value = changeInfo.text.trim()
        cell.font = { bold: true, color: { argb: changeInfo.color }, name: FONT_CALIBRI, size: 8 }
        const bgColor =
            changeInfo.color === COLORS.success
                ? COLORS.successLight
                : changeInfo.color === COLORS.danger
                  ? COLORS.dangerLight
                  : isAlt
                    ? COLORS.snow
                    : null
        if (bgColor) cell.fill = solidFill(bgColor)
    }
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

export function addDataRow(worksheet, row, values, startCol = 2, isAlt = false) {
    values.forEach((value, idx) => {
        const cell = worksheet.getCell(row, startCol + idx)
        if (typeof value === 'object' && value !== null) {
            cell.value = value.richText ? { richText: value.richText } : value.value
            if (value.format) cell.numFmt = value.format
            cell.alignment = { horizontal: value.align || 'left', vertical: 'middle' }
            if (value.color)
                cell.font = { bold: value.bold, color: { argb: value.color }, name: FONT_CALIBRI, size: 11 }
            else if (!value.richText) cell.font = { color: { argb: COLORS.slate700 }, name: FONT_CALIBRI, size: 11 }
        } else {
            cell.value = value
            cell.font = { color: { argb: COLORS.slate700 }, name: FONT_CALIBRI, size: 11 }
            cell.alignment = { horizontal: typeof value === 'number' ? 'right' : 'left', vertical: 'middle' }
        }
        if (isAlt) cell.fill = solidFill(COLORS.snow)
    })
    worksheet.getRow(row).height = 20
}

export function applySubtleBackground(worksheet, maxRow = 200, maxCol = 30) {
    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
        const row = worksheet.getRow(rowNum)
        for (let colNum = 1; colNum <= maxCol; colNum++) {
            const cell = row.getCell(colNum)
            if (!cell.fill?.fgColor || cell.fill.fgColor.argb === COLORS.white) {
                cell.fill = solidFill(COLORS.subtleGray)
            }
        }
    }
}

export function applyTotalCell(cell, value, format) {
    cell.value = value
    if (format) cell.numFmt = format
    cell.font = { bold: true, color: { argb: COLORS.brand }, name: FONT_CALIBRI, size: 11 }
    cell.fill = HEADER_FILL
    cell.border = TOTAL_BORDER
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
}

export function applyTotalChangeCell(cell, changeInfo) {
    cell.value = changeInfo?.text?.trim() || ''
    if (changeInfo?.text) {
        cell.font = { bold: true, color: { argb: changeInfo.color }, name: FONT_CALIBRI, size: 9 }
    }
    cell.fill = HEADER_FILL
    cell.border = TOTAL_BORDER
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

export function addReportHeader(worksheet, workbook, { logoBase64, title, subtitle, row = 2 }) {
    let currentRow = row

    if (logoBase64) {
        worksheet.mergeCells(currentRow, 2, currentRow + 2, 3)
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' })
        worksheet.addImage(imageId, {
            br: { col: 3, row: currentRow + 2 },
            editAs: 'oneCell',
            tl: { col: 1, row: currentRow - 1 }
        })
    }

    worksheet.mergeCells(currentRow, 5, currentRow, 12)
    const titleCell = worksheet.getCell(currentRow, 5)
    titleCell.value = title
    titleCell.font = { bold: true, color: { argb: COLORS.brand }, name: FONT_CALIBRI, size: 26 }
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
    worksheet.getRow(currentRow).height = 36
    currentRow++

    if (subtitle) {
        worksheet.mergeCells(currentRow, 5, currentRow, 9)
        const subtitleCell = worksheet.getCell(currentRow, 5)
        subtitleCell.value = subtitle
        subtitleCell.font = { color: { argb: COLORS.slate700 }, name: FONT_CALIBRI, size: 13 }
        subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' }
        currentRow++
    }

    worksheet.mergeCells(currentRow, 5, currentRow, 12)
    const dateCell = worksheet.getCell(currentRow, 5)
    const generatedDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    dateCell.value = { hyperlink: SITE_URL, text: `Generated on ${generatedDate} on smyrnatools.com` }
    dateCell.font = { color: { argb: COLORS.slate500 }, italic: true, name: FONT_CALIBRI, size: 10, underline: true }
    currentRow += 2

    return currentRow
}

export function addOverviewSection(
    worksheet,
    {
        startRow,
        startCol,
        title,
        groups,
        getChangeText: getChangeTextFn,
        getChangeValue: getChangeValueFn,
        addChangePct: addChangePctFn
    }
) {
    const col = startCol
    let row = startRow

    worksheet.getColumn(col).width = 14
    worksheet.getColumn(col + 1).width = 8
    worksheet.getColumn(col + 2).width = 10

    worksheet.mergeCells(row, col, row, col + 2)
    const titleCell = worksheet.getCell(row, col)
    titleCell.value = title
    titleCell.font = { bold: true, color: { argb: COLORS.white }, name: FONT_CALIBRI, size: 16 }
    titleCell.fill = solidFill(COLORS.brand)
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getCell(row, col + 1).fill = solidFill(COLORS.brand)
    worksheet.getCell(row, col + 2).fill = solidFill(COLORS.brand)
    worksheet.getRow(row).height = 28
    row += 2

    const resolvedGetChangeText = getChangeTextFn || getChangeText
    const resolvedGetChangeValue = getChangeValueFn || getChangeValue
    const resolvedAddChangePct = addChangePctFn || addChangePct

    groups.forEach((group) => {
        worksheet.mergeCells(row, col, row, col + 2)
        const groupCell = worksheet.getCell(row, col)
        groupCell.value = group.title
        groupCell.font = { bold: true, color: { argb: COLORS.slate700 }, name: FONT_CALIBRI, size: 11 }
        groupCell.fill = HEADER_FILL
        groupCell.alignment = { horizontal: 'left', vertical: 'middle' }
        worksheet.getCell(row, col + 1).fill = HEADER_FILL
        worksheet.getCell(row, col + 2).fill = HEADER_FILL
        worksheet.getRow(row).height = 20
        row++

        group.metrics.forEach((metric, idx) => {
            const isAlt = idx % 2 === 1
            const bgColor = isAlt ? COLORS.snow : null

            const labelCell = worksheet.getCell(row, col)
            labelCell.value = metric.label
            labelCell.font = { color: { argb: COLORS.slate500 }, name: FONT_CALIBRI, size: 10 }
            labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) labelCell.fill = solidFill(bgColor)

            const changeInfo =
                metric.prev !== undefined
                    ? metric.useValue
                        ? resolvedGetChangeValue(metric.value, metric.prev, metric.invertChange || false)
                        : resolvedGetChangeText(metric.value, metric.prev, metric.invertChange || false)
                    : { color: null, text: '' }
            const changeCell = worksheet.getCell(row, col + 1)
            resolvedAddChangePct(changeCell, changeInfo, isAlt)
            if (bgColor && !changeInfo?.text) changeCell.fill = solidFill(bgColor)

            const valueCell = worksheet.getCell(row, col + 2)
            if (metric.suffix) {
                valueCell.value = metric.value + metric.suffix
            } else {
                valueCell.value = metric.value
                if (metric.format) valueCell.numFmt = metric.format
            }
            valueCell.font = { bold: true, color: { argb: metric.color || COLORS.brand }, name: FONT_CALIBRI, size: 12 }
            valueCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) valueCell.fill = solidFill(bgColor)

            worksheet.getRow(row).height = 20
            row++
        })
        row++
    })

    return row
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
