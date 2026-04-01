import { Database } from '../services/DatabaseService'
import { ReportUtility } from './ReportUtility'
/**
 * Excel export infrastructure: workbook creation, styled header/data row builders,
 * report fetching with week-window alignment, change-percentage formatting,
 * and reusable section/overview layout helpers for ExcelJS workbooks.
 */
export { exportGeneralManagerReport } from '../app/components/modules/export/ExportModule'

const LOCALE_COMPARE_OPTIONS = { numeric: true, sensitivity: 'base' }
const REPORT_COLUMNS_FULL = 'id,data,week,submitted_at,report_date_range_start,completed'
const REPORT_COLUMNS_SHORT = 'id,data,week,submitted_at,completed'
const FONT_CALIBRI = 'Calibri'
const WORKBOOK_CREATOR = 'Smyrna Ready Mix'
const SITE_URL = 'https://smyrnatools.com'
const EMPTY_WEEK_RESULT = { reports: [], targetMondayIso: '' }

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

/* ── Reusable ExcelJS style builders ─────────────────────────────────── */

/**
 * Build a Calibri font descriptor. Every font in the workbook flows through here
 * so a typeface change only requires editing one line.
 * @param {number} size - Font size in points
 * @param {string} colorArgb - ARGB hex string from COLORS
 * @param {{ bold?: boolean, italic?: boolean, underline?: boolean }} [options]
 */
function buildFont(size, colorArgb, { bold, italic, underline } = {}) {
    const font = { color: { argb: colorArgb }, name: FONT_CALIBRI, size }
    if (bold) font.bold = true
    if (italic) font.italic = true
    if (underline) font.underline = true
    return font
}

function solidFill(argb) {
    return { fgColor: { argb }, pattern: 'solid', type: 'pattern' }
}

function alignMiddle(horizontal) {
    return { horizontal, vertical: 'middle' }
}

const HEADER_FONT = buildFont(10, COLORS.slate700, { bold: true })
const HEADER_FILL = solidFill(COLORS.slate100)
const HEADER_BORDER = { bottom: { color: { argb: COLORS.slate300 }, style: 'thin' } }
const TOTAL_BORDER = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
const BRAND_UNDERLINE_BORDER = { bottom: { color: { argb: COLORS.brand }, style: 'medium' } }
const DATA_FONT = buildFont(11, COLORS.slate700)

/* ── String / date normalization ─────────────────────────────────────── */

