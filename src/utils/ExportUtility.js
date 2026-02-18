import { supabase } from '../services/DatabaseService'
import { ReportUtility } from './ReportUtility'

export { exportGeneralManagerReport } from '../app/components/modules/export/ExportModule'

export function normUpper(code) {
    return String(code || '')
        .trim()
        .toUpperCase()
}

export function normNumeric(code) {
    const s = String(code || '').trim()
    const d = s.replace(/^0+/, '')
    return d.length ? d : s.toUpperCase()
}

export function sameIsoDay(a, b) {
    return a && b && a.slice(0, 10) === b.slice(0, 10)
}

export function toMondayIso(d) {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt)) return ''
    return ReportUtility.getMondayISO(dt)
}

export function sortPlants(plants) {
    return [...plants].sort((a, b) => {
        const ac = String(a.plant_code || '').trim()
        const bc = String(b.plant_code || '').trim()
        const an = /^[0-9]+$/.test(ac) ? parseInt(ac, 10) : NaN
        const bn = /^[0-9]+$/.test(bc) ? parseInt(bc, 10) : NaN
        if (!isNaN(an) && !isNaN(bn)) return an - bn
        if (!isNaN(an) && isNaN(bn)) return -1
        if (isNaN(an) && !isNaN(bn)) return 1
        return ac.localeCompare(bc, undefined, { numeric: true, sensitivity: 'base' })
    })
}

export function getPreviousWeekIso(weekIso) {
    if (!weekIso) return null
    const [year, month, day] = weekIso.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() - 7)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export function getWeekWindow(weekIso) {
    const targetMondayIso = ReportUtility.getMondayISO(weekIso)
    if (!targetMondayIso) return null
    const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
    const prevSunday = new Date(targetMondayDate)
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
    const windowEnd = new Date(targetMondayDate)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
    return {
        qEnd: windowEnd.toISOString(),
        qStart: prevSunday.toISOString(),
        targetMondayIso
    }
}

export async function fetchEfficiencyReports(plants, weekIso) {
    const codes = Array.isArray(plants) ? plants.map((p) => p.plant_code).filter(Boolean) : []
    if (!weekIso || codes.length === 0) return []
    const window = getWeekWindow(weekIso)
    if (!window) return []
    const { targetMondayIso, qStart, qEnd } = window
    let { data: byWeek } = await supabase
        .from('reports')
        .select('id,data,week,submitted_at,report_date_range_start,completed')
        .eq('report_name', 'plant_production')
        .gte('week', qStart)
        .lt('week', qEnd)
    if (!Array.isArray(byWeek)) byWeek = []
    let { data: byRange } = await supabase
        .from('reports')
        .select('id,data,week,submitted_at,report_date_range_start,completed')
        .eq('report_name', 'plant_production')
        .gte('report_date_range_start', qStart)
        .lt('report_date_range_start', qEnd)
    if (!Array.isArray(byRange)) byRange = []
    const mergedMap = new Map()
    ;[...byWeek, ...byRange].forEach((r) => {
        if (r && !mergedMap.has(r.id)) mergedMap.set(r.id, r)
    })
    const all = [...mergedMap.values()]

    function anchorMatches(r) {
        const weekField = r.week || r.report_date_range_start || r?.data?.report_date
        const mondayIso = toMondayIso(weekField)
        return sameIsoDay(mondayIso, targetMondayIso)
    }

    const codeSetU = new Set(codes.map(normUpper))
    const codeSetN = new Set(codes.map(normNumeric))
    const filtered = all.filter(anchorMatches).filter((r) => {
        const pc = r?.data?.plant
        if (!pc) return false
        const u = normUpper(pc)
        const n = normNumeric(pc)
        return codeSetU.has(u) || codeSetN.has(n)
    })
    const byPlant = new Map()
    filtered.forEach((r) => {
        const pc = r?.data?.plant
        const key = normUpper(pc)
        const prev = byPlant.get(key)
        if (!prev) byPlant.set(key, r)
        else {
            const take =
                prev.completed !== r.completed
                    ? r.completed
                        ? r
                        : prev
                    : (prev.submitted_at || '') < (r.submitted_at || '')
                      ? r
                      : prev
            byPlant.set(key, take)
        }
    })
    const final = [...byPlant.values()].sort((a, b) => {
        const da = String(a.data?.plant || '')
        const db = String(b.data?.plant || '')
        const na = parseInt(da.replace(/\D/g, ''), 10)
        const nb = parseInt(db.replace(/\D/g, ''), 10)
        const aN = Number.isFinite(na)
        const bN = Number.isFinite(nb)
        if (aN && bN && na !== nb) return na - nb
        if (aN && !bN) return -1
        if (!aN && bN) return 1
        return da.localeCompare(db, undefined, { numeric: true, sensitivity: 'base' })
    })
    return final.map((r) => ({
        completed: r.completed,
        data: r.data,
        id: r.id,
        plant_code: r.data.plant,
        plant_name: r.data.plant,
        report_date: r.data.report_date || '',
        rows: Array.isArray(r.data.rows) ? r.data.rows : [],
        submitted_at: r.submitted_at
    }))
}

