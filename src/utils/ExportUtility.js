import {supabase} from '../services/DatabaseService'
import {ReportUtility} from './ReportUtility'

export {exportGeneralManagerReport} from '../components/modules/export/ExportModule'

export function normUpper(code) {
    return String(code || '').trim().toUpperCase()
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
        return ac.localeCompare(bc, undefined, {numeric: true, sensitivity: 'base'})
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
        targetMondayIso,
        qStart: prevSunday.toISOString(),
        qEnd: windowEnd.toISOString()
    }
}

export async function fetchEfficiencyReports(plants, weekIso) {
    const codes = Array.isArray(plants) ? plants.map(p => p.plant_code).filter(Boolean) : []
    if (!weekIso || codes.length === 0) return []
    const window = getWeekWindow(weekIso)
    if (!window) return []
    const {targetMondayIso, qStart, qEnd} = window
    let {data: byWeek} = await supabase.from('reports').select('id,data,week,submitted_at,report_date_range_start,completed').eq('report_name', 'plant_production').gte('week', qStart).lt('week', qEnd)
    if (!Array.isArray(byWeek)) byWeek = []
    let {data: byRange} = await supabase.from('reports').select('id,data,week,submitted_at,report_date_range_start,completed').eq('report_name', 'plant_production').gte('report_date_range_start', qStart).lt('report_date_range_start', qEnd)
    if (!Array.isArray(byRange)) byRange = []
    const mergedMap = new Map()
    ;[...byWeek, ...byRange].forEach(r => {
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
    const filtered = all.filter(anchorMatches).filter(r => {
        const pc = r?.data?.plant
        if (!pc) return false
        const u = normUpper(pc)
        const n = normNumeric(pc)
        return codeSetU.has(u) || codeSetN.has(n)
    })
    const byPlant = new Map()
    filtered.forEach(r => {
        const pc = r?.data?.plant
        const key = normUpper(pc)
        const prev = byPlant.get(key)
        if (!prev) byPlant.set(key, r)
        else {
            const take = (prev.completed !== r.completed) ? (r.completed ? r : prev) : ((prev.submitted_at || '') < (r.submitted_at || '') ? r : prev)
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
        return da.localeCompare(db, undefined, {numeric: true, sensitivity: 'base'})
    })
    return final.map(r => ({
        id: r.id,
        plant_code: r.data.plant,
        plant_name: r.data.plant,
        report_date: r.data.report_date || '',
        rows: Array.isArray(r.data.rows) ? r.data.rows : [],
        data: r.data,
        completed: r.completed,
        submitted_at: r.submitted_at
    }))
}

export async function fetchAggregateProductionReport(weekIso) {
    if (!weekIso) return null
    const window = getWeekWindow(weekIso)
    if (!window) return null
    const {targetMondayIso, qStart, qEnd} = window
    let {data: byWeek} = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('week', qStart).lt('week', qEnd)
    if (!Array.isArray(byWeek)) byWeek = []
    let {data: byRange} = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('report_date_range_start', qStart).lt('report_date_range_start', qEnd)
    if (!Array.isArray(byRange)) byRange = []
    const merged = new Map()
    ;[...byWeek, ...byRange].forEach(r => {
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
    return filtered.find(r => r.completed) || filtered[0] || null
}

export async function fetchRMIReport(weekIso) {
    if (!weekIso) return null
    const window = getWeekWindow(weekIso)
    if (!window) return null
    const {targetMondayIso, qStart, qEnd} = window

    let {data: reports} = await supabase
        .from('reports')
        .select('id,data,week,submitted_at,completed')
        .eq('report_name', 'ready_mix_instructor')
        .gte('week', qStart)
        .lt('week', qEnd)

    if (!Array.isArray(reports)) return null

    const filtered = reports.filter(r => {
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

    let {data: reports} = await supabase
        .from('reports')
        .select('id,data,week,submitted_at,completed')
        .eq('report_name', 'general_manager')
        .gte('week', windowStart.toISOString())
        .lt('week', windowEnd.toISOString())

    if (!Array.isArray(reports) || reports.length === 0) return null

    const filtered = reports.filter(r => {
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
    let {data: reports} = await supabase
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
    reports.forEach(r => {
        const mondayIso = r.week ? getMondayIsoUTC(r.week) : null
        if (!mondayIso) return
        const existing = byWeek.get(mondayIso)
        if (!existing) {
            byWeek.set(mondayIso, { mondayIso, data: r.data, completed: r.completed, submitted_at: r.submitted_at })
        } else {
            if (r.completed && !existing.completed) byWeek.set(mondayIso, { mondayIso, data: r.data, completed: r.completed, submitted_at: r.submitted_at })
            else if (r.completed === existing.completed && (r.submitted_at || '') > (existing.submitted_at || '')) byWeek.set(mondayIso, { mondayIso, data: r.data, completed: r.completed, submitted_at: r.submitted_at })
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
    
    let minDate = null, maxDate = null
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
            const monthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
            const totalWeeks = getWeeksInMonth(year, month)
            byMonth.set(monthKey, { monthKey, monthName, reports: [], weekIsos: new Set(), totalWeeks })
            current.setUTCMonth(current.getUTCMonth() - 1)
        }
    }
    
    byWeek.forEach((r, mondayIso) => {
        const weekDate = new Date(mondayIso + 'T00:00:00Z')
        const monthKey = `${weekDate.getUTCFullYear()}-${String(weekDate.getUTCMonth() + 1).padStart(2, '0')}`
        if (byMonth.has(monthKey)) {
            byMonth.get(monthKey).reports.push(r.data)
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
    return { wb, ExcelLib }
}

export function downloadWorkbook(wb, filename) {
    return wb.xlsx.writeBuffer().then(buf => {
        const blob = new Blob([buf], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
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
        return (value === null || value === undefined || value === '') ? 0 : Number(value)
    }
    return (value === null || value === undefined || value === '') ? '' : value
}

export function truncateToTenth(n) {
    if (typeof n !== 'number' || !isFinite(n)) return n
    return Math.floor(n * 10) / 10
}

export function calcChange(current, previous) {
    if (previous === null || previous === undefined) {
        return {diff: 0, pct: 0, direction: 'neutral'}
    }
    const diff = current - previous
    const pct = previous === 0 ? (current === 0 ? 0 : 100) : Math.round(((current - previous) / previous) * 100)
    if (diff > 0) return {diff, pct, direction: 'up'}
    if (diff < 0) return {diff: Math.abs(diff), pct: Math.abs(pct), direction: 'down'}
    return {diff: 0, pct: 0, direction: 'neutral'}
}

export const COLORS = {
    brand: 'FF2C4A6B',
    brandLight: 'FF3B5F8A',
    accent: 'FF4B7BA8',
    success: 'FF2D7A5F',
    successLight: 'FFD4E8E0',
    warning: 'FFCA8A2B',
    danger: 'FFB93A3A',
    dangerLight: 'FFF5D9D9',
    white: 'FFFFFFFF',
    cream: 'FFF8F9FA',
    snow: 'FFE0E3E6',
    slate100: 'FFD0D4D8',
    slate200: 'FFC8CDD2',
    slate300: 'FFB5BBC2',
    slate500: 'FF8B949E',
    slate700: 'FF5A6672',
    slate900: 'FF2D3748',
    subtleGray: 'FFE8EAED'
}

export function getChangeText(current, previous, invertColors = false) {
    const change = calcChange(current, previous)
    if (change.direction === 'neutral' || change.pct === 0) {
        return {text: '0%', color: COLORS.slate300}
    }
    if (change.direction === 'up') {
        return {text: `+${change.pct}%`, color: invertColors ? COLORS.danger : COLORS.success}
    }
    return {text: `-${change.pct}%`, color: invertColors ? COLORS.success : COLORS.danger}
}

export function getChangeValue(current, previous, invertColors = false) {
    const change = calcChange(current, previous)
    if (change.direction === 'neutral' || change.diff === 0) {
        return {text: '0', color: COLORS.slate300}
    }
    if (change.direction === 'up') {
        return {text: `+${change.diff}`, color: invertColors ? COLORS.danger : COLORS.success}
    }
    return {text: `-${change.diff}`, color: invertColors ? COLORS.success : COLORS.danger}
}

export function addSectionTitle(ws, row, text) {
    ws.mergeCells(row, 2, row, 12)
    const cell = ws.getCell(row, 2)
    cell.value = text
    cell.font = {name: 'Calibri', size: 14, bold: true, color: {argb: COLORS.brand}}
    cell.alignment = {vertical: 'middle', horizontal: 'left'}
    for (let c = 2; c <= 16; c++) {
        ws.getCell(row, c).border = {bottom: {style: 'medium', color: {argb: COLORS.brand}}}
    }
    ws.getRow(row).height = 28
}

export function addTableHeaders(ws, row, headers, startCol = 2) {
    headers.forEach((h, idx) => {
        const cell = ws.getCell(row, startCol + idx)
        cell.value = h
        cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: COLORS.slate700}}
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        cell.alignment = {vertical: 'middle', horizontal: 'center'}
        cell.border = {bottom: {style: 'thin', color: {argb: COLORS.slate300}}}
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
            cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: COLORS.slate700}}
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
            cell.alignment = {vertical: 'middle', horizontal: align}
            cell.border = {bottom: {style: 'thin', color: {argb: COLORS.slate300}}}
            for (let i = 1; i < mergeCount; i++) {
                ws.getCell(row, col + i).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
                ws.getCell(row, col + i).border = {bottom: {style: 'thin', color: {argb: COLORS.slate300}}}
            }
            col += mergeCount
        } else {
            const cell = ws.getCell(row, col)
            cell.value = h.label
            cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: COLORS.slate700}}
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
            cell.alignment = {vertical: 'middle', horizontal: align}
            cell.border = {bottom: {style: 'thin', color: {argb: COLORS.slate300}}}
            col += 1
        }
    })
    ws.getRow(row).height = 22
}

export function addChangePct(cell, changeInfo, isAlt = false) {
    if (!changeInfo || !changeInfo.text) {
        cell.value = ''
        if (isAlt) {
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
        }
    } else {
        cell.value = changeInfo.text.trim()
        cell.font = {name: 'Calibri', size: 8, bold: true, color: {argb: changeInfo.color}}
        const bgColor = changeInfo.color === COLORS.success ? COLORS.successLight : 
                       changeInfo.color === COLORS.danger ? COLORS.dangerLight : 
                       (isAlt ? COLORS.snow : null)
        if (bgColor) {
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: bgColor}}
        }
    }
    cell.alignment = {vertical: 'middle', horizontal: 'right'}
}

export function addDataRow(ws, row, values, startCol = 2, isAlt = false) {
    values.forEach((v, idx) => {
        const cell = ws.getCell(row, startCol + idx)
        if (typeof v === 'object' && v !== null) {
            if (v.richText) {
                cell.value = {richText: v.richText}
            } else {
                cell.value = v.value
            }
            if (v.format) cell.numFmt = v.format
            cell.alignment = {vertical: 'middle', horizontal: v.align || 'left'}
            if (v.color) cell.font = {name: 'Calibri', size: 11, color: {argb: v.color}, bold: v.bold}
            else if (!v.richText) cell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
        } else {
            cell.value = v
            cell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
            cell.alignment = {vertical: 'middle', horizontal: typeof v === 'number' ? 'right' : 'left'}
        }
        if (isAlt) {
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
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
                cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.subtleGray}}
            }
        }
    }
}

export function applyTotalCell(cell, value, format) {
    cell.value = value
    if (format) cell.numFmt = format
    cell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.brand}}
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
    cell.border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
    cell.alignment = {vertical: 'middle', horizontal: 'left'}
}

export function applyTotalChangeCell(cell, changeInfo) {
    if (changeInfo && changeInfo.text) {
        cell.value = changeInfo.text.trim()
        cell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: changeInfo.color}}
    } else {
        cell.value = ''
    }
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
    cell.border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
    cell.alignment = {vertical: 'middle', horizontal: 'right'}
}