export function normUpper(code) {
    return String(code || '').trim().toUpperCase()
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

/* ── Report comparison / filtering helpers ───────────────────────────── */

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

/* ── Cell styling helpers ────────────────────────────────────────────── */

function applyHeaderStyle(cell, label, alignment = 'center') {
    cell.value = label
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = alignMiddle(alignment)
    cell.border = HEADER_BORDER
}

function resolveChangeColor(direction, invertColors) {
    if (direction === 'up') return invertColors ? COLORS.danger : COLORS.success
    if (direction === 'down') return invertColors ? COLORS.success : COLORS.danger
    return COLORS.slate300
}

/**
 * Resolve the background highlight for a change indicator cell.
 * Success/danger get a light tint; neutral cells fall back to the alt-row stripe.
 */
function resolveChangeBgColor(changeColorArgb, isAltRow) {
    if (changeColorArgb === COLORS.success) return COLORS.successLight
    if (changeColorArgb === COLORS.danger) return COLORS.dangerLight
    return isAltRow ? COLORS.snow : null
}

/* ── Plant sorting ───────────────────────────────────────────────────── */

export function sortPlants(plants) {
    return [...plants].sort((a, b) =>
        numericPlantComparator(String(a.plant_code || '').trim(), String(b.plant_code || '').trim())
    )
}

/* ── Week window utilities ───────────────────────────────────────────── */

export function getPreviousWeekIso(weekIso) {
    if (!weekIso) return null
    const normalized = toMondayIso(weekIso) || String(weekIso).slice(0, 10)
    const [year, month, day] = normalized.split('-').map(Number)
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
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

/* ── Report fetching ─────────────────────────────────────────────────── */

/**
 * Shared guard for week-window queries. Returns the window or EMPTY_WEEK_RESULT
 * when the ISO date is unparseable.
 */
function resolveWeekWindow(weekIso) {
    const window = getWeekWindow(weekIso)
    return window ?? null
}

async function fetchReportsByWeekWindow(reportName, weekIso) {
    const window = resolveWeekWindow(weekIso)
    if (!window) return EMPTY_WEEK_RESULT
    const { targetMondayIso, qStart, qEnd } = window
    const { data } = await Database.from('reports')
        .select(REPORT_COLUMNS_SHORT)
        .eq('report_name', reportName)
        .gte('week', qStart)
        .lt('week', qEnd)
    const filtered = (Array.isArray(data) ? data : []).filter((report) => anchorMatchesMonday(report, targetMondayIso))
    return { reports: filtered, targetMondayIso }
}

async function fetchReportsDualQuery(reportName, weekIso) {
    const window = resolveWeekWindow(weekIso)
    if (!window) return EMPTY_WEEK_RESULT
    const { targetMondayIso, qStart, qEnd } = window
    const [byWeek, byRange] = await Promise.all([
        Database.from('reports')
            .select(REPORT_COLUMNS_FULL)
            .eq('report_name', reportName)
            .gte('week', qStart)
            .lt('week', qEnd),
        Database.from('reports')
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

/* ── Public report fetchers ──────────────────────────────────────────── */

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
    const { data: reports } = await Database.from('reports')
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
    const { data: reports } = await Database.from('reports')
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

/* ── Workbook creation / download ────────────────────────────────────── */

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

/* ── Value coercion / change calculation ─────────────────────────────── */

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

/* ── Worksheet layout builders ───────────────────────────────────────── */

export function addSectionTitle(worksheet, row, text) {
    worksheet.mergeCells(row, 2, row, 12)
    const cell = worksheet.getCell(row, 2)
    cell.value = text
    cell.font = buildFont(14, COLORS.brand, { bold: true })
    cell.alignment = alignMiddle('left')
    for (let col = 2; col <= 16; col++) {
        worksheet.getCell(row, col).border = BRAND_UNDERLINE_BORDER
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
        cell.font = buildFont(8, changeInfo.color, { bold: true })
        const bgColor = resolveChangeBgColor(changeInfo.color, isAlt)
        if (bgColor) cell.fill = solidFill(bgColor)
    }
    cell.alignment = alignMiddle('right')
}

export function addDataRow(worksheet, row, values, startCol = 2, isAlt = false) {
    values.forEach((value, idx) => {
        const cell = worksheet.getCell(row, startCol + idx)
        if (typeof value === 'object' && value !== null) {
            cell.value = value.richText ? { richText: value.richText } : value.value
            if (value.format) cell.numFmt = value.format
            cell.alignment = alignMiddle(value.align || 'left')
            cell.font = value.color
                ? buildFont(11, value.color, { bold: value.bold })
                : value.richText ? undefined : DATA_FONT
        } else {
            cell.value = value
            cell.font = DATA_FONT
            cell.alignment = alignMiddle(typeof value === 'number' ? 'right' : 'left')
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
    cell.font = buildFont(11, COLORS.brand, { bold: true })
    cell.fill = HEADER_FILL
    cell.border = TOTAL_BORDER
    cell.alignment = alignMiddle('left')
}

export function applyTotalChangeCell(cell, changeInfo) {
    cell.value = changeInfo?.text?.trim() || ''
    if (changeInfo?.text) {
        cell.font = buildFont(9, changeInfo.color, { bold: true })
    }
    cell.fill = HEADER_FILL
    cell.border = TOTAL_BORDER
    cell.alignment = alignMiddle('right')
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
    titleCell.font = buildFont(26, COLORS.brand, { bold: true })
    titleCell.alignment = alignMiddle('left')
    worksheet.getRow(currentRow).height = 36
    currentRow++
    if (subtitle) {
        worksheet.mergeCells(currentRow, 5, currentRow, 9)
        const subtitleCell = worksheet.getCell(currentRow, 5)
        subtitleCell.value = subtitle
        subtitleCell.font = buildFont(13, COLORS.slate700)
        subtitleCell.alignment = alignMiddle('left')
        currentRow++
    }
    worksheet.mergeCells(currentRow, 5, currentRow, 12)
    const dateCell = worksheet.getCell(currentRow, 5)
    const generatedDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    dateCell.value = { hyperlink: SITE_URL, text: `Generated on ${generatedDate} on smyrnatools.com` }
    dateCell.font = buildFont(10, COLORS.slate500, { italic: true, underline: true })
    currentRow += 2
    return currentRow
}

/**
 * Render a single metric row inside an overview section.
 * Extracted from addOverviewSection to keep the group loop readable.
 */
function renderOverviewMetric(worksheet, row, col, metric, isAlt, resolvedGetChangeText, resolvedGetChangeValue, resolvedAddChangePct) {
    const bgColor = isAlt ? COLORS.snow : null

    const labelCell = worksheet.getCell(row, col)
    labelCell.value = metric.label
    labelCell.font = buildFont(10, COLORS.slate500)
    labelCell.alignment = alignMiddle('left')
    if (bgColor) labelCell.fill = solidFill(bgColor)

    const changeInfo = metric.prev !== undefined
        ? metric.useValue
            ? resolvedGetChangeValue(metric.value, metric.prev, metric.invertChange || false)
            : resolvedGetChangeText(metric.value, metric.prev, metric.invertChange || false)
        : { color: null, text: '' }
    const changeCell = worksheet.getCell(row, col + 1)
    resolvedAddChangePct(changeCell, changeInfo, isAlt)
    if (bgColor && !changeInfo?.text) changeCell.fill = solidFill(bgColor)

    const valueCell = worksheet.getCell(row, col + 2)
    valueCell.value = metric.suffix ? metric.value + metric.suffix : metric.value
    if (!metric.suffix && metric.format) valueCell.numFmt = metric.format
    valueCell.font = buildFont(12, metric.color || COLORS.brand, { bold: true })
    valueCell.alignment = alignMiddle('left')
    if (bgColor) valueCell.fill = solidFill(bgColor)

    worksheet.getRow(row).height = 20
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

    // Section title banner
    worksheet.mergeCells(row, col, row, col + 2)
    const titleCell = worksheet.getCell(row, col)
    titleCell.value = title
    titleCell.font = buildFont(16, COLORS.white, { bold: true })
    titleCell.fill = solidFill(COLORS.brand)
    titleCell.alignment = alignMiddle('center')
    worksheet.getCell(row, col + 1).fill = solidFill(COLORS.brand)
    worksheet.getCell(row, col + 2).fill = solidFill(COLORS.brand)
    worksheet.getRow(row).height = 28
    row += 2

    const resolvedGetChangeText = getChangeTextFn || getChangeText
    const resolvedGetChangeValue = getChangeValueFn || getChangeValue
    const resolvedAddChangePct = addChangePctFn || addChangePct

    groups.forEach((group) => {
        // Group header
        worksheet.mergeCells(row, col, row, col + 2)
        const groupCell = worksheet.getCell(row, col)
        groupCell.value = group.title
        groupCell.font = buildFont(11, COLORS.slate700, { bold: true })
        groupCell.fill = HEADER_FILL
        groupCell.alignment = alignMiddle('left')
        worksheet.getCell(row, col + 1).fill = HEADER_FILL
        worksheet.getCell(row, col + 2).fill = HEADER_FILL
        worksheet.getRow(row).height = 20
        row++

        group.metrics.forEach((metric, idx) => {
            renderOverviewMetric(worksheet, row, col, metric, idx % 2 === 1, resolvedGetChangeText, resolvedGetChangeValue, resolvedAddChangePct)
            row++
        })
        row++
    })
    return row
}

/* ── Page setup / column defaults ────────────────────────────────────── */

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
