import {supabase} from '../services/DatabaseService'
import {ReportService} from '../services/ReportService'
import {ReportUtility} from './ReportUtility'

function normUpper(code) {
    return String(code || '').trim().toUpperCase()
}

function normNumeric(code) {
    const s = String(code || '').trim();
    const d = s.replace(/^0+/, '');
    return d.length ? d : s.toUpperCase()
}

function sameIsoDay(a, b) {
    return a && b && a.slice(0, 10) === b.slice(0, 10)
}

function toMondayIso(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return ReportUtility.getMondayISO(dt)
}

async function fetchEfficiencyReports(plants, weekIso) {
    const codes = Array.isArray(plants) ? plants.map(p => p.plant_code).filter(Boolean) : []
    if (!weekIso || codes.length === 0) return []
    const targetMondayIso = ReportUtility.getMondayISO(weekIso)
    if (!targetMondayIso) return []
    const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
    const prevSunday = new Date(targetMondayDate);
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
    const windowEnd = new Date(targetMondayDate);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
    const qStart = prevSunday.toISOString();
    const qEnd = windowEnd.toISOString()
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
        const weekField = r.week || r.report_date_range_start || r?.data?.report_date;
        const mondayIso = toMondayIso(weekField);
        return sameIsoDay(mondayIso, targetMondayIso)
    }

    const codeSetU = new Set(codes.map(normUpper));
    const codeSetN = new Set(codes.map(normNumeric))
    const filtered = all.filter(anchorMatches).filter(r => {
        const pc = r?.data?.plant;
        if (!pc) return false;
        const u = normUpper(pc);
        const n = normNumeric(pc);
        return codeSetU.has(u) || codeSetN.has(n)
    })
    const byPlant = new Map()
    filtered.forEach(r => {
        const pc = r?.data?.plant;
        const key = normUpper(pc);
        const prev = byPlant.get(key);
        if (!prev) byPlant.set(key, r); else {
            const take = (prev.completed !== r.completed) ? (r.completed ? r : prev) : ((prev.submitted_at || '') < (r.submitted_at || '') ? r : prev);
            byPlant.set(key, take)
        }
    })
    const final = [...byPlant.values()].sort((a, b) => {
        const da = String(a.data?.plant || '');
        const db = String(b.data?.plant || '');
        const na = parseInt(da.replace(/\D/g, ''), 10);
        const nb = parseInt(db.replace(/\D/g, ''), 10);
        const aN = Number.isFinite(na);
        const bN = Number.isFinite(nb);
        if (aN && bN && na !== nb) return na - nb;
        if (aN && !bN) return -1;
        if (!aN && bN) return 1;
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

async function fetchAggregateProductionReport(weekIso) {
    if (!weekIso) return null
    const targetMondayIso = ReportUtility.getMondayISO(weekIso)
    if (!targetMondayIso) return null
    const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
    const prevSunday = new Date(targetMondayDate);
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
    const windowEnd = new Date(targetMondayDate);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
    const qStart = prevSunday.toISOString();
    const qEnd = windowEnd.toISOString()
    let {data: byWeek} = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('week', qStart).lt('week', qEnd)
    if (!Array.isArray(byWeek)) byWeek = []
    let {data: byRange} = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('report_date_range_start', qStart).lt('report_date_range_start', qEnd)
    if (!Array.isArray(byRange)) byRange = []
    const merged = new Map();
    [...byWeek, ...byRange].forEach(r => {
        if (r && !merged.has(r.id)) merged.set(r.id, r)
    })

    function anchorMatches(r) {
        const weekField = r.week || r.report_date_range_start || r?.data?.report_date;
        const mondayIso = toMondayIso(weekField);
        return sameIsoDay(mondayIso, targetMondayIso)
    }

    const filtered = [...merged.values()].filter(anchorMatches)
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? -1 : 1;
        return (b.submitted_at || '').localeCompare(a.submitted_at || '')
    })
    return filtered.find(r => r.completed) || filtered[0] || null
}

function sortPlants(plants) {
    return [...plants].sort((a, b) => {
        const ac = String(a.plant_code || '').trim();
        const bc = String(b.plant_code || '').trim();
        const an = /^[0-9]+$/.test(ac) ? parseInt(ac, 10) : NaN;
        const bn = /^[0-9]+$/.test(bc) ? parseInt(bc, 10) : NaN;
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        if (!isNaN(an) && isNaN(bn)) return -1;
        if (isNaN(an) && !isNaN(bn)) return 1;
        return ac.localeCompare(bc, undefined, {numeric: true, sensitivity: 'base'})
    })
}

async function fetchRMIReport(weekIso) {
    if (!weekIso) return null
    const targetMondayIso = ReportUtility.getMondayISO(weekIso)
    if (!targetMondayIso) return null
    const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
    const prevSunday = new Date(targetMondayDate)
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
    const windowEnd = new Date(targetMondayDate)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
    const qStart = prevSunday.toISOString()
    const qEnd = windowEnd.toISOString()

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

async function fetchPreviousGMReport(weekIso) {
    if (!weekIso) return null
    const currentMonday = ReportUtility.getMondayISO(weekIso)
    if (!currentMonday) return null
    const currentMondayDate = new Date(currentMonday + 'T00:00:00Z')
    const prevMondayDate = new Date(currentMondayDate)
    prevMondayDate.setUTCDate(prevMondayDate.getUTCDate() - 7)
    const prevMondayIso = prevMondayDate.toISOString().slice(0, 10)

    const windowStart = new Date(prevMondayDate)
    windowStart.setUTCDate(windowStart.getUTCDate() - 1)
    const windowEnd = new Date(prevMondayDate)
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
        return mondayIso === prevMondayIso
    })

    if (filtered.length === 0) return null

    const sorted = filtered.sort((a, b) => {
        if (a.completed !== b.completed) return b.completed ? 1 : -1
        return (b.submitted_at || '') > (a.submitted_at || '') ? 1 : -1
    })

    return sorted[0]?.data || null
}

