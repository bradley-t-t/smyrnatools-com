import { getRoleContext, getToneModifier, PLANT_SUMMARY_BASE, PROMPTS } from '../app/ai'

const GROK_API_KEY = process.env.REACT_APP_GROK_API_KEY
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'

const DEFAULT_MODEL = 'grok-4'
const FAST_MODEL = 'grok-3-mini-fast'
const MAX_SUGGESTIONS = 5
const MAX_RECENT_CHANGES = 10
const EXCLUDED_AGGREGATE_KEYS = ['report_date', 'notes']

const CLEANLINESS_THRESHOLDS = [
    { min: 4.5, points: '+10', label: 'Excellent - top tier', impact: 'boosting' },
    { min: 4, points: '+5', label: 'Good - above average', impact: 'boosting' },
    { min: 3, points: '-5', label: 'Average - hurting rankings', impact: 'hurting' },
    { min: 0, points: '-10', label: 'Poor - significantly hurting rankings', impact: 'significantly hurting' }
]

const buildHeaders = () => ({
    Authorization: `Bearer ${GROK_API_KEY}`,
    'Content-Type': 'application/json'
})

const buildRequestBody = (systemPrompt, messages, { model = DEFAULT_MODEL, temperature = 0.3 }) => ({
    messages: [{ content: systemPrompt, role: 'system' }, ...messages],
    model,
    stream: false,
    temperature
})

const getCleanlinessImpact = (score) => {
    if (score <= 0) return null
    return CLEANLINESS_THRESHOLDS.find((t) => score >= t.min) ?? null
}

const formatFleetStatLine = (label, stats) => {
    if (!stats) return []
    const lines = [`\n${label}: ${stats.total} total`]
    lines.push(`  Active: ${stats.active} | Spare: ${stats.spare} | In Shop: ${stats.inShop}`)
    if (stats.total > 0) {
        lines.push(`  Utilization: ${Math.round((stats.active / stats.total) * 100)}%`)
    }
    return lines
}

const formatFleetStatSummary = (label, stats) =>
    stats
        ? `${label}: ${stats.total} total, ${stats.active} active${stats.inShop !== undefined ? `, ${stats.inShop} in shop` : ''}${stats.spare !== undefined ? `, ${stats.spare} spare` : ''}`
        : null

const findByTruckNumber = (list, truckNum) =>
    list?.find((item) => String(item.truckNumber) === truckNum || String(item.truckNumber).includes(truckNum))

const filterByTruckNumber = (list, truckNum) =>
    list?.filter((item) => String(item.truckNumber) === truckNum || String(item.truckNumber).includes(truckNum)) ?? []

class AIInsightsServiceClass {
    async fetchFromAPI(systemPrompt, messages, options = {}) {
        if (!GROK_API_KEY) return null

        try {
            const response = await fetch(GROK_API_URL, {
                body: JSON.stringify(buildRequestBody(systemPrompt, messages, options)),
                headers: buildHeaders(),
                method: 'POST'
            })

            if (response.status === 429) return { error: 'rate_limited' }
            if (!response.ok) {
                const errorText = await response.text()
                console.error('API Error:', response.status, errorText)
                return { error: 'api_error', status: response.status }
            }

            const data = await response.json()
            return { content: data.choices?.[0]?.message?.content ?? null }
        } catch (error) {
            console.error('AI API Error:', error)
            return { error: 'network_error' }
        }
    }

    async callAPI(systemPrompt, userPrompt, options = {}) {
        return this.fetchFromAPI(systemPrompt, [{ content: userPrompt, role: 'user' }], options)
    }

    async callAPIWithMessages(systemPrompt, messages, options = {}) {
        const result = await this.fetchFromAPI(systemPrompt, messages, options)
        if (!result) return 'Error connecting to AI service.'
        if (result.error === 'rate_limited') return 'Rate limited. Please wait a moment and try again.'
        if (result.error) return 'Error connecting to AI service.'
        return result.content ?? 'Could not process that question.'
    }

