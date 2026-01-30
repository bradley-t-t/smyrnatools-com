import { getRoleContext, getToneModifier, PLANT_SUMMARY_BASE, PROMPTS } from '../app/ai'

const GROK_API_KEY = process.env.REACT_APP_GROK_API_KEY
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'

class AIInsightsServiceClass {
    async callAPI(systemPrompt, userPrompt, options = {}) {
        const { model = 'grok-4', temperature = 0.3 } = options

        if (!GROK_API_KEY) {
            console.error('REACT_APP_GROK_API_KEY not set')
            return null
        }

        try {
            const response = await fetch(GROK_API_URL, {
                body: JSON.stringify({
                    messages: [
                        { content: systemPrompt, role: 'system' },
                        { content: userPrompt, role: 'user' }
                    ],
                    model,
                    stream: false,
                    temperature
                }),
                headers: {
                    Authorization: `Bearer ${GROK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            })

            if (response.status === 429) return { error: 'rate_limited' }
            if (!response.ok) {
                const errorText = await response.text()
                console.error('API Error:', response.status, errorText)
                return { error: 'api_error', status: response.status }
            }

            const data = await response.json()
            return { content: data.choices?.[0]?.message?.content || null }
        } catch (error) {
            console.error('AI API Error:', error)
            return { error: 'network_error' }
        }
    }

    async callAPIWithMessages(systemPrompt, messages, options = {}) {
        const { model = 'grok-4', temperature = 0.3 } = options

        if (!GROK_API_KEY) return null

        try {
            const response = await fetch(GROK_API_URL, {
                body: JSON.stringify({
                    messages: [{ content: systemPrompt, role: 'system' }, ...messages],
                    model,
                    stream: false,
                    temperature
                }),
                headers: {
                    Authorization: `Bearer ${GROK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            })

            if (response.status === 429) return 'Rate limited. Please wait a moment and try again.'
            if (!response.ok) return 'Error connecting to AI service.'

            const data = await response.json()
            return data.choices?.[0]?.message?.content || 'Could not process that question.'
        } catch (error) {
            console.error('AI API Error:', error)
            return 'Error connecting to AI service.'
        }
    }

    async generateDashboardInsights(dashboardData) {
        const userPrompt = this.formatDashboardData(dashboardData)
        const result = await this.callAPI(PROMPTS.dashboardInsights, userPrompt)

        if (result?.error) {
            if (result.error === 'api_error' && result.status) {
                throw new Error(`API Error: ${result.status}`)
            }
            throw new Error('Failed to generate insights')
        }

        return result?.content || 'Unable to generate insights at this time.'
    }

    async askFollowUp(question, conversationHistory, contextData) {
        const formattedContext = this.selectRelevantContext(question, contextData)
        const messages = [
            { content: formattedContext, role: 'user' },
            ...conversationHistory.map((msg) => ({ content: msg.content, role: msg.role }))
        ]

        return this.callAPIWithMessages(PROMPTS.followUp, messages)
    }

    async generatePlantSummary(plantData) {
        const userCtx = plantData.userContext || {}
        const roleContext = getRoleContext(userCtx.roleName, userCtx.isViewingOwnPlant, userCtx.assignedPlant)
        const toneModifier = getToneModifier(plantData.plantCode)
        const systemPrompt = `${roleContext}${toneModifier}\n\n${PLANT_SUMMARY_BASE}`
        const userPrompt = this.formatPlantSummaryData(plantData)

        const result = await this.callAPI(systemPrompt, userPrompt, { model: 'grok-3-mini-fast', temperature: 0.5 })
        return result?.content || null
    }

    async generateHistorySummary(historyContext) {
        const userPrompt = this.formatHistoryData(historyContext)
        const result = await this.callAPI(PROMPTS.historySummary, userPrompt, {
            model: 'grok-3-mini-fast',
            temperature: 0.5
        })
        return result?.content || null
    }

    async generateGMReportAnalysis(reportContext) {
        const userPrompt = this.formatGMReportData(reportContext)
        const result = await this.callAPI(PROMPTS.gmReportAnalysis, userPrompt, {
            model: 'grok-3-mini-fast',
            temperature: 0.5
        })
        return result?.content || null
    }

    async generateGMReportExportSummary(reportContext) {
        const userPrompt = this.formatGMExportData(reportContext)
        const result = await this.callAPI(PROMPTS.gmReportExportSummary, userPrompt, {
            model: 'grok-3-mini-fast',
            temperature: 0.4
        })
        return result?.content || null
    }

    async improveListItem(description, comments = '') {
        const userPrompt = comments
            ? `Description: "${description}"\nComments: "${comments}"`
            : `Description: "${description}"\nComments: (none - please add a brief relevant comment)`

        const result = await this.callAPI(PROMPTS.improveListItem, userPrompt, { model: 'grok-3-mini-fast' })
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

        const userPrompt = `Complete this task: "${partialDescription}"`
        const result = await this.callAPI(PROMPTS.suggestListItems, userPrompt, {
            model: 'grok-3-mini-fast',
            temperature: 0.6
        })

        if (!result?.content) return []
        return result.content
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .slice(0, 5)
    }

    selectRelevantContext(question, ctx) {
        const q = question.toLowerCase()
        const parts = [
            `Region: ${ctx.regionName || 'Unknown'}, Date: ${ctx.currentDate || new Date().toISOString().slice(0, 10)}`
        ]

        const mentionsSpecificTruck = q.match(/\b\d{3,5}\b/)
        const mentionsPlant = q.match(/\b(40[1-8]|410|45[35]|46[18]|455)\b/)
        const mentionsOperatorName = ctx.allOperatorsList?.find((o) => q.includes(o.name?.toLowerCase()))

        if (mentionsSpecificTruck) {
            const truckNum = mentionsSpecificTruck[0]
            const mixer = ctx.allMixersList?.find(
                (m) => String(m.truckNumber) === truckNum || String(m.truckNumber).includes(truckNum)
            )
            if (mixer) {
                parts.push(
                    `Mixer ${mixer.truckNumber}: ${mixer.status} at Plant ${mixer.plant}, Operator: ${mixer.operatorName || 'Unassigned'}, VIN: ${mixer.vin || 'N/A'}, Make: ${mixer.make || 'N/A'}, Model: ${mixer.model || 'N/A'}, Year: ${mixer.year || 'N/A'}, Last Service: ${mixer.lastServiceDate?.slice(0, 10) || 'N/A'}`
                )
            }
            const tractor = ctx.allTractorsList?.find(
                (t) => String(t.truckNumber) === truckNum || String(t.truckNumber).includes(truckNum)
            )
            if (tractor) {
                parts.push(
                    `Tractor ${tractor.truckNumber}: ${tractor.status} at Plant ${tractor.plant}, Operator: ${tractor.operatorName || 'Unassigned'}, Type: ${tractor.type || 'N/A'}`
                )
            }
            const history =
                ctx.operatorAssignmentHistory?.filter(
                    (h) => String(h.truckNumber) === truckNum || String(h.truckNumber).includes(truckNum)
                ) || []
            if (history.length > 0) {
                const operators = [
                    ...new Set(
                        history.map((h) => h.newOperator).filter((o) => o && o !== 'None' && o !== 'Unknown Operator')
                    )
                ]
                if (operators.length > 0) parts.push(`Operators who have driven ${truckNum}: ${operators.join(', ')}`)
            }
        }

        if (mentionsOperatorName) {
            const op = mentionsOperatorName
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

        if (q.includes('fleet') || q.includes('status') || q.includes('how many') || q.includes('total')) {
            if (ctx.mixerStats)
                parts.push(
                    `Mixers: ${ctx.mixerStats.total} total, ${ctx.mixerStats.active} active, ${ctx.mixerStats.inShop} in shop, ${ctx.mixerStats.spare} spare`
                )
            if (ctx.tractorStats)
                parts.push(
                    `Tractors: ${ctx.tractorStats.total} total, ${ctx.tractorStats.active} active, ${ctx.tractorStats.inShop} in shop`
                )
            if (ctx.trailerStats)
                parts.push(`Trailers: ${ctx.trailerStats.total} total, ${ctx.trailerStats.active} active`)
            if (ctx.operatorStats)
                parts.push(`Operators: ${ctx.operatorStats.total} total, ${ctx.operatorStats.active} active`)
        }

        if (q.includes('operator') && mentionsPlant) {
            const plantCode = mentionsPlant[0]
            const ops = ctx.allOperatorsList?.filter((o) => String(o.plant) === plantCode) || []
            if (ops.length > 0) parts.push(`Operators at Plant ${plantCode}: ${ops.map((o) => o.name).join(', ')}`)
        }

        if (q.includes('shop') && ctx.mixersInShop?.length > 0) {
            parts.push(`Mixers in shop: ${ctx.mixersInShop.map((m) => `${m.truckNumber} (${m.plant})`).join(', ')}`)
        }

        if (q.includes('yard') || q.includes('report') || q.includes('production')) {
            if (mentionsPlant) {
                const plantCode = mentionsPlant[0]
                const reports = ctx.plantManagerReports?.filter((r) => String(r.plant) === plantCode).slice(0, 5) || []
                reports.forEach((r) =>
                    parts.push(`Week ${r.week} Plant ${r.plant}: ${r.yardage} yards, ${r.totalHours} hours`)
                )
            } else {
                const latestWeek = ctx.plantManagerReports?.[0]?.week
                if (latestWeek) {
                    const weekReports = ctx.plantManagerReports.filter((r) => r.week === latestWeek)
                    const totalYards = weekReports.reduce((sum, r) => sum + (r.yardage || 0), 0)
                    parts.push(`Week ${latestWeek}: ${totalYards} total yards across ${weekReports.length} plants`)
                }
            }
        }

        return parts.join('\n')
    }

    formatDashboardData(data) {
        const parts = [`Analysis Date: ${new Date().toLocaleDateString()}`]

        if (data.regionName) parts.push(`Region: ${data.regionName}`)
        if (data.selectedPlant) parts.push(`Viewing Plant: ${data.selectedPlant}`)

        parts.push(`\n=== FLEET STATUS ===`)

        if (data.mixerStats) {
            const utilizationRate =
                data.mixerStats.total > 0 ? Math.round((data.mixerStats.active / data.mixerStats.total) * 100) : 0
            parts.push(`\nMIXERS: ${data.mixerStats.total} total`)
            parts.push(
                `  Active: ${data.mixerStats.active} | Spare: ${data.mixerStats.spare} | In Shop: ${data.mixerStats.inShop}`
            )
            parts.push(`  Utilization: ${utilizationRate}%`)
        }

        if (data.tractorStats) {
            const utilizationRate =
                data.tractorStats.total > 0 ? Math.round((data.tractorStats.active / data.tractorStats.total) * 100) : 0
            parts.push(`\nTRACTORS: ${data.tractorStats.total} total`)
            parts.push(
                `  Active: ${data.tractorStats.active} | Spare: ${data.tractorStats.spare} | In Shop: ${data.tractorStats.inShop}`
            )
            parts.push(`  Utilization: ${utilizationRate}%`)
        }

        if (data.trailerStats) {
            parts.push(`\nTRAILERS: ${data.trailerStats.total} total`)
            parts.push(
                `  Active: ${data.trailerStats.active} | Spare: ${data.trailerStats.spare} | In Shop: ${data.trailerStats.inShop}`
            )
        }

        if (data.equipmentStats) {
            parts.push(`\nEQUIPMENT: ${data.equipmentStats.total} total`)
            parts.push(
                `  Active: ${data.equipmentStats.active} | Spare: ${data.equipmentStats.spare} | In Shop: ${data.equipmentStats.inShop}`
            )
        }

        parts.push(`\n=== OPERATORS ===`)
        if (data.operatorStats) {
            parts.push(`Total Operators: ${data.operatorStats.total}`)
            parts.push(`Active: ${data.operatorStats.active}`)
            parts.push(`  - Mixer Operators (assigned to mixers): ${data.operatorStats.mixerOperators || 0}`)
            parts.push(`  - Tractor Operators (assigned to tractors): ${data.operatorStats.tractorOperators || 0}`)
            parts.push(`  - Unassigned Active: ${data.operatorStats.unassigned || 0}`)
            parts.push(`Training: ${data.operatorStats.training || 0}`)
            parts.push(`Pending Start: ${data.operatorStats.pendingStart || 0}`)
            parts.push(`Light Duty: ${data.operatorStats.lightDuty || 0}`)
        }

        parts.push(`\n=== MAINTENANCE ===`)
        parts.push(`Service Overdue: ${data.overdueCount || 0} assets`)
        parts.push(`Open Issues: ${data.openIssuesCount || 0}`)

        if (data.statusHistory) {
            parts.push(`\n=== HISTORICAL TRENDS (${data.historyDateRange || 'all time'}) ===`)
            if (data.statusHistory.mixers?.length > 0) {
                parts.push(`Mixer Time Distribution:`)
                data.statusHistory.mixers.slice(0, 3).forEach((s) => parts.push(`  ${s.status}: ${s.percentage}%`))
            }
            if (data.statusHistory.tractors?.length > 0) {
                parts.push(`Tractor Time Distribution:`)
                data.statusHistory.tractors.slice(0, 3).forEach((s) => parts.push(`  ${s.status}: ${s.percentage}%`))
            }
        }

        if (data.recentReports) {
            parts.push(`\n=== RECENT REPORTS (Last 4 Weeks) ===`)
            parts.push(`Total Completed Reports: ${data.recentReports.totalReportsLast4Weeks || 0}`)

            if (data.recentReports.plantManagerReports?.length > 0) {
                parts.push(`\nPLANT MANAGER REPORTS:`)
                data.recentReports.plantManagerReports.forEach((r) => {
                    parts.push(
                        `  Week ${r.week} - Plant ${r.plant}: ${r.yardage || 0} yards, ${r.hours || 0} hours, ${r.operatorCount || 0} operators, ${r.loadsLost || 0} loads lost`
                    )
                })
            }

            if (data.recentReports.generalManagerReports?.length > 0) {
                parts.push(`\nGENERAL MANAGER REPORTS:`)
                data.recentReports.generalManagerReports.forEach((r) => {
                    parts.push(
                        `  Week ${r.week}: ${r.totalYardage || 0} total yards, ${r.totalHours || 0} hours, ${r.operatorsActive || 0} active operators, ${r.mixersRunnable || 0} runnable/${r.mixersDown || 0} down`
                    )
                })
            }

            if (data.recentReports.efficiencyReports?.length > 0) {
                parts.push(`\nEFFICIENCY REPORTS:`)
                data.recentReports.efficiencyReports.forEach((r) => {
                    parts.push(
                        `  Week ${r.week} - Plant ${r.plant}: Start ${r.avgStartTime || 'N/A'}, End ${r.avgEndTime || 'N/A'}, ${r.loadsPerHour || 'N/A'} loads/hr`
                    )
                })
            }

            if (data.recentReports.rmiReports?.length > 0) {
                parts.push(`\nRMI (TRAINING/HIRING) REPORTS:`)
                data.recentReports.rmiReports.forEach((r) => {
                    parts.push(
                        `  Week ${r.week}: ${r.trainersActive || 0} active trainers, ${r.pendingHires || 0} pending hires, goal: ${r.hiringGoal || 0}`
                    )
                })
            }

            if (data.recentReports.aggregateReports?.length > 0) {
                parts.push(`\nAGGREGATE PRODUCTION REPORTS:`)
                data.recentReports.aggregateReports.slice(0, 4).forEach((r) => {
                    const materialCount = Array.isArray(r.materials) ? r.materials.length : 0
                    parts.push(`  Week ${r.week}: ${materialCount} materials reported`)
                })
            }
        }

        parts.push(
            `\nAnalyze this data and provide 3-5 specific issues or concerns. Focus on problems, not positives. Consider production trends, yardage, hours, efficiency, and staffing levels.`
        )
        return parts.join('\n')
    }

    formatPlantSummaryData(plantData) {
        const parts = [`Plant ${plantData.plantCode} Current Status:`]

        if (plantData.leaderboardMetrics) {
            const m = plantData.leaderboardMetrics
            parts.push(`Efficiency Rank: #${m.rank} of ${m.totalPlants} in region`)
            parts.push(`Efficiency Score: ${m.efficiency?.toFixed(1)}%`)
            parts.push(
                `ADJUSTED YPH: ${m.adjustedYPH?.toFixed(2)} (THIS IS THE KEY METRIC - accounts for help given/received)`
            )
            parts.push(`Raw YPH: ${m.rawYPH?.toFixed(2)} (for context only - does not reflect true performance)`)
            parts.push(`Help Given: ${Math.round(m.helpGiven || 0)} hours`)
            parts.push(`Help Received: ${Math.round(m.helpReceived || 0)} hours`)
            parts.push(`Net Help: ${Math.round(m.netHelp || 0)} hours (positive = gave more, negative = received more)`)

            if (m.avgCleanliness !== undefined) {
                const cs = m.avgCleanliness || 0
                parts.push(`Fleet Avg Cleanliness: ${cs > 0 ? cs.toFixed(1) : 'N/A'}/5`)
                if (cs >= 4.5) parts.push(`Cleanliness Ranking Impact: +10 points (Excellent - top tier)`)
                else if (cs >= 4) parts.push(`Cleanliness Ranking Impact: +5 points (Good - above average)`)
                else if (cs >= 3) parts.push(`Cleanliness Ranking Impact: -5 points (Average - hurting rankings)`)
                else if (cs > 0)
                    parts.push(`Cleanliness Ranking Impact: -10 points (Poor - significantly hurting rankings)`)
            }

            if (m.safetyIncidents !== undefined) {
                const sc = m.safetyIncidents || 0
                parts.push(`Safety Incidents: ${sc} reported this period`)
                parts.push(
                    sc > 0
                        ? `Safety Ranking Impact: -${sc} point${sc > 1 ? 's' : ''} (incidents hurt efficiency score)`
                        : `Safety Status: Clean record - no incidents`
                )
            }
        }

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
        if (plantData.assetsWithMostIssues?.length > 0)
            parts.push(`Open Issues: ${plantData.assetsWithMostIssues.length} assets have unresolved issues`)

        if (plantData.longTermShopAssets?.length > 0) {
            parts.push(
                `LONG-TERM SHOP CONCERN: ${plantData.longTermShopAssets.length} trucks have been in shop for 1+ month`
            )
            plantData.longTermShopAssets.forEach((a) =>
                parts.push(`  - ${a.type} ${a.identifier}: ${a.daysInShop} days in shop`)
            )
        }

        if (plantData.fleetCleanliness) {
            const fc = plantData.fleetCleanliness
            parts.push(
                `Fleet Cleanliness: Average rating ${Math.round(fc.average || 0)}/5 across ${fc.totalActiveMixers} active mixers`
            )
            if (fc.breakdown) {
                parts.push(
                    `Cleanliness Breakdown: ${fc.breakdown.excellent} excellent (5), ${fc.breakdown.good} good (4), ${fc.breakdown.average} average (3), ${fc.breakdown.poor} poor (<3), ${fc.breakdown.unrated} unrated`
                )
            }
            if (fc.average >= 4.5)
                parts.push(`Cleanliness Impact: Excellent fleet cleanliness is boosting efficiency score (+10 points)`)
            else if (fc.average >= 4)
                parts.push(`Cleanliness Impact: Good fleet cleanliness is boosting efficiency score (+5 points)`)
            else if (fc.average >= 3)
                parts.push(`Cleanliness Impact: Average fleet cleanliness is hurting efficiency score (-5 points)`)
            else if (fc.average > 0)
                parts.push(
                    `Cleanliness Impact: Poor fleet cleanliness is significantly hurting efficiency score (-10 points)`
                )
        }

        return parts.join('\n')
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
                const breakdown = Object.entries(ctx.statusBreakdown)
                    .map(([status, days]) => `${status}: ${days} days`)
                    .join(', ')
                parts.push(`Status Time Breakdown: ${breakdown}`)
            }
            if (ctx.currentStatusDays > 0) parts.push(`Days in Current Status: ${ctx.currentStatusDays}`)
        }

        if (ctx.cleanlinessHistory) {
            parts.push(`Cleanliness Ratings Recorded: ${ctx.cleanlinessHistory.count}`)
            parts.push(`Average Cleanliness: ${ctx.cleanlinessHistory.average.toFixed(1)}/5`)
            parts.push(`Current Cleanliness: ${ctx.cleanlinessHistory.current}/5`)
            if (ctx.cleanlinessHistory.trend !== 0) {
                parts.push(
                    `Cleanliness Trend: ${ctx.cleanlinessHistory.trend > 0 ? 'Improving' : 'Declining'} (${ctx.cleanlinessHistory.trend > 0 ? '+' : ''}${ctx.cleanlinessHistory.trend})`
                )
            }
        }

        if (ctx.operatorChanges > 0) {
            parts.push(`Operator Changes: ${ctx.operatorChanges}`)
            parts.push(`Unique Operators Assigned: ${ctx.uniqueOperators}`)
            if (ctx.operatorChanges > 5) parts.push(`HIGH OPERATOR TURNOVER - investigate why operators keep changing`)
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
            parts.push(`Open Issues: ${ctx.openIssues}`)
            parts.push(`Resolved Issues: ${ctx.resolvedIssues}`)
            if (ctx.highSeverityIssues > 0)
                parts.push(`HIGH SEVERITY OPEN ISSUES: ${ctx.highSeverityIssues} - needs immediate attention`)
        }

        if (ctx.recentChanges?.length > 0) {
            parts.push(`Recent Changes (last 10):`)
            ctx.recentChanges.forEach((c) =>
                parts.push(`  - ${c.field}: "${c.from}" -> "${c.to}" (${new Date(c.date).toLocaleDateString()})`)
            )
        }

        return parts.join('\n')
    }

    formatGMReportData(ctx) {
        const parts = [`Weekly General Manager Report Summary`, `Week: ${ctx.weekIso || 'Unknown'}`]

        if (ctx.plants?.length > 0) {
            parts.push(
                `\nRegion covers ${ctx.plants.length} plants: ${ctx.plants.map((p) => p.plant_code || p).join(', ')}`
            )
        }

        if (ctx.plantSummaries?.length > 0) {
            parts.push(`\nPer-Plant Metrics:`)
            ctx.plantSummaries.forEach((p) => {
                parts.push(`\n${p.plantName} (${p.plantCode}):`)
                if (p.operators !== undefined)
                    parts.push(`  Operators: ${p.operators} (last week: ${p.lastWeekOperators || 'N/A'})`)
                if (p.runnableTrucks !== undefined)
                    parts.push(`  Runnable Trucks: ${p.runnableTrucks} (last week: ${p.lastWeekRunnable || 'N/A'})`)
                if (p.downTrucks !== undefined)
                    parts.push(`  Down Trucks: ${p.downTrucks} (last week: ${p.lastWeekDown || 'N/A'})`)
                if (p.operatorsStarting !== undefined) parts.push(`  Operators Starting: ${p.operatorsStarting}`)
                if (p.operatorsLeaving !== undefined) parts.push(`  Operators Leaving: ${p.operatorsLeaving}`)
                if (p.operatorsTraining !== undefined) parts.push(`  In Training: ${p.operatorsTraining}`)
                if (p.yardage !== undefined)
                    parts.push(`  Total Yardage: ${p.yardage} (last week: ${p.lastWeekYardage || 'N/A'})`)
                if (p.hours !== undefined)
                    parts.push(`  Total Hours: ${p.hours} (last week: ${p.lastWeekHours || 'N/A'})`)
                if (p.notes) parts.push(`  Notes: ${p.notes}`)
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
            parts.push(`\nAggregate Production This Week:`)
            Object.entries(ctx.aggregateData).forEach(([key, value]) => {
                if (value && key !== 'report_date' && key !== 'notes') parts.push(`  ${key}: ${value}`)
            })
        }

        if (ctx.rmiReport) {
            parts.push(`\nReady Mix Instructor Report Available: Yes`)
            if (ctx.rmiReport.total_trainees !== undefined)
                parts.push(`  Total Trainees: ${ctx.rmiReport.total_trainees}`)
        }

        return parts.join('\n')
    }

    formatGMExportData(ctx) {
        const parts = [`Week: ${ctx.weekIso || 'Unknown'}`, `Plants: ${ctx.plantCount || 0}`]

        if (ctx.totalYardage !== undefined) parts.push(`Total Yardage: ${ctx.totalYardage}`)
        if (ctx.totalOperators !== undefined) parts.push(`Total Operators: ${ctx.totalOperators}`)
        if (ctx.totalRunnable !== undefined) parts.push(`Runnable Trucks: ${ctx.totalRunnable}`)
        if (ctx.totalDown !== undefined) parts.push(`Down Trucks: ${ctx.totalDown}`)
        if (ctx.fleetUtilization !== undefined) parts.push(`Fleet Utilization: ${ctx.fleetUtilization}%`)
        if (ctx.allocationPct !== undefined) parts.push(`Operator Allocation: ${ctx.allocationPct}%`)

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

    async validateEfficiencyComment(comment, issues) {
        const systemPrompt = `You are a validation assistant for weekly plant efficiency reports. Your job is to determine if a comment provides a meaningful explanation for performance issues.

A VALID comment must:
- Specifically explain WHY timing issues occurred
- Provide concrete reasons (equipment issues, scheduling problems, delays, etc.)
- Be more than just a statement of fact or placeholder

INVALID comments include:
- Single words like "N/A", "na", "mixers", "trucks", "none"
- Just listing what happened without explaining why
- Generic statements without specific reasons
- Empty or placeholder text

Respond with ONLY "VALID" or "INVALID: [brief guidance]" where guidance helps the user understand what to add.`

        const issuesText = []
        if (issues.startDelayed) issuesText.push(`Punch in to 1st load: ${issues.startMinutes} minutes (expected: ≤15)`)
        if (issues.endDelayed) issuesText.push(`Washout to punch out: ${issues.endMinutes} minutes (expected: ≤20)`)
        if (issues.lowLoads) issuesText.push(`Total loads: ${issues.loads} (expected: ≥3)`)
        if (issues.excessiveHours) issuesText.push(`Total hours: ${issues.hours.toFixed(1)} (expected: ≤14)`)

        const userPrompt = `Performance Issues:\n${issuesText.join('\n')}\n\nOperator Comment: "${comment}"\n\nIs this a valid explanation?`

        const result = await this.callAPI(systemPrompt, userPrompt, { temperature: 0.1 })

        if (result?.error) {
            return { error: true }
        }

        const response = result?.content?.trim() || ''

        if (response.startsWith('VALID')) {
            return { valid: true }
        }

        const invalidMatch = response.match(/^INVALID:\s*(.+)$/i)
        if (invalidMatch) {
            return { guidance: invalidMatch[1].trim(), valid: false }
        }

        return { guidance: 'Please provide a detailed explanation for the timing issues.', valid: false }
    }
}

export const AIService = new AIInsightsServiceClass()
