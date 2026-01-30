import { AIService } from '../../../../services/AIService'
import { EquipmentService } from '../../../../services/EquipmentService'
import { MixerService } from '../../../../services/MixerService'
import { PickupTruckService } from '../../../../services/PickupTruckService'
import { ReportService } from '../../../../services/ReportService'
import { TractorService } from '../../../../services/TractorService'
import { TrailerService } from '../../../../services/TrailerService'
import {
    addChangePct,
    addDataRow,
    addMergedTableHeaders,
    addReportHeader,
    addSectionTitle,
    addTableHeaders,
    applyTotalCell,
    applyTotalChangeCell,
    COLORS,
    ensure,
    fetchAggregateProductionReport,
    fetchAllAggregateReports,
    fetchAllMonthlyGMReports,
    fetchEfficiencyReports,
    fetchRMIReport,
    getChangeText,
    getChangeValue,
    getPreviousWeekIso,
    sortPlants,
    truncateToTenth
} from '../../../../utils/ExportUtility'
import { createSheet, exportWorkbook, finalizeSheet, generateFilename, initExport } from '../ExportModule'

export async function exportGeneralManagerReport({ form, plants, weekIso, filename }) {
    if (typeof window === 'undefined') return

    const finalFilename = filename || generateFilename('General Manager Report', weekIso)

    const sortedPlantsEarly = sortPlants(plants)
    let totalOpsEarly = 0,
        totalRunnableEarly = 0,
        totalDownEarly = 0,
        totalYardageEarly = 0
    sortedPlantsEarly.forEach((p) => {
        totalOpsEarly += ensure(form[`active_operators_${p.plant_code}`], true)
        totalRunnableEarly += ensure(form[`runnable_trucks_${p.plant_code}`], true)
        totalDownEarly += ensure(form[`down_trucks_${p.plant_code}`], true)
        totalYardageEarly += ensure(form[`total_yardage_${p.plant_code}`], true)
    })
    const allocationPctEarly = totalRunnableEarly > 0 ? Math.round((totalOpsEarly / totalRunnableEarly) * 100) : 0
    const fleetUtilizationEarly =
        totalRunnableEarly + totalDownEarly > 0
            ? Math.round((totalRunnableEarly / (totalRunnableEarly + totalDownEarly)) * 100)
            : 0

    const plantIssuesEarly = []
    sortedPlantsEarly.forEach((p) => {
        const down = ensure(form[`down_trucks_${p.plant_code}`], true)
        if (down >= 2) plantIssuesEarly.push(`${p.plant_code}: ${down} down`)
    })

    const aiSummaryPromise = AIService.generateGMReportExportSummary({
        allocationPct: allocationPctEarly,
        fleetUtilization: fleetUtilizationEarly,
        plantCount: sortedPlantsEarly.length,
        plantIssues: plantIssuesEarly,
        totalDown: totalDownEarly,
        totalOperators: totalOpsEarly,
        totalRunnable: totalRunnableEarly,
        totalYardage: totalYardageEarly,
        weekIso
    }).catch((err) => {
        console.warn('AI summary generation failed:', err)
        return null
    })

    const [initData, allMonthlyData, assetResults] = await Promise.all([
        initExport({ subject: 'Weekly General Manager Report' }),
        fetchAllMonthlyGMReports(),
        Promise.all([
            MixerService.getAllMixers().catch(() => []),
            TractorService.getAllTractors().catch(() => []),
            TrailerService.fetchTrailers().catch(() => []),
            EquipmentService.getAllEquipments().catch(() => []),
            PickupTruckService.getAll().catch(() => [])
        ])
    ])

    const { wb, ExcelLib, logoBase64 } = initData
    const [mixers, tractors, trailers, equipment, pickups] = assetResults

    const plantCodes = new Set(
        plants.map((p) =>
            String(p.plant_code || '')
                .trim()
                .toUpperCase()
        )
    )
    const filterByPlant = (items) =>
        items.filter((item) => {
            const plantCode = String(item.assignedPlant || item.assigned_plant || '')
                .trim()
                .toUpperCase()
            return plantCodes.has(plantCode)
        })

    const assetData = {
        equipment: filterByPlant(equipment),
        mixers: filterByPlant(mixers),
        pickups: filterByPlant(pickups),
        tractors: filterByPlant(tractors),
        trailers: filterByPlant(trailers)
    }

    const weeksToExport = [{ form, weekIso }]
    let checkWeek = getPreviousWeekIso(weekIso)
    const weekIsos = [weekIso]
    while (checkWeek) {
        const monthData = allMonthlyData.find((m) => {
            return m.reports.some((r) => r.weekIso === checkWeek)
        })
        const reportEntry = monthData?.reports.find((r) => r.weekIso === checkWeek)
        if (reportEntry?.data) {
            weeksToExport.push({ form: reportEntry.data, weekIso: checkWeek })
            weekIsos.push(checkWeek)
            checkWeek = getPreviousWeekIso(checkWeek)
        } else {
            break
        }
    }

    const [effReportsMap, rmiDataMap, aggReportsMap, allAggReportsMap] = await Promise.all([
        Promise.all(
            weekIsos.map(async (w) => {
                const reports = await fetchEfficiencyReports(plants, w)
                return { reports, weekIso: w }
            })
        ).then((results) => {
            const map = {}
            results.forEach((r) => {
                map[r.weekIso] = r.reports
            })
            return map
        }),
        Promise.all(
            weekIsos.map(async (w) => {
                const data = await fetchRMIReport(w)
                return { data, weekIso: w }
            })
        ).then((results) => {
            const map = {}
            results.forEach((r) => {
                map[r.weekIso] = r.data
            })
            return map
        }),
        Promise.all(
            weekIsos.map(async (w) => {
                const report = await fetchAggregateProductionReport(w)
                return { report, weekIso: w }
            })
        ).then((results) => {
            const map = {}
            results.forEach((r) => {
                map[r.weekIso] = r.report
            })
            return map
        }),
        Promise.all(
            weekIsos.map(async (w) => {
                const aggData = await fetchAllAggregateReports(w)
                return { aggData, weekIso: w }
            })
        ).then((results) => {
            const map = {}
            results.forEach((r) => {
                map[r.weekIso] = r.aggData
            })
            return map
        })
    ])

    for (let i = 0; i < weeksToExport.length; i++) {
        const weekData = weeksToExport[i]
        const prevWeekData = weeksToExport[i + 1] || null
        const isCurrentWeek = i === 0
        const effReports = effReportsMap[weekData.weekIso] || []
        const prevEffReports = prevWeekData ? effReportsMap[prevWeekData.weekIso] || [] : []
        const rmiData = rmiDataMap[weekData.weekIso] || null
        const aggregateReport = aggReportsMap[weekData.weekIso] || null
        const prevAggregateReport = prevWeekData ? aggReportsMap[prevWeekData.weekIso] || null : null
        const allAggReports = allAggReportsMap[weekData.weekIso] || { monthly: [], yearly: [] }

        await createWeekSheet(
            wb,
            ExcelLib,
            weekData.form,
            plants,
            weekData.weekIso,
            prevWeekData?.form,
            prevWeekData?.weekIso,
            allMonthlyData,
            logoBase64,
            isCurrentWeek ? assetData : null,
            {
                aggregateReport,
                aiSummaryPromise: isCurrentWeek ? aiSummaryPromise : null,
                allAggReports,
                effReports,
                prevAggregateReport,
                prevEffReports,
                rmiData
            }
        )
    }

    await exportWorkbook(wb, finalFilename)
}