    async generateContentFromPrompt(promptKey, dataFormatter, context, options = {}) {
        const userPrompt = dataFormatter.call(this, context)
        const result = await this.callAPI(PROMPTS[promptKey], userPrompt, {
            model: FAST_MODEL,
            temperature: 0.5,
            ...options
        })
        return result?.content ?? null
    }

    async generateDashboardInsights(dashboardData) {
        const userPrompt = this.formatDashboardData(dashboardData)
        const result = await this.callAPI(PROMPTS.dashboardInsights, userPrompt)

        if (result?.error) {
            throw new Error(
                result.error === 'api_error' && result.status
                    ? `API Error: ${result.status}`
                    : 'Failed to generate insights'
            )
        }

        return result?.content ?? 'Unable to generate insights at this time.'
    }

    async askFollowUp(question, conversationHistory, contextData) {
        const formattedContext = this.selectRelevantContext(question, contextData)
        const messages = [
            { content: formattedContext, role: 'user' },
            ...conversationHistory.map(({ content, role }) => ({ content, role }))
        ]
        return this.callAPIWithMessages(PROMPTS.followUp, messages)
    }

    async generatePlantSummary(plantData) {
        const { roleName, isViewingOwnPlant, assignedPlant } = plantData.userContext ?? {}
        const systemPrompt = `${getRoleContext(roleName, isViewingOwnPlant, assignedPlant)}${getToneModifier(plantData.plantCode)}\n\n${PLANT_SUMMARY_BASE}`
        const result = await this.callAPI(systemPrompt, this.formatPlantSummaryData(plantData), {
            model: FAST_MODEL,
            temperature: 0.5
        })
        return result?.content ?? null
    }

    async generateHistorySummary(historyContext) {
        return this.generateContentFromPrompt('historySummary', this.formatHistoryData, historyContext)
    }

    async generateGMReportAnalysis(reportContext) {
        return this.generateContentFromPrompt('gmReportAnalysis', this.formatGMReportData, reportContext)
    }

    async generateGMReportExportSummary(reportContext) {
        return this.generateContentFromPrompt('gmReportExportSummary', this.formatGMExportData, reportContext, {
            temperature: 0.4
        })
    }

    async improveListItem(description, comments = '') {
        const userPrompt = comments
            ? `Description: "${description}"\nComments: "${comments}"`
            : `Description: "${description}"\nComments: (none - please add a brief relevant comment)`

        const result = await this.callAPI(PROMPTS.improveListItem, userPrompt, { model: FAST_MODEL })
        if (!result?.content) return null

        try {
            const parsed = JSON.parse(result.content.trim())
            return { comments: parsed.comments || '', description: parsed.description || description }
        } catch {
            return { comments: '', description: result.content }
        }
    }