export async function fetchAggregateProductionReport(weekIso) {
    if (!weekIso) return null
    const window = getWeekWindow(weekIso)
    if (!window) return null
    const { targetMondayIso, qStart, qEnd } = window
    let { data: byWeek } = await supabase
        .from('reports')
        .select('id,data,week,report_date_range_start,completed,submitted_at')
        .eq('report_name', 'aggregate_production')
        .gte('week', qStart)
        .lt('week', qEnd)
    if (!Array.isArray(byWeek)) byWeek = []
    let { data: byRange } = await supabase
        .from('reports')
        .select('id,data,week,report_date_range_start,completed,submitted_at')
        .eq('report_name', 'aggregate_production')
        .gte('report_date_range_start', qStart)
        .lt('report_date_range_start', qEnd)
    if (!Array.isArray(byRange)) byRange = []
    const merged = new Map()
    ;[...byWeek, ...byRange].forEach((r) => {
        if (r && !merged.has(r.id)) merged.set(r.id, r)
    })

    function anchorMatches(r) {
        const weekField = r.week || r.report_date_range_start || r?.data?.report_date
        const mondayIso = toMondayIso(weekField)
        return sameIsoDay(mondayIso, targetMondayIso)
    }

    const filtered = [...merged.values()].filter(anchorMatches)
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? -1 : 1
        return (b.submitted_at || '').localeCompare(a.submitted_at || '')
    })
    return filtered.find((r) => r.completed) || filtered[0] || null
}

