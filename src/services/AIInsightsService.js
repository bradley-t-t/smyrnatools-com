const GROK_API_KEY = process.env.REACT_APP_GROK_API_KEY
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'

class AIInsightsServiceClass {
    async generateDashboardInsights(dashboardData) {
        const systemPrompt = `You are an operations analyst for a concrete ready-mix company. Analyze the data and identify issues that need attention.

IMPORTANT CONTEXT:
- Mixer Operators drive concrete mixer trucks to job sites
- Tractor Operators drive tractor-trailers for hauling materials (cement, aggregate, etc.)
- These are two distinct operator types with different roles

RESPONSE FORMAT:
Respond with exactly 3-5 bullet points. Each bullet should:
- Start with an icon indicator: [!] for critical, [~] for warning, [i] for info
- Be one clear, specific sentence
- Focus on actionable issues, not general observations

Do NOT use markdown formatting. Use plain text only.
If everything looks good, respond with: [i] No significant issues detected at this time.`

        const userPrompt = this.formatDashboardDataForPrompt(dashboardData)

        try {
            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-4',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    temperature: 0.3
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Grok API Error Response:', response.status, errorText)
                let errorMessage = 'Failed to generate insights'
                try {
                    const errorData = JSON.parse(errorText)
                    if (errorData.error && errorData.error.includes('credit')) {
                        errorMessage = 'AI service requires credits. Please contact your administrator.'
                    } else {
                        errorMessage = errorData.error?.message || errorData.message || errorData.error || errorMessage
                    }
                } catch {
                    errorMessage = `API Error: ${response.status}`
                }
                throw new Error(errorMessage)
            }

            const data = await response.json()
            return data.choices?.[0]?.message?.content || 'Unable to generate insights at this time.'
        } catch (error) {
            console.error('AI Insights Error:', error)
            throw error
        }
    }

    async askFollowUp(question, conversationHistory, contextData) {
        const systemPrompt = `You are an operations analyst assistant for a concrete ready-mix company. You have access to comprehensive operational data.

CONTEXT:
- Mixer Operators drive concrete mixer trucks to deliver concrete
- Tractor Operators drive tractor-trailers for hauling materials (cement, aggregate)
- You have access to: fleet statistics, operator data, asset status history, recent reports (plant manager, efficiency, aggregate production, RMI/training)
- Reports contain weekly yardage, hours worked, loads, efficiency metrics
- Status history shows how long assets have been in different states (Active, In Shop, Spare, etc.)

DATA AVAILABLE:
- Current fleet status (mixers, tractors, trailers, equipment by status)
- Operator counts (active, training, pending, by assignment type)
- Maintenance info (overdue count, open issues)
- Recent reports from last 4 weeks (if available)
- Assets currently in shop with details
- Historical status distribution

Answer questions using the provided data. If specific data needed to answer isn't in the context, explain what data would be needed. Do not use markdown formatting.`

        const formattedContext = this.selectRelevantContext(question, contextData)

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: formattedContext }
        ]

        conversationHistory.forEach((msg) => {
            messages.push({ role: msg.role, content: msg.content })
        })

        try {
            if (!GROK_API_KEY) {
                console.error('REACT_APP_GROK_API_KEY not set')
                return 'AI not configured. Restart dev server.'
            }

            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-4',
                    messages,
                    stream: false,
                    temperature: 0.3
                })
            })

            if (response.status === 429) {
                return 'Rate limited. Please wait a moment and try again.'
            }

            if (!response.ok) {
                const errorText = await response.text()
                console.error('API Error:', response.status, errorText)
                return 'Error connecting to AI service.'
            }

            const data = await response.json()
            return data.choices?.[0]?.message?.content || 'Could not process that question.'
        } catch (error) {
            console.error('AI Error:', error)
            return 'Error connecting to AI service.'
        }
    }

    selectRelevantContext(question, ctx) {
        const q = question.toLowerCase()
        const parts = []

        parts.push(
            `Region: ${ctx.regionName || 'Unknown'}, Date: ${ctx.currentDate || new Date().toISOString().slice(0, 10)}`
        )

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
                if (operators.length > 0) {
                    parts.push(`Operators who have driven ${truckNum}: ${operators.join(', ')}`)
                }
            }
        }

        if (mentionsOperatorName) {
            const op = mentionsOperatorName
            parts.push(`Operator ${op.name}: ${op.status} at Plant ${op.plant}, Position: ${op.position || 'Operator'}`)
            const assignedMixer = ctx.allMixersList?.find((m) => m.operatorName === op.name)
            if (assignedMixer) {
                parts.push(
                    `${op.name} is currently driving Mixer ${assignedMixer.truckNumber} at Plant ${assignedMixer.plant}`
                )
            }
            const assignedTractor = ctx.allTractorsList?.find((t) => t.operatorName === op.name)
            if (assignedTractor) {
                parts.push(
                    `${op.name} is currently driving Tractor ${assignedTractor.truckNumber} at Plant ${assignedTractor.plant}`
                )
            }
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
            if (ops.length > 0) {
                parts.push(`Operators at Plant ${plantCode}: ${ops.map((o) => o.name).join(', ')}`)
            }
        }

        if (q.includes('shop')) {
            if (ctx.mixersInShop?.length > 0) {
                parts.push(`Mixers in shop: ${ctx.mixersInShop.map((m) => `${m.truckNumber} (${m.plant})`).join(', ')}`)
            }
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

    formatContextForFollowUp(ctx) {
        const parts = []

        parts.push(`Region: ${ctx.regionName || 'Unknown'}`)
        if (ctx.selectedPlant) parts.push(`Selected Plant: ${ctx.selectedPlant}`)
        if (ctx.currentDate) parts.push(`Current Date: ${ctx.currentDate}`)

        parts.push(`\n=== CURRENT FLEET STATUS ===`)

        if (ctx.mixerStats) {
            parts.push(
                `MIXERS: ${ctx.mixerStats.total} total, ${ctx.mixerStats.active} active, ${ctx.mixerStats.inShop} in shop, ${ctx.mixerStats.spare} spare`
            )
            parts.push(
                `  Service Overdue: ${ctx.mixerStats.serviceOverdue || 0}, Open Issues: ${ctx.mixerStats.openIssues || 0}`
            )
        }
        if (ctx.tractorStats) {
            parts.push(
                `TRACTORS: ${ctx.tractorStats.total} total, ${ctx.tractorStats.active} active, ${ctx.tractorStats.inShop} in shop, ${ctx.tractorStats.spare} spare`
            )
            parts.push(
                `  Types: End Dump: ${ctx.tractorStats.endDump || 0}, Cement Hauler: ${ctx.tractorStats.cementHauler || 0}, Dump Truck: ${ctx.tractorStats.dumpTruck || 0}`
            )
            parts.push(
                `  Service Overdue: ${ctx.tractorStats.serviceOverdue || 0}, Open Issues: ${ctx.tractorStats.openIssues || 0}`
            )
        }
        if (ctx.trailerStats) {
            parts.push(
                `TRAILERS: ${ctx.trailerStats.total} total, ${ctx.trailerStats.active} active, ${ctx.trailerStats.inShop} in shop, ${ctx.trailerStats.spare} spare`
            )
            parts.push(
                `  Service Overdue: ${ctx.trailerStats.serviceOverdue || 0}, Open Issues: ${ctx.trailerStats.openIssues || 0}`
            )
        }
        if (ctx.equipmentStats) {
            parts.push(
                `EQUIPMENT: ${ctx.equipmentStats.total} total, ${ctx.equipmentStats.active} active, ${ctx.equipmentStats.inShop} in shop, ${ctx.equipmentStats.spare} spare`
            )
            parts.push(
                `  Service Overdue: ${ctx.equipmentStats.serviceOverdue || 0}, Open Issues: ${ctx.equipmentStats.openIssues || 0}`
            )
        }
        if (ctx.pickupStats) {
            parts.push(
                `PICKUP TRUCKS: ${ctx.pickupStats.total} total, ${ctx.pickupStats.active} active, ${ctx.pickupStats.inShop} in shop, ${ctx.pickupStats.spare} spare, ${ctx.pickupStats.stationary} stationary`
            )
        }

        if (ctx.operatorStats) {
            parts.push(`\n=== OPERATORS ===`)
            parts.push(
                `Total: ${ctx.operatorStats.total}, Active: ${ctx.operatorStats.active}, Training: ${ctx.operatorStats.training}, Pending Start: ${ctx.operatorStats.pending}`
            )
            parts.push(
                `Light Duty: ${ctx.operatorStats.lightDuty || 0}, Terminated: ${ctx.operatorStats.terminated || 0}`
            )
        }

        parts.push(`\n=== MAINTENANCE SUMMARY ===`)
        parts.push(`Total Service Overdue: ${ctx.totalServiceOverdue || 0}`)
        parts.push(`Total Open Maintenance Issues: ${ctx.totalOpenMaintenanceIssues || 0}`)

        if (ctx.mixersInShop?.length > 0) {
            parts.push(`\n=== MIXERS IN SHOP (${ctx.mixersInShop.length}) ===`)
            ctx.mixersInShop.forEach((m) => {
                let line = `  Truck ${m.truckNumber} at Plant ${m.plant}`
                if (m.enteredShopDate) line += ` (since ${m.enteredShopDate.slice(0, 10)})`
                if (m.openIssues?.length > 0) line += ` - Issues: ${m.openIssues.join('; ')}`
                parts.push(line)
            })
        }

        if (ctx.tractorsInShop?.length > 0) {
            parts.push(`\n=== TRACTORS IN SHOP (${ctx.tractorsInShop.length}) ===`)
            ctx.tractorsInShop.forEach((t) => {
                let line = `  Truck ${t.truckNumber} (${t.type || 'Unknown Type'}) at Plant ${t.plant}`
                if (t.enteredShopDate) line += ` (since ${t.enteredShopDate.slice(0, 10)})`
                if (t.openIssues?.length > 0) line += ` - Issues: ${t.openIssues.join('; ')}`
                parts.push(line)
            })
        }

        if (ctx.trailersInShop?.length > 0) {
            parts.push(`\n=== TRAILERS IN SHOP (${ctx.trailersInShop.length}) ===`)
            ctx.trailersInShop.forEach((t) => {
                let line = `  Trailer ${t.trailerNumber} at Plant ${t.plant}`
                if (t.enteredShopDate) line += ` (since ${t.enteredShopDate.slice(0, 10)})`
                if (t.openIssues?.length > 0) line += ` - Issues: ${t.openIssues.join('; ')}`
                parts.push(line)
            })
        }

        if (ctx.equipmentInShop?.length > 0) {
            parts.push(`\n=== EQUIPMENT IN SHOP (${ctx.equipmentInShop.length}) ===`)
            ctx.equipmentInShop.forEach((e) => {
                let line = `  ${e.identifyingNumber} (${e.type || 'Unknown Type'}) at Plant ${e.plant}`
                if (e.enteredShopDate) line += ` (since ${e.enteredShopDate.slice(0, 10)})`
                if (e.openIssues?.length > 0) line += ` - Issues: ${e.openIssues.join('; ')}`
                parts.push(line)
            })
        }

        if (ctx.mixersSpare?.length > 0) {
            parts.push(`\n=== SPARE MIXERS (${ctx.mixersSpare.length}) ===`)
            ctx.mixersSpare.forEach((m) => {
                parts.push(`  Truck ${m.truckNumber} at Plant ${m.plant}`)
            })
        }

        if (ctx.tractorsSpare?.length > 0) {
            parts.push(`\n=== SPARE TRACTORS (${ctx.tractorsSpare.length}) ===`)
            ctx.tractorsSpare.forEach((t) => {
                parts.push(`  Truck ${t.truckNumber} (${t.type || 'Unknown'}) at Plant ${t.plant}`)
            })
        }

        if (ctx.allMixersList?.length > 0) {
            parts.push(`\n=== ALL MIXERS - FULL DETAILS (${ctx.allMixersList.length}) ===`)
            ctx.allMixersList.forEach((m) => {
                let details = `  Truck ${m.truckNumber}: ${m.status} at Plant ${m.plant}, Operator: ${m.operatorName || 'Unassigned'}`
                if (m.vin) details += `, VIN: ${m.vin}`
                if (m.make) details += `, Make: ${m.make}`
                if (m.model) details += `, Model: ${m.model}`
                if (m.year) details += `, Year: ${m.year}`
                if (m.licensePlate) details += `, License: ${m.licensePlate}`
                if (m.mileage) details += `, Mileage: ${m.mileage}`
                if (m.drumCapacity) details += `, Capacity: ${m.drumCapacity} yards`
                if (m.lastServiceDate) details += `, Last Service: ${m.lastServiceDate.slice(0, 10)}`
                parts.push(details)
            })
        }

        if (ctx.allTractorsList?.length > 0) {
            parts.push(`\n=== ALL TRACTORS - FULL DETAILS (${ctx.allTractorsList.length}) ===`)
            ctx.allTractorsList.forEach((t) => {
                let details = `  Truck ${t.truckNumber} (${t.type || 'Unknown'}): ${t.status} at Plant ${t.plant}, Operator: ${t.operatorName || 'Unassigned'}`
                if (t.vin) details += `, VIN: ${t.vin}`
                if (t.make) details += `, Make: ${t.make}`
                if (t.model) details += `, Model: ${t.model}`
                if (t.year) details += `, Year: ${t.year}`
                if (t.licensePlate) details += `, License: ${t.licensePlate}`
                if (t.mileage) details += `, Mileage: ${t.mileage}`
                if (t.lastServiceDate) details += `, Last Service: ${t.lastServiceDate.slice(0, 10)}`
                parts.push(details)
            })
        }

        if (ctx.allTrailersList?.length > 0) {
            parts.push(`\n=== ALL TRAILERS - FULL DETAILS (${ctx.allTrailersList.length}) ===`)
            ctx.allTrailersList.forEach((t) => {
                let details = `  Trailer ${t.trailerNumber} (${t.type || 'Unknown'}): ${t.status} at Plant ${t.plant}`
                if (t.vin) details += `, VIN: ${t.vin}`
                if (t.make) details += `, Make: ${t.make}`
                if (t.model) details += `, Model: ${t.model}`
                if (t.year) details += `, Year: ${t.year}`
                if (t.licensePlate) details += `, License: ${t.licensePlate}`
                if (t.lastServiceDate) details += `, Last Service: ${t.lastServiceDate.slice(0, 10)}`
                parts.push(details)
            })
        }

        if (ctx.allEquipmentList?.length > 0) {
            parts.push(`\n=== ALL EQUIPMENT - FULL DETAILS (${ctx.allEquipmentList.length}) ===`)
            ctx.allEquipmentList.forEach((e) => {
                let details = `  ${e.identifyingNumber} (${e.type || 'Unknown'}): ${e.status} at Plant ${e.plant}`
                if (e.make) details += `, Make: ${e.make}`
                if (e.model) details += `, Model: ${e.model}`
                if (e.year) details += `, Year: ${e.year}`
                if (e.serialNumber) details += `, Serial: ${e.serialNumber}`
                if (e.lastServiceDate) details += `, Last Service: ${e.lastServiceDate.slice(0, 10)}`
                parts.push(details)
            })
        }

        if (ctx.allPickupsList?.length > 0) {
            parts.push(`\n=== ALL PICKUP TRUCKS - FULL DETAILS (${ctx.allPickupsList.length}) ===`)
            ctx.allPickupsList.forEach((p) => {
                let details = `  Truck ${p.truckNumber}: ${p.status} at Plant ${p.plant}`
                if (p.assignedTo) details += `, Assigned To: ${p.assignedTo}`
                if (p.vin) details += `, VIN: ${p.vin}`
                if (p.make) details += `, Make: ${p.make}`
                if (p.model) details += `, Model: ${p.model}`
                if (p.year) details += `, Year: ${p.year}`
                if (p.licensePlate) details += `, License: ${p.licensePlate}`
                if (p.mileage) details += `, Mileage: ${p.mileage}`
                parts.push(details)
            })
        }

        const operatorTruckMap = []
        if (ctx.allMixersList?.length > 0) {
            ctx.allMixersList
                .filter((m) => m.operatorName && m.operatorName !== 'Unassigned')
                .forEach((m) => {
                    operatorTruckMap.push({
                        name: m.operatorName,
                        truck: m.truckNumber,
                        type: 'Mixer',
                        plant: m.plant,
                        status: m.status
                    })
                })
        }
        if (ctx.allTractorsList?.length > 0) {
            ctx.allTractorsList
                .filter((t) => t.operatorName && t.operatorName !== 'Unassigned')
                .forEach((t) => {
                    operatorTruckMap.push({
                        name: t.operatorName,
                        truck: t.truckNumber,
                        type: 'Tractor',
                        plant: t.plant,
                        status: t.status
                    })
                })
        }
        if (operatorTruckMap.length > 0) {
            parts.push(`\n=== CURRENT OPERATOR TRUCK ASSIGNMENTS (${operatorTruckMap.length} assigned) ===`)
            operatorTruckMap.forEach((a) => {
                parts.push(`  ${a.name} is driving ${a.type} ${a.truck} at Plant ${a.plant} (${a.status})`)
            })
        }

        if (ctx.allOperatorsList?.length > 0) {
            parts.push(`\n=== ALL OPERATORS - FULL DETAILS (${ctx.allOperatorsList.length}) ===`)
            ctx.allOperatorsList.forEach((o) => {
                let details = `  ${o.name}: ${o.status} at Plant ${o.plant}, Position: ${o.position || 'Unknown'}`
                if (o.hireDate) details += `, Hire Date: ${o.hireDate.slice(0, 10)}`
                if (o.trainer) details += `, Trainer: ${o.trainer}`
                parts.push(details)
            })
        }

        if (ctx.operatorAssignmentHistory?.length > 0) {
            parts.push(
                `\n=== OPERATOR ASSIGNMENT HISTORY (showing 50 of ${ctx.operatorAssignmentHistory.length} changes) ===`
            )
            ctx.operatorAssignmentHistory.slice(0, 50).forEach((h) => {
                parts.push(
                    `  ${h.changedAt?.slice(0, 10)}: ${h.assetType} ${h.truckNumber} at Plant ${h.plant} - Previous: ${h.previousOperator}, New: ${h.newOperator}`
                )
            })

            const truckOperatorMap = {}
            ctx.operatorAssignmentHistory.forEach((h) => {
                const key = `${h.assetType} ${h.truckNumber}`
                if (!truckOperatorMap[key]) truckOperatorMap[key] = new Set()
                if (h.previousOperator && h.previousOperator !== 'None' && h.previousOperator !== 'Unknown Operator') {
                    truckOperatorMap[key].add(h.previousOperator)
                }
                if (h.newOperator && h.newOperator !== 'None' && h.newOperator !== 'Unknown Operator') {
                    truckOperatorMap[key].add(h.newOperator)
                }
            })

            parts.push(`\n=== OPERATORS WHO HAVE DRIVEN EACH TRUCK (based on history) ===`)
            Object.keys(truckOperatorMap)
                .sort()
                .forEach((truck) => {
                    const operators = Array.from(truckOperatorMap[truck])
                    if (operators.length > 0) {
                        parts.push(`  ${truck}: ${operators.join(', ')}`)
                    }
                })
        }

        if (ctx.operatorsTraining?.length > 0) {
            parts.push(`\n=== OPERATORS IN TRAINING (${ctx.operatorsTraining.length}) ===`)
            ctx.operatorsTraining.forEach((o) => {
                parts.push(
                    `  ${o.name} at Plant ${o.plant} (${o.position || 'Unknown Position'}), Trainer: ${o.trainer || 'Not Assigned'}`
                )
            })
        }

        if (ctx.operatorsPendingStart?.length > 0) {
            parts.push(`\n=== OPERATORS PENDING START (${ctx.operatorsPendingStart.length}) ===`)
            ctx.operatorsPendingStart.forEach((o) => {
                parts.push(`  ${o.name} at Plant ${o.plant}, Start Date: ${o.pendingDate || 'TBD'}`)
            })
        }

        if (ctx.recentReports) {
            parts.push(`\n=== RECENT REPORTS (Last 4 Weeks) ===`)

            if (ctx.recentReports.plantManager?.length > 0) {
                parts.push(`\nPlant Manager Reports (${ctx.recentReports.plantManager.length}):`)
                ctx.recentReports.plantManager.forEach((r) => {
                    parts.push(
                        `  Week ${r.week}, Plant ${r.plant}: ${r.yardage || 0} yards, ${r.hours || 0} hrs, ${r.loadsLost || 0} loads lost`
                    )
                })
            }

            if (ctx.recentReports.efficiency?.length > 0) {
                parts.push(`\nEfficiency Reports (${ctx.recentReports.efficiency.length}):`)
                ctx.recentReports.efficiency.forEach((r) => {
                    parts.push(
                        `  Week ${r.week}, Plant ${r.plant}: Start ${r.avgStartTime || 'N/A'}, End ${r.avgEndTime || 'N/A'}, ${r.loadsPerHour || 'N/A'} loads/hr`
                    )
                })
            }

            if (ctx.recentReports.generalManager?.length > 0) {
                parts.push(`\nGeneral Manager Reports (${ctx.recentReports.generalManager.length}):`)
                ctx.recentReports.generalManager.forEach((r) => {
                    parts.push(`  Week ${r.week}: ${r.totalYardage || 0} total yards, ${r.totalHours || 0} hours`)
                })
            }
        }

        if (ctx.pendingListItems?.length > 0) {
            parts.push(`\n=== PENDING LIST ITEMS (${ctx.pendingListItems.length}) ===`)
            ctx.pendingListItems.slice(0, 30).forEach((li) => {
                let line = `  Plant ${li.plant}: ${li.description}`
                if (li.deadline) line += ` (Due: ${li.deadline.slice(0, 10)})`
                if (li.status) line += ` [${li.status}]`
                if (li.responsible) line += ` - Assigned: ${li.responsible}`
                parts.push(line)
            })
        }

        if (ctx.completedListItems?.length > 0) {
            parts.push(`\n=== RECENTLY COMPLETED LIST ITEMS (${ctx.completedListItems.length}) ===`)
            ctx.completedListItems.slice(0, 10).forEach((li) => {
                parts.push(
                    `  Plant ${li.plant}: ${li.description} (Completed: ${li.completedAt?.slice(0, 10) || 'N/A'})`
                )
            })
        }

        if (ctx.statusHistorySummary) {
            parts.push(`\n=== STATUS HISTORY SUMMARY (ALL TIME) ===`)

            const addSummary = (name, summary) => {
                parts.push(`\n${name}:`)
                parts.push(
                    `  Total Status Changes: ${summary.totalChanges}, Entered Shop: ${summary.enteredShop}, Exited Shop: ${summary.exitedShop}`
                )
                if (Object.keys(summary.byPlant || {}).length > 0) {
                    parts.push(`  By Plant:`)
                    Object.entries(summary.byPlant).forEach(([plant, data]) => {
                        parts.push(
                            `    Plant ${plant}: ${data.enteredShop} entered shop, ${data.exitedShop} exited shop, ${data.totalChanges} total changes`
                        )
                    })
                }
            }

            if (ctx.statusHistorySummary.mixers) addSummary('Mixers', ctx.statusHistorySummary.mixers)
            if (ctx.statusHistorySummary.tractors) addSummary('Tractors', ctx.statusHistorySummary.tractors)
            if (ctx.statusHistorySummary.trailers) addSummary('Trailers', ctx.statusHistorySummary.trailers)
            if (ctx.statusHistorySummary.equipment) addSummary('Equipment', ctx.statusHistorySummary.equipment)
            if (ctx.statusHistorySummary.pickups) addSummary('Pickup Trucks', ctx.statusHistorySummary.pickups)
        }

        if (ctx.mixersHistory?.length > 0) {
            parts.push(`\n=== MIXER STATUS CHANGE HISTORY (${ctx.mixersHistory.length} records) ===`)
            ctx.mixersHistory.forEach((h) => {
                parts.push(
                    `  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`
                )
            })
        }

        if (ctx.tractorsHistory?.length > 0) {
            parts.push(`\n=== TRACTOR STATUS CHANGE HISTORY (${ctx.tractorsHistory.length} records) ===`)
            ctx.tractorsHistory.forEach((h) => {
                parts.push(
                    `  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`
                )
            })
        }

        if (ctx.trailersHistory?.length > 0) {
            parts.push(`\n=== TRAILER STATUS CHANGE HISTORY (${ctx.trailersHistory.length} records) ===`)
            ctx.trailersHistory.forEach((h) => {
                parts.push(
                    `  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`
                )
            })
        }

        if (ctx.equipmentHistory?.length > 0) {
            parts.push(`\n=== EQUIPMENT STATUS CHANGE HISTORY (${ctx.equipmentHistory.length} records) ===`)
            ctx.equipmentHistory.forEach((h) => {
                parts.push(
                    `  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`
                )
            })
        }

        if (ctx.pickupsHistory?.length > 0) {
            parts.push(`\n=== PICKUP TRUCK STATUS CHANGE HISTORY (${ctx.pickupsHistory.length} records) ===`)
            ctx.pickupsHistory.forEach((h) => {
                parts.push(
                    `  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`
                )
            })
        }

        if (ctx.statusChangeHistory) {
            if (ctx.statusChangeHistory.mixers?.length > 0) {
                parts.push(`\n=== RECENT MIXER STATUS CHANGES ===`)
                ctx.statusChangeHistory.mixers.slice(0, 30).forEach((h) => {
                    parts.push(
                        `  Truck ${h.truckNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`
                    )
                })
            }

            if (ctx.statusChangeHistory.tractors?.length > 0) {
                parts.push(`\n=== RECENT TRACTOR STATUS CHANGES ===`)
                ctx.statusChangeHistory.tractors.slice(0, 20).forEach((h) => {
                    parts.push(
                        `  Truck ${h.truckNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`
                    )
                })
            }
        }

        if (ctx.stats) {
            parts.push(`\n=== LEGACY STATS (if different from above) ===`)
            if (ctx.stats.mixers) {
                parts.push(
                    `Mixers: ${ctx.stats.mixers.total} total, ${ctx.stats.mixers.active} active, ${ctx.stats.mixers.shop} in shop, ${ctx.stats.mixers.spare} spare`
                )
            }
            if (ctx.stats.tractors) {
                parts.push(
                    `Tractors: ${ctx.stats.tractors.total} total, ${ctx.stats.tractors.active} active, ${ctx.stats.tractors.shop} in shop, ${ctx.stats.tractors.spare} spare`
                )
            }
            if (ctx.stats.operators) {
                parts.push(`Operators: ${ctx.stats.operators.total} total, ${ctx.stats.operators.active} active`)
                parts.push(
                    `  Mixer operators: ${ctx.stats.operators.mixerAssigned || 0}, Tractor operators: ${ctx.stats.operators.tractorAssigned || 0}`
                )
            }
        }

        if (ctx.plantManagerReports?.length > 0) {
            parts.push(`\n=== PLANT MANAGER REPORTS (${ctx.plantManagerReports.length} reports) ===`)
            ctx.plantManagerReports.forEach((r) => {
                parts.push(
                    `  Week ${r.week} - Plant ${r.plant} (${r.plantName || 'Unknown'}): ${r.yardage} yards, ${r.totalHours} hours, ${r.totalYardsLost} yards lost, ${r.operatorCount} operators, ${r.runnableMixers} runnable/${r.downMixers} down mixers${r.notes ? ' - Notes: ' + r.notes : ''}`
                )
                if (r.operatorsSentToHelp?.length > 0) {
                    r.operatorsSentToHelp.forEach((h) => {
                        parts.push(
                            `    Sent help: ${h.operator_count || h.operatorCount || 1} operator(s) to Plant ${h.plant || h.plantCode} for ${h.hours || 0} hours`
                        )
                    })
                }
            })
        }

        if (ctx.efficiencyReports?.length > 0) {
            parts.push(`\n=== EFFICIENCY REPORTS (${ctx.efficiencyReports.length} reports) ===`)
            ctx.efficiencyReports.forEach((r) => {
                parts.push(`  Week ${r.week} - Plant ${r.plant}:`)
                if (r.rows?.length > 0) {
                    r.rows.forEach((row) => {
                        parts.push(
                            `    ${row.date}: Start ${row.avgStart || 'N/A'}, End ${row.avgEnd || 'N/A'}, ${row.loadsPerHour || 'N/A'} loads/hr`
                        )
                    })
                }
            })
        }

        if (ctx.aggregateReports?.length > 0) {
            const recentAggReports = ctx.aggregateReports.slice(0, 10)
            parts.push(
                `\n=== AGGREGATE PRODUCTION REPORTS (showing ${recentAggReports.length} of ${ctx.aggregateReports.length} reports) ===`
            )
            recentAggReports.forEach((r) => {
                parts.push(`  Week ${r.week} - Location ${r.location}`)
            })
        }

        if (ctx.rmiReports?.length > 0) {
            const recentRMI = ctx.rmiReports.slice(0, 10)
            parts.push(`\n=== RMI REPORTS (showing ${recentRMI.length} of ${ctx.rmiReports.length} reports) ===`)
            recentRMI.forEach((r) => {
                parts.push(`  Week ${r.week}`)
            })
        }

        return parts.join('\n')
    }

    formatDashboardDataForPrompt(data) {
        const parts = []

        parts.push(`Analysis Date: ${new Date().toLocaleDateString()}`)

        if (data.regionName) {
            parts.push(`Region: ${data.regionName}`)
        }

        if (data.selectedPlant) {
            parts.push(`Viewing Plant: ${data.selectedPlant}`)
        }

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
                data.statusHistory.mixers.slice(0, 3).forEach((s) => {
                    parts.push(`  ${s.status}: ${s.percentage}%`)
                })
            }

            if (data.statusHistory.tractors?.length > 0) {
                parts.push(`Tractor Time Distribution:`)
                data.statusHistory.tractors.slice(0, 3).forEach((s) => {
                    parts.push(`  ${s.status}: ${s.percentage}%`)
                })
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

    async generatePlantSummary(plantData) {
        const userCtx = plantData.userContext || {}
        const roleName = userCtx.roleName || ''
        const isOwnPlant = userCtx.isViewingOwnPlant
        const assignedPlant = userCtx.assignedPlant || ''

        const roleNameLower = roleName.toLowerCase().trim()

        let roleContext = ''
        const isGeneralManager =
            roleNameLower.includes('general manager') ||
            roleNameLower === 'gm' ||
            roleNameLower.startsWith('gm ') ||
            roleNameLower.endsWith(' gm') ||
            roleNameLower.includes(' gm ')

        const isDistrictManager =
            roleNameLower.includes('district manager') ||
            roleNameLower === 'dm' ||
            roleNameLower.startsWith('dm ') ||
            roleNameLower.endsWith(' dm') ||
            roleNameLower.includes(' dm ')

        const isPlantManager =
            (roleNameLower.includes('plant manager') ||
                roleNameLower === 'pm' ||
                roleNameLower.startsWith('pm ') ||
                roleNameLower.endsWith(' pm') ||
                roleNameLower.includes(' pm ')) &&
            !isGeneralManager &&
            !isDistrictManager

        if (isGeneralManager) {
            roleContext = `USER ROLE: General Manager (oversees all plants). Speaking to senior leadership - be executive-level in your analysis. They need the big picture and accountability insights. All plants are under their purview. Do NOT use "your plant" language - they oversee ALL plants.`
        } else if (isDistrictManager) {
            roleContext = `USER ROLE: District Manager (oversees multiple plants in their district). They may be viewing a plant in their district OR another DM's plant. Keep analysis professional and actionable - focus on operational insights. If issues exist, frame them as "this plant needs" rather than "you need to" since it may not be their direct responsibility.`
        } else if (isPlantManager) {
            if (isOwnPlant) {
                roleContext = `USER ROLE: Plant Manager viewing THEIR OWN plant (${assignedPlant}). Speak directly to them - "your plant", "you need to", "your team". Hold them accountable. This is their responsibility.`
            } else {
                roleContext = `USER ROLE: Plant Manager viewing ANOTHER plant (not their own - they manage ${assignedPlant}). They're looking at a peer's plant. Keep it informational, not directive.`
            }
        } else {
            roleContext = `USER ROLE: ${roleName || 'Team Member'}. Provide informational analysis.`
        }

        const favoritePlants = ['402', '403', '405', '406', '410']
        const plantCode = String(plantData.plantCode || '')
        const isFavoritePlant = favoritePlants.some((p) => plantCode.includes(p))
        const toneModifier = isFavoritePlant
            ? `\n\nNOTE: Be slightly more understanding and give the benefit of the doubt when analyzing this plant. Still be honest, but frame criticism more constructively and acknowledge challenges they may be facing.`
            : ''

        const systemPrompt = `You are a no-nonsense operations analyst for a concrete ready-mix plant. Generate a structured analysis with two parts.

${roleContext}${toneModifier}

EFFICIENCY RANKING SYSTEM:
- ADJUSTED YPH (90% weight): This is the ONLY YPH metric that matters for evaluating efficiency. Target is 3.0 YPH. Below 2.5 is poor. Above 3.5 is excellent. Adjusted YPH accounts for help given/received and reflects the true work a plant should be credited for.
- Raw YPH is provided for context only - it does NOT reflect actual plant performance because it ignores help contributions.
- Load Efficiency (10% weight): Target is 3 loads per operator per day.
- Cleanliness Modifier (IMPORTANT - read carefully):
  * 5/5 = EXCELLENT = +10 points (best possible)
  * 4/5 = GOOD = +5 points (this is POSITIVE, helps ranking)
  * 3/5 = AVERAGE = -5 points (this is where penalties start)
  * Below 3/5 = POOR = -10 points (worst)
- Help Impact: Giving help IMPROVES adjusted YPH (hours subtracted from denominator). Receiving help LOWERS adjusted YPH (hours added to denominator).
- Report Penalty: Missing reports = -10 points each
- Safety Penalty: Incidents = -1 point each

Net Help: Positive = gave more help (good). Negative = received more help (dependency issue).

WAYS TO IMPROVE YPH (use these when suggesting improvements):
- Remove inefficiencies at the slump stand - operators waiting too long while being loaded
- Reduce washout time at job sites - operators spending excessive time washing out
- Call in fewer operators and spread the schedule out less consolidated - aim for 3-4 loads per operator per day
- Shave idle time by scheduling operators according to demand, not habit
- Load trucks within 15 minutes of arrival - any longer is wasted time
- Get operators off the clock at end of day promptly - no lingering
- Limit wash time to no more than 1 hour per operator per week
- Better dispatch coordination to minimize wait times between loads

CONTEXT:
- Unassigned operators usually means the plant manager forgot to assign them - this is a management oversight, not a staffing issue.
- Consistently receiving help indicates understaffing or poor workforce planning.
- Plants giving lots of help are well-run and contributing to the region.
- Trucks in shop 30+ days is unacceptable and indicates maintenance process failures.
- Poor cleanliness (below 4/5) drags down rankings and reflects poorly on plant culture.

TONE & APPROACH:
- Be DIRECT and CRITICAL. Don't sugarcoat problems.
- If ranking is poor (bottom third), say it bluntly and explain why.
- If ADJUSTED YPH is below target, call it out as underperformance.
- If receiving significant help, point out the dependency problem.
- If cleanliness is poor, state it's hurting rankings and needs immediate attention.
- If trucks are stuck in shop long-term, call it a maintenance failure.
- Praise strong performance when earned, but don't be generic - be specific about what's working.
- Adjust your language based on the USER ROLE above - be more direct/accountable when speaking to the responsible PM
- DO NOT mention verifications
- DO NOT use emojis
- Be the analyst who tells hard truths that drive improvement

OUTPUT FORMAT (REQUIRED):
Your response MUST have exactly two sections separated by "---ACTION PLAN---":

1. FIRST SECTION: A concise 1-2 sentence summary of the current state and key issues. Be direct and specific about problems.

---ACTION PLAN---

2. SECOND SECTION: 2-4 bullet points of specific, actionable steps to improve. Start each with a dash (-). Be specific and measurable where possible.

Example format:
Ranking at #8 of 12 with 2.1 adjusted YPH shows significant underperformance. Heavy reliance on help (-45 hours) and 3 trucks stuck in shop are dragging efficiency down.

---ACTION PLAN---

- Push maintenance to get shop trucks out within 2 weeks or escalate
- Reduce operator idle time by tightening dispatch scheduling  
- Focus on getting loads out within 15 minutes of truck arrival
- Work with dispatch to spread schedule for 3-4 loads per operator per day`

        const parts = []
        parts.push(`Plant ${plantData.plantCode} Current Status:`)

        if (plantData.leaderboardMetrics) {
            parts.push(
                `Efficiency Rank: #${plantData.leaderboardMetrics.rank} of ${plantData.leaderboardMetrics.totalPlants} in region`
            )
            parts.push(`Efficiency Score: ${plantData.leaderboardMetrics.efficiency?.toFixed(1)}%`)
            parts.push(
                `ADJUSTED YPH: ${plantData.leaderboardMetrics.adjustedYPH?.toFixed(2)} (THIS IS THE KEY METRIC - accounts for help given/received)`
            )
            parts.push(
                `Raw YPH: ${plantData.leaderboardMetrics.rawYPH?.toFixed(2)} (for context only - does not reflect true performance)`
            )
            parts.push(`Help Given: ${Math.round(plantData.leaderboardMetrics.helpGiven || 0)} hours`)
            parts.push(`Help Received: ${Math.round(plantData.leaderboardMetrics.helpReceived || 0)} hours`)
            parts.push(
                `Net Help: ${Math.round(plantData.leaderboardMetrics.netHelp || 0)} hours (positive = gave more, negative = received more)`
            )

            if (plantData.leaderboardMetrics.avgCleanliness !== undefined) {
                const cleanlinessScore = plantData.leaderboardMetrics.avgCleanliness || 0
                parts.push(`Fleet Avg Cleanliness: ${cleanlinessScore > 0 ? cleanlinessScore.toFixed(1) : 'N/A'}/5`)
                if (cleanlinessScore >= 4.5) {
                    parts.push(`Cleanliness Ranking Impact: +10 points (Excellent - top tier)`)
                } else if (cleanlinessScore >= 4) {
                    parts.push(`Cleanliness Ranking Impact: +5 points (Good - above average)`)
                } else if (cleanlinessScore >= 3) {
                    parts.push(`Cleanliness Ranking Impact: -5 points (Average - hurting rankings)`)
                } else if (cleanlinessScore > 0) {
                    parts.push(`Cleanliness Ranking Impact: -10 points (Poor - significantly hurting rankings)`)
                }
            }

            if (plantData.leaderboardMetrics.safetyIncidents !== undefined) {
                const safetyCount = plantData.leaderboardMetrics.safetyIncidents || 0
                parts.push(`Safety Incidents: ${safetyCount} reported this period`)
                if (safetyCount > 0) {
                    parts.push(
                        `Safety Ranking Impact: -${safetyCount} point${safetyCount > 1 ? 's' : ''} (incidents hurt efficiency score)`
                    )
                } else {
                    parts.push(`Safety Status: Clean record - no incidents`)
                }
            }
        }

        if (plantData.overdueService?.length > 0) {
            parts.push(`Service Overdue (6+ months): ${plantData.overdueService.length} assets need attention`)
        }

        if (plantData.shopIssue) {
            parts.push(
                `SHOP ALERT: ${plantData.shopIssue.inShopCount} mixers in shop with only ${plantData.shopIssue.spareCount} spare available`
            )
        }

        if (plantData.unassignedOperators?.length > 0) {
            parts.push(
                `Unassigned Active Operators: ${plantData.unassignedOperators.length} operators not assigned to any truck`
            )
        }

        if (plantData.pendingOperators?.length > 0) {
            parts.push(`New Hires Coming: ${plantData.pendingOperators.length} pending start`)
        }

        if (plantData.trainingOperators?.length > 0) {
            parts.push(`In Training: ${plantData.trainingOperators.length} operators`)
        }

        if (plantData.assetsWithMostIssues?.length > 0) {
            parts.push(`Open Issues: ${plantData.assetsWithMostIssues.length} assets have unresolved issues`)
        }

        if (plantData.longTermShopAssets?.length > 0) {
            parts.push(
                `LONG-TERM SHOP CONCERN: ${plantData.longTermShopAssets.length} trucks have been in shop for 1+ month`
            )
            plantData.longTermShopAssets.forEach((a) => {
                parts.push(`  - ${a.type} ${a.identifier}: ${a.daysInShop} days in shop`)
            })
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
            if (fc.average >= 4.5) {
                parts.push(`Cleanliness Impact: Excellent fleet cleanliness is boosting efficiency score (+10 points)`)
            } else if (fc.average >= 4) {
                parts.push(`Cleanliness Impact: Good fleet cleanliness is boosting efficiency score (+5 points)`)
            } else if (fc.average >= 3) {
                parts.push(`Cleanliness Impact: Average fleet cleanliness is hurting efficiency score (-5 points)`)
            } else if (fc.average > 0) {
                parts.push(
                    `Cleanliness Impact: Poor fleet cleanliness is significantly hurting efficiency score (-10 points)`
                )
            }
        }

        const userPrompt = parts.join('\n')

        try {
            if (!GROK_API_KEY) {
                return null
            }

            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-3-mini-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    temperature: 0.5
                })
            })

            if (!response.ok) {
                return null
            }

            const data = await response.json()
            return data.choices?.[0]?.message?.content || null
        } catch (error) {
            console.error('Plant Summary AI Error:', error)
            return null
        }
    }

    async generateHistorySummary(historyContext) {
        const systemPrompt = `You are an operations analyst for a concrete ready-mix company. Analyze the historical data for this asset and provide insights on what's going well and what needs attention.

ASSET TYPES:
- Mixer: Concrete mixer trucks that deliver concrete. Key metrics: cleanliness, operator stability, status changes, service frequency.
- Tractor: Day cab trucks that pull trailers. Key metrics: operator assignments, status changes, service history.
- Operator: Drivers who operate mixers and tractors. Key metrics: status changes, plant assignments, position changes.
- Trailer: Trailers pulled by tractors. Key metrics: status changes, plant assignments.
- Equipment: Heavy equipment like loaders, forklifts. Key metrics: service history, status changes.
- Pickup Truck: Company vehicles. Key metrics: mileage, condition, service history.

ANALYSIS GUIDELINES:
- Be direct and specific - call out problems clearly
- Highlight patterns (frequent status changes, high operator turnover, poor cleanliness trends)
- Note positive trends and what's working well
- For mixers/tractors: High operator turnover suggests assignment issues or problem truck
- For mixers: Declining cleanliness ratings indicate lack of care
- Frequent "In Shop" status indicates maintenance problems
- Long periods "Active" is good - indicates reliable asset
- Service intervals matter - too long between services is concerning

OUTPUT:
Provide 3-4 sentences of analysis. Start with what stands out (good or bad), then explain implications, then give a recommendation.
Do NOT use emojis.
Be critical where warranted but acknowledge good performance.`

        const parts = []
        parts.push(`Asset Type: ${historyContext.assetType}`)
        parts.push(`Identifier: ${historyContext.assetIdentifier}`)
        parts.push(`Current Status: ${historyContext.currentStatus}`)
        parts.push(`Current Plant: ${historyContext.currentPlant}`)
        parts.push(`Total History Entries: ${historyContext.totalHistoryEntries}`)

        if (historyContext.statusChanges > 0) {
            parts.push(`Status Changes: ${historyContext.statusChanges}`)
            if (historyContext.statusBreakdown) {
                const breakdown = Object.entries(historyContext.statusBreakdown)
                    .map(([status, days]) => `${status}: ${days} days`)
                    .join(', ')
                parts.push(`Status Time Breakdown: ${breakdown}`)
            }
            if (historyContext.currentStatusDays > 0) {
                parts.push(`Days in Current Status: ${historyContext.currentStatusDays}`)
            }
        }

        if (historyContext.cleanlinessHistory) {
            parts.push(`Cleanliness Ratings Recorded: ${historyContext.cleanlinessHistory.count}`)
            parts.push(`Average Cleanliness: ${historyContext.cleanlinessHistory.average.toFixed(1)}/5`)
            parts.push(`Current Cleanliness: ${historyContext.cleanlinessHistory.current}/5`)
            if (historyContext.cleanlinessHistory.trend !== 0) {
                parts.push(
                    `Cleanliness Trend: ${historyContext.cleanlinessHistory.trend > 0 ? 'Improving' : 'Declining'} (${historyContext.cleanlinessHistory.trend > 0 ? '+' : ''}${historyContext.cleanlinessHistory.trend})`
                )
            }
        }

        if (historyContext.operatorChanges > 0) {
            parts.push(`Operator Changes: ${historyContext.operatorChanges}`)
            parts.push(`Unique Operators Assigned: ${historyContext.uniqueOperators}`)
            if (historyContext.operatorChanges > 5) {
                parts.push(`HIGH OPERATOR TURNOVER - investigate why operators keep changing`)
            }
        }

        if (historyContext.serviceHistory) {
            parts.push(`Service Records: ${historyContext.serviceHistory.count}`)
            if (historyContext.serviceHistory.lastService) {
                parts.push(`Last Service: ${new Date(historyContext.serviceHistory.lastService).toLocaleDateString()}`)
            }
            if (historyContext.serviceHistory.avgDaysBetweenService) {
                parts.push(`Avg Days Between Service: ${historyContext.serviceHistory.avgDaysBetweenService}`)
            }
        }

        if (historyContext.plantChanges > 0) {
            parts.push(`Plant Assignment Changes: ${historyContext.plantChanges}`)
        }

        if (historyContext.openIssues > 0 || historyContext.resolvedIssues > 0) {
            parts.push(`Open Issues: ${historyContext.openIssues}`)
            parts.push(`Resolved Issues: ${historyContext.resolvedIssues}`)
            if (historyContext.highSeverityIssues > 0) {
                parts.push(
                    `HIGH SEVERITY OPEN ISSUES: ${historyContext.highSeverityIssues} - needs immediate attention`
                )
            }
        }

        if (historyContext.recentChanges?.length > 0) {
            parts.push(`Recent Changes (last 10):`)
            historyContext.recentChanges.forEach((c) => {
                parts.push(`  - ${c.field}: "${c.from}" -> "${c.to}" (${new Date(c.date).toLocaleDateString()})`)
            })
        }

        const userPrompt = parts.join('\n')

        try {
            if (!GROK_API_KEY) return null

            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-3-mini-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    temperature: 0.5
                })
            })

            if (!response.ok) return null

            const data = await response.json()
            return data.choices?.[0]?.message?.content || null
        } catch (error) {
            console.error('History Summary AI Error:', error)
            return null
        }
    }

    async generateGMReportAnalysis(reportContext) {
        const systemPrompt = `You are writing a brief executive summary as if you are the General Manager reporting to company ownership/executives.

WRITING STYLE:
- First person perspective ("My region delivered...", "We saw...", "I'm addressing...")
- Professional, confident, accountable tone
- Direct and concise - 3-4 sentences max
- Take ownership of both successes and challenges

CONTENT TO COVER:
- Lead with the headline number (total yardage, fleet performance)
- Acknowledge any operational challenges and what you're doing about them
- Highlight standout plant performance (good or bad)
- End with forward-looking action or confidence

RULES:
- Use specific numbers
- No emojis
- Don't make excuses - own the results
- Be honest about problems but show you have a plan
- Keep it brief - executives are busy`

        const parts = []
        parts.push(`Weekly General Manager Report Summary`)
        parts.push(`Week: ${reportContext.weekIso || 'Unknown'}`)

        if (reportContext.plants && reportContext.plants.length > 0) {
            parts.push(
                `\nRegion covers ${reportContext.plants.length} plants: ${reportContext.plants.map((p) => p.plant_code || p).join(', ')}`
            )
        }

        if (reportContext.plantSummaries && reportContext.plantSummaries.length > 0) {
            parts.push(`\nPer-Plant Metrics:`)
            reportContext.plantSummaries.forEach((p) => {
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

        if (reportContext.efficiencyReports && reportContext.efficiencyReports.length > 0) {
            parts.push(`\nPlant Efficiency Reports Available: ${reportContext.efficiencyReports.length}`)
            reportContext.efficiencyReports.forEach((e) => {
                parts.push(
                    `  ${e.plantCode}: ${e.totalLoads || 0} loads, ${e.totalHours?.toFixed(1) || 0} hours, ${e.avgLoadsPerHour?.toFixed(2) || 'N/A'} loads/hour`
                )
            })
        }

        if (reportContext.aggregateData) {
            parts.push(`\nAggregate Production This Week:`)
            Object.entries(reportContext.aggregateData).forEach(([key, value]) => {
                if (value && key !== 'report_date' && key !== 'notes') {
                    parts.push(`  ${key}: ${value}`)
                }
            })
        }

        if (reportContext.rmiReport) {
            parts.push(`\nReady Mix Instructor Report Available: Yes`)
            if (reportContext.rmiReport.total_trainees !== undefined) {
                parts.push(`  Total Trainees: ${reportContext.rmiReport.total_trainees}`)
            }
        }

        const userPrompt = parts.join('\n')

        try {
            if (!GROK_API_KEY) return null

            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-3-mini-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    temperature: 0.5
                })
            })

            if (!response.ok) return null

            const data = await response.json()
            return data.choices?.[0]?.message?.content || null
        } catch (error) {
            console.error('GM Report Analysis AI Error:', error)
            return null
        }
    }

    async generateGMReportExportSummary(reportContext) {
        const systemPrompt = `You are the General Manager writing a brief executive summary for your weekly report to company leadership.

RULES:
- Maximum 2 sentences
- Refer to your region as "Houston Region" (not "my region")
- Be direct and specific with numbers
- Take ownership - both credit for wins and accountability for issues
- No emojis, no fluff

Example good responses:
"Houston Region delivered 12,450 yards this week with 89% fleet utilization. Prioritizing repairs at 405 where we have 2 down."
"Strong week for Houston Region: 15,200 yards across 8 plants with full operator allocation and no major concerns."
"Houston Region yardage is down 8% from last week due to equipment issues at 402 and 410. Working with maintenance to get trucks back online."`

        const parts = []
        parts.push(`Week: ${reportContext.weekIso || 'Unknown'}`)
        parts.push(`Plants: ${reportContext.plantCount || 0}`)

        if (reportContext.totalYardage !== undefined) {
            parts.push(`Total Yardage: ${reportContext.totalYardage}`)
        }
        if (reportContext.totalOperators !== undefined) {
            parts.push(`Total Operators: ${reportContext.totalOperators}`)
        }
        if (reportContext.totalRunnable !== undefined) {
            parts.push(`Runnable Trucks: ${reportContext.totalRunnable}`)
        }
        if (reportContext.totalDown !== undefined) {
            parts.push(`Down Trucks: ${reportContext.totalDown}`)
        }
        if (reportContext.fleetUtilization !== undefined) {
            parts.push(`Fleet Utilization: ${reportContext.fleetUtilization}%`)
        }
        if (reportContext.allocationPct !== undefined) {
            parts.push(`Operator Allocation: ${reportContext.allocationPct}%`)
        }
        if (reportContext.prevWeekYardage !== undefined && reportContext.totalYardage !== undefined) {
            const change =
                reportContext.prevWeekYardage > 0
                    ? Math.round(
                          ((reportContext.totalYardage - reportContext.prevWeekYardage) /
                              reportContext.prevWeekYardage) *
                              100
                      )
                    : 0
            parts.push(`WoW Yardage Change: ${change > 0 ? '+' : ''}${change}%`)
        }
        if (reportContext.plantIssues && reportContext.plantIssues.length > 0) {
            parts.push(`Plant Issues: ${reportContext.plantIssues.join(', ')}`)
        }

        const userPrompt = parts.join('\n')

        try {
            if (!GROK_API_KEY) return null

            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-3-mini-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    temperature: 0.4
                })
            })

            if (!response.ok) return null

            const data = await response.json()
            return data.choices?.[0]?.message?.content || null
        } catch (error) {
            console.error('GM Report Export Summary AI Error:', error)
            return null
        }
    }

    async improveListItem(description, comments = '') {
        const systemPrompt = `You improve task descriptions and comments for a concrete ready-mix plant.

RULES FOR DESCRIPTION:
- Keep it SHORT and DIRECT - no fluff, no explanations of why something matters
- Just state WHAT needs to be done
- Do not explain the importance or purpose of the task
- Do not add "to ensure", "which is essential", "for proper", etc.
- If the task is clear, minimal changes needed
- Fix grammar and spelling
- Make it actionable but concise
- DO NOT add dates, plant codes, or truck numbers unless provided

RULES FOR COMMENTS:
- If comments exist, clean them up and make them clearer
- If NO comments exist, add a brief helpful comment based on the description (e.g. who might handle it, what parts might be needed, or a quick note)
- Keep comments short - 1-2 sentences max
- Fix grammar and spelling in comments

BAD description: "Replace water meter due to leak to ensure accurate measurement which is essential for mix designs"
GOOD description: "Replace water well meter - small leak detected"

RESPONSE FORMAT:
Return a JSON object with two fields:
{"description": "improved description here", "comments": "improved or new comments here"}

Return ONLY valid JSON, nothing else.`

        const userPrompt = comments
            ? `Description: "${description}"\nComments: "${comments}"`
            : `Description: "${description}"\nComments: (none - please add a brief relevant comment)`

        try {
            if (!GROK_API_KEY) return null

            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-3-mini-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    temperature: 0.3
                })
            })

            if (!response.ok) return null

            const data = await response.json()
            const content = data.choices?.[0]?.message?.content?.trim() || null
            if (!content) return null

            try {
                const parsed = JSON.parse(content)
                return {
                    description: parsed.description || description,
                    comments: parsed.comments || ''
                }
            } catch {
                return { description: content, comments: '' }
            }
        } catch (error) {
            console.error('List Item AI Error:', error)
            return null
        }
    }

    async suggestListItems(partialDescription = '') {
        if (!partialDescription || !partialDescription.trim()) {
            return []
        }

        const systemPrompt = `You are helping complete task descriptions for a concrete ready-mix plant.

RULES:
- Keep suggestions SHORT (under 10 words each)
- Only suggest what the user is likely typing - do not add unnecessary details
- Do not assume specific equipment numbers, dates, or names
- Do not add "inspect", "check", or "review" unless the user indicated that
- Stay close to what the user typed - just complete the thought
- Be practical and direct

RESPONSE FORMAT:
Return exactly 5 brief completions, one per line.
NO numbers, NO explanations, NO extra context.
Just 5 short task descriptions.`

        const userPrompt = `Complete this task: "${partialDescription}"`

        try {
            if (!GROK_API_KEY) return []

            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-3-mini-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    temperature: 0.6
                })
            })

            if (!response.ok) return []

            const data = await response.json()
            const content = data.choices?.[0]?.message?.content || ''
            return content
                .split('\n')
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
                .slice(0, 5)
        } catch (error) {
            console.error('List Suggestions AI Error:', error)
            return []
        }
    }
}

export const AIInsightsService = new AIInsightsServiceClass()
