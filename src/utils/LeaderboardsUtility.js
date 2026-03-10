/**
 * Leaderboard computation engine: calculates per-plant fleet counts, cross-plant hours adjustments,
 * efficiency/YPH/production metrics from weekly reports, safety incident aggregation,
 * and category-based sorting for plant rankings.
 */
const LeaderboardsUtility = {
    calculateFleetCounts(plantCodesInRegion, mixersData, tractorsData, trailersData, equipmentData, operatorsData) {
        const fleetCountsByPlant = {}
        plantCodesInRegion.forEach((plantCode) => {
            const plantMixers = mixersData.filter((m) => {
                const plant = m.assignedPlant || m.assigned_plant
                return plant === plantCode && m.status !== 'Retired'
            })
            const mixerCount = plantMixers.length
            const plantTractors = tractorsData.filter((t) => {
                const plant = t.assignedPlant || t.assigned_plant
                return plant === plantCode && t.status !== 'Retired'
            })
            const tractorCount = plantTractors.length
            const trailerCount = trailersData.filter((t) => {
                const plant = t.assignedPlant || t.assigned_plant
                return plant === plantCode && t.status !== 'Retired'
            }).length
            const equipmentCount = equipmentData.filter((e) => {
                const plant = e.assignedPlant || e.assigned_plant
                return plant === plantCode && e.status !== 'Retired'
            }).length
            const mixerOperatorIds = new Set(
                plantMixers
                    .filter((m) => m.assignedOperator && m.assignedOperator !== '0')
                    .map((m) => m.assignedOperator)
            )
            const tractorOperatorIds = new Set(
                plantTractors
                    .filter((t) => t.assignedOperator && t.assignedOperator !== '0')
                    .map((t) => t.assignedOperator)
            )
            const mixerOperatorCount = operatorsData.filter((o) => {
                const plant = o.plantCode || o.plant_code
                const opId = o.employeeId || o.employee_id
                return plant === plantCode && o.status === 'Active' && mixerOperatorIds.has(opId)
            }).length
            const tractorOperatorCount = operatorsData.filter((o) => {
                const plant = o.plantCode || o.plant_code
                const opId = o.employeeId || o.employee_id
                return plant === plantCode && o.status === 'Active' && tractorOperatorIds.has(opId)
            }).length
            const totalOperators = operatorsData.filter((o) => {
                const plant = o.plantCode || o.plant_code
                return plant === plantCode && o.status === 'Active'
            }).length
            const activeMixers = plantMixers.filter((m) => m.status === 'Active')
            const mixersWithCleanliness = activeMixers.filter((m) => {
                const rating = m.cleanlinessRating || m.cleanliness_rating
                return rating !== null && rating !== undefined && rating > 0
            })
            const avgMixerCleanliness =
                mixersWithCleanliness.length > 0
                    ? mixersWithCleanliness.reduce((sum, m) => {
                          const rating = m.cleanlinessRating || m.cleanliness_rating
                          return sum + (parseFloat(rating) || 0)
                      }, 0) / mixersWithCleanliness.length
                    : 0
            fleetCountsByPlant[plantCode] = {
                avgFleetCleanliness: avgMixerCleanliness,
                avgFleetCleanlinessForEfficiency: Math.floor(avgMixerCleanliness),
                equipment: equipmentCount,
                mixerOperators: mixerOperatorCount,
                mixers: mixerCount,
                operators: totalOperators,
                totalAssets: mixerCount + tractorCount + trailerCount + equipmentCount,
                tractorOperators: tractorOperatorCount,
                tractors: tractorCount,
                trailers: trailerCount
            }
        })
        return fleetCountsByPlant
    },
    calculateHoursAdjustments(reports, profilesData, plantCodesInRegion) {
        const hoursAdjustmentsByPlant = {}
        plantCodesInRegion.forEach((plantCode) => {
            hoursAdjustmentsByPlant[plantCode] = {
                details: [],
                hoursAdded: 0,
                hoursSubtracted: 0
            }
        })
        reports.forEach((report) => {
            if (!report.data?.operators_sent_to_help) return
            const sendingPlantProfile = profilesData.find((p) => p.id === report.user_id)
            if (!sendingPlantProfile) return
            const sendingPlantCode = sendingPlantProfile.plant_code
            report.data.operators_sent_to_help.forEach((entry) => {
                const { destination_plant, operators } = entry
                if (!operators || operators.length === 0) return
                const totalHours = operators.reduce((sum, op) => sum + (parseFloat(op.hours) || 0), 0)
                if (hoursAdjustmentsByPlant[sendingPlantCode]) {
                    hoursAdjustmentsByPlant[sendingPlantCode].hoursSubtracted += totalHours
                    hoursAdjustmentsByPlant[sendingPlantCode].details.push({
                        hours: totalHours,
                        operatorCount: operators.length,
                        to: destination_plant,
                        type: 'sent',
                        week: report.week
                    })
                }
                if (hoursAdjustmentsByPlant[destination_plant]) {
                    hoursAdjustmentsByPlant[destination_plant].hoursAdded += totalHours
                    hoursAdjustmentsByPlant[destination_plant].details.push({
                        from: sendingPlantCode,
                        hours: totalHours,
                        operatorCount: operators.length,
                        type: 'received',
                        week: report.week
                    })
                }
            })
        })
        return hoursAdjustmentsByPlant
    },
    calculateMetrics(
        reportsList,
        _avgFleetCleanlinessActual = 0,
        mixerOperatorCount = 1,
        currentWeekStart,
        hoursAdjustments = null,
        safetyIncidents = null
    ) {
        if (reportsList.length === 0) {
            return null
        }
        const reportsByWeek = new Map()
        const allReportDates = []
        reportsList.forEach((report) => {
            const weekStr = report.week.split('T')[0]
            const weekDate = new Date(weekStr + 'T12:00:00')
            if (weekDate >= currentWeekStart) {
                return
            }
            if (reportsByWeek.has(weekStr)) {
                const existing = reportsByWeek.get(weekStr)
                if (report.completed && !existing.completed) {
                    reportsByWeek.set(weekStr, report)
                } else if (report.completed === existing.completed) {
                    const existingDate = new Date(existing.submitted_at || existing.updated_at || 0)
                    const reportDate = new Date(report.submitted_at || report.updated_at || 0)
                    if (reportDate > existingDate) {
                        reportsByWeek.set(weekStr, report)
                    }
                }
            } else {
                reportsByWeek.set(weekStr, report)
                allReportDates.push(weekStr)
            }
        })
        if (allReportDates.length === 0) return null
        allReportDates.sort()
        const firstDate = allReportDates[0]
        const allWeeks = []
        let currentDate = new Date(firstDate + 'T12:00:00')
        const lastSunday = new Date(currentWeekStart)
        lastSunday.setDate(currentWeekStart.getDate() - 7)
        while (currentDate < currentWeekStart) {
            const year = currentDate.getFullYear()
            const month = String(currentDate.getMonth() + 1).padStart(2, '0')
            const day = String(currentDate.getDate()).padStart(2, '0')
            const weekStr = `${year}-${month}-${day}`
            const report = reportsByWeek.get(weekStr)
            if (report) {
                const yardage = parseFloat(report.data?.yardage || 0)
                const hours = parseFloat(report.data?.total_hours || 0)
                allWeeks.push({
                    hours,
                    isMissing: false,
                    isNotSubmitted: !report.completed,
                    yardage
                })
            } else if (currentDate >= new Date(firstDate + 'T12:00:00') && currentDate < currentWeekStart) {
                allWeeks.push({
                    hours: 0,
                    isMissing: true,
                    isNotSubmitted: false,
                    yardage: 0
                })
            }
            currentDate.setDate(currentDate.getDate() + 7)
        }
        const submittedWeeks = allWeeks.filter((w) => !w.isMissing && !w.isNotSubmitted)
        const totalExpectedReports = allWeeks.length
        const missingReports = allWeeks.filter((w) => w.isMissing)
        const incompleteReports = allWeeks.filter((w) => w.isNotSubmitted)
        const missingCount = missingReports.length
        const incompleteCount = incompleteReports.length
        if (submittedWeeks.length === 0) return null
        const totals = submittedWeeks.reduce(
            (acc, week) => ({
                reportCount: acc.reportCount + 1,
                totalHours: acc.totalHours + week.hours,
                totalYards: acc.totalYards + week.yardage
            }),
            { reportCount: 0, totalHours: 0, totalYards: 0 }
        )
        let adjustedTotalHours = totals.totalHours
        let helpGiven = 0
        let helpReceived = 0
        let helpRatio = 0
        if (hoursAdjustments) {
            const netAdjustment = hoursAdjustments.hoursAdded - hoursAdjustments.hoursSubtracted
            adjustedTotalHours = totals.totalHours + netAdjustment
            helpGiven = hoursAdjustments.hoursSubtracted || 0
            helpReceived = hoursAdjustments.hoursAdded || 0
            if (helpReceived > 0) {
                helpRatio = helpGiven / helpReceived
            } else if (helpGiven > 0) {
                helpRatio = helpGiven
            } else {
                helpRatio = 0
            }
        }
        const weeksWithHours = submittedWeeks.filter((w) => w.hours > 0)
        const yardsWithHours = weeksWithHours.reduce((sum, w) => sum + w.yardage, 0)
        const hoursTotal = weeksWithHours.reduce((sum, w) => sum + w.hours, 0)
        let adjustedHoursTotal = hoursTotal
        if (hoursAdjustments) {
            const netAdjustment = hoursAdjustments.hoursAdded - hoursAdjustments.hoursSubtracted
            adjustedHoursTotal = hoursTotal + netAdjustment
        }
        const rawYPH = hoursTotal > 0 ? yardsWithHours / hoursTotal : 0
        const avgYPH = adjustedHoursTotal > 0 ? yardsWithHours / adjustedHoursTotal : 0
        const avgYardageWeekly = totals.reportCount > 0 ? totals.totalYards / totals.reportCount : 0
        const avgYardageDaily = avgYardageWeekly / 6
        const avgWeeklyHours = totals.reportCount > 0 ? adjustedTotalHours / totals.reportCount : 0
        const avgHoursDaily = avgWeeklyHours / 6
        const avgMonthlyYards = avgYardageWeekly * 4.33
        const avgMonthlyHours = avgWeeklyHours * 4.33
        const yardsPerLoad = 10
        const avgLoadsWeekly = totals.reportCount > 0 ? totals.totalYards / yardsPerLoad / totals.reportCount : 0
        const avgLoadsDaily = avgLoadsWeekly / 6
        const targetYPH = 3.0
        const yphEfficiency = avgYPH > 0 ? Math.min((avgYPH / targetYPH) * 100, 100) : 0
        const loadsPerOperatorPerDay = mixerOperatorCount > 0 ? avgLoadsDaily / mixerOperatorCount : 0
        const targetLoadsPerOperatorPerDay = 3
        const loadsEfficiency = Math.min((loadsPerOperatorPerDay / targetLoadsPerOperatorPerDay) * 100, 100)
        const baseEfficiency = yphEfficiency * 0.9 + loadsEfficiency * 0.1
        const reportDeduction = (missingCount + incompleteCount) * 10
        const impactfulIncidents = safetyIncidents?.impactfulIncidents || 0
        const totalSafetyIncidents = safetyIncidents?.totalIncidents || 0
        const avgEfficiency = avgYPH > 0 ? Math.min(Math.max(baseEfficiency - reportDeduction, 0), 100) : 0
        const dataIntegrity = totalExpectedReports > 0 ? (totals.reportCount / totalExpectedReports) * 100 : 100
        return {
            avgEfficiency,
            avgHoursDaily,
            avgLoadsDaily,
            avgLoadsWeekly,
            avgMonthlyHours,
            avgMonthlyYards,
            avgWeeklyHours,
            avgYPH,
            avgYardageDaily,
            avgYardageWeekly,
            dataIntegrity,
            helpGiven,
            helpRatio,
            helpReceived,
            impactfulIncidents,
            incompleteReports: incompleteCount,
            loadsEfficiency,
            missingReports: missingCount,
            rawYPH,
            reportCount: totals.reportCount,
            totalHours: totals.totalHours,
            totalSafetyIncidents,
            totalYardage: totals.totalYards
        }
    },
    calculateSafetyIncidents(safetyReports, plantCodesInRegion) {
        const safetyByPlant = {}
        plantCodesInRegion.forEach((plantCode) => {
            safetyByPlant[plantCode] = {
                details: [],
                impactfulIncidents: 0,
                totalIncidents: 0
            }
        })
        safetyReports.forEach((report) => {
            if (!report.data?.issues || !Array.isArray(report.data.issues)) return
            report.data.issues.forEach((issue) => {
                const plantCode = issue.plant
                if (!plantCode || plantCode === 'All' || !safetyByPlant[plantCode]) return
                safetyByPlant[plantCode].totalIncidents++
                if (issue.affectsEfficiency === true) {
                    safetyByPlant[plantCode].impactfulIncidents++
                    safetyByPlant[plantCode].details.push({
                        date: issue.date,
                        description: issue.description,
                        tags: issue.tags || [],
                        week: report.week
                    })
                }
            })
        })
        return safetyByPlant
    },
    getCategoryData(plantMetrics, category) {
        switch (category) {
            case 'efficiency':
                return plantMetrics
                    .filter((p) => typeof p.avgEfficiency === 'number' && p.avgWeeklyHours > 0)
                    .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
            case 'yph':
                return plantMetrics
                    .filter((p) => isFinite(p.avgYPH) && p.avgYPH > 0)
                    .sort((a, b) => b.avgYPH - a.avgYPH)
            case 'production':
                return plantMetrics.filter((p) => p.totalYardage > 0).sort((a, b) => b.totalYardage - a.totalYardage)
            case 'weekly-yardage':
                return plantMetrics
                    .filter((p) => p.avgYardageWeekly > 0)
                    .sort((a, b) => b.avgYardageWeekly - a.avgYardageWeekly)
            case 'daily-yardage':
                return plantMetrics
                    .filter((p) => p.avgYardageDaily > 0)
                    .sort((a, b) => b.avgYardageDaily - a.avgYardageDaily)
            case 'monthly-yardage':
                return plantMetrics
                    .filter((p) => p.avgMonthlyYards > 0)
                    .sort((a, b) => b.avgMonthlyYards - a.avgMonthlyYards)
            case 'weekly-hours':
                return plantMetrics
                    .filter((p) => p.avgWeeklyHours > 0)
                    .sort((a, b) => a.avgWeeklyHours - b.avgWeeklyHours)
            case 'daily-hours':
                return plantMetrics.filter((p) => p.avgHoursDaily > 0).sort((a, b) => a.avgHoursDaily - b.avgHoursDaily)
            case 'monthly-hours':
                return plantMetrics
                    .filter((p) => p.avgMonthlyHours > 0)
                    .sort((a, b) => a.avgMonthlyHours - b.avgMonthlyHours)
            case 'help-given':
                return plantMetrics.filter((p) => p.helpGiven > 0).sort((a, b) => b.helpGiven - a.helpGiven)
            case 'help-received':
                return plantMetrics.filter((p) => p.helpReceived > 0).sort((a, b) => b.helpReceived - a.helpReceived)
            default:
                return []
        }
    },
    getCategoryScore(plant, category) {
        const scoreKeys = {
            'daily-hours': 'avgHoursDaily',
            'daily-yardage': 'avgYardageDaily',
            efficiency: 'avgEfficiency',
            'help-given': 'helpGiven',
            'help-received': 'helpReceived',
            'monthly-hours': 'avgMonthlyHours',
            'monthly-yardage': 'avgMonthlyYards',
            production: 'totalYardage',
            'weekly-hours': 'avgWeeklyHours',
            'weekly-yardage': 'avgYardageWeekly',
            yph: 'avgYPH'
        }
        const key = scoreKeys[category]
        if (!key) return 0
        const val = plant[key]
        return typeof val === 'number' ? Math.round(val * 100) / 100 : 0
    },
    getCategoryTitle(category) {
        switch (category) {
            case 'efficiency':
                return 'Overall Efficiency'
            case 'yph':
                return 'Yards Per Hour'
            case 'production':
                return 'Total Production'
            case 'weekly-yardage':
                return 'Weekly Yardage'
            case 'daily-yardage':
                return 'Daily Yardage'
            case 'monthly-yardage':
                return 'Monthly Yardage'
            case 'weekly-hours':
                return 'Weekly Hours'
            case 'daily-hours':
                return 'Daily Hours'
            case 'monthly-hours':
                return 'Monthly Hours'
            case 'help-given':
                return 'Most Help Given'
            case 'help-received':
                return 'Most Help Received'
            default:
                return 'Leaderboard'
        }
    },
    getEfficiencyColor(efficiency) {
        if (efficiency >= 90) return 'var(--success)'
        if (efficiency >= 80) return 'var(--warning)'
        return 'var(--danger)'
    }
}
export default LeaderboardsUtility