export function addReportHeader(ws, wb, {logoBase64, title, subtitle, row = 2}) {
    let r = row
    
    if (logoBase64) {
        ws.mergeCells(r, 2, r + 2, 3)
        const imageId = wb.addImage({
            base64: logoBase64,
            extension: 'png'
        })
        ws.addImage(imageId, {
            tl: { col: 1, row: r - 1 },
            br: { col: 3, row: r + 2 },
            editAs: 'oneCell'
        })
    }

    ws.mergeCells(r, 5, r, 12)
    const titleCell = ws.getCell(r, 5)
    titleCell.value = title
    titleCell.font = {name: 'Calibri', size: 26, bold: true, color: {argb: COLORS.brand}}
    titleCell.alignment = {vertical: 'middle', horizontal: 'left'}
    ws.getRow(r).height = 36
    r++

    if (subtitle) {
        ws.mergeCells(r, 5, r, 9)
        const subtitleCell = ws.getCell(r, 5)
        subtitleCell.value = subtitle
        subtitleCell.font = {name: 'Calibri', size: 13, color: {argb: COLORS.slate700}}
        subtitleCell.alignment = {vertical: 'middle', horizontal: 'left'}
        r++
    }

    ws.mergeCells(r, 5, r, 12)
    const dateCell = ws.getCell(r, 5)
    dateCell.value = {
        text: 'Generated on ' + new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ' on smyrnatools.com',
        hyperlink: 'https://smyrnatools.com'
    }
    dateCell.font = {name: 'Calibri', size: 10, italic: true, color: {argb: COLORS.slate500}, underline: true}
    r += 2

    return r
}

