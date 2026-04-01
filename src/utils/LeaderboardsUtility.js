const RETIRED_STATUS = 'Retired'
const ACTIVE_STATUS = 'Active'
const UNASSIGNED_OPERATOR = '0'
const WORK_DAYS_PER_WEEK = 6
const WEEKS_PER_MONTH = 4.33
const YARDS_PER_LOAD = 10
const TARGET_YPH = 3.0
const TARGET_LOADS_PER_OPERATOR_PER_DAY = 3
const YPH_EFFICIENCY_WEIGHT = 0.9
const LOADS_EFFICIENCY_WEIGHT = 0.1
const MISSING_REPORT_PENALTY = 10
const EFFICIENCY_COLOR_GREEN = '#22c55e'
const EFFICIENCY_COLOR_AMBER = '#f59e0b'
const EFFICIENCY_COLOR_RED = '#ef4444'
const HIGH_EFFICIENCY_THRESHOLD = 90
const MEDIUM_EFFICIENCY_THRESHOLD = 80

/**
 * Category configuration: maps each category ID to its metric key
 * and sort direction (descending by default, ascending for hours where lower is better).
 */
const CATEGORY_CONFIG = {
    'daily-hours': { key: 'avgHoursDaily', sortAscending: true },
    'daily-yardage': { key: 'avgYardageDaily' },
    efficiency: { filter: (p) => typeof p.avgEfficiency === 'number' && p.avgWeeklyHours > 0, key: 'avgEfficiency' },
    'help-given': { key: 'helpGiven' },
    'help-received': { key: 'helpReceived' },
    'monthly-hours': { key: 'avgMonthlyHours', sortAscending: true },
    'monthly-yardage': { key: 'avgMonthlyYards' },
    production: { key: 'totalYardage' },
    'weekly-hours': { key: 'avgWeeklyHours', sortAscending: true },
    'weekly-yardage': { key: 'avgYardageWeekly' },
    yph: { filter: (p) => isFinite(p.avgYPH) && p.avgYPH > 0, key: 'avgYPH' }
}

/** Counts active (non-retired) assets assigned to a plant, normalizing camelCase/snake_case field names. */
function countActiveAssetsForPlant(assets, plantCode) {
    return assets.filter((asset) => {
        const plant = asset.assignedPlant || asset.assigned_plant
        return plant === plantCode && asset.status !== RETIRED_STATUS
    })
}

/** Returns the set of operator IDs assigned to the given assets. */
function extractAssignedOperatorIds(assets) {
    return new Set(
        assets
            .filter((asset) => asset.assignedOperator && asset.assignedOperator !== UNASSIGNED_OPERATOR)
            .map((asset) => asset.assignedOperator)
    )
}

/** Counts operators at a plant whose IDs appear in the given set. */
function countMatchingOperators(operatorsData, plantCode, operatorIdSet) {
    return operatorsData.filter((operator) => {
        const plant = operator.plantCode || operator.plant_code
        const operatorId = operator.employeeId || operator.employee_id
        return plant === plantCode && operator.status === ACTIVE_STATUS && operatorIdSet.has(operatorId)
    }).length
}

/** Computes the average cleanliness rating across active mixers that have a valid rating. */
function computeAverageCleanliness(activeMixers) {
    const mixersWithRating = activeMixers.filter((mixer) => {
        const rating = mixer.cleanlinessRating || mixer.cleanliness_rating
        return rating != null && rating > 0
    })
    if (mixersWithRating.length === 0) return 0
    const totalRating = mixersWithRating.reduce((sum, mixer) => {
        const rating = mixer.cleanlinessRating || mixer.cleanliness_rating
        return sum + (parseFloat(rating) || 0)
    }, 0)
    return totalRating / mixersWithRating.length
}