    async suggestListItems(partialDescription = '') {
        if (!partialDescription?.trim()) return []

        const result = await this.callAPI(PROMPTS.suggestListItems, `Complete this task: "${partialDescription}"`, {
            model: FAST_MODEL,
            temperature: 0.6
        })

        if (!result?.content) return []
        return result.content
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, MAX_SUGGESTIONS)
    }

    async validateEfficiencyComment(comment, issues) {
        const issueLines = [
            issues.startDelayed && `Punch in to 1st load: ${issues.startMinutes} minutes (expected: <=15)`,
            issues.endDelayed && `Washout to punch out: ${issues.endMinutes} minutes (expected: <=20)`,
            issues.lowLoads && `Total loads: ${issues.loads} (expected: >=3)`,
            issues.excessiveHours && `Total hours: ${issues.hours.toFixed(1)} (expected: <=14)`
        ].filter(Boolean)

        const userPrompt = `Performance Issues:\n${issueLines.join('\n')}\n\nOperator Comment: "${comment}"\n\nIs this a valid explanation?`
        const result = await this.callAPI(PROMPTS.validateEfficiencyComment, userPrompt, { temperature: 0.1 })

        if (result?.error) return { error: true }

        const response = result?.content?.trim() ?? ''
        if (response.startsWith('VALID')) return { valid: true }

        const invalidMatch = response.match(/^INVALID:\s*(.+)$/i)
        return invalidMatch
            ? { guidance: invalidMatch[1].trim(), valid: false }
            : { guidance: 'Please provide a detailed explanation for the timing issues.', valid: false }
    }

    async validatePlantManagerMetrics(form) {
        const yardage = Number(form.yardage) || 0
        const hours = Number(form.total_hours) || 0
        const lostYardage = Number(form.total_yards_lost) || 0
        const resoldYardage = Number(form.yards_resold) || 0

        if (yardage === 0 || hours === 0) return { needsReview: false }

        const yph = yardage / hours
        const netYardage = yardage - lostYardage + resoldYardage
        const lostPct = yardage > 0 ? ((lostYardage / yardage) * 100).toFixed(1) : 0

        const userPrompt = [
            'Plant Manager Report Metrics:',
            `- Total Yardage: ${yardage} yards`,
            `- Total Hours: ${hours} hours`,
            `- Yards Per Hour: ${yph.toFixed(2)}`,
            `- Lost Yardage: ${lostYardage} yards (${lostPct}% of total)`,
            `- Resold Yardage: ${resoldYardage} yards`,
            `- Net Yardage: ${netYardage} yards`,
            '',
            'Does this data make sense or should the plant manager double-check their entries?'
        ].join('\n')

        const result = await this.callAPI(PROMPTS.validatePlantManagerMetrics, userPrompt, { temperature: 0.2 })
        if (result?.error) return { error: true }

        try {
            return JSON.parse(result?.content?.trim() || '{"needsReview": false}')
        } catch {
            return { needsReview: false }
        }
    }

    selectRelevantContext(question, ctx) {
        const q = question.toLowerCase()
        const parts = [
            `Region: ${ctx.regionName || 'Unknown'}, Date: ${ctx.currentDate || new Date().toISOString().slice(0, 10)}`
        ]

        this.appendTruckContext(q, ctx, parts)
        this.appendOperatorContext(q, ctx, parts)
        this.appendFleetContext(q, ctx, parts)
        this.appendPlantOperatorContext(q, ctx, parts)
        this.appendShopContext(q, ctx, parts)
        this.appendReportContext(q, ctx, parts)

        return parts.join('\n')
    }

    appendTruckContext(q, ctx, parts) {
        const truckMatch = q.match(/\b\d{3,5}\b/)
        if (!truckMatch) return

        const truckNum = truckMatch[0]
        const mixer = findByTruckNumber(ctx.allMixersList, truckNum)
        if (mixer) {
            parts.push(
                `Mixer ${mixer.truckNumber}: ${mixer.status} at Plant ${mixer.plant}, Operator: ${mixer.operatorName || 'Unassigned'}, VIN: ${mixer.vin || 'N/A'}, Make: ${mixer.make || 'N/A'}, Model: ${mixer.model || 'N/A'}, Year: ${mixer.year || 'N/A'}, Last Service: ${mixer.lastServiceDate?.slice(0, 10) || 'N/A'}`
            )
        }

        const tractor = findByTruckNumber(ctx.allTractorsList, truckNum)
        if (tractor) {
            parts.push(
                `Tractor ${tractor.truckNumber}: ${tractor.status} at Plant ${tractor.plant}, Operator: ${tractor.operatorName || 'Unassigned'}, Type: ${tractor.type || 'N/A'}`
            )
        }

        const history = filterByTruckNumber(ctx.operatorAssignmentHistory, truckNum)
        const operators = [
            ...new Set(history.map((h) => h.newOperator).filter((o) => o && o !== 'None' && o !== 'Unknown Operator'))
        ]
        if (operators.length > 0) parts.push(`Operators who have driven ${truckNum}: ${operators.join(', ')}`)
    }

    appendOperatorContext(q, ctx, parts) {
        const op = ctx.allOperatorsList?.find((o) => q.includes(o.name?.toLowerCase()))
        if (!op) return

        parts.push(`Operator ${op.name}: ${op.status} at Plant ${op.plant}, Position: ${op.position || 'Operator'}`)

        const assignedMixer = ctx.allMixersList?.find((m) => m.operatorName === op.name)
        if (assignedMixer)
            parts.push(
                `${op.name} is currently driving Mixer ${assignedMixer.truckNumber} at Plant ${assignedMixer.plant}`
            )

        const assignedTractor = ctx.allTractorsList?.find((t) => t.operatorName === op.name)
        if (assignedTractor)
            parts.push(
                `${op.name} is currently driving Tractor ${assignedTractor.truckNumber} at Plant ${assignedTractor.plant}`
            )
    }

    appendFleetContext(q, ctx, parts) {
        if (!q.includes('fleet') && !q.includes('status') && !q.includes('how many') && !q.includes('total')) return

        const summaries = [
            formatFleetStatSummary('Mixers', ctx.mixerStats),
            formatFleetStatSummary('Tractors', ctx.tractorStats),
            formatFleetStatSummary('Trailers', ctx.trailerStats),
            ctx.operatorStats && `Operators: ${ctx.operatorStats.total} total, ${ctx.operatorStats.active} active`
        ].filter(Boolean)

        parts.push(...summaries)
    }

    appendPlantOperatorContext(q, ctx, parts) {
        if (!q.includes('operator')) return
        const plantMatch = q.match(/\b(40[1-8]|410|45[35]|46[18]|455)\b/)
        if (!plantMatch) return

        const plantCode = plantMatch[0]
        const ops = ctx.allOperatorsList?.filter((o) => String(o.plant) === plantCode) ?? []
        if (ops.length > 0) parts.push(`Operators at Plant ${plantCode}: ${ops.map((o) => o.name).join(', ')}`)
    }

    appendShopContext(q, ctx, parts) {
        if (!q.includes('shop') || !ctx.mixersInShop?.length) return
        parts.push(`Mixers in shop: ${ctx.mixersInShop.map((m) => `${m.truckNumber} (${m.plant})`).join(', ')}`)
    }

    appendReportContext(q, ctx, parts) {
        if (!q.includes('yard') && !q.includes('report') && !q.includes('production')) return

        const plantMatch = q.match(/\b(40[1-8]|410|45[35]|46[18]|455)\b/)
        if (plantMatch) {
            const reports = ctx.plantManagerReports?.filter((r) => String(r.plant) === plantMatch[0]).slice(0, 5) ?? []
            reports.forEach((r) =>
                parts.push(`Week ${r.week} Plant ${r.plant}: ${r.yardage} yards, ${r.totalHours} hours`)
            )
            return
        }

        const latestWeek = ctx.plantManagerReports?.[0]?.week
        if (!latestWeek) return

        const weekReports = ctx.plantManagerReports.filter((r) => r.week === latestWeek)
        const totalYards = weekReports.reduce((sum, r) => sum + (r.yardage || 0), 0)
        parts.push(`Week ${latestWeek}: ${totalYards} total yards across ${weekReports.length} plants`)
    }

    formatDashboardData(data) {
        const parts = [`Analysis Date: ${new Date().toLocaleDateString()}`]

        if (data.regionName) parts.push(`Region: ${data.regionName}`)
        if (data.selectedPlant) parts.push(`Viewing Plant: ${data.selectedPlant}`)

        parts.push('\n=== FLEET STATUS ===')
        parts.push(...formatFleetStatLine('MIXERS', data.mixerStats))
        parts.push(...formatFleetStatLine('TRACTORS', data.tractorStats))
        parts.push(...formatFleetStatLine('TRAILERS', data.trailerStats))
        parts.push(...formatFleetStatLine('EQUIPMENT', data.equipmentStats))

        parts.push('\n=== OPERATORS ===')
        if (data.operatorStats) {
            const os = data.operatorStats
            parts.push(
                `Total Operators: ${os.total}`,
                `Active: ${os.active}`,
                `  - Mixer Operators (assigned to mixers): ${os.mixerOperators || 0}`,
                `  - Tractor Operators (assigned to tractors): ${os.tractorOperators || 0}`,
                `  - Unassigned Active: ${os.unassigned || 0}`,
                `Training: ${os.training || 0}`,
                `Pending Start: ${os.pendingStart || 0}`,
                `Light Duty: ${os.lightDuty || 0}`
            )
        }

        parts.push('\n=== MAINTENANCE ===')
        parts.push(`Service Overdue: ${data.overdueCount || 0} assets`)
        parts.push(`Open Issues: ${data.openIssuesCount || 0}`)

        this.appendHistoricalTrends(data, parts)
        this.appendRecentReports(data, parts)

        parts.push(
            '\nAnalyze this data and provide 3-5 specific issues or concerns. Focus on problems, not positives. Consider production trends, yardage, hours, efficiency, and staffing levels.'
        )
        return parts.join('\n')
    }

    appendHistoricalTrends(data, parts) {
        if (!data.statusHistory) return

        parts.push(`\n=== HISTORICAL TRENDS (${data.historyDateRange || 'all time'}) ===`)

        const appendDistribution = (label, items) => {
            if (!items?.length) return
            parts.push(`${label} Time Distribution:`)
            items.slice(0, 3).forEach((s) => parts.push(`  ${s.status}: ${s.percentage}%`))
        }

        appendDistribution('Mixer', data.statusHistory.mixers)
        appendDistribution('Tractor', data.statusHistory.tractors)
    }

    appendRecentReports(data, parts) {
        if (!data.recentReports) return

        parts.push('\n=== RECENT REPORTS (Last 4 Weeks) ===')
        parts.push(`Total Completed Reports: ${data.recentReports.totalReportsLast4Weeks || 0}`)

        const reportFormatters = [
            {
                key: 'plantManagerReports',
                label: 'PLANT MANAGER REPORTS',
                format: (r) =>
                    `  Week ${r.week} - Plant ${r.plant}: ${r.yardage || 0} yards, ${r.hours || 0} hours, ${r.operatorCount || 0} operators, ${r.loadsLost || 0} loads lost`
            },
            {
                key: 'generalManagerReports',
                label: 'GENERAL MANAGER REPORTS',
                format: (r) =>
                    `  Week ${r.week}: ${r.totalYardage || 0} total yards, ${r.totalHours || 0} hours, ${r.operatorsActive || 0} active operators, ${r.mixersRunnable || 0} runnable/${r.mixersDown || 0} down`
            },
            {
                key: 'efficiencyReports',
                label: 'EFFICIENCY REPORTS',
                format: (r) =>
                    `  Week ${r.week} - Plant ${r.plant}: Start ${r.avgStartTime || 'N/A'}, End ${r.avgEndTime || 'N/A'}, ${r.loadsPerHour || 'N/A'} loads/hr`
            },
            {
                key: 'rmiReports',
                label: 'RMI (TRAINING/HIRING) REPORTS',
                format: (r) =>
                    `  Week ${r.week}: ${r.trainersActive || 0} active trainers, ${r.pendingHires || 0} pending hires, goal: ${r.hiringGoal || 0}`
            }
        ]

        reportFormatters.forEach(({ key, label, format }) => {
            const items = data.recentReports[key]
            if (!items?.length) return
            parts.push(`\n${label}:`)
            items.forEach((r) => parts.push(format(r)))
        })

        if (data.recentReports.aggregateReports?.length > 0) {
            parts.push('\nAGGREGATE PRODUCTION REPORTS:')
            data.recentReports.aggregateReports.slice(0, 4).forEach((r) => {
                parts.push(
                    `  Week ${r.week}: ${Array.isArray(r.materials) ? r.materials.length : 0} materials reported`
                )
            })
        }
    }

    formatPlantSummaryData(plantData) {
        const parts = [`Plant ${plantData.plantCode} Current Status:`]

        this.appendLeaderboardMetrics(plantData, parts)
        this.appendPlantAlerts(plantData, parts)
        this.appendIssueSummary(plantData, parts)
        this.appendLongTermShopAssets(plantData, parts)
        this.appendFleetCleanliness(plantData, parts)

        return parts.join('\n')
    }

    appendLeaderboardMetrics(plantData, parts) {
        const m = plantData.leaderboardMetrics
        if (!m) return

        parts.push(
            `Efficiency Rank: #${m.rank} of ${m.totalPlants} in region`,
            `Efficiency Score: ${m.efficiency?.toFixed(1)}%`,
            `ADJUSTED YPH: ${m.adjustedYPH?.toFixed(2)} (THIS IS THE KEY METRIC - accounts for help given/received)`,
            `Raw YPH: ${m.rawYPH?.toFixed(2)} (for context only - does not reflect true performance)`,
            `Help Given: ${Math.round(m.helpGiven || 0)} hours`,
            `Help Received: ${Math.round(m.helpReceived || 0)} hours`,
            `Net Help: ${Math.round(m.netHelp || 0)} hours (positive = gave more, negative = received more)`
        )

        if (m.avgCleanliness !== undefined) {
            const cs = m.avgCleanliness || 0
            parts.push(`Fleet Avg Cleanliness: ${cs > 0 ? cs.toFixed(1) : 'N/A'}/5`)
            const impact = getCleanlinessImpact(cs)
            if (impact) parts.push(`Cleanliness Ranking Impact: ${impact.points} points (${impact.label})`)
        }

        if (m.safetyIncidents !== undefined) {
            const sc = m.safetyIncidents || 0
            parts.push(`Safety Incidents: ${sc} reported this period`)
            parts.push(
                sc > 0
                    ? `Safety Ranking Impact: -${sc} point${sc > 1 ? 's' : ''} (incidents hurt efficiency score)`
                    : 'Safety Status: Clean record - no incidents'
            )
        }
    }

    appendPlantAlerts(plantData, parts) {
        if (plantData.overdueService?.length > 0)
            parts.push(`Service Overdue (6+ months): ${plantData.overdueService.length} assets need attention`)
        if (plantData.shopIssue)
            parts.push(
                `SHOP ALERT: ${plantData.shopIssue.inShopCount} mixers in shop with only ${plantData.shopIssue.spareCount} spare available`
            )
        if (plantData.unassignedOperators?.length > 0)
            parts.push(
                `Unassigned Active Operators: ${plantData.unassignedOperators.length} operators not assigned to any truck`
            )
        if (plantData.pendingOperators?.length > 0)
            parts.push(`New Hires Coming: ${plantData.pendingOperators.length} pending start`)
        if (plantData.trainingOperators?.length > 0)
            parts.push(`In Training: ${plantData.trainingOperators.length} operators`)
    }

    appendIssueSummary(plantData, parts) {
        if (!plantData.issueSummary && !plantData.assetsWithMostIssues?.length) return

        if (plantData.issueSummary) {
            const { openIssues, resolvedIssues } = plantData.issueSummary
            parts.push(`Issue Summary: ${openIssues} open issues, ${resolvedIssues} resolved issues`)

            if (openIssues > 0 && plantData.assetsWithMostIssues?.length > 0) {
                parts.push(
                    `Assets with Most Open Issues: ${plantData.assetsWithMostIssues.length} assets need attention`
                )
                plantData.assetsWithMostIssues
                    .slice(0, 3)
                    .forEach((a) =>
                        parts.push(
                            `  - ${a.type} ${a.identifier}: ${a.openIssueCount} open, ${a.resolvedIssueCount} resolved`
                        )
                    )
            }

            if (resolvedIssues > 0 && openIssues === 0) {
                parts.push('All issues resolved - excellent maintenance responsiveness!')
            }
            return
        }

        parts.push(`Open Issues: ${plantData.assetsWithMostIssues.length} assets have unresolved issues`)
    }

    appendLongTermShopAssets(plantData, parts) {
        if (!plantData.longTermShopAssets?.length) return
        parts.push(
            `LONG-TERM SHOP CONCERN: ${plantData.longTermShopAssets.length} trucks have been in shop for 1+ month`
        )
        plantData.longTermShopAssets.forEach((a) =>
            parts.push(`  - ${a.type} ${a.identifier}: ${a.daysInShop} days in shop`)
        )
    }

    appendFleetCleanliness(plantData, parts) {
        const fc = plantData.fleetCleanliness
        if (!fc) return

        parts.push(
            `Fleet Cleanliness: Average rating ${Math.round(fc.average || 0)}/5 across ${fc.totalActiveMixers} active mixers`
        )

        if (fc.breakdown) {
            parts.push(
                `Cleanliness Breakdown: ${fc.breakdown.excellent} excellent (5), ${fc.breakdown.good} good (4), ${fc.breakdown.average} average (3), ${fc.breakdown.poor} poor (<3), ${fc.breakdown.unrated} unrated`
            )
        }

        const impact = getCleanlinessImpact(fc.average)
        if (impact)
            parts.push(
                `Cleanliness Impact: ${impact.label.split(' - ')[0]} fleet cleanliness is ${impact.impact} efficiency score (${impact.points} points)`
            )
    }

    formatHistoryData(ctx) {
        const parts = [
            `Asset Type: ${ctx.assetType}`,
            `Identifier: ${ctx.assetIdentifier}`,
            `Current Status: ${ctx.currentStatus}`,
            `Current Plant: ${ctx.currentPlant}`,
            `Total History Entries: ${ctx.totalHistoryEntries}`
        ]

        if (ctx.statusChanges > 0) {
            parts.push(`Status Changes: ${ctx.statusChanges}`)
            if (ctx.statusBreakdown) {
                parts.push(
                    `Status Time Breakdown: ${Object.entries(ctx.statusBreakdown)
                        .map(([status, days]) => `${status}: ${days} days`)
                        .join(', ')}`
                )
            }
            if (ctx.currentStatusDays > 0) parts.push(`Days in Current Status: ${ctx.currentStatusDays}`)
        }

        if (ctx.cleanlinessHistory) {
            const ch = ctx.cleanlinessHistory
            parts.push(
                `Cleanliness Ratings Recorded: ${ch.count}`,
                `Average Cleanliness: ${ch.average.toFixed(1)}/5`,
                `Current Cleanliness: ${ch.current}/5`
            )
            if (ch.trend !== 0) {
                parts.push(
                    `Cleanliness Trend: ${ch.trend > 0 ? 'Improving' : 'Declining'} (${ch.trend > 0 ? '+' : ''}${ch.trend})`
                )
            }
        }

        if (ctx.operatorChanges > 0) {
            parts.push(`Operator Changes: ${ctx.operatorChanges}`, `Unique Operators Assigned: ${ctx.uniqueOperators}`)
        }

        if (ctx.serviceHistory) {
            parts.push(`Service Records: ${ctx.serviceHistory.count}`)
            if (ctx.serviceHistory.lastService)
                parts.push(`Last Service: ${new Date(ctx.serviceHistory.lastService).toLocaleDateString()}`)
            if (ctx.serviceHistory.avgDaysBetweenService)
                parts.push(`Avg Days Between Service: ${ctx.serviceHistory.avgDaysBetweenService}`)
        }

        if (ctx.plantChanges > 0) parts.push(`Plant Assignment Changes: ${ctx.plantChanges}`)

        if (ctx.openIssues > 0 || ctx.resolvedIssues > 0) {
            parts.push(`Open Issues: ${ctx.openIssues}`, `Resolved Issues: ${ctx.resolvedIssues}`)
            if (ctx.highSeverityIssues > 0)
                parts.push(`HIGH SEVERITY OPEN ISSUES: ${ctx.highSeverityIssues} - needs immediate attention`)
        }

        if (ctx.recentChanges?.length > 0) {
            parts.push('Recent Changes (last 10):')
            ctx.recentChanges
                .slice(0, MAX_RECENT_CHANGES)
                .forEach((c) =>
                    parts.push(`  - ${c.field}: "${c.from}" -> "${c.to}" (${new Date(c.date).toLocaleDateString()})`)
                )
        }

        return parts.join('\n')
    }

    formatGMReportData(ctx) {
        const parts = ['Weekly General Manager Report Summary', `Week: ${ctx.weekIso || 'Unknown'}`]

        if (ctx.plants?.length > 0) {
            parts.push(
                `\nRegion covers ${ctx.plants.length} plants: ${ctx.plants.map((p) => p.plant_code || p).join(', ')}`
            )
        }

        if (ctx.plantSummaries?.length > 0) {
            parts.push('\nPer-Plant Metrics:')
            ctx.plantSummaries.forEach((p) => {
                parts.push(`\n${p.plantName} (${p.plantCode}):`)
                const metrics = [
                    p.operators !== undefined &&
                        `  Operators: ${p.operators} (last week: ${p.lastWeekOperators || 'N/A'})`,
                    p.runnableTrucks !== undefined &&
                        `  Runnable Trucks: ${p.runnableTrucks} (last week: ${p.lastWeekRunnable || 'N/A'})`,
                    p.downTrucks !== undefined &&
                        `  Down Trucks: ${p.downTrucks} (last week: ${p.lastWeekDown || 'N/A'})`,
                    p.operatorsStarting !== undefined && `  Operators Starting: ${p.operatorsStarting}`,
                    p.operatorsLeaving !== undefined && `  Operators Leaving: ${p.operatorsLeaving}`,
                    p.operatorsTraining !== undefined && `  In Training: ${p.operatorsTraining}`,
                    p.yardage !== undefined &&
                        `  Total Yardage: ${p.yardage} (last week: ${p.lastWeekYardage || 'N/A'})`,
                    p.hours !== undefined && `  Total Hours: ${p.hours} (last week: ${p.lastWeekHours || 'N/A'})`,
                    p.notes && `  Notes: ${p.notes}`
                ].filter(Boolean)
                parts.push(...metrics)
            })
        }

        if (ctx.efficiencyReports?.length > 0) {
            parts.push(`\nPlant Efficiency Reports Available: ${ctx.efficiencyReports.length}`)
            ctx.efficiencyReports.forEach((e) => {
                parts.push(
                    `  ${e.plantCode}: ${e.totalLoads || 0} loads, ${e.totalHours?.toFixed(1) || 0} hours, ${e.avgLoadsPerHour?.toFixed(2) || 'N/A'} loads/hour`
                )
            })
        }

        if (ctx.aggregateData) {
            parts.push('\nAggregate Production This Week:')
            Object.entries(ctx.aggregateData)
                .filter(([key, value]) => value && !EXCLUDED_AGGREGATE_KEYS.includes(key))
                .forEach(([key, value]) => parts.push(`  ${key}: ${value}`))
        }

        if (ctx.rmiReport) {
            parts.push('\nReady Mix Instructor Report Available: Yes')
            if (ctx.rmiReport.total_trainees !== undefined)
                parts.push(`  Total Trainees: ${ctx.rmiReport.total_trainees}`)
        }

        return parts.join('\n')
    }

    formatGMExportData(ctx) {
        const parts = [`Week: ${ctx.weekIso || 'Unknown'}`, `Plants: ${ctx.plantCount || 0}`]

        const conditionalMetrics = [
            ctx.totalYardage !== undefined && `Total Yardage: ${ctx.totalYardage}`,
            ctx.totalOperators !== undefined && `Total Operators: ${ctx.totalOperators}`,
            ctx.totalRunnable !== undefined && `Runnable Trucks: ${ctx.totalRunnable}`,
            ctx.totalDown !== undefined && `Down Trucks: ${ctx.totalDown}`,
            ctx.fleetUtilization !== undefined && `Fleet Utilization: ${ctx.fleetUtilization}%`,
            ctx.allocationPct !== undefined && `Operator Allocation: ${ctx.allocationPct}%`
        ].filter(Boolean)
        parts.push(...conditionalMetrics)

        if (ctx.prevWeekYardage !== undefined && ctx.totalYardage !== undefined) {
            const change =
                ctx.prevWeekYardage > 0
                    ? Math.round(((ctx.totalYardage - ctx.prevWeekYardage) / ctx.prevWeekYardage) * 100)
                    : 0
            parts.push(`WoW Yardage Change: ${change > 0 ? '+' : ''}${change}%`)
        }

        if (ctx.plantIssues?.length > 0) parts.push(`Plant Issues: ${ctx.plantIssues.join(', ')}`)

        return parts.join('\n')
    }
}

export const AIService = new AIInsightsServiceClass()