export async function fetchAllAggregateReports(upToWeekIso) {
    let { data: reports } = await supabase
        .from('reports')
        .select('id,data,week,report_date_range_start,completed,submitted_at')
        .eq('report_name', 'aggregate_production')
        .order('week', { ascending: false })

    if (!Array.isArray(reports)) return { monthly: [], yearly: [] }

    const byWeek = new Map()
    reports.forEach((r) => {
        const weekField = r.week || r.report_date_range_start
        const mondayIso = toMondayIso(weekField)
        if (!mondayIso || mondayIso > upToWeekIso) return
        const existing = byWeek.get(mondayIso)
        if (!existing) {
            byWeek.set(mondayIso, r)
        } else {
            if (r.completed && !existing.completed) byWeek.set(mondayIso, r)
            else if (r.completed === existing.completed && (r.submitted_at || '') > (existing.submitted_at || ''))
                byWeek.set(mondayIso, r)
        }
    })

    const currentDate = new Date(upToWeekIso + 'T00:00:00Z')
    const currentMonthKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}`
    const currentYear = currentDate.getUTCFullYear()

    const monthly = []
    const yearly = []

    byWeek.forEach((r, mondayIso) => {
        const weekDate = new Date(mondayIso + 'T00:00:00Z')
        const monthKey = `${weekDate.getUTCFullYear()}-${String(weekDate.getUTCMonth() + 1).padStart(2, '0')}`
        const year = weekDate.getUTCFullYear()

        if (monthKey === currentMonthKey) {
            monthly.push(r.data)
        }
        if (year === currentYear) {
            yearly.push(r.data)
        }
    })

    return { monthly, yearly }
}

export async function fetchRMIReport(weekIso) {
    if (!weekIso) return null
    const window = getWeekWindow(weekIso)
    if (!window) return null
    const { targetMondayIso, qStart, qEnd } = window

    let { data: reports } = await supabase
        .from('reports')
        .select('id,data,week,submitted_at,completed')
        .eq('report_name', 'ready_mix_instructor')
        .gte('week', qStart)
        .lt('week', qEnd)

    if (!Array.isArray(reports)) return null

    const filtered = reports.filter((r) => {
        const weekField = r.week
        const mondayIso = weekField ? ReportUtility.getMondayISO(weekField) : ''
        return mondayIso === targetMondayIso
    })

    if (filtered.length === 0) return null

    const sorted = filtered.sort((a, b) => {
        if (a.completed !== b.completed) return b.completed ? 1 : -1
        return (b.submitted_at || '') > (a.submitted_at || '') ? 1 : -1
    })

    return sorted[0].data
}

export async function fetchGMReportForWeek(weekIso) {
    if (!weekIso) return null
    const targetMondayIso = ReportUtility.getMondayISO(weekIso)
    if (!targetMondayIso) return null
    const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')

    const windowStart = new Date(targetMondayDate)
    windowStart.setUTCDate(windowStart.getUTCDate() - 1)
    const windowEnd = new Date(targetMondayDate)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)

    let { data: reports } = await supabase
        .from('reports')
        .select('id,data,week,submitted_at,completed')
        .eq('report_name', 'general_manager')
        .gte('week', windowStart.toISOString())
        .lt('week', windowEnd.toISOString())

    if (!Array.isArray(reports) || reports.length === 0) return null

    const filtered = reports.filter((r) => {
        const weekField = r.week
        const mondayIso = weekField ? ReportUtility.getMondayISO(weekField) : ''
        return mondayIso === targetMondayIso
    })

    if (filtered.length === 0) return null

    const sorted = filtered.sort((a, b) => {
        if (a.completed !== b.completed) return b.completed ? 1 : -1
        return (b.submitted_at || '') > (a.submitted_at || '') ? 1 : -1
    })

    return sorted[0]?.data || null
}

export async function fetchAllMonthlyGMReports() {
    let { data: reports } = await supabase
        .from('reports')
        .select('id,data,week,submitted_at,completed')
        .eq('report_name', 'general_manager')
        .order('week', { ascending: false })

    if (!Array.isArray(reports)) reports = []

    const getMondayIsoUTC = (dateInput) => {
        if (!dateInput) return null
        let isoStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString()
        const datePart = isoStr.slice(0, 10)
        const d = new Date(datePart + 'T00:00:00Z')
        if (isNaN(d.getTime())) return null
        const day = d.getUTCDay()
        d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
        return d.toISOString().slice(0, 10)
    }

    const byWeek = new Map()
    reports.forEach((r) => {
        const mondayIso = r.week ? getMondayIsoUTC(r.week) : null
        if (!mondayIso) return
        const existing = byWeek.get(mondayIso)
        if (!existing) {
            byWeek.set(mondayIso, { completed: r.completed, data: r.data, mondayIso, submitted_at: r.submitted_at })
        } else {
            if (r.completed && !existing.completed)
                byWeek.set(mondayIso, {
                    completed: r.completed,
                    data: r.data,
                    mondayIso,
                    submitted_at: r.submitted_at
                })
            else if (r.completed === existing.completed && (r.submitted_at || '') > (existing.submitted_at || ''))
                byWeek.set(mondayIso, {
                    completed: r.completed,
                    data: r.data,
                    mondayIso,
                    submitted_at: r.submitted_at
                })
        }
    })

    const getWeeksInMonth = (year, month) => {
        const firstDay = new Date(Date.UTC(year, month - 1, 1))
        const lastDay = new Date(Date.UTC(year, month, 0))
        let weeks = 0
        const d = new Date(firstDay)
        while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1)
        while (d <= lastDay) {
            weeks++
            d.setUTCDate(d.getUTCDate() + 7)
        }
        return weeks || 4
    }

    const byMonth = new Map()

    let minDate = null,
        maxDate = null
    byWeek.forEach((r, mondayIso) => {
        const weekDate = new Date(mondayIso + 'T00:00:00Z')
        if (!minDate || weekDate < minDate) minDate = weekDate
        if (!maxDate || weekDate > maxDate) maxDate = weekDate
    })

    if (minDate && maxDate) {
        const current = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), 1))
        const end = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1))
        while (current >= end) {
            const year = current.getUTCFullYear()
            const month = current.getUTCMonth() + 1
            const monthKey = `${year}-${String(month).padStart(2, '0')}`
            const monthName = current.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC', year: 'numeric' })
            const totalWeeks = getWeeksInMonth(year, month)
            byMonth.set(monthKey, { monthKey, monthName, reports: [], totalWeeks, weekIsos: new Set() })
            current.setUTCMonth(current.getUTCMonth() - 1)
        }
    }

    byWeek.forEach((r, mondayIso) => {
        const weekDate = new Date(mondayIso + 'T00:00:00Z')
        const monthKey = `${weekDate.getUTCFullYear()}-${String(weekDate.getUTCMonth() + 1).padStart(2, '0')}`
        if (byMonth.has(monthKey)) {
            byMonth.get(monthKey).reports.push({ data: r.data, weekIso: mondayIso })
            byMonth.get(monthKey).weekIsos.add(mondayIso)
        }
    })

    return [...byMonth.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export async function loadLogo(path = '/srm-logo.png') {
    try {
        const logoResponse = await fetch(path)
        if (logoResponse.ok) {
            const blob = await logoResponse.blob()
            return await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result.split(',')[1])
                reader.readAsDataURL(blob)
            })
        }
    } catch (e) {
        console.warn('Could not load logo', e)
    }
    return null
}

export async function createWorkbook() {
    const excelModule = await import('exceljs')
    const ExcelLib = excelModule.default || excelModule
    const wb = new ExcelLib.Workbook()
    wb.creator = 'Smyrna Ready Mix'
    wb.created = new Date()
    wb.modified = new Date()
    return { ExcelLib, wb }
}

export function downloadWorkbook(wb, filename) {
    return wb.xlsx.writeBuffer().then((buf) => {
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
            URL.revokeObjectURL(url)
            a.remove()
        }, 0)
    })
}

export function ensure(value, isNumeric) {
    if (isNumeric) {
        return value === null || value === undefined || value === '' ? 0 : Number(value)
    }
    return value === null || value === undefined || value === '' ? '' : value
}

export function truncateToTenth(n) {
    if (typeof n !== 'number' || !isFinite(n)) return n
    return Math.floor(n * 10) / 10
}

export function calcChange(current, previous) {
    if (previous === null || previous === undefined) {
        return { diff: 0, direction: 'neutral', pct: 0 }
    }
    const diff = current - previous
    const pct = previous === 0 ? (current === 0 ? 0 : 100) : Math.round(((current - previous) / previous) * 100)
    if (diff > 0) return { diff, direction: 'up', pct }
    if (diff < 0) return { diff: Math.abs(diff), direction: 'down', pct: Math.abs(pct) }
    return { diff: 0, direction: 'neutral', pct: 0 }
}

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

export function getChangeText(current, previous, invertColors = false) {
    const change = calcChange(current, previous)
    if (change.direction === 'neutral' || change.pct === 0) {
        return { color: COLORS.slate300, text: '0%' }
    }
    if (change.direction === 'up') {
        return { color: invertColors ? COLORS.danger : COLORS.success, text: `+${change.pct}%` }
    }
    return { color: invertColors ? COLORS.success : COLORS.danger, text: `-${change.pct}%` }
}

export function getChangeValue(current, previous, invertColors = false) {
    const change = calcChange(current, previous)
    if (change.direction === 'neutral' || change.diff === 0) {
        return { color: COLORS.slate300, text: '0' }
    }
    if (change.direction === 'up') {
        return { color: invertColors ? COLORS.danger : COLORS.success, text: `+${change.diff}` }
    }
    return { color: invertColors ? COLORS.success : COLORS.danger, text: `-${change.diff}` }
}

export function addSectionTitle(ws, row, text) {
    ws.mergeCells(row, 2, row, 12)
    const cell = ws.getCell(row, 2)
    cell.value = text
    cell.font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 14 }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
    for (let c = 2; c <= 16; c++) {
        ws.getCell(row, c).border = { bottom: { color: { argb: COLORS.brand }, style: 'medium' } }
    }
    ws.getRow(row).height = 28
}

export function addTableHeaders(ws, row, headers, startCol = 2) {
    headers.forEach((h, idx) => {
        const cell = ws.getCell(row, startCol + idx)
        cell.value = h
        cell.font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
        cell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = { bottom: { color: { argb: COLORS.slate300 }, style: 'thin' } }
    })
    ws.getRow(row).height = 22
}

export function addMergedTableHeaders(ws, row, headers, startCol = 2) {
    let col = startCol
    headers.forEach((h) => {
        const mergeCount = h.mergeCount || (h.merge ? 2 : 1)
        const align = h.align || 'center'
        if (mergeCount > 1) {
            ws.mergeCells(row, col, row, col + mergeCount - 1)
            const cell = ws.getCell(row, col)
            cell.value = h.label
            cell.font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
            cell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            cell.alignment = { horizontal: align, vertical: 'middle' }
            cell.border = { bottom: { color: { argb: COLORS.slate300 }, style: 'thin' } }
            for (let i = 1; i < mergeCount; i++) {
                ws.getCell(row, col + i).fill = {
                    fgColor: { argb: COLORS.slate100 },
                    pattern: 'solid',
                    type: 'pattern'
                }
                ws.getCell(row, col + i).border = { bottom: { color: { argb: COLORS.slate300 }, style: 'thin' } }
            }
            col += mergeCount
        } else {
            const cell = ws.getCell(row, col)
            cell.value = h.label
            cell.font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
            cell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            cell.alignment = { horizontal: align, vertical: 'middle' }
            cell.border = { bottom: { color: { argb: COLORS.slate300 }, style: 'thin' } }
            col += 1
        }
    })
    ws.getRow(row).height = 22
}

export function addChangePct(cell, changeInfo, isAlt = false) {
    if (!changeInfo || !changeInfo.text) {
        cell.value = ''
        if (isAlt) {
            cell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
        }
    } else {
        cell.value = changeInfo.text.trim()
        cell.font = { bold: true, color: { argb: changeInfo.color }, name: 'Calibri', size: 8 }
        const bgColor =
            changeInfo.color === COLORS.success
                ? COLORS.successLight
                : changeInfo.color === COLORS.danger
                  ? COLORS.dangerLight
                  : isAlt
                    ? COLORS.snow
                    : null
        if (bgColor) {
            cell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        }
    }
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

export function addDataRow(ws, row, values, startCol = 2, isAlt = false) {
    values.forEach((v, idx) => {
        const cell = ws.getCell(row, startCol + idx)
        if (typeof v === 'object' && v !== null) {
            if (v.richText) {
                cell.value = { richText: v.richText }
            } else {
                cell.value = v.value
            }
            if (v.format) cell.numFmt = v.format
            cell.alignment = { horizontal: v.align || 'left', vertical: 'middle' }
            if (v.color) cell.font = { bold: v.bold, color: { argb: v.color }, name: 'Calibri', size: 11 }
            else if (!v.richText) cell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        } else {
            cell.value = v
            cell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            cell.alignment = { horizontal: typeof v === 'number' ? 'right' : 'left', vertical: 'middle' }
        }
        if (isAlt) {
            cell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
        }
    })
    ws.getRow(row).height = 20
}

export function applySubtleBackground(ws, maxRow = 200, maxCol = 30) {
    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
        const row = ws.getRow(rowNum)
        for (let colNum = 1; colNum <= maxCol; colNum++) {
            const cell = row.getCell(colNum)
            if (!cell.fill || !cell.fill.fgColor || cell.fill.fgColor.argb === 'FFFFFFFF') {
                cell.fill = { fgColor: { argb: COLORS.subtleGray }, pattern: 'solid', type: 'pattern' }
            }
        }
    }
}

export function applyTotalCell(cell, value, format) {
    cell.value = value
    if (format) cell.numFmt = format
    cell.font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 11 }
    cell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
    cell.border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
}

export function applyTotalChangeCell(cell, changeInfo) {
    if (changeInfo && changeInfo.text) {
        cell.value = changeInfo.text.trim()
        cell.font = { bold: true, color: { argb: changeInfo.color }, name: 'Calibri', size: 9 }
    } else {
        cell.value = ''
    }
    cell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
    cell.border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

export function addReportHeader(ws, wb, { logoBase64, title, subtitle, row = 2 }) {
    let r = row

    if (logoBase64) {
        ws.mergeCells(r, 2, r + 2, 3)
        const imageId = wb.addImage({
            base64: logoBase64,
            extension: 'png'
        })
        ws.addImage(imageId, {
            br: { col: 3, row: r + 2 },
            editAs: 'oneCell',
            tl: { col: 1, row: r - 1 }
        })
    }

    ws.mergeCells(r, 5, r, 12)
    const titleCell = ws.getCell(r, 5)
    titleCell.value = title
    titleCell.font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 26 }
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getRow(r).height = 36
    r++

    if (subtitle) {
        ws.mergeCells(r, 5, r, 9)
        const subtitleCell = ws.getCell(r, 5)
        subtitleCell.value = subtitle
        subtitleCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 13 }
        subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' }
        r++
    }

    ws.mergeCells(r, 5, r, 12)
    const dateCell = ws.getCell(r, 5)
    dateCell.value = {
        hyperlink: 'https://smyrnatools.com',
        text:
            'Generated on ' +
            new Date().toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }) +
            ' on smyrnatools.com'
    }
    dateCell.font = { color: { argb: COLORS.slate500 }, italic: true, name: 'Calibri', size: 10, underline: true }
    r += 2

    return r
}

export function addOverviewSection(
    ws,
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

    ws.getColumn(col).width = 14
    ws.getColumn(col + 1).width = 8
    ws.getColumn(col + 2).width = 10

    ws.mergeCells(row, col, row, col + 2)
    const titleCell = ws.getCell(row, col)
    titleCell.value = title
    titleCell.font = { bold: true, color: { argb: COLORS.white }, name: 'Calibri', size: 16 }
    titleCell.fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(row, col + 1).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    ws.getCell(row, col + 2).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    ws.getRow(row).height = 28
    row += 2

    const _getChangeText = getChangeTextFn || getChangeText
    const _getChangeValue = getChangeValueFn || getChangeValue
    const _addChangePct = addChangePctFn || addChangePct

    groups.forEach((group) => {
        ws.mergeCells(row, col, row, col + 2)
        const groupCell = ws.getCell(row, col)
        groupCell.value = group.title
        groupCell.font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        groupCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        groupCell.alignment = { horizontal: 'left', vertical: 'middle' }
        ws.getCell(row, col + 1).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        ws.getCell(row, col + 2).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        ws.getRow(row).height = 20
        row++

        group.metrics.forEach((metric, idx) => {
            const isAlt = idx % 2 === 1
            const bgColor = isAlt ? COLORS.snow : null

            const labelCell = ws.getCell(row, col)
            labelCell.value = metric.label
            labelCell.font = { color: { argb: COLORS.slate500 }, name: 'Calibri', size: 10 }
            labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) labelCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

            const changeInfo =
                metric.prev !== undefined
                    ? metric.useValue
                        ? _getChangeValue(metric.value, metric.prev, metric.invertChange || false)
                        : _getChangeText(metric.value, metric.prev, metric.invertChange || false)
                    : { color: null, text: '' }
            const changeCell = ws.getCell(row, col + 1)
            _addChangePct(changeCell, changeInfo, isAlt)
            if (bgColor && (!changeInfo || !changeInfo.text)) {
                changeCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
            }

            const valueCell = ws.getCell(row, col + 2)
            if (metric.suffix) {
                valueCell.value = metric.value + metric.suffix
            } else {
                valueCell.value = metric.value
                if (metric.format) valueCell.numFmt = metric.format
            }
            valueCell.font = { bold: true, color: { argb: metric.color || COLORS.brand }, name: 'Calibri', size: 12 }
            valueCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) valueCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

            ws.getRow(row).height = 20
            row++
        })
        row++
    })

    return row
}

export function setDefaultPageSetup(ws) {
    ws.pageSetup = {
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