/** Formats a Date as 'YYYY-MM-DD'. */
function toDateString(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/** Selects the best report per week: prefers completed, then most recently submitted/updated. */
function deduplicateReportsByWeek(reportsList, currentWeekStart) {
    const reportsByWeek = new Map()
    const allWeekDates = []

    reportsList.forEach((report) => {
        const weekStr = report.week.split('T')[0]
        const weekDate = new Date(weekStr + 'T12:00:00')
        if (weekDate >= currentWeekStart) return

        if (!reportsByWeek.has(weekStr)) {
            reportsByWeek.set(weekStr, report)
            allWeekDates.push(weekStr)
            return
        }

        const existing = reportsByWeek.get(weekStr)
        if (report.completed && !existing.completed) {
            reportsByWeek.set(weekStr, report)
        } else if (report.completed === existing.completed) {
            const existingTimestamp = new Date(existing.submitted_at || existing.updated_at || 0)
            const reportTimestamp = new Date(report.submitted_at || report.updated_at || 0)
            if (reportTimestamp > existingTimestamp) {
                reportsByWeek.set(weekStr, report)
            }
        }
    })

    allWeekDates.sort()
    return { allWeekDates, reportsByWeek }
}

/** Builds the complete weekly timeline from firstDate through the week before currentWeekStart. */
function buildWeeklyTimeline(reportsByWeek, firstDate, currentWeekStart) {
    const allWeeks = []
    let cursor = new Date(firstDate + 'T12:00:00')

    while (cursor < currentWeekStart) {
        const weekStr = toDateString(cursor)
        const report = reportsByWeek.get(weekStr)

        if (report) {
            allWeeks.push({
                hours: parseFloat(report.data?.total_hours || 0),
                isMissing: false,
                isNotSubmitted: !report.completed,
                yardage: parseFloat(report.data?.yardage || 0)
            })
        } else {
            allWeeks.push({ hours: 0, isMissing: true, isNotSubmitted: false, yardage: 0 })
        }

        cursor.setDate(cursor.getDate() + 7)
    }

    return allWeeks
}

/** Computes net hour adjustments and help ratio from cross-plant operator sharing. */
function computeHoursAdjustmentMetrics(hoursAdjustments, rawTotalHours) {
    if (!hoursAdjustments) {
        return { adjustedTotalHours: rawTotalHours, helpGiven: 0, helpRatio: 0, helpReceived: 0 }
    }

    const netAdjustment = hoursAdjustments.hoursAdded - hoursAdjustments.hoursSubtracted
    const helpGiven = hoursAdjustments.hoursSubtracted || 0
    const helpReceived = hoursAdjustments.hoursAdded || 0
    let helpRatio = 0
    if (helpReceived > 0) {
        helpRatio = helpGiven / helpReceived
    } else if (helpGiven > 0) {
        helpRatio = helpGiven
    }

    return { adjustedTotalHours: rawTotalHours + netAdjustment, helpGiven, helpRatio, helpReceived }
}

/**
 * Leaderboard computation engine: calculates per-plant fleet counts, cross-plant hours adjustments,
 * efficiency/YPH/production metrics from weekly reports, safety incident aggregation,
 * and category-based sorting for plant rankings.
 */
const LeaderboardsUtility = {
    calculateFleetCounts(plantCodesInRegion, mixersData, tractorsData, trailersData, equipmentData, operatorsData) {
        const fleetCountsByPlant = {}

        plantCodesInRegion.forEach((plantCode) => {
            const plantMixers = countActiveAssetsForPlant(mixersData, plantCode)
            const plantTractors = countActiveAssetsForPlant(tractorsData, plantCode)
            const trailerCount = countActiveAssetsForPlant(trailersData, plantCode).length
            const equipmentCount = countActiveAssetsForPlant(equipmentData, plantCode).length

            const mixerOperatorIds = extractAssignedOperatorIds(plantMixers)
            const tractorOperatorIds = extractAssignedOperatorIds(plantTractors)

            const totalOperators = operatorsData.filter((operator) => {
                const plant = operator.plantCode || operator.plant_code
                return plant === plantCode && operator.status === ACTIVE_STATUS
            }).length

            const activeMixers = plantMixers.filter((mixer) => mixer.status === ACTIVE_STATUS)
            const avgMixerCleanliness = computeAverageCleanliness(activeMixers)

            fleetCountsByPlant[plantCode] = {
                avgFleetCleanliness: avgMixerCleanliness,
                avgFleetCleanlinessForEfficiency: Math.floor(avgMixerCleanliness),
                equipment: equipmentCount,
                mixerOperators: countMatchingOperators(operatorsData, plantCode, mixerOperatorIds),
                mixers: plantMixers.length,
                operators: totalOperators,
                totalAssets: plantMixers.length + plantTractors.length + trailerCount + equipmentCount,
                tractorOperators: countMatchingOperators(operatorsData, plantCode, tractorOperatorIds),
                tractors: plantTractors.length,
                trailers: trailerCount
            }
        })

        return fleetCountsByPlant
    },

    calculateHoursAdjustments(reports, profilesData, plantCodesInRegion) {
        const hoursAdjustmentsByPlant = {}
        plantCodesInRegion.forEach((plantCode) => {
            hoursAdjustmentsByPlant[plantCode] = { details: [], hoursAdded: 0, hoursSubtracted: 0 }
        })

        reports.forEach((report) => {
            if (!report.data?.operators_sent_to_help) return
            const sendingPlantProfile = profilesData.find((profile) => profile.id === report.user_id)
            if (!sendingPlantProfile) return

            const sendingPlantCode = sendingPlantProfile.plant_code

            report.data.operators_sent_to_help.forEach((entry) => {
                const { destination_plant, operators } = entry
                if (!operators?.length) return

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
        if (reportsList.length === 0) return null

        const { allWeekDates, reportsByWeek } = deduplicateReportsByWeek(reportsList, currentWeekStart)
        if (allWeekDates.length === 0) return null

        const allWeeks = buildWeeklyTimeline(reportsByWeek, allWeekDates[0], currentWeekStart)
        const submittedWeeks = allWeeks.filter((week) => !week.isMissing && !week.isNotSubmitted)
        if (submittedWeeks.length === 0) return null

        const missingCount = allWeeks.filter((week) => week.isMissing).length
        const incompleteCount = allWeeks.filter((week) => week.isNotSubmitted).length

        const totals = submittedWeeks.reduce(
            (acc, week) => ({
                reportCount: acc.reportCount + 1,
                totalHours: acc.totalHours + week.hours,
                totalYards: acc.totalYards + week.yardage
            }),
            { reportCount: 0, totalHours: 0, totalYards: 0 }
        )

        const { adjustedTotalHours, helpGiven, helpRatio, helpReceived } = computeHoursAdjustmentMetrics(
            hoursAdjustments,
            totals.totalHours
        )

        const weeksWithHours = submittedWeeks.filter((week) => week.hours > 0)
        const yardsFromWeeksWithHours = weeksWithHours.reduce((sum, week) => sum + week.yardage, 0)
        const rawHoursTotal = weeksWithHours.reduce((sum, week) => sum + week.hours, 0)
        const adjustedHoursForYph = hoursAdjustments
            ? rawHoursTotal + (hoursAdjustments.hoursAdded - hoursAdjustments.hoursSubtracted)
            : rawHoursTotal

        const rawYPH = rawHoursTotal > 0 ? yardsFromWeeksWithHours / rawHoursTotal : 0
        const avgYPH = adjustedHoursForYph > 0 ? yardsFromWeeksWithHours / adjustedHoursForYph : 0
        const avgYardageWeekly = totals.reportCount > 0 ? totals.totalYards / totals.reportCount : 0
        const avgWeeklyHours = totals.reportCount > 0 ? adjustedTotalHours / totals.reportCount : 0
        const avgLoadsWeekly = totals.reportCount > 0 ? totals.totalYards / YARDS_PER_LOAD / totals.reportCount : 0
        const avgLoadsDaily = avgLoadsWeekly / WORK_DAYS_PER_WEEK

        const yphEfficiency = avgYPH > 0 ? Math.min((avgYPH / TARGET_YPH) * 100, 100) : 0
        const loadsPerOperatorPerDay = mixerOperatorCount > 0 ? avgLoadsDaily / mixerOperatorCount : 0
        const loadsEfficiency = Math.min((loadsPerOperatorPerDay / TARGET_LOADS_PER_OPERATOR_PER_DAY) * 100, 100)
        const baseEfficiency = yphEfficiency * YPH_EFFICIENCY_WEIGHT + loadsEfficiency * LOADS_EFFICIENCY_WEIGHT
        const reportDeduction = (missingCount + incompleteCount) * MISSING_REPORT_PENALTY
        const avgEfficiency = avgYPH > 0 ? Math.min(Math.max(baseEfficiency - reportDeduction, 0), 100) : 0
        const dataIntegrity = allWeeks.length > 0 ? (totals.reportCount / allWeeks.length) * 100 : 100

        return {
            avgEfficiency,
            avgHoursDaily: avgWeeklyHours / WORK_DAYS_PER_WEEK,
            avgLoadsDaily,
            avgLoadsWeekly,
            avgMonthlyHours: avgWeeklyHours * WEEKS_PER_MONTH,
            avgMonthlyYards: avgYardageWeekly * WEEKS_PER_MONTH,
            avgWeeklyHours,
            avgYPH,
            avgYardageDaily: avgYardageWeekly / WORK_DAYS_PER_WEEK,
            avgYardageWeekly,
            dataIntegrity,
            helpGiven,
            helpRatio,
            helpReceived,
            impactfulIncidents: safetyIncidents?.impactfulIncidents || 0,
            incompleteReports: incompleteCount,
            loadsEfficiency,
            missingReports: missingCount,
            rawYPH,
            reportCount: totals.reportCount,
            totalHours: totals.totalHours,
            totalSafetyIncidents: safetyIncidents?.totalIncidents || 0,
            totalYardage: totals.totalYards
        }
    },

    calculateSafetyIncidents(safetyReports, plantCodesInRegion) {
        const safetyByPlant = {}
        plantCodesInRegion.forEach((plantCode) => {
            safetyByPlant[plantCode] = { details: [], impactfulIncidents: 0, totalIncidents: 0 }
        })

        safetyReports.forEach((report) => {
            if (!Array.isArray(report.data?.issues)) return

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
        const config = CATEGORY_CONFIG[category]
        if (!config) return []

        const defaultFilter = (plant) => plant[config.key] > 0
        const filtered = plantMetrics.filter(config.filter || defaultFilter)
        const direction = config.sortAscending ? 1 : -1
        return filtered.sort((a, b) => direction * (a[config.key] - b[config.key]))
    },

    getCategoryScore(plant, category) {
        const config = CATEGORY_CONFIG[category]
        if (!config) return 0
        const value = plant[config.key]
        return typeof value === 'number' ? Math.round(value * 100) / 100 : 0
    },

    getEfficiencyColor(efficiency) {
        if (efficiency >= HIGH_EFFICIENCY_THRESHOLD) return EFFICIENCY_COLOR_GREEN
        if (efficiency >= MEDIUM_EFFICIENCY_THRESHOLD) return EFFICIENCY_COLOR_AMBER
        return EFFICIENCY_COLOR_RED
    }
}

export default LeaderboardsUtility