export async function exportGeneralManagerReport({form, plants, weekIso, filename}) {
    if (typeof window === 'undefined') return
    
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const yyyy = today.getFullYear()
    const defaultFilename = `General Manager Report ${mm}-${dd}-${yyyy}.xlsx`
    const finalFilename = filename || defaultFilename

    const excelModule = await import('exceljs')
    const ExcelLib = excelModule.default || excelModule

    const COLORS = {
        brand: 'FF1E3A5F',
        brandLight: 'FF2D5A8A',
        accent: 'FF3B82F6',
        success: 'FF10B981',
        successLight: 'FFD1FAE5',
        warning: 'FFF59E0B',
        danger: 'FFEF4444',
        dangerLight: 'FFFEE2E2',
        white: 'FFFFFFFF',
        cream: 'FFFAFAFA',
        snow: 'FFF8FAFC',
        slate100: 'FFF1F5F9',
        slate200: 'FFE2E8F0',
        slate300: 'FFCBD5E1',
        slate500: 'FF64748B',
        slate700: 'FF334155',
        slate900: 'FF0F172A'
    }

    function ensure(value, isNumeric) {
        if (isNumeric) {
            return (value === null || value === undefined || value === '') ? 0 : Number(value)
        }
        return (value === null || value === undefined || value === '') ? '' : value
    }

    function truncateToTenth(n) {
        if (typeof n !== 'number' || !isFinite(n)) return n
        return Math.floor(n * 10) / 10
    }

    function calcChange(current, previous) {
        if (previous === 0 || previous === null || previous === undefined) {
            if (current === 0) return {pct: 0, direction: 'neutral'}
            return {pct: null, direction: 'new'}
        }
        const pct = Math.round(((current - previous) / previous) * 100)
        if (pct > 0) return {pct, direction: 'up'}
        if (pct < 0) return {pct: Math.abs(pct), direction: 'down'}
        return {pct: 0, direction: 'neutral'}
    }

    function getChangeText(current, previous, invertColors = false) {
        const change = calcChange(current, previous)
        if (change.direction === 'neutral' || change.pct === 0) {
            return {text: '', color: null}
        }
        if (change.direction === 'new') {
            return {text: ' (+100%)', color: invertColors ? COLORS.danger : COLORS.success}
        }
        if (change.direction === 'up') {
            return {text: ` (+${change.pct}%)`, color: invertColors ? COLORS.danger : COLORS.success}
        }
        return {text: ` (-${change.pct}%)`, color: invertColors ? COLORS.success : COLORS.danger}
    }

    function addSectionTitle(ws, row, col, text) {
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

    function addTableHeaders(ws, row, headers, startCol = 2) {
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

    function addMergedTableHeaders(ws, row, headers, startCol = 2) {
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
                    ws.getCell(row, col + i).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {argb: COLORS.slate100}
                    }
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

    function addChangePct(cell, changeInfo, isAlt = false) {
        if (!changeInfo || !changeInfo.text) {
            cell.value = ''
        } else {
            cell.value = changeInfo.text.trim()
            cell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: changeInfo.color}}
        }
        cell.alignment = {vertical: 'middle', horizontal: 'right'}
        if (isAlt) {
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
        }
    }

    function addDataRow(ws, row, values, startCol = 2, isAlt = false) {
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

    const effReports = await fetchEfficiencyReports(plants, weekIso)
    const sortedPlants = sortPlants(plants)
    const sortedEffReports = sortPlants(effReports)

    const prevWeekIso = (() => {
        if (!weekIso) return null
        const currentMonday = ReportUtility.getMondayISO(weekIso)
        if (!currentMonday) return null
        const d = new Date(currentMonday + 'T00:00:00Z')
        d.setUTCDate(d.getUTCDate() - 7)
        return d.toISOString().slice(0, 10)
    })()

    const prevGMData = await fetchPreviousGMReport(weekIso)
    const prevEffReports = prevWeekIso ? await fetchEfficiencyReports(plants, prevWeekIso) : []
    const sortedPrevEffReports = sortPlants(prevEffReports)

    const rmiData = await fetchRMIReport(weekIso)
    const rmiSnapshot = rmiData?.snapshot_data || {}
    const mixerTrainers = rmiSnapshot.mixer_trainers || []
    const tractorTrainers = rmiSnapshot.tractor_trainers || []
    const mixerPending = rmiSnapshot.mixer_pending || []
    const tractorPending = rmiSnapshot.tractor_pending || []
    const mixerTraining = rmiSnapshot.mixer_training || []
    const tractorTraining = rmiSnapshot.tractor_training || []
    const hiringGoals = rmiData?.hiring_goals || {}

    const allTrainers = [...mixerTrainers.map(t => ({...t, type: 'Mixer'})), ...tractorTrainers.map(t => ({
        ...t,
        type: 'Tractor'
    }))]
    const allPending = [...mixerPending.map(p => ({...p, type: 'Mixer'})), ...tractorPending.map(p => ({
        ...p,
        type: 'Tractor'
    }))]
    const allTraining = [...mixerTraining.map(t => ({...t, type: 'Mixer'})), ...tractorTraining.map(t => ({
        ...t,
        type: 'Tractor'
    }))]

    let totalHiringNeeded = 0
    sortedPlants.forEach(p => {
        const goal = Number(hiringGoals[p.plant_code]) || 0
        const currentOps = ensure(form[`active_operators_${p.plant_code}`], true)
        const needed = goal - currentOps
        if (needed > 0) totalHiringNeeded += needed
    })

    const wb = new ExcelLib.Workbook()
    wb.creator = 'Smyrna Ready Mix'
    wb.created = new Date()
    wb.modified = new Date()
    wb.properties.subject = 'Weekly General Manager Report'

    const ws = wb.addWorksheet('Weekly Report', {
        views: [{showGridLines: false}],
        properties: {defaultRowHeight: 18}
    })

    ws.columns = [
        {width: 3},
        {width: 10}, {width: 20},
        {width: 7}, {width: 8},
        {width: 7}, {width: 8},
        {width: 7}, {width: 8},
        {width: 7}, {width: 10},
        {width: 7}, {width: 10},
        {width: 15}, {width: 15}, {width: 15}
    ]

    const weekRange = weekIso ? ReportService.getWeekRangeFromIso(weekIso) : ''

    let r = 2

    ws.mergeCells(r, 3, r, 10)
    const titleCell = ws.getCell(r, 3)
    titleCell.value = 'General Manager Report'
    titleCell.font = {name: 'Calibri', size: 26, bold: true, color: {argb: COLORS.brand}}
    titleCell.alignment = {vertical: 'middle', horizontal: 'left'}
    ws.getRow(r).height = 36
    r++

    ws.mergeCells(r, 3, r, 7)
    const subtitleCell = ws.getCell(r, 3)
    subtitleCell.value = weekRange || 'Weekly Summary'
    subtitleCell.font = {name: 'Calibri', size: 13, color: {argb: COLORS.slate500}}
    subtitleCell.alignment = {vertical: 'middle', horizontal: 'left'}
    r++

    ws.mergeCells(r, 3, r, 10)
    const dateCell = ws.getCell(r, 3)
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

    let totalOps = 0, totalRunnable = 0, totalDown = 0, totalYardage = 0, totalHours = 0
    sortedPlants.forEach(p => {
        totalOps += ensure(form[`active_operators_${p.plant_code}`], true)
        totalRunnable += ensure(form[`runnable_trucks_${p.plant_code}`], true)
        totalDown += ensure(form[`down_trucks_${p.plant_code}`], true)
        totalYardage += ensure(form[`total_yardage_${p.plant_code}`], true)
        totalHours += ensure(form[`total_hours_${p.plant_code}`], true)
    })

    const overviewStartRow = r
    const overviewCol = 18

    ws.getColumn(overviewCol).width = 14
    ws.getColumn(overviewCol + 1).width = 8
    ws.getColumn(overviewCol + 2).width = 10

    const totalLoads = Math.round(totalYardage / 10)
    const allocationPct = totalRunnable > 0 ? Math.round((totalOps / totalRunnable) * 100) : 0
    const fleetUtilization = (totalRunnable + totalDown) > 0 ? Math.round((totalRunnable / (totalRunnable + totalDown)) * 100) : 0

    const workDays = 6
    const dailyYardage = Math.round(totalYardage / workDays)
    const dailyLoads = Math.round(totalLoads / workDays)
    const dailyHours = (totalHours / workDays).toFixed(1)

    const loadsPerOpPerDay = totalOps > 0 ? (totalLoads / totalOps / workDays).toFixed(1) : '0.0'
    const hoursPerOpPerDay = totalOps > 0 ? (totalHours / totalOps / workDays).toFixed(1) : '0.0'

    let prevTotalOpsOv = 0, prevTotalRunnableOv = 0, prevTotalDownOv = 0, prevTotalYardageOv = 0, prevTotalHoursOv = 0
    if (prevGMData) {
        sortedPlants.forEach(p => {
            prevTotalOpsOv += ensure(prevGMData[`active_operators_${p.plant_code}`], true)
            prevTotalRunnableOv += ensure(prevGMData[`runnable_trucks_${p.plant_code}`], true)
            prevTotalDownOv += ensure(prevGMData[`down_trucks_${p.plant_code}`], true)
            prevTotalYardageOv += ensure(prevGMData[`total_yardage_${p.plant_code}`], true)
            prevTotalHoursOv += ensure(prevGMData[`total_hours_${p.plant_code}`], true)
        })
    }
    const prevTotalLoads = Math.round(prevTotalYardageOv / 10)
    const prevAllocationPct = prevTotalRunnableOv > 0 ? Math.round((prevTotalOpsOv / prevTotalRunnableOv) * 100) : 0
    const prevFleetUtil = (prevTotalRunnableOv + prevTotalDownOv) > 0 ? Math.round((prevTotalRunnableOv / (prevTotalRunnableOv + prevTotalDownOv)) * 100) : 0
    const prevDailyYardage = Math.round(prevTotalYardageOv / workDays)
    const prevDailyLoads = Math.round(prevTotalLoads / workDays)
    const prevDailyHours = (prevTotalHoursOv / workDays).toFixed(1)
    const prevLoadsPerOpPerDay = prevTotalOpsOv > 0 ? (prevTotalLoads / prevTotalOpsOv / workDays).toFixed(1) : '0.0'
    const prevHoursPerOpPerDay = prevTotalOpsOv > 0 ? (prevTotalHoursOv / prevTotalOpsOv / workDays).toFixed(1) : '0.0'

    let ovRow = overviewStartRow

    ws.mergeCells(ovRow, overviewCol, ovRow, overviewCol + 2)
    const overviewTitleCell = ws.getCell(ovRow, overviewCol)
    overviewTitleCell.value = 'Weekly Overview'
    overviewTitleCell.font = {name: 'Calibri', size: 16, bold: true, color: {argb: COLORS.white}}
    overviewTitleCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.brand}}
    overviewTitleCell.alignment = {vertical: 'middle', horizontal: 'center'}
    ws.getCell(ovRow, overviewCol + 1).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.brand}}
    ws.getCell(ovRow, overviewCol + 2).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.brand}}
    ws.getRow(ovRow).height = 28
    ovRow += 2

    const addOverviewGroup = (title, metrics) => {
        ws.mergeCells(ovRow, overviewCol, ovRow, overviewCol + 2)
        const groupCell = ws.getCell(ovRow, overviewCol)
        groupCell.value = title
        groupCell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.slate700}}
        groupCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        groupCell.alignment = {vertical: 'middle', horizontal: 'left'}
        ws.getCell(ovRow, overviewCol + 1).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        ws.getCell(ovRow, overviewCol + 2).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        ws.getRow(ovRow).height = 20
        ovRow++

        metrics.forEach((metric) => {
            const labelCell = ws.getCell(ovRow, overviewCol)
            labelCell.value = metric.label
            labelCell.font = {name: 'Calibri', size: 10, color: {argb: COLORS.slate500}}
            labelCell.alignment = {vertical: 'middle', horizontal: 'left'}

            const changeInfo = metric.prev !== undefined ? getChangeText(metric.value, metric.prev, metric.invertChange || false) : {
                text: '',
                color: null
            }
            addChangePct(ws.getCell(ovRow, overviewCol + 1), changeInfo, false)

            const valueCell = ws.getCell(ovRow, overviewCol + 2)
            if (metric.suffix) {
                valueCell.value = metric.value + metric.suffix
            } else {
                valueCell.value = metric.value
                if (metric.format) valueCell.numFmt = metric.format
            }
            valueCell.font = {name: 'Calibri', size: 12, bold: true, color: {argb: metric.color || COLORS.brand}}
            valueCell.alignment = {vertical: 'middle', horizontal: 'left'}

            ws.getRow(ovRow).height = 20
            ovRow++
        })
        ovRow++
    }

    addOverviewGroup('Fleet', [
        {label: 'Plants', value: sortedPlants.length},
        {label: 'Runnable', value: totalRunnable, prev: prevTotalRunnableOv},
        {
            label: 'Down',
            value: totalDown,
            prev: prevTotalDownOv,
            color: totalDown > 0 ? COLORS.danger : COLORS.brand,
            invertChange: true
        },
        {
            label: 'Utilization',
            value: fleetUtilization,
            prev: prevFleetUtil,
            suffix: '%',
            color: fleetUtilization >= 90 ? COLORS.success : fleetUtilization < 80 ? COLORS.danger : COLORS.brand
        }
    ])

    addOverviewGroup('Operators', [
        {label: 'Total', value: totalOps, prev: prevTotalOpsOv},
        {
            label: 'Allocation',
            value: allocationPct,
            prev: prevAllocationPct,
            suffix: '%',
            color: allocationPct >= 100 ? COLORS.success : allocationPct < 80 ? COLORS.danger : COLORS.brand
        }
    ])

    addOverviewGroup('Training', [
        {label: 'Trainers', value: allTrainers.length},
        {
            label: 'In Training',
            value: allTraining.length,
            color: allTraining.length > 0 ? COLORS.success : COLORS.brand
        },
        {label: 'Pending Start', value: allPending.length},
        {label: 'Need to Hire', value: totalHiringNeeded, color: totalHiringNeeded > 0 ? COLORS.danger : COLORS.success}
    ])

    addOverviewGroup('Weekly Production', [
        {label: 'Yardage', value: totalYardage, prev: prevTotalYardageOv, format: '#,##0'},
        {label: 'Loads', value: totalLoads, prev: prevTotalLoads, format: '#,##0'},
        {label: 'Hours', value: totalHours, prev: prevTotalHoursOv, format: '#,##0.0'}
    ])

    addOverviewGroup('Daily Averages', [
        {label: 'Yardage', value: dailyYardage, prev: prevDailyYardage, format: '#,##0'},
        {label: 'Loads', value: dailyLoads, prev: prevDailyLoads, format: '#,##0'},
        {label: 'Hours', value: dailyHours, prev: parseFloat(prevDailyHours)}
    ])

    addOverviewGroup('Per Operator/Day', [
        {label: 'Loads', value: loadsPerOpPerDay, prev: parseFloat(prevLoadsPerOpPerDay)},
        {label: 'Hours', value: hoursPerOpPerDay, prev: parseFloat(prevHoursPerOpPerDay)}
    ])

    addSectionTitle(ws, r, 1, 'Plant Summary')
    r += 2

    const plantHeaders = [
        {label: 'Plant', merge: false},
        {label: 'Name', merge: false, align: 'left'},
        {label: 'Operators', merge: true},
        {label: 'Runnable', merge: true},
        {label: 'Down', merge: true},
        {label: 'Yardage', merge: true},
        {label: 'Hours', merge: true},
        {label: 'Notes', mergeCount: 3, align: 'left'}
    ]
    addMergedTableHeaders(ws, r, plantHeaders)
    r++

    sortedPlants.forEach((p, idx) => {
        const ops = ensure(form[`active_operators_${p.plant_code}`], true)
        const runnable = ensure(form[`runnable_trucks_${p.plant_code}`], true)
        const down = ensure(form[`down_trucks_${p.plant_code}`], true)
        const yardage = ensure(form[`total_yardage_${p.plant_code}`], true)
        const hours = ensure(form[`total_hours_${p.plant_code}`], true)

        const prevOps = prevGMData ? ensure(prevGMData[`active_operators_${p.plant_code}`], true) : null
        const prevRunnable = prevGMData ? ensure(prevGMData[`runnable_trucks_${p.plant_code}`], true) : null
        const prevDown = prevGMData ? ensure(prevGMData[`down_trucks_${p.plant_code}`], true) : null
        const prevYardage = prevGMData ? ensure(prevGMData[`total_yardage_${p.plant_code}`], true) : null
        const prevHours = prevGMData ? ensure(prevGMData[`total_hours_${p.plant_code}`], true) : null

        const opsChange = prevGMData ? getChangeText(ops, prevOps, false) : {text: '', color: null}
        const runnableChange = prevGMData ? getChangeText(runnable, prevRunnable, false) : {text: '', color: null}
        const downChange = prevGMData ? getChangeText(down, prevDown, true) : {text: '', color: null}
        const yardageChange = prevGMData ? getChangeText(yardage, prevYardage, false) : {text: '', color: null}
        const hoursChange = prevGMData ? getChangeText(hours, prevHours, false) : {text: '', color: null}

        const isAlt = idx % 2 === 1

        const rowData = [
            {value: ensure(p.plant_code, false), align: 'center'},
            ensure(p.plant_name, false)
        ]
        addDataRow(ws, r, rowData, 2, isAlt)

        addChangePct(ws.getCell(r, 4), opsChange, isAlt)
        const opsCell = ws.getCell(r, 5)
        opsCell.value = ops
        opsCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
        opsCell.alignment = {vertical: 'middle', horizontal: 'left'}
        if (isAlt) opsCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

        addChangePct(ws.getCell(r, 6), runnableChange, isAlt)
        const runnableCell = ws.getCell(r, 7)
        runnableCell.value = runnable
        runnableCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
        runnableCell.alignment = {vertical: 'middle', horizontal: 'left'}
        if (isAlt) runnableCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

        addChangePct(ws.getCell(r, 8), downChange, isAlt)
        const downCell = ws.getCell(r, 9)
        downCell.value = down
        downCell.font = {
            name: 'Calibri',
            size: 11,
            color: {argb: down > 0 ? COLORS.danger : COLORS.slate700},
            bold: down > 0
        }
        downCell.alignment = {vertical: 'middle', horizontal: 'left'}
        if (isAlt) downCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

        addChangePct(ws.getCell(r, 10), yardageChange, isAlt)
        const yardageCell = ws.getCell(r, 11)
        yardageCell.value = yardage
        yardageCell.numFmt = '#,##0'
        yardageCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
        yardageCell.alignment = {vertical: 'middle', horizontal: 'left'}
        if (isAlt) yardageCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

        addChangePct(ws.getCell(r, 12), hoursChange, isAlt)
        const hoursCell = ws.getCell(r, 13)
        hoursCell.value = hours
        hoursCell.numFmt = '#,##0.0'
        hoursCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
        hoursCell.alignment = {vertical: 'middle', horizontal: 'left'}
        if (isAlt) hoursCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

        ws.mergeCells(r, 14, r, 16)
        const notesCell = ws.getCell(r, 14)
        notesCell.value = ensure(form[`notes_${p.plant_code}`], false)
        notesCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
        notesCell.alignment = {vertical: 'middle', horizontal: 'left'}
        if (isAlt) {
            notesCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
            ws.getCell(r, 15).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
            ws.getCell(r, 16).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
        }

        ws.getRow(r).height = 20
        r++
    })

    let prevTotalOps = 0, prevTotalRunnable = 0, prevTotalDown = 0, prevTotalYardage = 0, prevTotalHours = 0
    if (prevGMData) {
        sortedPlants.forEach(p => {
            prevTotalOps += ensure(prevGMData[`active_operators_${p.plant_code}`], true)
            prevTotalRunnable += ensure(prevGMData[`runnable_trucks_${p.plant_code}`], true)
            prevTotalDown += ensure(prevGMData[`down_trucks_${p.plant_code}`], true)
            prevTotalYardage += ensure(prevGMData[`total_yardage_${p.plant_code}`], true)
            prevTotalHours += ensure(prevGMData[`total_hours_${p.plant_code}`], true)
        })
    }

    const totalOpsChange = prevGMData ? getChangeText(totalOps, prevTotalOps, false) : {text: '', color: null}
    const totalRunnableChange = prevGMData ? getChangeText(totalRunnable, prevTotalRunnable, false) : {
        text: '',
        color: null
    }
    const totalDownChange = prevGMData ? getChangeText(totalDown, prevTotalDown, true) : {text: '', color: null}
    const totalYardageChange = prevGMData ? getChangeText(totalYardage, prevTotalYardage, false) : {
        text: '',
        color: null
    }
    const totalHoursChange = prevGMData ? getChangeText(totalHours, prevTotalHours, false) : {text: '', color: null}

    const applyTotalCell = (cell, value, format) => {
        cell.value = value
        if (format) cell.numFmt = format
        cell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.brand}}
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        cell.border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
        cell.alignment = {vertical: 'middle', horizontal: 'left'}
    }

    const applyTotalChangeCell = (cell, changeInfo) => {
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

    ws.getCell(r, 2).value = ''
    ws.getCell(r, 2).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
    ws.getCell(r, 2).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}

    ws.getCell(r, 3).value = 'TOTAL'
    ws.getCell(r, 3).font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.brand}}
    ws.getCell(r, 3).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
    ws.getCell(r, 3).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
    ws.getCell(r, 3).alignment = {vertical: 'middle', horizontal: 'right'}

    applyTotalChangeCell(ws.getCell(r, 4), totalOpsChange)
    applyTotalCell(ws.getCell(r, 5), totalOps)

    applyTotalChangeCell(ws.getCell(r, 6), totalRunnableChange)
    applyTotalCell(ws.getCell(r, 7), totalRunnable)

    applyTotalChangeCell(ws.getCell(r, 8), totalDownChange)
    applyTotalCell(ws.getCell(r, 9), totalDown)

    applyTotalChangeCell(ws.getCell(r, 10), totalYardageChange)
    applyTotalCell(ws.getCell(r, 11), totalYardage, '#,##0')

    applyTotalChangeCell(ws.getCell(r, 12), totalHoursChange)
    applyTotalCell(ws.getCell(r, 13), totalHours, '#,##0.0')

    ws.mergeCells(r, 14, r, 16)
    ws.getCell(r, 14).value = ''
    ws.getCell(r, 14).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
    ws.getCell(r, 14).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
    ws.getCell(r, 15).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
    ws.getCell(r, 15).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
    ws.getCell(r, 16).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
    ws.getCell(r, 16).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}

    ws.getRow(r).height = 24
    r += 3

    if (sortedEffReports.length > 0) {
        addSectionTitle(ws, r, 1, 'Efficiency Overview')
        r += 2

        const effHeaders = [
            {label: 'Plant', merge: false},
            {label: 'Name', merge: false, align: 'left'},
            {label: 'Date', merge: false},
            {label: 'Loads', merge: true},
            {label: 'Hours', merge: true},
            {label: 'L/H/O', merge: true},
            {label: 'Start', merge: true},
            {label: 'End', merge: true}
        ]
        addMergedTableHeaders(ws, r, effHeaders)
        r++

        sortedEffReports.forEach((er, idx) => {
            const insights = ReportService.getPlantProductionInsights(er.rows || [])
            const lphBase = truncateToTenth(insights.avgLoadsPerHour)
            const loads = insights.totalLoads || 0
            const hours = truncateToTenth(insights.totalHours)
            const startMin = truncateToTenth(insights.avgElapsedStart)
            const endMin = truncateToTenth(insights.avgElapsedEnd)
            const plantInfo = sortedPlants.find(p => String(p.plant_code) === String(er.plant_code))
            const plantName = plantInfo?.plant_name || plantInfo?.name || er.plant_code
            
            const reportDate = er.report_date || ''
            const formattedDate = reportDate ? new Date(reportDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
            
            const plantOps = ensure(form[`active_operators_${er.plant_code}`], true)
            const lph = truncateToTenth(lphBase * plantOps)

            const isAlt = idx % 2 === 1
            const isShutDown = loads === 0 && (hours === null || hours === 0 || isNaN(hours)) && (startMin === null || isNaN(startMin)) && (endMin === null || isNaN(endMin))

            const rowData = [
                {value: ensure(er.plant_code, false), align: 'center'},
                plantName,
                {value: formattedDate, align: 'center'}
            ]
            addDataRow(ws, r, rowData, 2, isAlt)

            if (isShutDown) {
                ws.mergeCells(r, 5, r, 14)
                const shutDownCell = ws.getCell(r, 5)
                shutDownCell.value = 'Plant Shut Down'
                shutDownCell.font = {name: 'Calibri', size: 11, italic: true, color: {argb: COLORS.slate500}}
                shutDownCell.alignment = {vertical: 'middle', horizontal: 'center'}
                if (isAlt) {
                    shutDownCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
                    for (let c = 6; c <= 14; c++) {
                        ws.getCell(r, c).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
                    }
                }
                ws.getRow(r).height = 20
                r++
                return
            }

            const prevEr = sortedPrevEffReports.find(p => String(p.plant_code) === String(er.plant_code))
            let prevLoads = null, prevHours = null, prevLph = null, prevStart = null, prevEnd = null
            if (prevEr) {
                const prevInsights = ReportService.getPlantProductionInsights(prevEr.rows || [])
                prevLoads = prevInsights.totalLoads || 0
                prevHours = truncateToTenth(prevInsights.totalHours)
                const prevLphBase = truncateToTenth(prevInsights.avgLoadsPerHour)
                const prevPlantOps = prevGMData ? ensure(prevGMData[`active_operators_${er.plant_code}`], true) : plantOps
                prevLph = truncateToTenth(prevLphBase * prevPlantOps)
                prevStart = truncateToTenth(prevInsights.avgElapsedStart)
                prevEnd = truncateToTenth(prevInsights.avgElapsedEnd)
            }

            const filterNew = (c) => c.text && c.text.includes('new') ? {text: '', color: null} : c

            const loadsChange = prevEr ? filterNew(getChangeText(loads, prevLoads, false)) : {text: '', color: null}
            const hoursChange = prevEr ? filterNew(getChangeText(hours, prevHours, false)) : {text: '', color: null}
            const lphChange = prevEr ? filterNew(getChangeText(lph, prevLph, false)) : {text: '', color: null}
            const startChange = prevEr ? filterNew(getChangeText(startMin, prevStart, true)) : {text: '', color: null}
            const endChange = prevEr ? filterNew(getChangeText(endMin, prevEnd, true)) : {text: '', color: null}

            addChangePct(ws.getCell(r, 5), loadsChange, isAlt)
            const loadsCell = ws.getCell(r, 6)
            loadsCell.value = loads
            loadsCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
            loadsCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (isAlt) loadsCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

            addChangePct(ws.getCell(r, 7), hoursChange, isAlt)
            const hoursCell = ws.getCell(r, 8)
            hoursCell.value = hours
            hoursCell.numFmt = '#,##0.0'
            hoursCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
            hoursCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (isAlt) hoursCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

            addChangePct(ws.getCell(r, 9), lphChange, isAlt)
            const lphCell = ws.getCell(r, 10)
            lphCell.value = lph
            lphCell.numFmt = '#,##0.0'
            lphCell.font = {
                name: 'Calibri',
                size: 11,
                color: {argb: lph >= 2 ? COLORS.success : lph < 1.5 ? COLORS.danger : COLORS.slate700},
                bold: lph >= 2 || lph < 1.5
            }
            lphCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (isAlt) lphCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

            addChangePct(ws.getCell(r, 11), startChange, isAlt)
            const startCell = ws.getCell(r, 12)
            startCell.value = startMin + ' mins'
            startCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
            startCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (isAlt) startCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

            addChangePct(ws.getCell(r, 13), endChange, isAlt)
            const endCell = ws.getCell(r, 14)
            endCell.value = endMin + ' mins'
            endCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
            endCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (isAlt) endCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

            ws.getRow(r).height = 20
            r++
        })

        let totalLoads = 0, totalHours = 0, totalLph = 0, totalStart = 0, totalEnd = 0
        let prevTotalLoads = 0, prevTotalHours = 0, prevTotalLph = 0, prevTotalStart = 0, prevTotalEnd = 0
        let effCount = 0, prevEffCount = 0

        sortedEffReports.forEach(er => {
            const insights = ReportService.getPlantProductionInsights(er.rows || [])
            const plantOpsEff = ensure(form[`active_operators_${er.plant_code}`], true)
            totalLoads += insights.totalLoads || 0
            totalHours += truncateToTenth(insights.totalHours) || 0
            totalLph += truncateToTenth(insights.avgLoadsPerHour) * plantOpsEff || 0
            totalStart += truncateToTenth(insights.avgElapsedStart) || 0
            totalEnd += truncateToTenth(insights.avgElapsedEnd) || 0
            effCount++
        })

        sortedPrevEffReports.forEach(er => {
            const insights = ReportService.getPlantProductionInsights(er.rows || [])
            const prevPlantOpsEff = prevGMData ? ensure(prevGMData[`active_operators_${er.plant_code}`], true) : ensure(form[`active_operators_${er.plant_code}`], true)
            prevTotalLoads += insights.totalLoads || 0
            prevTotalHours += truncateToTenth(insights.totalHours) || 0
            prevTotalLph += truncateToTenth(insights.avgLoadsPerHour) * prevPlantOpsEff || 0
            prevTotalStart += truncateToTenth(insights.avgElapsedStart) || 0
            prevTotalEnd += truncateToTenth(insights.avgElapsedEnd) || 0
            prevEffCount++
        })

        const avgLph = effCount > 0 ? truncateToTenth(totalLph / effCount) : 0
        const avgStart = effCount > 0 ? truncateToTenth(totalStart / effCount) : 0
        const avgEnd = effCount > 0 ? truncateToTenth(totalEnd / effCount) : 0
        const prevAvgLph = prevEffCount > 0 ? truncateToTenth(prevTotalLph / prevEffCount) : 0
        const prevAvgStart = prevEffCount > 0 ? truncateToTenth(prevTotalStart / prevEffCount) : 0
        const prevAvgEnd = prevEffCount > 0 ? truncateToTenth(prevTotalEnd / prevEffCount) : 0

        const effLoadsChange = prevEffCount > 0 ? getChangeText(totalLoads, prevTotalLoads, false) : {
            text: '',
            color: null
        }
        const effHoursChange = prevEffCount > 0 ? getChangeText(totalHours, prevTotalHours, false) : {
            text: '',
            color: null
        }
        const effLphChange = prevEffCount > 0 ? getChangeText(avgLph, prevAvgLph, false) : {text: '', color: null}
        const effStartChange = prevEffCount > 0 ? getChangeText(avgStart, prevAvgStart, true) : {text: '', color: null}
        const effEndChange = prevEffCount > 0 ? getChangeText(avgEnd, prevAvgEnd, true) : {text: '', color: null}

        const applyEffTotalCell = (cell, value, format) => {
            cell.value = value
            if (format) cell.numFmt = format
            cell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.brand}}
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
            cell.border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
            cell.alignment = {vertical: 'middle', horizontal: 'left'}
        }

        const applyEffTotalChangeCell = (cell, changeInfo) => {
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

        ws.getCell(r, 2).value = ''
        ws.getCell(r, 2).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        ws.getCell(r, 2).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}

        ws.mergeCells(r, 3, r, 4)
        ws.getCell(r, 3).value = 'AVERAGES'
        ws.getCell(r, 3).font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.brand}}
        ws.getCell(r, 3).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        ws.getCell(r, 3).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
        ws.getCell(r, 3).alignment = {vertical: 'middle', horizontal: 'right'}
        ws.getCell(r, 4).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
        ws.getCell(r, 4).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}

        applyEffTotalChangeCell(ws.getCell(r, 5), effLoadsChange)
        applyEffTotalCell(ws.getCell(r, 6), totalLoads)

        applyEffTotalChangeCell(ws.getCell(r, 7), effHoursChange)
        applyEffTotalCell(ws.getCell(r, 8), totalHours, '#,##0.0')

        applyEffTotalChangeCell(ws.getCell(r, 9), effLphChange)
        applyEffTotalCell(ws.getCell(r, 10), avgLph, '#,##0.0')

        applyEffTotalChangeCell(ws.getCell(r, 11), effStartChange)
        applyEffTotalCell(ws.getCell(r, 12), avgStart + ' mins')

        applyEffTotalChangeCell(ws.getCell(r, 13), effEndChange)
        applyEffTotalCell(ws.getCell(r, 14), avgEnd + ' mins')

        ws.getRow(r).height = 24
        r += 3
    }

    const aggregateReport = await fetchAggregateProductionReport(weekIso)
    const prevAggregateReport = prevWeekIso ? await fetchAggregateProductionReport(prevWeekIso) : null

    if (aggregateReport) {
        addSectionTitle(ws, r, 1, 'Aggregate Production')
        r += 2

        const aggHeaders = [
            {label: 'Material', mergeCount: 2, align: 'left'},
            {label: 'Quantity', merge: true}
        ]
        addMergedTableHeaders(ws, r, aggHeaders)
        r++

        const aggFields = [
            ['sand', 'Sand'],
            ['fill_dirt', 'Fill Dirt'],
            ['black_dirt', 'Black Dirt'],
            ['select_fill', 'Select Fill'],
            ['crushed_concrete', 'Freeport Crushed Concrete'],
            ['houston_crushed_concrete', 'Houston Crushed Concrete'],
            ['three_by_five_crushed', '3 x 5 Crushed'],
            ['stabilized_sand', 'Stabilized Sand'],
            ['stabilized_crushed_concrete', 'Stabilized Crushed Concrete'],
            ['beach_quality_sand', 'Beach Quality Sand'],
            ['limestone_one_inch', 'Limestone - 1"'],
            ['white_screened_sand', 'White Screened Sand'],
            ['pea_gravel_three_eighths', '3/8" Pea Gravel'],
            ['crushed_asphalt', 'Crushed Asphalt'],
            ['screened_sand', 'Screened Sand'],
            ['washout', 'Washout'],
            ['rip_rap', 'Rip Rap']
        ]

        const dataSource = aggregateReport?.data || {}
        const prevDataSource = prevAggregateReport?.data || {}
        let aggTotal = 0
        let prevAggTotal = 0
        let rowIdx = 0

        aggFields.forEach(([key, label]) => {
            let raw = dataSource[key]
            raw = raw === undefined || raw === null || raw === '' ? 0 : Number(raw)
            let prevRaw = prevDataSource[key]
            prevRaw = prevRaw === undefined || prevRaw === null || prevRaw === '' ? 0 : Number(prevRaw)

            if (raw === 0 && prevRaw === 0) return
            aggTotal += raw
            prevAggTotal += prevRaw

            const changeInfo = prevAggregateReport ? getChangeText(raw, prevRaw, false) : {text: '', color: null}
            const isAlt = rowIdx % 2 === 1

            ws.mergeCells(r, 2, r, 3)
            const labelCell = ws.getCell(r, 2)
            labelCell.value = label
            labelCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
            labelCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (isAlt) {
                labelCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
                ws.getCell(r, 3).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
            }

            addChangePct(ws.getCell(r, 4), changeInfo, isAlt)

            const valCell = ws.getCell(r, 5)
            valCell.value = raw
            valCell.numFmt = '#,##0.0'
            valCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
            valCell.alignment = {vertical: 'middle', horizontal: 'left'}
            if (isAlt) valCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}

            ws.getRow(r).height = 20
            r++
            rowIdx++
        })

        if (aggTotal > 0) {
            const totalChangeInfo = prevAggregateReport ? getChangeText(aggTotal, prevAggTotal, false) : {
                text: '',
                color: null
            }

            ws.mergeCells(r, 2, r, 3)
            const totalLabelCell = ws.getCell(r, 2)
            totalLabelCell.value = 'TOTAL'
            totalLabelCell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.brand}}
            totalLabelCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
            totalLabelCell.border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
            totalLabelCell.alignment = {vertical: 'middle', horizontal: 'right'}
            ws.getCell(r, 3).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
            ws.getCell(r, 3).border = {top: {style: 'medium', color: {argb: COLORS.brand}}}

            const totalChangeCell = ws.getCell(r, 4)
            if (totalChangeInfo && totalChangeInfo.text) {
                totalChangeCell.value = totalChangeInfo.text.trim()
                totalChangeCell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: totalChangeInfo.color}}
            } else {
                totalChangeCell.value = ''
            }
            totalChangeCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
            totalChangeCell.border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
            totalChangeCell.alignment = {vertical: 'middle', horizontal: 'right'}

            const totalValCell = ws.getCell(r, 5)
            totalValCell.value = aggTotal
            totalValCell.numFmt = '#,##0.0'
            totalValCell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.brand}}
            totalValCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.slate100}}
            totalValCell.border = {top: {style: 'medium', color: {argb: COLORS.brand}}}
            totalValCell.alignment = {vertical: 'middle', horizontal: 'left'}

            ws.getRow(r).height = 24
        }
        r += 3
    }

    if (rmiData) {
        const getPlantName = (code) => {
            const p = plants?.find(x => (x.plant_code || x.code) === code)
            return p?.name || code || ''
        }

        if (allTrainers.length > 0 || allPending.length > 0 || allTraining.length > 0) {
            addSectionTitle(ws, r, 1, 'Training & Hiring')
            r += 2
        }

        if (allTrainers.length > 0) {
            ws.getCell(r, 2).value = 'Active Trainers'
            ws.getCell(r, 2).font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.slate700}}
            r++
            const trainerHeaders = [
                {label: 'Plant', merge: false},
                {label: 'Name', merge: false, align: 'left'},
                {label: 'Type', merge: false},
                {label: 'Status', merge: false}
            ]
            addMergedTableHeaders(ws, r, trainerHeaders)
            r++
            allTrainers.forEach((t, idx) => {
                addDataRow(ws, r, [
                    {value: getPlantName(t.plant), align: 'center'},
                    t.name || '',
                    {value: t.type, align: 'center'},
                    {value: t.status || '', align: 'center'}
                ], 2, idx % 2 === 1)
                r++
            })
            r++
        }

        if (allPending.length > 0) {
            ws.getCell(r, 2).value = 'Pending Start'
            ws.getCell(r, 2).font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.slate700}}
            r++
            const pendingHeaders = [
                {label: 'Plant', merge: false},
                {label: 'Name', merge: false, align: 'left'},
                {label: 'Type', merge: false},
                {label: 'Start Date', merge: true}
            ]
            addMergedTableHeaders(ws, r, pendingHeaders)
            r++
            allPending.forEach((p, idx) => {
                const isAlt = idx % 2 === 1
                addDataRow(ws, r, [
                    {value: getPlantName(p.plant), align: 'center'},
                    p.name || '',
                    {value: p.type, align: 'center'}
                ], 2, isAlt)
                ws.mergeCells(r, 5, r, 6)
                const startDateCell = ws.getCell(r, 5)
                startDateCell.value = p.startDate || ''
                startDateCell.font = {name: 'Calibri', size: 11, color: {argb: COLORS.slate700}}
                startDateCell.alignment = {vertical: 'middle', horizontal: 'center'}
                if (isAlt) {
                    startDateCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
                    ws.getCell(r, 6).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: COLORS.snow}}
                }
                r++
            })
            r++
        }

        if (allTraining.length > 0) {
            ws.getCell(r, 2).value = 'In Training'
            ws.getCell(r, 2).font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.slate700}}
            r++
            const trainingHeaders = [
                {label: 'Plant', merge: false},
                {label: 'Name', merge: false, align: 'left'},
                {label: 'Type', merge: false},
                {label: 'Trainer', merge: false, align: 'left'}
            ]
            addMergedTableHeaders(ws, r, trainingHeaders)
            r++
            allTraining.forEach((t, idx) => {
                addDataRow(ws, r, [
                    {value: getPlantName(t.plant), align: 'center'},
                    t.name || '',
                    {value: t.type, align: 'center'},
                    t.trainer || ''
                ], 2, idx % 2 === 1)
                r++
            })
            r++
        }

        const goalsArr = Object.entries(hiringGoals).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        if (goalsArr.length > 0) {
            r++
            ws.getCell(r, 2).value = 'Hiring Goals'
            ws.getCell(r, 2).font = {name: 'Calibri', size: 11, bold: true, color: {argb: COLORS.slate700}}
            r++
            addTableHeaders(ws, r, ['Plant', 'Goal'], 2)
            r++
            sortedPlants.forEach((plant, idx) => {
                const code = plant.plant_code || plant.code
                const goal = hiringGoals[code]
                if (goal !== undefined && goal !== null && goal !== '') {
                    addDataRow(ws, r, [{value: getPlantName(code), align: 'center'}, {
                        value: Number(goal),
                        align: 'center'
                    }], 2, idx % 2 === 1)
                    r++
                }
            })
        }
    }

    ws.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3}
    }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
        URL.revokeObjectURL(url)
        a.remove()
    }, 0)
}