export function addOverviewSection(ws, {startRow, startCol, title, groups, getChangeText: getChangeTextFn, getChangeValue: getChangeValueFn, addChangePct: addChangePctFn}) {
    const col = startCol
    let row = startRow

    ws.getColumn(col).width = 14
    ws.getColumn(col + 1).width = 8
    ws.getColumn(col + 2).width = 10

    ws.mergeCells(row, col, row, col + 2)
    const titleCell = ws.getCell(row, col)
    titleCell.value = title
    titleCell.font = {name: 'Calibri', size: 16, bold: true, color: {argb: COLORS.white}}
    titleCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.brand}}
    titleCell.alignment = {vertical: 'middle', horizontal: 'center'}
    ws.getCell(row, col + 1).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.brand}}
    ws.getCell(row, col + 2).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.brand}}
    ws.getRow(row).height = 28
    row += 2

    const _getChangeText = getChangeTextFn || getChangeText
    const _getChangeValue = getChangeValueFn || getChangeValue
    const _addChangePct = addChangePctFn || addChangePct

    groups.forEach(group => {
        ws.mergeCells(row, col, row, col + 2)
        const groupCell = ws.getCell(row, col)
        groupCell.value = group.title
        groupCell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.slate700}}
        groupCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        groupCell.alignment = {vertical: 'middle', horizontal: 'left'}
        ws.getCell(row, col + 1).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        ws.getCell(row, col + 2).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        ws.getRow(row).height = 20
        row++

        group.metrics.forEach((metric, idx) => {
            const isAlt = idx % 2 === 1
            const bgColor = isAlt ? COLORS.snow : null

            const labelCell = ws.getCell(row, col)
            labelCell.value = metric.label
            labelCell.font = {name: 'Calibri', size: 10, color: {argb: COLORS.slate500}}
            labelCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (bgColor) labelCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: bgColor}}

            const changeInfo = metric.prev !== undefined ? 
                (metric.useValue ? _getChangeValue(metric.value, metric.prev, metric.invertChange || false) : _getChangeText(metric.value, metric.prev, metric.invertChange || false)) : 
                {text: '', color: null}
            const changeCell = ws.getCell(row, col + 1)
            _addChangePct(changeCell, changeInfo, isAlt)
            if (bgColor && (!changeInfo || !changeInfo.text)) {
                changeCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: bgColor}}
            }

            const valueCell = ws.getCell(row, col + 2)
            if (metric.suffix) {
                valueCell.value = metric.value + metric.suffix
            } else {
                valueCell.value = metric.value
                if (metric.format) valueCell.numFmt = metric.format
            }
            valueCell.font = {name: 'Calibri', size: 12, bold: true, color: {argb: metric.color || COLORS.brand}}
            valueCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (bgColor) valueCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: bgColor}}

            ws.getRow(row).height = 20
            row++
        })
        row++
    })

    return row
}

export function setDefaultPageSetup(ws) {
    ws.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3}
    }
}

export function getDefaultColumnWidths() {
    return [
        {width: 3},
        {width: 10}, {width: 20},
        {width: 7}, {width: 8},
        {width: 7}, {width: 8},
        {width: 7}, {width: 8},
        {width: 7}, {width: 10},
        {width: 7}, {width: 10},
        {width: 15}, {width: 15}, {width: 15}
    ]
}