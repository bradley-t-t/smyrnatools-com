/**
 * Weekly report computation helpers: YPH/yardage metric grading, week date calculations,
 * Monday-anchored ISO normalization, cross-plant hours adjustment, report status resolution,
 * operator exclusion detection, and AI-assisted plant production validation.
 */
const ReportUtility = {
    buildHoursReceivedByWeek(allReports, targetPlantCode) {
        const hoursReceivedByWeek = {}
        const plantCodeStr = String(targetPlantCode || '')

        if (!allReports || !Array.isArray(allReports) || !plantCodeStr) {
            return hoursReceivedByWeek
        }

        allReports.forEach((report) => {
            const weekStr = this.normalizeWeekStr(report.week)
            const helpEntries = report.data?.operators_sent_to_help || []
            if (Array.isArray(helpEntries)) {
                helpEntries.forEach((entry) => {
                    const destPlant = String(entry.destination_plant || '')
                    if (destPlant === plantCodeStr && entry.operators && Array.isArray(entry.operators)) {
                        if (!hoursReceivedByWeek[weekStr]) {
                            hoursReceivedByWeek[weekStr] = 0
                        }
                        entry.operators.forEach((op) => {
                            hoursReceivedByWeek[weekStr] += parseFloat(op.hours) || 0
                        })
                    }
                })
            }
        })

        return hoursReceivedByWeek
    },
    calculateAdjustedYph(reportData, hoursReceived = 0) {
        const yards = parseFloat(
            reportData?.total_yards_delivered || reportData?.yardage || reportData?.['Yardage'] || 0
        )
        const hours = parseFloat(
            reportData?.total_operator_hours || reportData?.total_hours || reportData?.['Total Hours'] || 0
        )

        if (hours <= 0 || yards <= 0) {
            return { adjustedYph: 0, hoursReceived: 0, hoursSent: 0, rawYph: 0 }
        }

        const rawYph = yards / hours
        const hoursSent = this.calculateHoursSent(reportData)
        const adjustedHours = hours - hoursSent + hoursReceived
        const adjustedYph = adjustedHours > 0 ? yards / adjustedHours : rawYph

        return { adjustedYph, hoursReceived, hoursSent, rawYph }
    },
    calculateHoursReceivedForWeek(allReports, targetWeekStr, targetPlantCode) {
        const normalizedTargetWeek = this.normalizeWeekStr(targetWeekStr)
        const hoursReceivedByWeek = this.buildHoursReceivedByWeek(allReports, targetPlantCode)
        return hoursReceivedByWeek[normalizedTargetWeek] || 0
    },
    calculateHoursSent(reportData) {
        let totalHoursSent = 0
        const operatorsSentToHelp = reportData?.operators_sent_to_help || []
        if (Array.isArray(operatorsSentToHelp)) {
            operatorsSentToHelp.forEach((entry) => {
                if (entry.operators && Array.isArray(entry.operators)) {
                    entry.operators.forEach((op) => {
                        totalHoursSent += parseFloat(op.hours) || 0
                    })
                }
            })
        }
        return totalHoursSent
    },
    computeMyReportStatus({ completed, hasSavedData, weekIso, today }) {
        const now = today instanceof Date ? today : new Date()
        const { saturday } = this.getWeekDatesFromIso(weekIso)
        let statusText = ''
        let statusClass = ''
        let buttonLabel = ''
        if (completed) {
            statusText = 'Submitted'
            statusClass = 'success'
            buttonLabel = 'View'
        } else if (hasSavedData) {
            statusText = 'Draft'
            statusClass = 'warning'
            buttonLabel = 'Edit'
        } else if (saturday && saturday >= now) {
            statusText = 'Active'
            statusClass = 'info'
            buttonLabel = 'Submit'
        } else {
            statusText = 'Overdue'
            statusClass = 'error'
            buttonLabel = 'Submit'
        }
        return { buttonLabel, statusClass, statusText }
    },
    formatDate(dateInput, locale) {
        if (!dateInput) return ''
        const d = new Date(dateInput)
        if (isNaN(d.getTime())) return ''
        return d.toLocaleDateString(locale)
    },
    formatDateMMDDYY(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) return ''
        const mm = date.getMonth() + 1
        const dd = date.getDate()
        const yy = date.getFullYear().toString().slice(-2)
        return `${mm}-${dd}-${yy}`
    },
    formatDateTime(dt, locale) {
        if (!dt) return ''
        const date = new Date(dt)
        if (isNaN(date.getTime())) return ''
        return date.toLocaleString(locale)
    },
    formatVerboseDate(dateInput, locale) {
        if (!dateInput) return ''
        let d
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const [y, m, da] = dateInput.split('-').map(Number)
            d = new Date(y, m - 1, da)
        } else {
            d = new Date(dateInput)
        }
        if (isNaN(d.getTime())) return ''
        return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' })
    },
    getExcludedOperators(rows, operatorOptions) {
        const r = Array.isArray(rows) ? rows : []
        const opts = Array.isArray(operatorOptions) ? operatorOptions : []
        return opts.filter((opt) => !r.some((row) => row.name === opt.value)).map((opt) => opt.value)
    },
    getFullYphMetrics(reportData, hoursReceived = 0) {
        const { rawYph, adjustedYph, hoursSent } = this.calculateAdjustedYph(reportData, hoursReceived)
        const rawGradeInfo = this.getYphGradeAndLabel(rawYph)
        const adjustedGradeInfo = this.getYphGradeAndLabel(adjustedYph)

        return {
            adjusted: adjustedYph,
            adjustedGrade: adjustedGradeInfo.grade,
            adjustedLabel: adjustedGradeInfo.label,
            hoursReceived,
            hoursSent,
            raw: rawYph,
            rawGrade: rawGradeInfo.grade,
            rawLabel: rawGradeInfo.label
        }
    },
    getLastNWeekIsos(n, fromDate) {
        const weeks = []
        const base = fromDate instanceof Date ? fromDate : new Date()
        const currentMonday = this.mondayOf(base)
        if (!currentMonday) return weeks
        const ptr = new Date(currentMonday)
        for (let i = 0; i < n; i++) {
            weeks.push(ptr.toISOString().slice(0, 10))
            ptr.setDate(ptr.getDate() - 7)
        }
        return weeks
    },
    getMondayISO(dateInput) {
        const monday = this.mondayOf(dateInput || new Date())
        return monday ? monday.toISOString().slice(0, 10) : ''
    },
    getTodayISODate() {
        return new Date().toISOString().slice(0, 10)
    },
    getTotalWeeksSince(startDate, todayDate) {
        const today = todayDate instanceof Date ? todayDate : new Date()
        const currentMonday = this.mondayOf(today)
        const startMonday = this.mondayOf(startDate)
        if (!currentMonday || !startMonday) return 0
        const diffMs = currentMonday.getTime() - startMonday.getTime()
        const weeks = Math.floor(diffMs / 604800000) + 1
        return Math.max(weeks, 0)
    },
    getTruckNumberForOperator(row, mixers) {
        if (row && row.truck_number) return row.truck_number
        if (!row || !row.name) return ''
        const mixer = (mixers || []).find((m) => m.assigned_operator === row.name)
        if (mixer && mixer.truck_number) return mixer.truck_number
        return ''
    },
    getWeekBadge(weekIso, today = new Date()) {
        const currentMonday = this.mondayOf(today)
        if (!currentMonday) return ''
        const weekMonday = new Date(weekIso)
        if (isNaN(weekMonday.getTime())) return ''
        const diffWeeks = Math.floor((currentMonday - weekMonday) / (7 * 24 * 60 * 60 * 1000))
        if (diffWeeks === 0) return 'This Week'
        if (diffWeeks === 1) return 'Last Week'
        if (diffWeeks > 1) return 'Older'
        return ''
    },

    getWeekDatesFromIso(weekIso) {
        if (!weekIso) return { monday: null, saturday: null }
        const monday = new Date(weekIso)
        monday.setDate(monday.getDate() + 1)
        monday.setHours(0, 0, 0, 0)
        const saturday = new Date(monday)
        saturday.setDate(monday.getDate() + 5)
        saturday.setHours(0, 0, 0, 0)
        return { monday, saturday }
    },

    getWeekVerbose(weekIso, locale) {
        if (!weekIso) return ''
        const { monday, saturday } = this.getWeekDatesFromIso(weekIso)
        if (!monday || !saturday) return ''
        const left = monday.toLocaleDateString(locale, { day: 'numeric', month: 'short', weekday: 'short' })
        const right = saturday.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            weekday: 'short',
            year: 'numeric'
        })
        return `${left}  – ${right}`
    },

    getYphGradeAndLabel(yph) {
        let grade = 'poor'
        let label = 'Poor'

        if (yph >= 6) {
            grade = 'excellent'
            label = 'Excellent'
        } else if (yph >= 4) {
            grade = 'good'
            label = 'Good'
        } else if (yph >= 3) {
            grade = 'average'
            label = 'Average'
        }

        return { grade, label }
    },

    mondayOf(dateInput) {
        const d = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput)
        if (isNaN(d.getTime())) return null
        const day = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((day + 6) % 7))
        monday.setHours(0, 0, 0, 0)
        return monday
    },

    normalizeWeekStr(weekStr) {
        if (!weekStr) return ''
        const datePart = weekStr.split('T')[0]
        const [y, m, d] = datePart.split('-').map(Number)
        if (!y || !m || !d) return datePart
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    },

    parseTimeToMinutes(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null
        const parts = timeStr.split(':').map(Number)
        if (parts.length < 2) return null
        const [h, m] = parts
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null
        return h * 60 + m
    },

    async validatePlantProduction(form, operatorOptions) {
        if (!form || typeof form !== 'object') return 'Invalid form'
        if (!form.plant) return 'Please select a plant before submitting.'
        if (!form.report_date) return 'Please select a report date before submitting.'
        const rows = Array.isArray(form.rows) ? form.rows : []
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i]
            const label = Array.isArray(operatorOptions)
                ? operatorOptions.find((o) => o.value === r.name)?.label || `Operator ${i + 1}`
                : `Operator ${i + 1}`
            const start = this.parseTimeToMinutes(r.start_time)
            const first = this.parseTimeToMinutes(r.first_load)
            const eod = this.parseTimeToMinutes(r.eod_in_yard)
            const punch = this.parseTimeToMinutes(r.punch_out)
            if (!r.start_time || start === null) return `${label}: Start Time is required and must be a valid time.`
            if (!r.first_load || first === null) return `${label}: 1st Load time is required and must be a valid time.`
            if (!r.eod_in_yard || eod === null)
                return `${label}: EOD In Yard time is required and must be a valid time.`
            if (!r.punch_out || punch === null) return `${label}: Punch Out time is required and must be a valid time.`
            if (first - start < 0) return `${label}: 1st Load time must be after Start Time.`
            if (punch - eod < 0) return `${label}: Punch Out time must be after EOD In Yard.`
            if (start !== null && punch !== null && punch - start <= 0)
                return `${label}: Total hours must be greater than 0.`
            const loadsVal = r.loads
            if (loadsVal === undefined || loadsVal === null || String(loadsVal) === '')
                return `${label}: Total Loads is required.`
            const loadsNum = Number(loadsVal)
            if (!Number.isFinite(loadsNum) || loadsNum < 0 || !Number.isInteger(loadsNum))
                return `${label}: Total Loads must be a non-negative whole number.`
            const dStart = start !== null && first !== null ? first - start : null
            const dEnd = eod !== null && punch !== null ? punch - eod : null
            const hours = start !== null && punch !== null ? (punch - start) / 60 : null
            const startDelayed = dStart !== null && dStart > 15
            const endDelayed = dEnd !== null && dEnd > 20
            const lowLoads = loadsNum < 3
            const excessiveHours = hours !== null && hours > 14
            const hasIssues = startDelayed || endDelayed || lowLoads || excessiveHours

            if (hasIssues && (!r.comments || String(r.comments).trim() === '')) {
                return `${label}: Comments are required when there are performance issues (e.g., delayed start/load, low loads, or excessive hours).`
            }

            if (hasIssues && r.comments && String(r.comments).trim()) {
                const { AIService } = await import('../services/AIService')
                const issues = {
                    endDelayed,
                    endMinutes: dEnd,
                    excessiveHours,
                    hours,
                    loads: loadsNum,
                    lowLoads,
                    startDelayed,
                    startMinutes: dStart
                }

                const validation = await AIService.validateEfficiencyComment(r.comments, issues)

                if (validation.error) {
                    return `${label}: Unable to validate comment. Please ensure your explanation is detailed and specific.`
                }

                if (!validation.valid) {
                    const guidance = validation.guidance || 'Provide a specific reason for the timing issues.'
                    const issuesList = []
                    if (startDelayed) issuesList.push(`Punch-in to 1st load: ${dStart} min (max 15)`)
                    if (endDelayed) issuesList.push(`Washout to punch-out: ${dEnd} min (max 20)`)
                    if (lowLoads) issuesList.push(`Loads: ${loadsNum} (min 3)`)
                    if (excessiveHours) issuesList.push(`Hours: ${hours.toFixed(1)} (max 14)`)
                    return `${label}: Comment needs improvement.\n\n${guidance}\n\nYour comment: ${r.comments}\n\nIssues: ${issuesList.join(' | ')}`
                }
            }
        }
        return ''
    }
}

export default ReportUtility
export { ReportUtility }