async function createWeekSheet(
    wb,
    ExcelLib,
    form,
    plants,
    weekIso,
    prevGMData,
    prevWeekIso,
    allMonthlyData,
    logoBase64,
    assetData,
    prefetchedData = {}
) {
    const {
        effReports = [],
        prevEffReports = [],
        rmiData = null,
        aggregateReport = null,
        prevAggregateReport = null,
        allAggReports = { monthly: [], yearly: [] },
        aiSummaryPromise = null
    } = prefetchedData

    const sortedPlants = sortPlants(plants)
    const sortedEffReports = sortPlants(effReports)
    const sortedPrevEffReports = sortPlants(prevEffReports)

    const rmiSnapshot = rmiData?.snapshot_data || {}
    const mixerTrainers = rmiSnapshot.mixer_trainers || []
    const tractorTrainers = rmiSnapshot.tractor_trainers || []
    const mixerPending = rmiSnapshot.mixer_pending || []
    const tractorPending = rmiSnapshot.tractor_pending || []
    const mixerTraining = rmiSnapshot.mixer_training || []
    const tractorTraining = rmiSnapshot.tractor_training || []
    const hiringGoals = rmiData?.hiring_goals || {}

    const allTrainers = [
        ...mixerTrainers.map((t) => ({ ...t, type: 'Mixer' })),
        ...tractorTrainers.map((t) => ({
            ...t,
            type: 'Tractor'
        }))
    ]
    const allPending = [
        ...mixerPending.map((p) => ({ ...p, type: 'Mixer' })),
        ...tractorPending.map((p) => ({
            ...p,
            type: 'Tractor'
        }))
    ]
    const allTraining = [
        ...mixerTraining.map((t) => ({ ...t, type: 'Mixer' })),
        ...tractorTraining.map((t) => ({
            ...t,
            type: 'Tractor'
        }))
    ]

    let totalHiringNeeded = 0
    sortedPlants.forEach((p) => {
        const goal = Number(hiringGoals[p.plant_code]) || 0
        const currentOps = ensure(form[`active_operators_${p.plant_code}`], true)
        const needed = goal - currentOps
        if (needed > 0) totalHiringNeeded += needed
    })

    const sheetName = weekIso ? ReportService.getWeekRangeFromIso(weekIso).replace(' through ', ' - ') : 'Weekly Report'
    const ws = createSheet(wb, sheetName)

    const weekRange = weekIso ? ReportService.getWeekRangeFromIso(weekIso) : ''

    let r = addReportHeader(ws, wb, {
        logoBase64,
        subtitle: weekRange || 'Weekly Summary',
        title: 'General Manager Report'
    })

    let totalOps = 0,
        totalRunnable = 0,
        totalDown = 0,
        totalYardage = 0,
        totalHours = 0
    sortedPlants.forEach((p) => {
        totalOps += ensure(form[`active_operators_${p.plant_code}`], true)
        totalRunnable += ensure(form[`runnable_trucks_${p.plant_code}`], true)
        totalDown += ensure(form[`down_trucks_${p.plant_code}`], true)
        totalYardage += ensure(form[`total_yardage_${p.plant_code}`], true)
        totalHours += ensure(form[`total_hours_${p.plant_code}`], true)
    })

    const allocationPct = totalRunnable > 0 ? Math.round((totalOps / totalRunnable) * 100) : 0
    const fleetUtilization =
        totalRunnable + totalDown > 0 ? Math.round((totalRunnable / (totalRunnable + totalDown)) * 100) : 0

    if (aiSummaryPromise) {
        const aiSummary = await aiSummaryPromise
        if (aiSummary) {
            ws.mergeCells(2, 18, 2, 27)
            const headerCell = ws.getCell(2, 18)
            headerCell.value = 'AI Summary'
            headerCell.font = { bold: true, color: { argb: COLORS.white }, name: 'Calibri', size: 11 }
            headerCell.fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
            headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
            headerCell.border = {
                left: { color: { argb: COLORS.brand }, style: 'medium' },
                right: { color: { argb: COLORS.brand }, style: 'medium' },
                top: { color: { argb: COLORS.brand }, style: 'medium' }
            }
            for (let col = 19; col <= 27; col++) {
                ws.getCell(2, col).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
                if (col === 27) {
                    ws.getCell(2, col).border = {
                        right: { color: { argb: COLORS.brand }, style: 'medium' },
                        top: { color: { argb: COLORS.brand }, style: 'medium' }
                    }
                }
            }
            ws.getRow(2).height = 22

            ws.mergeCells(3, 18, 5, 27)
            const aiCell = ws.getCell(3, 18)
            aiCell.value = aiSummary
            aiCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            aiCell.fill = { fgColor: { argb: 'FFF8FAFC' }, pattern: 'solid', type: 'pattern' }
            aiCell.alignment = { horizontal: 'left', indent: 1, vertical: 'middle', wrapText: true }
            aiCell.border = {
                left: { color: { argb: COLORS.brand }, style: 'medium' }
            }
            for (let col = 19; col <= 27; col++) {
                ws.getCell(3, col).fill = { fgColor: { argb: 'FFF8FAFC' }, pattern: 'solid', type: 'pattern' }
                ws.getCell(4, col).fill = { fgColor: { argb: 'FFF8FAFC' }, pattern: 'solid', type: 'pattern' }
                ws.getCell(5, col).fill = { fgColor: { argb: 'FFF8FAFC' }, pattern: 'solid', type: 'pattern' }
                if (col === 27) {
                    ws.getCell(3, col).border = { right: { color: { argb: COLORS.brand }, style: 'medium' } }
                    ws.getCell(4, col).border = { right: { color: { argb: COLORS.brand }, style: 'medium' } }
                    ws.getCell(5, col).border = {
                        bottom: { color: { argb: COLORS.brand }, style: 'medium' },
                        right: { color: { argb: COLORS.brand }, style: 'medium' }
                    }
                } else {
                    ws.getCell(5, col).border = { bottom: { color: { argb: COLORS.brand }, style: 'medium' } }
                }
            }
            ws.getCell(4, 18).border = { left: { color: { argb: COLORS.brand }, style: 'medium' } }
            ws.getCell(5, 18).border = {
                bottom: { color: { argb: COLORS.brand }, style: 'medium' },
                left: { color: { argb: COLORS.brand }, style: 'medium' }
            }
            ws.getRow(3).height = 20
            ws.getRow(4).height = 20
            ws.getRow(5).height = 20
        }
    }

    const overviewStartRow = r
    const overviewCol = 18

    ws.getColumn(overviewCol).width = 14
    ws.getColumn(overviewCol + 1).width = 8
    ws.getColumn(overviewCol + 2).width = 10
    ws.getColumn(overviewCol + 3).width = 1

    const totalLoads = Math.round(totalYardage / 10)

    const workDays = 6
    const dailyYardage = Math.round(totalYardage / workDays)
    const dailyLoads = Math.round(totalLoads / workDays)
    const dailyHours = (totalHours / workDays).toFixed(1)

    const loadsPerOpPerDay = totalOps > 0 ? (totalLoads / totalOps / workDays).toFixed(1) : '0.0'
    const hoursPerOpPerDay = totalOps > 0 ? (totalHours / totalOps / workDays).toFixed(1) : '0.0'

    let prevTotalOpsOv = 0,
        prevTotalRunnableOv = 0,
        prevTotalDownOv = 0,
        prevTotalYardageOv = 0,
        prevTotalHoursOv = 0
    if (prevGMData) {
        sortedPlants.forEach((p) => {
            prevTotalOpsOv += ensure(prevGMData[`active_operators_${p.plant_code}`], true)
            prevTotalRunnableOv += ensure(prevGMData[`runnable_trucks_${p.plant_code}`], true)
            prevTotalDownOv += ensure(prevGMData[`down_trucks_${p.plant_code}`], true)
            prevTotalYardageOv += ensure(prevGMData[`total_yardage_${p.plant_code}`], true)
            prevTotalHoursOv += ensure(prevGMData[`total_hours_${p.plant_code}`], true)
        })
    }
    const prevTotalLoads = Math.round(prevTotalYardageOv / 10)
    const prevAllocationPct = prevTotalRunnableOv > 0 ? Math.round((prevTotalOpsOv / prevTotalRunnableOv) * 100) : 0
    const prevFleetUtil =
        prevTotalRunnableOv + prevTotalDownOv > 0
            ? Math.round((prevTotalRunnableOv / (prevTotalRunnableOv + prevTotalDownOv)) * 100)
            : 0
    const prevDailyYardage = Math.round(prevTotalYardageOv / workDays)
    const prevDailyLoads = Math.round(prevTotalLoads / workDays)
    const prevDailyHours = (prevTotalHoursOv / workDays).toFixed(1)
    const prevLoadsPerOpPerDay = prevTotalOpsOv > 0 ? (prevTotalLoads / prevTotalOpsOv / workDays).toFixed(1) : '0.0'
    const prevHoursPerOpPerDay = prevTotalOpsOv > 0 ? (prevTotalHoursOv / prevTotalOpsOv / workDays).toFixed(1) : '0.0'

    let ovRow = overviewStartRow

    ws.mergeCells(ovRow, overviewCol, ovRow, overviewCol + 2)
    const overviewTitleCell = ws.getCell(ovRow, overviewCol)
    overviewTitleCell.value = 'Weekly Overview'
    overviewTitleCell.font = { bold: true, color: { argb: COLORS.white }, name: 'Calibri', size: 16 }
    overviewTitleCell.fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    overviewTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(ovRow, overviewCol + 1).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    ws.getCell(ovRow, overviewCol + 2).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    ws.getRow(ovRow).height = 28
    ovRow += 2

    const addOverviewGroup = (title, metrics) => {
        ws.mergeCells(ovRow, overviewCol, ovRow, overviewCol + 2)
        const groupCell = ws.getCell(ovRow, overviewCol)
        groupCell.value = title
        groupCell.font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        groupCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        groupCell.alignment = { horizontal: 'left', vertical: 'middle' }
        ws.getCell(ovRow, overviewCol + 1).fill = {
            fgColor: { argb: COLORS.slate100 },
            pattern: 'solid',
            type: 'pattern'
        }
        ws.getCell(ovRow, overviewCol + 2).fill = {
            fgColor: { argb: COLORS.slate100 },
            pattern: 'solid',
            type: 'pattern'
        }
        ws.getRow(ovRow).height = 20
        ovRow++

        metrics.forEach((metric, idx) => {
            const isAlt = idx % 2 === 1
            const bgColor = isAlt ? COLORS.snow : null

            const labelCell = ws.getCell(ovRow, overviewCol)
            labelCell.value = metric.label
            labelCell.font = { color: { argb: COLORS.slate500 }, name: 'Calibri', size: 10 }
            labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) labelCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

            const changeInfo =
                metric.prev !== undefined
                    ? metric.useValue
                        ? getChangeValue(metric.value, metric.prev, metric.invertChange || false)
                        : getChangeText(metric.value, metric.prev, metric.invertChange || false)
                    : { color: null, text: '' }
            const changeCell = ws.getCell(ovRow, overviewCol + 1)
            addChangePct(changeCell, changeInfo, isAlt)
            if (bgColor && (!changeInfo || !changeInfo.text)) {
                changeCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
            }

            const valueCell = ws.getCell(ovRow, overviewCol + 2)
            if (metric.suffix) {
                valueCell.value = metric.value + metric.suffix
            } else {
                valueCell.value = metric.value
                if (metric.format) valueCell.numFmt = metric.format
            }
            valueCell.font = { bold: true, color: { argb: metric.color || COLORS.brand }, name: 'Calibri', size: 12 }
            valueCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) valueCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

            ws.getRow(ovRow).height = 20
            ovRow++
        })
        ovRow++
    }

    addOverviewGroup('Fleet', [
        { label: 'Plants', value: sortedPlants.length },
        { label: 'Runnable', prev: prevTotalRunnableOv, useValue: true, value: totalRunnable },
        {
            color: totalDown > 0 ? COLORS.danger : COLORS.brand,
            invertChange: true,
            label: 'Down',
            prev: prevTotalDownOv,
            useValue: true,
            value: totalDown
        },
        {
            color: fleetUtilization >= 90 ? COLORS.success : fleetUtilization < 80 ? COLORS.danger : COLORS.brand,
            label: 'Utilization',
            prev: prevFleetUtil,
            suffix: '%',
            value: fleetUtilization
        }
    ])

    addOverviewGroup('Operators', [
        { label: 'Total', prev: prevTotalOpsOv, useValue: true, value: totalOps },
        {
            color: allocationPct >= 100 ? COLORS.success : allocationPct < 80 ? COLORS.danger : COLORS.brand,
            label: 'Allocation',
            prev: prevAllocationPct,
            suffix: '%',
            value: allocationPct
        }
    ])

    addOverviewGroup('Training', [
        { label: 'Trainers', value: allTrainers.length },
        {
            color: allTraining.length > 0 ? COLORS.success : COLORS.brand,
            label: 'In Training',
            value: allTraining.length
        },
        { label: 'Pending Start', value: allPending.length },
        {
            color: totalHiringNeeded > 0 ? COLORS.danger : COLORS.success,
            label: 'Need to Hire',
            value: totalHiringNeeded
        }
    ])

    addOverviewGroup('Weekly Production', [
        { format: '#,##0', label: 'Yardage', prev: prevTotalYardageOv, value: totalYardage },
        { format: '#,##0', label: 'Loads', prev: prevTotalLoads, value: totalLoads },
        { format: '#,##0.0', label: 'Hours', prev: prevTotalHoursOv, value: totalHours }
    ])

    addOverviewGroup('Daily Averages', [
        { format: '#,##0', label: 'Yardage', prev: prevDailyYardage, value: dailyYardage },
        { format: '#,##0', label: 'Loads', prev: prevDailyLoads, value: dailyLoads },
        { label: 'Hours', prev: parseFloat(prevDailyHours), value: dailyHours }
    ])

    addOverviewGroup('Per Operator/Day', [
        { label: 'Loads', prev: parseFloat(prevLoadsPerOpPerDay), value: loadsPerOpPerDay },
        { label: 'Hours', prev: parseFloat(prevHoursPerOpPerDay), value: hoursPerOpPerDay }
    ])

    const monthlyCol = overviewCol + 4
    ws.getColumn(monthlyCol).width = 14
    ws.getColumn(monthlyCol + 1).width = 8
    ws.getColumn(monthlyCol + 2).width = 10
    ws.getColumn(monthlyCol + 3).width = 1

    const calcMonthlyTotals = (reports) => {
        let ops = 0,
            runnable = 0,
            down = 0,
            yardage = 0,
            hours = 0
        const weekCount = reports.length
        reports.forEach((rpt) => {
            if (!rpt) return
            const data = rpt.data || rpt
            sortedPlants.forEach((p) => {
                ops += ensure(data[`active_operators_${p.plant_code}`], true)
                runnable += ensure(data[`runnable_trucks_${p.plant_code}`], true)
                down += ensure(data[`down_trucks_${p.plant_code}`], true)
                yardage += ensure(data[`total_yardage_${p.plant_code}`], true)
                hours += ensure(data[`total_hours_${p.plant_code}`], true)
            })
        })
        const avgOps = weekCount > 0 ? Math.round(ops / weekCount) : 0
        const avgRunnable = weekCount > 0 ? Math.round(runnable / weekCount) : 0
        const avgDown = weekCount > 0 ? Math.round(down / weekCount) : 0
        return { avgDown, avgOps, avgRunnable, hours, loads: Math.round(yardage / 10), weekCount, yardage }
    }

    const filteredMonthlyForSidebar = allMonthlyData
        .map((m) => {
            const filtered = m.reports.filter((r) => r.weekIso <= weekIso)
            return { ...m, reports: filtered, weekIsos: new Set(filtered.map((r) => r.weekIso)) }
        })
        .filter((m) => m.reports.length > 0)

    const monthlyTotals = filteredMonthlyForSidebar.map((m) => ({
        ...m,
        totals: calcMonthlyTotals(m.reports)
    }))

    let moRow = overviewStartRow

    ws.mergeCells(moRow, monthlyCol, moRow, monthlyCol + 2)
    const monthlyTitleCell = ws.getCell(moRow, monthlyCol)
    monthlyTitleCell.value = 'Monthly Overview'
    monthlyTitleCell.font = { bold: true, color: { argb: COLORS.white }, name: 'Calibri', size: 16 }
    monthlyTitleCell.fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    monthlyTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(moRow, monthlyCol + 1).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    ws.getCell(moRow, monthlyCol + 2).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
    moRow += 2

    const addMonthlyGroup = (title, metrics) => {
        ws.mergeCells(moRow, monthlyCol, moRow, monthlyCol + 2)
        const groupCell = ws.getCell(moRow, monthlyCol)
        groupCell.value = title
        groupCell.font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        groupCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        groupCell.alignment = { horizontal: 'left', vertical: 'middle' }
        ws.getCell(moRow, monthlyCol + 1).fill = {
            fgColor: { argb: COLORS.slate100 },
            pattern: 'solid',
            type: 'pattern'
        }
        ws.getCell(moRow, monthlyCol + 2).fill = {
            fgColor: { argb: COLORS.slate100 },
            pattern: 'solid',
            type: 'pattern'
        }
        ws.getRow(moRow).height = 20
        moRow++

        metrics.forEach((metric, idx) => {
            const isAlt = idx % 2 === 1
            const bgColor = isAlt ? COLORS.snow : null

            const labelCell = ws.getCell(moRow, monthlyCol)
            labelCell.value = metric.label
            labelCell.font = { color: { argb: COLORS.slate500 }, name: 'Calibri', size: 10 }
            labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) labelCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

            const changeInfo =
                metric.prev !== undefined
                    ? metric.useValue
                        ? getChangeValue(metric.value, metric.prev, metric.invertChange || false)
                        : getChangeText(metric.value, metric.prev, metric.invertChange || false)
                    : { color: null, text: '' }
            const changeCell = ws.getCell(moRow, monthlyCol + 1)
            addChangePct(changeCell, changeInfo, isAlt)
            if (bgColor && (!changeInfo || !changeInfo.text)) {
                changeCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
            }

            const valueCell = ws.getCell(moRow, monthlyCol + 2)
            if (metric.suffix) {
                valueCell.value = metric.value + metric.suffix
            } else {
                valueCell.value = metric.value
                if (metric.format) valueCell.numFmt = metric.format
            }
            valueCell.font = { bold: true, color: { argb: metric.color || COLORS.brand }, name: 'Calibri', size: 12 }
            valueCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (bgColor) valueCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

            ws.getRow(moRow).height = 20
            moRow++
        })
        moRow++
    }

    monthlyTotals.forEach((monthData, idx) => {
        const prevMonthData = monthlyTotals[idx + 1]
        const prevTotals = prevMonthData ? prevMonthData.totals : null
        const weeksReported = monthData.weekIsos ? monthData.weekIsos.size : monthData.totals.weekCount
        const totalWeeks = monthData.totalWeeks || 4
        const weeksLabel = weeksReported === 0 ? `0 of ${totalWeeks} weeks` : `${weeksReported}/${totalWeeks} weeks`

        addMonthlyGroup(monthData.monthName, [
            { label: 'Weeks', value: weeksLabel },
            { format: '#,##0', label: 'Yardage', prev: prevTotals?.yardage, value: monthData.totals.yardage },
            { format: '#,##0', label: 'Loads', prev: prevTotals?.loads, value: monthData.totals.loads },
            { format: '#,##0.0', label: 'Hours', prev: prevTotals?.hours, value: monthData.totals.hours }
        ])
    })

    if (assetData) {
        const assetCol = monthlyCol + 4
        ws.getColumn(assetCol).width = 14
        ws.getColumn(assetCol + 1).width = 10

        const countByStatus = (items) => {
            const counts = { active: 0, retired: 0, shop: 0, spare: 0, total: 0 }
            items.forEach((item) => {
                if (item.status === 'Active') counts.active++
                else if (item.status === 'Spare') counts.spare++
                else if (item.status === 'In Shop') counts.shop++
                else if (item.status === 'Retired') counts.retired++
                if (item.status !== 'Retired') counts.total++
            })
            return counts
        }

        const countTractorsByType = (tractors) => {
            const cement = tractors.filter((t) => t.freight === 'Cement' || !t.freight)
            const endDump = tractors.filter((t) => t.freight === 'Aggregate')
            const dumpTruck = tractors.filter((t) => t.freight === 'Dump Truck')
            return {
                cement: countByStatus(cement),
                dumpTruck: countByStatus(dumpTruck),
                endDump: countByStatus(endDump)
            }
        }

        const mixerCounts = countByStatus(assetData.mixers || [])
        const tractorBreakdown = countTractorsByType(assetData.tractors || [])
        const trailerCounts = countByStatus(assetData.trailers || [])
        const equipmentCounts = countByStatus(assetData.equipment || [])
        const pickupCounts = countByStatus(assetData.pickups || [])

        let asRow = overviewStartRow

        ws.mergeCells(asRow, assetCol, asRow, assetCol + 1)
        const assetTitleCell = ws.getCell(asRow, assetCol)
        assetTitleCell.value = 'Asset Overview'
        assetTitleCell.font = { bold: true, color: { argb: COLORS.white }, name: 'Calibri', size: 16 }
        assetTitleCell.fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
        assetTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
        ws.getCell(asRow, assetCol + 1).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
        ws.getRow(asRow).height = 28
        asRow++

        ws.mergeCells(asRow, assetCol, asRow, assetCol + 1)
        const assetNoteCell = ws.getCell(asRow, assetCol)
        assetNoteCell.value = 'As of report generation'
        assetNoteCell.font = { color: { argb: COLORS.slate500 }, italic: true, name: 'Calibri', size: 9 }
        assetNoteCell.alignment = { horizontal: 'center', vertical: 'middle' }
        ws.getRow(asRow).height = 16
        asRow++

        const addAssetGroup = (title, counts) => {
            ws.mergeCells(asRow, assetCol, asRow, assetCol + 1)
            const groupCell = ws.getCell(asRow, assetCol)
            groupCell.value = title
            groupCell.font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            groupCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            groupCell.alignment = { horizontal: 'left', vertical: 'middle' }
            ws.getCell(asRow, assetCol + 1).fill = {
                fgColor: { argb: COLORS.slate100 },
                pattern: 'solid',
                type: 'pattern'
            }
            ws.getRow(asRow).height = 20
            asRow++

            const statusRows = [
                { color: COLORS.success, label: 'Active', value: counts.active },
                { color: COLORS.brand, label: 'Spare', value: counts.spare },
                { color: counts.shop > 0 ? COLORS.warning : COLORS.brand, label: 'In Shop', value: counts.shop },
                { bold: true, color: COLORS.slate700, label: 'Total', value: counts.total }
            ]

            statusRows.forEach((row, idx) => {
                const isAlt = idx % 2 === 1
                const bgColor = isAlt ? COLORS.snow : null

                const labelCell = ws.getCell(asRow, assetCol)
                labelCell.value = row.label
                labelCell.font = {
                    bold: row.bold || false,
                    color: { argb: COLORS.slate500 },
                    name: 'Calibri',
                    size: 10
                }
                labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
                if (bgColor) labelCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

                const valueCell = ws.getCell(asRow, assetCol + 1)
                valueCell.value = row.value
                valueCell.font = { bold: row.bold || false, color: { argb: row.color }, name: 'Calibri', size: 12 }
                valueCell.alignment = { horizontal: 'left', vertical: 'middle' }
                if (bgColor) valueCell.fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }

                ws.getRow(asRow).height = 20
                asRow++
            })
            asRow++
        }

        addAssetGroup('Mixers', mixerCounts)
        addAssetGroup('Cement Haulers', tractorBreakdown.cement)
        addAssetGroup('End Dump', tractorBreakdown.endDump)
        addAssetGroup('Dump Trucks', tractorBreakdown.dumpTruck)
        addAssetGroup('Trailers', trailerCounts)
        addAssetGroup('Equipment', equipmentCounts)
        addAssetGroup('Pickup Trucks', pickupCounts)
    }

    addSectionTitle(ws, r, 'Plant Summary')
    r += 2

    const plantHeaders = [
        { label: 'Plant', merge: false },
        { align: 'left', label: 'Name', merge: false },
        { label: 'Operators', merge: true },
        { label: 'Runnable', merge: true },
        { label: 'Down', merge: true },
        { label: 'Yardage', merge: true },
        { label: 'Hours', merge: true },
        { align: 'left', label: 'Notes', mergeCount: 3 }
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

        const opsChange = prevGMData ? getChangeValue(ops, prevOps, false) : { color: null, text: '' }
        const runnableChange = prevGMData ? getChangeValue(runnable, prevRunnable, false) : { color: null, text: '' }
        const downChange = prevGMData ? getChangeValue(down, prevDown, true) : { color: null, text: '' }
        const yardageChange = prevGMData ? getChangeText(yardage, prevYardage, false) : { color: null, text: '' }
        const hoursChange = prevGMData ? getChangeText(hours, prevHours, false) : { color: null, text: '' }

        const isAlt = idx % 2 === 1

        const rowData = [{ align: 'center', value: ensure(p.plant_code, false) }, ensure(p.plant_name, false)]
        addDataRow(ws, r, rowData, 2, isAlt)

        addChangePct(ws.getCell(r, 4), opsChange, isAlt)
        const opsCell = ws.getCell(r, 5)
        opsCell.value = ops
        opsCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        opsCell.alignment = { horizontal: 'left', vertical: 'middle' }
        if (isAlt) opsCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

        addChangePct(ws.getCell(r, 6), runnableChange, isAlt)
        const runnableCell = ws.getCell(r, 7)
        runnableCell.value = runnable
        runnableCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        runnableCell.alignment = { horizontal: 'left', vertical: 'middle' }
        if (isAlt) runnableCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

        addChangePct(ws.getCell(r, 8), downChange, isAlt)
        const downCell = ws.getCell(r, 9)
        downCell.value = down
        downCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        downCell.alignment = { horizontal: 'left', vertical: 'middle' }
        if (isAlt) downCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

        addChangePct(ws.getCell(r, 10), yardageChange, isAlt)
        const yardageCell = ws.getCell(r, 11)
        yardageCell.value = yardage
        yardageCell.numFmt = '#,##0'
        yardageCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        yardageCell.alignment = { horizontal: 'left', vertical: 'middle' }
        if (isAlt) yardageCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

        addChangePct(ws.getCell(r, 12), hoursChange, isAlt)
        const hoursCell = ws.getCell(r, 13)
        hoursCell.value = hours
        hoursCell.numFmt = '#,##0.0'
        hoursCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        hoursCell.alignment = { horizontal: 'left', vertical: 'middle' }
        if (isAlt) hoursCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

        ws.mergeCells(r, 14, r, 16)
        const notesCell = ws.getCell(r, 14)
        notesCell.value = ensure(form[`notes_${p.plant_code}`], false)
        notesCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
        notesCell.alignment = { horizontal: 'left', vertical: 'middle' }
        if (isAlt) {
            notesCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
            ws.getCell(r, 15).fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
            ws.getCell(r, 16).fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
        }

        ws.getRow(r).height = 20
        r++
    })

    let prevTotalOps = 0,
        prevTotalRunnable = 0,
        prevTotalDown = 0,
        prevTotalYardage = 0,
        prevTotalHours = 0
    if (prevGMData) {
        sortedPlants.forEach((p) => {
            prevTotalOps += ensure(prevGMData[`active_operators_${p.plant_code}`], true)
            prevTotalRunnable += ensure(prevGMData[`runnable_trucks_${p.plant_code}`], true)
            prevTotalDown += ensure(prevGMData[`down_trucks_${p.plant_code}`], true)
            prevTotalYardage += ensure(prevGMData[`total_yardage_${p.plant_code}`], true)
            prevTotalHours += ensure(prevGMData[`total_hours_${p.plant_code}`], true)
        })
    }

    const totalOpsChange = prevGMData ? getChangeValue(totalOps, prevTotalOps, false) : { color: null, text: '' }
    const totalRunnableChange = prevGMData
        ? getChangeValue(totalRunnable, prevTotalRunnable, false)
        : {
              color: null,
              text: ''
          }
    const totalDownChange = prevGMData ? getChangeValue(totalDown, prevTotalDown, true) : { color: null, text: '' }
    const totalYardageChange = prevGMData
        ? getChangeText(totalYardage, prevTotalYardage, false)
        : {
              color: null,
              text: ''
          }
    const totalHoursChange = prevGMData ? getChangeText(totalHours, prevTotalHours, false) : { color: null, text: '' }

    ws.getCell(r, 2).value = ''
    ws.getCell(r, 2).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
    ws.getCell(r, 2).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }

    ws.getCell(r, 3).value = 'TOTAL'
    ws.getCell(r, 3).font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 11 }
    ws.getCell(r, 3).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
    ws.getCell(r, 3).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
    ws.getCell(r, 3).alignment = { horizontal: 'right', vertical: 'middle' }

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
    ws.getCell(r, 14).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
    ws.getCell(r, 14).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
    ws.getCell(r, 15).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
    ws.getCell(r, 15).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
    ws.getCell(r, 16).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
    ws.getCell(r, 16).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }

    ws.getRow(r).height = 24
    r++

    const currentWeekDate = weekIso ? new Date(weekIso + 'T00:00:00Z') : new Date()
    const currentMonthKey = `${currentWeekDate.getUTCFullYear()}-${String(currentWeekDate.getUTCMonth() + 1).padStart(2, '0')}`
    const currentYear = currentWeekDate.getUTCFullYear()

    const filterReportsUpToWeek = (monthlyDataArray) => {
        return monthlyDataArray
            .map((m) => {
                const filteredReports = m.reports.filter((r) => r.weekIso <= weekIso).map((r) => r.data)
                const filteredWeekIsos = new Set(m.reports.filter((r) => r.weekIso <= weekIso).map((r) => r.weekIso))
                return { ...m, reports: filteredReports, weekIsos: filteredWeekIsos }
            })
            .filter((m) => m.reports.length > 0)
    }

    const filteredMonthlyData = filterReportsUpToWeek(allMonthlyData)
    const currentMonthData = filteredMonthlyData.find((m) => m.monthKey === currentMonthKey)
    const currentYearData = filteredMonthlyData.filter((m) => m.monthKey.startsWith(String(currentYear)))

    const calcPlantSummaryTotals = (reports) => {
        let ops = 0,
            runnable = 0,
            down = 0,
            yardage = 0,
            hours = 0
        reports.forEach((data) => {
            sortedPlants.forEach((p) => {
                ops += ensure(data[`active_operators_${p.plant_code}`], true)
                runnable += ensure(data[`runnable_trucks_${p.plant_code}`], true)
                down += ensure(data[`down_trucks_${p.plant_code}`], true)
                yardage += ensure(data[`total_yardage_${p.plant_code}`], true)
                hours += ensure(data[`total_hours_${p.plant_code}`], true)
            })
        })
        return { down, hours, ops, runnable, yardage }
    }

    const addSummaryTotalRow = (label, totals, bgColor) => {
        ws.getCell(r, 2).value = ''
        ws.getCell(r, 2).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 3).value = label
        ws.getCell(r, 3).font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
        ws.getCell(r, 3).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 3).alignment = { horizontal: 'right', vertical: 'middle' }
        ws.getCell(r, 4).value = ''
        ws.getCell(r, 4).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 5).value = totals.ops
        ws.getCell(r, 5).font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
        ws.getCell(r, 5).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 5).alignment = { horizontal: 'left', vertical: 'middle' }
        ws.getCell(r, 6).value = ''
        ws.getCell(r, 6).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 7).value = totals.runnable
        ws.getCell(r, 7).font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
        ws.getCell(r, 7).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 7).alignment = { horizontal: 'left', vertical: 'middle' }
        ws.getCell(r, 8).value = ''
        ws.getCell(r, 8).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 9).value = totals.down
        ws.getCell(r, 9).font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
        ws.getCell(r, 9).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 9).alignment = { horizontal: 'left', vertical: 'middle' }
        ws.getCell(r, 10).value = ''
        ws.getCell(r, 10).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 11).value = totals.yardage
        ws.getCell(r, 11).numFmt = '#,##0'
        ws.getCell(r, 11).font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
        ws.getCell(r, 11).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 11).alignment = { horizontal: 'left', vertical: 'middle' }
        ws.getCell(r, 12).value = ''
        ws.getCell(r, 12).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 13).value = totals.hours
        ws.getCell(r, 13).numFmt = '#,##0.0'
        ws.getCell(r, 13).font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 10 }
        ws.getCell(r, 13).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 13).alignment = { horizontal: 'left', vertical: 'middle' }
        ws.mergeCells(r, 14, r, 16)
        ws.getCell(r, 14).value = ''
        ws.getCell(r, 14).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 15).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 16).fill = { fgColor: { argb: bgColor }, pattern: 'solid', type: 'pattern' }
        ws.getRow(r).height = 20
        r++
    }

    if (currentMonthData && currentMonthData.reports.length > 0) {
        const monthTotals = calcPlantSummaryTotals(currentMonthData.reports)
        addSummaryTotalRow(`MTD (${currentMonthData.monthName})`, monthTotals, COLORS.snow)
    }

    if (currentYearData.length > 0) {
        const allYearReports = currentYearData.flatMap((m) => m.reports)
        const yearTotals = calcPlantSummaryTotals(allYearReports)
        addSummaryTotalRow(`YTD (${currentYear})`, yearTotals, COLORS.snow)
    }

    r += 2

    if (sortedEffReports.length > 0) {
        addSectionTitle(ws, r, 'Efficiency Overview')
        r += 2

        const effHeaders = [
            { label: 'Plant', merge: false },
            { align: 'left', label: 'Name', merge: false },
            { label: 'Date', merge: false },
            { label: 'Loads', merge: true },
            { label: 'Hours', merge: true },
            { label: 'L/H/O', merge: true },
            { label: 'Start', merge: true },
            { label: 'End', merge: true }
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
            const plantInfo = sortedPlants.find((p) => String(p.plant_code) === String(er.plant_code))
            const plantName = plantInfo?.plant_name || plantInfo?.name || er.plant_code

            const reportDate = er.report_date || ''
            const formattedDate = reportDate
                ? new Date(reportDate + 'T00:00:00').toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short'
                  })
                : ''

            const plantOps = ensure(form[`active_operators_${er.plant_code}`], true)
            const lph = truncateToTenth(lphBase * plantOps)

            const isAlt = idx % 2 === 1
            const isShutDown =
                loads === 0 &&
                (hours === null || hours === 0 || isNaN(hours)) &&
                (startMin === null || isNaN(startMin)) &&
                (endMin === null || isNaN(endMin))

            const rowData = [
                { align: 'center', value: ensure(er.plant_code, false) },
                plantName,
                { align: 'center', value: formattedDate }
            ]
            addDataRow(ws, r, rowData, 2, isAlt)

            if (isShutDown) {
                ws.mergeCells(r, 5, r, 14)
                const shutDownCell = ws.getCell(r, 5)
                shutDownCell.value = 'Plant Shut Down'
                shutDownCell.font = { color: { argb: COLORS.slate500 }, italic: true, name: 'Calibri', size: 11 }
                shutDownCell.alignment = { horizontal: 'center', vertical: 'middle' }
                if (isAlt) {
                    shutDownCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
                    for (let c = 6; c <= 14; c++) {
                        ws.getCell(r, c).fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
                    }
                }
                ws.getRow(r).height = 20
                r++
                return
            }

            const prevEr = sortedPrevEffReports.find((p) => String(p.plant_code) === String(er.plant_code))
            let prevLoads = null,
                prevHours = null,
                prevLph = null,
                prevStart = null,
                prevEnd = null
            if (prevEr) {
                const prevInsights = ReportService.getPlantProductionInsights(prevEr.rows || [])
                prevLoads = prevInsights.totalLoads || 0
                prevHours = truncateToTenth(prevInsights.totalHours)
                const prevLphBase = truncateToTenth(prevInsights.avgLoadsPerHour)
                const prevPlantOps = prevGMData
                    ? ensure(prevGMData[`active_operators_${er.plant_code}`], true)
                    : plantOps
                prevLph = truncateToTenth(prevLphBase * prevPlantOps)
                prevStart = truncateToTenth(prevInsights.avgElapsedStart)
                prevEnd = truncateToTenth(prevInsights.avgElapsedEnd)
            }

            const filterNew = (c) => (c.text && c.text.includes('new') ? { color: null, text: '' } : c)

            const noChangeResult = { color: COLORS.slate500, text: '0%' }
            const loadsChange = prevEr ? filterNew(getChangeText(loads, prevLoads, false)) : noChangeResult
            const hoursChange = prevEr ? filterNew(getChangeText(hours, prevHours, false)) : noChangeResult
            const lphChange = prevEr ? filterNew(getChangeText(lph, prevLph, false)) : noChangeResult
            const startChange = prevEr ? filterNew(getChangeText(startMin, prevStart, true)) : noChangeResult
            const endChange = prevEr ? filterNew(getChangeText(endMin, prevEnd, true)) : noChangeResult

            addChangePct(ws.getCell(r, 5), loadsChange, isAlt)
            const loadsCell = ws.getCell(r, 6)
            loadsCell.value = loads
            loadsCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            loadsCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) loadsCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            addChangePct(ws.getCell(r, 7), hoursChange, isAlt)
            const hoursCell = ws.getCell(r, 8)
            hoursCell.value = hours
            hoursCell.numFmt = '#,##0.0'
            hoursCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            hoursCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) hoursCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            addChangePct(ws.getCell(r, 9), lphChange, isAlt)
            const lphCell = ws.getCell(r, 10)
            lphCell.value = lph
            lphCell.numFmt = '#,##0.0'
            lphCell.font = {
                bold: lph >= 2 || lph < 1.5,
                color: { argb: lph >= 2 ? COLORS.success : lph < 1.5 ? COLORS.danger : COLORS.slate700 },
                name: 'Calibri',
                size: 11
            }
            lphCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) lphCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            addChangePct(ws.getCell(r, 11), startChange, isAlt)
            const startCell = ws.getCell(r, 12)
            startCell.value = startMin
            startCell.numFmt = '#,##0.0'
            startCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            startCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) startCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            addChangePct(ws.getCell(r, 13), endChange, isAlt)
            const endCell = ws.getCell(r, 14)
            endCell.value = endMin
            endCell.numFmt = '#,##0.0'
            endCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            endCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) endCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            ws.getRow(r).height = 20
            r++
        })

        let totalLoadsEff = 0,
            totalHoursEff = 0,
            totalLphEff = 0,
            totalStartEff = 0,
            totalEndEff = 0
        let prevTotalLoadsEff = 0,
            prevTotalHoursEff = 0,
            prevTotalLphEff = 0,
            prevTotalStartEff = 0,
            prevTotalEndEff = 0
        let effCount = 0,
            prevEffCount = 0

        sortedEffReports.forEach((er) => {
            const insights = ReportService.getPlantProductionInsights(er.rows || [])
            const plantOpsEff = ensure(form[`active_operators_${er.plant_code}`], true)
            totalLoadsEff += insights.totalLoads || 0
            totalHoursEff += truncateToTenth(insights.totalHours) || 0
            totalLphEff += truncateToTenth(insights.avgLoadsPerHour) * plantOpsEff || 0
            totalStartEff += truncateToTenth(insights.avgElapsedStart) || 0
            totalEndEff += truncateToTenth(insights.avgElapsedEnd) || 0
            effCount++
        })

        sortedPrevEffReports.forEach((er) => {
            const insights = ReportService.getPlantProductionInsights(er.rows || [])
            const prevPlantOpsEff = prevGMData
                ? ensure(prevGMData[`active_operators_${er.plant_code}`], true)
                : ensure(form[`active_operators_${er.plant_code}`], true)
            prevTotalLoadsEff += insights.totalLoads || 0
            prevTotalHoursEff += truncateToTenth(insights.totalHours) || 0
            prevTotalLphEff += truncateToTenth(insights.avgLoadsPerHour) * prevPlantOpsEff || 0
            prevTotalStartEff += truncateToTenth(insights.avgElapsedStart) || 0
            prevTotalEndEff += truncateToTenth(insights.avgElapsedEnd) || 0
            prevEffCount++
        })

        const avgLph = effCount > 0 ? truncateToTenth(totalLphEff / effCount) : 0
        const avgStart = effCount > 0 ? truncateToTenth(totalStartEff / effCount) : 0
        const avgEnd = effCount > 0 ? truncateToTenth(totalEndEff / effCount) : 0
        const prevAvgLph = prevEffCount > 0 ? truncateToTenth(prevTotalLphEff / prevEffCount) : 0
        const prevAvgStart = prevEffCount > 0 ? truncateToTenth(prevTotalStartEff / prevEffCount) : 0
        const prevAvgEnd = prevEffCount > 0 ? truncateToTenth(prevTotalEndEff / prevEffCount) : 0

        const effLoadsChange =
            prevEffCount > 0
                ? getChangeText(totalLoadsEff, prevTotalLoadsEff, false)
                : {
                      color: null,
                      text: ''
                  }
        const effHoursChange =
            prevEffCount > 0
                ? getChangeText(totalHoursEff, prevTotalHoursEff, false)
                : {
                      color: null,
                      text: ''
                  }
        const effLphChange = prevEffCount > 0 ? getChangeText(avgLph, prevAvgLph, false) : { color: null, text: '' }
        const effStartChange =
            prevEffCount > 0 ? getChangeText(avgStart, prevAvgStart, true) : { color: null, text: '' }
        const effEndChange = prevEffCount > 0 ? getChangeText(avgEnd, prevAvgEnd, true) : { color: null, text: '' }

        ws.getCell(r, 2).value = ''
        ws.getCell(r, 2).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 2).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }

        ws.mergeCells(r, 3, r, 4)
        ws.getCell(r, 3).value = 'AVERAGES'
        ws.getCell(r, 3).font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 11 }
        ws.getCell(r, 3).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 3).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
        ws.getCell(r, 3).alignment = { horizontal: 'right', vertical: 'middle' }
        ws.getCell(r, 4).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
        ws.getCell(r, 4).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }

        applyTotalChangeCell(ws.getCell(r, 5), effLoadsChange)
        applyTotalCell(ws.getCell(r, 6), totalLoadsEff)

        applyTotalChangeCell(ws.getCell(r, 7), effHoursChange)
        applyTotalCell(ws.getCell(r, 8), totalHoursEff, '#,##0.0')

        applyTotalChangeCell(ws.getCell(r, 9), effLphChange)
        applyTotalCell(ws.getCell(r, 10), avgLph, '#,##0.0')

        applyTotalChangeCell(ws.getCell(r, 11), effStartChange)
        applyTotalCell(ws.getCell(r, 12), avgStart + ' mins')

        applyTotalChangeCell(ws.getCell(r, 13), effEndChange)
        applyTotalCell(ws.getCell(r, 14), avgEnd + ' mins')

        ws.getRow(r).height = 24
        r += 3
    }

    const calcAggregateFromReports = (reports, fields) => {
        const totals = {}
        fields.forEach(([key]) => {
            totals[key] = 0
        })
        reports.forEach((data) => {
            if (!data) return
            fields.forEach(([key]) => {
                let val = data[key]
                val = val === undefined || val === null || val === '' ? 0 : Number(val)
                totals[key] += val
            })
        })
        return totals
    }

    if (aggregateReport) {
        addSectionTitle(ws, r, 'Aggregate Production')
        r += 2

        const aggHeaders = [
            { align: 'left', label: 'Material', mergeCount: 2 },
            { label: 'This Week', merge: true },
            { label: 'MTD', merge: false },
            { label: 'YTD', merge: false }
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

        const mtdTotals = calcAggregateFromReports(allAggReports.monthly, aggFields)
        const ytdTotals = calcAggregateFromReports(allAggReports.yearly, aggFields)

        const dataSource = aggregateReport?.data || {}
        const prevDataSource = prevAggregateReport?.data || {}
        let aggTotal = 0
        let prevAggTotal = 0
        let mtdTotal = 0
        let ytdTotal = 0
        let rowIdx = 0

        aggFields.forEach(([key, label]) => {
            let raw = dataSource[key]
            raw = raw === undefined || raw === null || raw === '' ? 0 : Number(raw)
            let prevRaw = prevDataSource[key]
            prevRaw = prevRaw === undefined || prevRaw === null || prevRaw === '' ? 0 : Number(prevRaw)

            const mtdVal = mtdTotals[key] || 0
            const ytdVal = ytdTotals[key] || 0

            aggTotal += raw
            prevAggTotal += prevRaw
            mtdTotal += mtdVal
            ytdTotal += ytdVal

            const changeInfo = prevAggregateReport ? getChangeText(raw, prevRaw, false) : { color: null, text: '' }
            const isAlt = rowIdx % 2 === 1

            ws.mergeCells(r, 2, r, 3)
            const labelCell = ws.getCell(r, 2)
            labelCell.value = label
            labelCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) {
                labelCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
                ws.getCell(r, 3).fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
            }

            addChangePct(ws.getCell(r, 4), changeInfo, isAlt)

            const valCell = ws.getCell(r, 5)
            valCell.value = raw
            valCell.numFmt = '#,##0.0'
            valCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            valCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) valCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            const mtdCell = ws.getCell(r, 6)
            mtdCell.value = mtdVal
            mtdCell.numFmt = '#,##0.0'
            mtdCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            mtdCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) mtdCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            const ytdCell = ws.getCell(r, 7)
            ytdCell.value = ytdVal
            ytdCell.numFmt = '#,##0.0'
            ytdCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            ytdCell.alignment = { horizontal: 'left', vertical: 'middle' }
            if (isAlt) ytdCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }

            ws.getRow(r).height = 20
            r++
            rowIdx++
        })

        if (aggTotal > 0) {
            const totalChangeInfo = prevAggregateReport
                ? getChangeText(aggTotal, prevAggTotal, false)
                : {
                      color: null,
                      text: ''
                  }

            ws.mergeCells(r, 2, r, 3)
            const totalLabelCell = ws.getCell(r, 2)
            totalLabelCell.value = 'TOTAL'
            totalLabelCell.font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 11 }
            totalLabelCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            totalLabelCell.border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
            totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' }
            ws.getCell(r, 3).fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            ws.getCell(r, 3).border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }

            const totalChangeCell = ws.getCell(r, 4)
            if (totalChangeInfo && totalChangeInfo.text) {
                totalChangeCell.value = totalChangeInfo.text.trim()
                totalChangeCell.font = { bold: true, color: { argb: totalChangeInfo.color }, name: 'Calibri', size: 9 }
            } else {
                totalChangeCell.value = ''
            }
            totalChangeCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            totalChangeCell.border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
            totalChangeCell.alignment = { horizontal: 'right', vertical: 'middle' }

            const totalValCell = ws.getCell(r, 5)
            totalValCell.value = aggTotal
            totalValCell.numFmt = '#,##0.0'
            totalValCell.font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 11 }
            totalValCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            totalValCell.border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
            totalValCell.alignment = { horizontal: 'left', vertical: 'middle' }

            const mtdTotalCell = ws.getCell(r, 6)
            mtdTotalCell.value = mtdTotal
            mtdTotalCell.numFmt = '#,##0.0'
            mtdTotalCell.font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 11 }
            mtdTotalCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            mtdTotalCell.border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
            mtdTotalCell.alignment = { horizontal: 'left', vertical: 'middle' }

            const ytdTotalCell = ws.getCell(r, 7)
            ytdTotalCell.value = ytdTotal
            ytdTotalCell.numFmt = '#,##0.0'
            ytdTotalCell.font = { bold: true, color: { argb: COLORS.brand }, name: 'Calibri', size: 11 }
            ytdTotalCell.fill = { fgColor: { argb: COLORS.slate100 }, pattern: 'solid', type: 'pattern' }
            ytdTotalCell.border = { top: { color: { argb: COLORS.brand }, style: 'medium' } }
            ytdTotalCell.alignment = { horizontal: 'left', vertical: 'middle' }

            ws.getRow(r).height = 24
        }
        r += 2
    }

    if (rmiData) {
        const getPlantName = (code) => {
            const p = plants?.find((x) => (x.plant_code || x.code) === code)
            return p?.name || code || ''
        }

        if (allTrainers.length > 0 || allPending.length > 0 || allTraining.length > 0) {
            addSectionTitle(ws, r, 'Training & Hiring')
            r += 2
        }

        if (allTrainers.length > 0) {
            ws.getCell(r, 2).value = 'Active Trainers'
            ws.getCell(r, 2).font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            r++
            const trainerHeaders = [
                { label: 'Plant', merge: false },
                { align: 'left', label: 'Name', merge: false },
                { label: 'Type', merge: false },
                { label: 'Status', merge: false }
            ]
            addMergedTableHeaders(ws, r, trainerHeaders)
            r++
            allTrainers.forEach((t, idx) => {
                addDataRow(
                    ws,
                    r,
                    [
                        { align: 'center', value: getPlantName(t.plant) },
                        t.name || '',
                        { align: 'center', value: t.type },
                        { align: 'center', value: t.status || '' }
                    ],
                    2,
                    idx % 2 === 1
                )
                r++
            })
            r++
        }

        if (allPending.length > 0) {
            ws.getCell(r, 2).value = 'Pending Start'
            ws.getCell(r, 2).font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            r++
            const pendingHeaders = [
                { label: 'Plant', merge: false },
                { align: 'left', label: 'Name', merge: false },
                { label: 'Type', merge: false },
                { label: 'Start Date', merge: true }
            ]
            addMergedTableHeaders(ws, r, pendingHeaders)
            r++
            allPending.forEach((p, idx) => {
                const isAlt = idx % 2 === 1
                addDataRow(
                    ws,
                    r,
                    [
                        { align: 'center', value: getPlantName(p.plant) },
                        p.name || '',
                        { align: 'center', value: p.type }
                    ],
                    2,
                    isAlt
                )
                ws.mergeCells(r, 5, r, 6)
                const startDateCell = ws.getCell(r, 5)
                startDateCell.value = p.startDate || ''
                startDateCell.font = { color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
                startDateCell.alignment = { horizontal: 'center', vertical: 'middle' }
                if (isAlt) {
                    startDateCell.fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
                    ws.getCell(r, 6).fill = { fgColor: { argb: COLORS.snow }, pattern: 'solid', type: 'pattern' }
                }
                r++
            })
            r++
        }

        if (allTraining.length > 0) {
            ws.getCell(r, 2).value = 'In Training'
            ws.getCell(r, 2).font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            r++
            const trainingHeaders = [
                { label: 'Plant', merge: false },
                { align: 'left', label: 'Name', merge: false },
                { label: 'Type', merge: false },
                { align: 'left', label: 'Trainer', merge: false }
            ]
            addMergedTableHeaders(ws, r, trainingHeaders)
            r++
            allTraining.forEach((t, idx) => {
                addDataRow(
                    ws,
                    r,
                    [
                        { align: 'center', value: getPlantName(t.plant) },
                        t.name || '',
                        { align: 'center', value: t.type },
                        t.trainer || ''
                    ],
                    2,
                    idx % 2 === 1
                )
                r++
            })
            r++
        }

        const goalsArr = Object.entries(hiringGoals).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        if (goalsArr.length > 0) {
            r++
            ws.getCell(r, 2).value = 'Hiring Goals'
            ws.getCell(r, 2).font = { bold: true, color: { argb: COLORS.slate700 }, name: 'Calibri', size: 11 }
            r++
            addTableHeaders(ws, r, ['Plant', 'Goal'], 2)
            r++
            sortedPlants.forEach((plant, idx) => {
                const code = plant.plant_code || plant.code
                const goal = hiringGoals[code]
                if (goal !== undefined && goal !== null && goal !== '') {
                    addDataRow(
                        ws,
                        r,
                        [
                            { align: 'center', value: getPlantName(code) },
                            {
                                align: 'center',
                                value: Number(goal)
                            }
                        ],
                        2,
                        idx % 2 === 1
                    )
                    r++
                }
            })
        }
    }

    finalizeSheet(ws)
}
