const GROK_API_KEY = process.env.REACT_APP_GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

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
If everything looks good, respond with: [i] No significant issues detected at this time.`;

        const userPrompt = this.formatDashboardDataForPrompt(dashboardData);

        try {
            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROK_API_KEY}`
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
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Grok API Error Response:', response.status, errorText);
                let errorMessage = 'Failed to generate insights';
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error && errorData.error.includes('credit')) {
                        errorMessage = 'AI service requires credits. Please contact your administrator.';
                    } else {
                        errorMessage = errorData.error?.message || errorData.message || errorData.error || errorMessage;
                    }
                } catch {
                    errorMessage = `API Error: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'Unable to generate insights at this time.';
        } catch (error) {
            console.error('AI Insights Error:', error);
            throw error;
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

Answer questions using the provided data. If specific data needed to answer isn't in the context, explain what data would be needed. Do not use markdown formatting.`;

        const formattedContext = this.selectRelevantContext(question, contextData);
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: formattedContext }
        ];

        conversationHistory.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });

        try {
            if (!GROK_API_KEY) {
                console.error('REACT_APP_GROK_API_KEY not set');
                return 'AI not configured. Restart dev server.';
            }
            
            console.log('AI Agent - Sending request with context size:', formattedContext.length);
            
            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-4',
                    messages,
                    stream: false,
                    temperature: 0.3
                })
            });

            if (response.status === 429) {
                return 'Rate limited. Please wait a moment and try again.';
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                return 'Error connecting to AI service.';
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'Could not process that question.';
        } catch (error) {
            console.error('AI Error:', error);
            return 'Error connecting to AI service.';
        }
    }

    selectRelevantContext(question, ctx) {
        const q = question.toLowerCase();
        const parts = [];
        
        parts.push(`Region: ${ctx.regionName || 'Unknown'}, Date: ${ctx.currentDate || new Date().toISOString().slice(0, 10)}`);
        
        const mentionsSpecificTruck = q.match(/\b\d{3,5}\b/);
        const mentionsPlant = q.match(/\b(40[1-8]|410|45[35]|46[18]|455)\b/);
        const mentionsOperatorName = ctx.allOperatorsList?.find(o => q.includes(o.name?.toLowerCase()));
        
        if (mentionsSpecificTruck) {
            const truckNum = mentionsSpecificTruck[0];
            const mixer = ctx.allMixersList?.find(m => String(m.truckNumber) === truckNum || String(m.truckNumber).includes(truckNum));
            if (mixer) {
                parts.push(`Mixer ${mixer.truckNumber}: ${mixer.status} at Plant ${mixer.plant}, Operator: ${mixer.operatorName || 'Unassigned'}, VIN: ${mixer.vin || 'N/A'}, Make: ${mixer.make || 'N/A'}, Model: ${mixer.model || 'N/A'}, Year: ${mixer.year || 'N/A'}, Last Service: ${mixer.lastServiceDate?.slice(0,10) || 'N/A'}`);
            }
            const tractor = ctx.allTractorsList?.find(t => String(t.truckNumber) === truckNum || String(t.truckNumber).includes(truckNum));
            if (tractor) {
                parts.push(`Tractor ${tractor.truckNumber}: ${tractor.status} at Plant ${tractor.plant}, Operator: ${tractor.operatorName || 'Unassigned'}, Type: ${tractor.type || 'N/A'}`);
            }
            const history = ctx.operatorAssignmentHistory?.filter(h => String(h.truckNumber) === truckNum || String(h.truckNumber).includes(truckNum)) || [];
            if (history.length > 0) {
                const operators = [...new Set(history.map(h => h.newOperator).filter(o => o && o !== 'None' && o !== 'Unknown Operator'))];
                if (operators.length > 0) {
                    parts.push(`Operators who have driven ${truckNum}: ${operators.join(', ')}`);
                }
            }
        }
        
        if (mentionsOperatorName) {
            const op = mentionsOperatorName;
            parts.push(`Operator ${op.name}: ${op.status} at Plant ${op.plant}, Position: ${op.position || 'Operator'}`);
            const assignedMixer = ctx.allMixersList?.find(m => m.operatorName === op.name);
            if (assignedMixer) {
                parts.push(`${op.name} is currently driving Mixer ${assignedMixer.truckNumber} at Plant ${assignedMixer.plant}`);
            }
            const assignedTractor = ctx.allTractorsList?.find(t => t.operatorName === op.name);
            if (assignedTractor) {
                parts.push(`${op.name} is currently driving Tractor ${assignedTractor.truckNumber} at Plant ${assignedTractor.plant}`);
            }
        }
        
        if (q.includes('fleet') || q.includes('status') || q.includes('how many') || q.includes('total')) {
            if (ctx.mixerStats) parts.push(`Mixers: ${ctx.mixerStats.total} total, ${ctx.mixerStats.active} active, ${ctx.mixerStats.inShop} in shop, ${ctx.mixerStats.spare} spare`);
            if (ctx.tractorStats) parts.push(`Tractors: ${ctx.tractorStats.total} total, ${ctx.tractorStats.active} active, ${ctx.tractorStats.inShop} in shop`);
            if (ctx.trailerStats) parts.push(`Trailers: ${ctx.trailerStats.total} total, ${ctx.trailerStats.active} active`);
            if (ctx.operatorStats) parts.push(`Operators: ${ctx.operatorStats.total} total, ${ctx.operatorStats.active} active`);
        }
        
        if (q.includes('operator') && mentionsPlant) {
            const plantCode = mentionsPlant[0];
            const ops = ctx.allOperatorsList?.filter(o => String(o.plant) === plantCode) || [];
            if (ops.length > 0) {
                parts.push(`Operators at Plant ${plantCode}: ${ops.map(o => o.name).join(', ')}`);
            }
        }
        
        if (q.includes('shop')) {
            if (ctx.mixersInShop?.length > 0) {
                parts.push(`Mixers in shop: ${ctx.mixersInShop.map(m => `${m.truckNumber} (${m.plant})`).join(', ')}`);
            }
        }
        
        if (q.includes('yard') || q.includes('report') || q.includes('production')) {
            if (mentionsPlant) {
                const plantCode = mentionsPlant[0];
                const reports = ctx.plantManagerReports?.filter(r => String(r.plant) === plantCode).slice(0, 5) || [];
                reports.forEach(r => parts.push(`Week ${r.week} Plant ${r.plant}: ${r.yardage} yards, ${r.totalHours} hours`));
            } else {
                const latestWeek = ctx.plantManagerReports?.[0]?.week;
                if (latestWeek) {
                    const weekReports = ctx.plantManagerReports.filter(r => r.week === latestWeek);
                    const totalYards = weekReports.reduce((sum, r) => sum + (r.yardage || 0), 0);
                    parts.push(`Week ${latestWeek}: ${totalYards} total yards across ${weekReports.length} plants`);
                }
            }
        }
        
        console.log('AI Agent - Context size:', parts.join('\n').length, 'chars');
        return parts.join('\n');
    }

    formatContextForFollowUp(ctx) {
        const parts = [];
        
        parts.push(`Region: ${ctx.regionName || 'Unknown'}`);
        if (ctx.selectedPlant) parts.push(`Selected Plant: ${ctx.selectedPlant}`);
        if (ctx.currentDate) parts.push(`Current Date: ${ctx.currentDate}`);
        
        parts.push(`\n=== CURRENT FLEET STATUS ===`);
        
        if (ctx.mixerStats) {
            parts.push(`MIXERS: ${ctx.mixerStats.total} total, ${ctx.mixerStats.active} active, ${ctx.mixerStats.inShop} in shop, ${ctx.mixerStats.spare} spare`);
            parts.push(`  Service Overdue: ${ctx.mixerStats.serviceOverdue || 0}, Open Issues: ${ctx.mixerStats.openIssues || 0}`);
        }
        if (ctx.tractorStats) {
            parts.push(`TRACTORS: ${ctx.tractorStats.total} total, ${ctx.tractorStats.active} active, ${ctx.tractorStats.inShop} in shop, ${ctx.tractorStats.spare} spare`);
            parts.push(`  Types: End Dump: ${ctx.tractorStats.endDump || 0}, Cement Hauler: ${ctx.tractorStats.cementHauler || 0}, Dump Truck: ${ctx.tractorStats.dumpTruck || 0}`);
            parts.push(`  Service Overdue: ${ctx.tractorStats.serviceOverdue || 0}, Open Issues: ${ctx.tractorStats.openIssues || 0}`);
        }
        if (ctx.trailerStats) {
            parts.push(`TRAILERS: ${ctx.trailerStats.total} total, ${ctx.trailerStats.active} active, ${ctx.trailerStats.inShop} in shop, ${ctx.trailerStats.spare} spare`);
            parts.push(`  Service Overdue: ${ctx.trailerStats.serviceOverdue || 0}, Open Issues: ${ctx.trailerStats.openIssues || 0}`);
        }
        if (ctx.equipmentStats) {
            parts.push(`EQUIPMENT: ${ctx.equipmentStats.total} total, ${ctx.equipmentStats.active} active, ${ctx.equipmentStats.inShop} in shop, ${ctx.equipmentStats.spare} spare`);
            parts.push(`  Service Overdue: ${ctx.equipmentStats.serviceOverdue || 0}, Open Issues: ${ctx.equipmentStats.openIssues || 0}`);
        }
        if (ctx.pickupStats) {
            parts.push(`PICKUP TRUCKS: ${ctx.pickupStats.total} total, ${ctx.pickupStats.active} active, ${ctx.pickupStats.inShop} in shop, ${ctx.pickupStats.spare} spare, ${ctx.pickupStats.stationary} stationary`);
        }
        
        if (ctx.operatorStats) {
            parts.push(`\n=== OPERATORS ===`);
            parts.push(`Total: ${ctx.operatorStats.total}, Active: ${ctx.operatorStats.active}, Training: ${ctx.operatorStats.training}, Pending Start: ${ctx.operatorStats.pending}`);
            parts.push(`Light Duty: ${ctx.operatorStats.lightDuty || 0}, Terminated: ${ctx.operatorStats.terminated || 0}`);
        }
        
        parts.push(`\n=== MAINTENANCE SUMMARY ===`);
        parts.push(`Total Service Overdue: ${ctx.totalServiceOverdue || 0}`);
        parts.push(`Total Open Maintenance Issues: ${ctx.totalOpenMaintenanceIssues || 0}`);
        
        if (ctx.mixersInShop?.length > 0) {
            parts.push(`\n=== MIXERS IN SHOP (${ctx.mixersInShop.length}) ===`);
            ctx.mixersInShop.forEach(m => {
                let line = `  Truck ${m.truckNumber} at Plant ${m.plant}`;
                if (m.enteredShopDate) line += ` (since ${m.enteredShopDate.slice(0, 10)})`;
                if (m.openIssues?.length > 0) line += ` - Issues: ${m.openIssues.join('; ')}`;
                parts.push(line);
            });
        }
        
        if (ctx.tractorsInShop?.length > 0) {
            parts.push(`\n=== TRACTORS IN SHOP (${ctx.tractorsInShop.length}) ===`);
            ctx.tractorsInShop.forEach(t => {
                let line = `  Truck ${t.truckNumber} (${t.type || 'Unknown Type'}) at Plant ${t.plant}`;
                if (t.enteredShopDate) line += ` (since ${t.enteredShopDate.slice(0, 10)})`;
                if (t.openIssues?.length > 0) line += ` - Issues: ${t.openIssues.join('; ')}`;
                parts.push(line);
            });
        }
        
        if (ctx.trailersInShop?.length > 0) {
            parts.push(`\n=== TRAILERS IN SHOP (${ctx.trailersInShop.length}) ===`);
            ctx.trailersInShop.forEach(t => {
                let line = `  Trailer ${t.trailerNumber} at Plant ${t.plant}`;
                if (t.enteredShopDate) line += ` (since ${t.enteredShopDate.slice(0, 10)})`;
                if (t.openIssues?.length > 0) line += ` - Issues: ${t.openIssues.join('; ')}`;
                parts.push(line);
            });
        }
        
        if (ctx.equipmentInShop?.length > 0) {
            parts.push(`\n=== EQUIPMENT IN SHOP (${ctx.equipmentInShop.length}) ===`);
            ctx.equipmentInShop.forEach(e => {
                let line = `  ${e.identifyingNumber} (${e.type || 'Unknown Type'}) at Plant ${e.plant}`;
                if (e.enteredShopDate) line += ` (since ${e.enteredShopDate.slice(0, 10)})`;
                if (e.openIssues?.length > 0) line += ` - Issues: ${e.openIssues.join('; ')}`;
                parts.push(line);
            });
        }
        
        if (ctx.mixersSpare?.length > 0) {
            parts.push(`\n=== SPARE MIXERS (${ctx.mixersSpare.length}) ===`);
            ctx.mixersSpare.forEach(m => {
                parts.push(`  Truck ${m.truckNumber} at Plant ${m.plant}`);
            });
        }
        
        if (ctx.tractorsSpare?.length > 0) {
            parts.push(`\n=== SPARE TRACTORS (${ctx.tractorsSpare.length}) ===`);
            ctx.tractorsSpare.forEach(t => {
                parts.push(`  Truck ${t.truckNumber} (${t.type || 'Unknown'}) at Plant ${t.plant}`);
            });
        }
        
        if (ctx.allMixersList?.length > 0) {
            parts.push(`\n=== ALL MIXERS - FULL DETAILS (${ctx.allMixersList.length}) ===`);
            ctx.allMixersList.forEach(m => {
                let details = `  Truck ${m.truckNumber}: ${m.status} at Plant ${m.plant}, Operator: ${m.operatorName || 'Unassigned'}`;
                if (m.vin) details += `, VIN: ${m.vin}`;
                if (m.make) details += `, Make: ${m.make}`;
                if (m.model) details += `, Model: ${m.model}`;
                if (m.year) details += `, Year: ${m.year}`;
                if (m.licensePlate) details += `, License: ${m.licensePlate}`;
                if (m.mileage) details += `, Mileage: ${m.mileage}`;
                if (m.drumCapacity) details += `, Capacity: ${m.drumCapacity} yards`;
                if (m.lastServiceDate) details += `, Last Service: ${m.lastServiceDate.slice(0, 10)}`;
                parts.push(details);
            });
        }
        
        if (ctx.allTractorsList?.length > 0) {
            parts.push(`\n=== ALL TRACTORS - FULL DETAILS (${ctx.allTractorsList.length}) ===`);
            ctx.allTractorsList.forEach(t => {
                let details = `  Truck ${t.truckNumber} (${t.type || 'Unknown'}): ${t.status} at Plant ${t.plant}, Operator: ${t.operatorName || 'Unassigned'}`;
                if (t.vin) details += `, VIN: ${t.vin}`;
                if (t.make) details += `, Make: ${t.make}`;
                if (t.model) details += `, Model: ${t.model}`;
                if (t.year) details += `, Year: ${t.year}`;
                if (t.licensePlate) details += `, License: ${t.licensePlate}`;
                if (t.mileage) details += `, Mileage: ${t.mileage}`;
                if (t.lastServiceDate) details += `, Last Service: ${t.lastServiceDate.slice(0, 10)}`;
                parts.push(details);
            });
        }

        if (ctx.allTrailersList?.length > 0) {
            parts.push(`\n=== ALL TRAILERS - FULL DETAILS (${ctx.allTrailersList.length}) ===`);
            ctx.allTrailersList.forEach(t => {
                let details = `  Trailer ${t.trailerNumber} (${t.type || 'Unknown'}): ${t.status} at Plant ${t.plant}`;
                if (t.vin) details += `, VIN: ${t.vin}`;
                if (t.make) details += `, Make: ${t.make}`;
                if (t.model) details += `, Model: ${t.model}`;
                if (t.year) details += `, Year: ${t.year}`;
                if (t.licensePlate) details += `, License: ${t.licensePlate}`;
                if (t.lastServiceDate) details += `, Last Service: ${t.lastServiceDate.slice(0, 10)}`;
                parts.push(details);
            });
        }

        if (ctx.allEquipmentList?.length > 0) {
            parts.push(`\n=== ALL EQUIPMENT - FULL DETAILS (${ctx.allEquipmentList.length}) ===`);
            ctx.allEquipmentList.forEach(e => {
                let details = `  ${e.identifyingNumber} (${e.type || 'Unknown'}): ${e.status} at Plant ${e.plant}`;
                if (e.make) details += `, Make: ${e.make}`;
                if (e.model) details += `, Model: ${e.model}`;
                if (e.year) details += `, Year: ${e.year}`;
                if (e.serialNumber) details += `, Serial: ${e.serialNumber}`;
                if (e.lastServiceDate) details += `, Last Service: ${e.lastServiceDate.slice(0, 10)}`;
                parts.push(details);
            });
        }

        if (ctx.allPickupsList?.length > 0) {
            parts.push(`\n=== ALL PICKUP TRUCKS - FULL DETAILS (${ctx.allPickupsList.length}) ===`);
            ctx.allPickupsList.forEach(p => {
                let details = `  Truck ${p.truckNumber}: ${p.status} at Plant ${p.plant}`;
                if (p.assignedTo) details += `, Assigned To: ${p.assignedTo}`;
                if (p.vin) details += `, VIN: ${p.vin}`;
                if (p.make) details += `, Make: ${p.make}`;
                if (p.model) details += `, Model: ${p.model}`;
                if (p.year) details += `, Year: ${p.year}`;
                if (p.licensePlate) details += `, License: ${p.licensePlate}`;
                if (p.mileage) details += `, Mileage: ${p.mileage}`;
                parts.push(details);
            });
        }

        const operatorTruckMap = [];
        if (ctx.allMixersList?.length > 0) {
            ctx.allMixersList.filter(m => m.operatorName && m.operatorName !== 'Unassigned').forEach(m => {
                operatorTruckMap.push({name: m.operatorName, truck: m.truckNumber, type: 'Mixer', plant: m.plant, status: m.status});
            });
        }
        if (ctx.allTractorsList?.length > 0) {
            ctx.allTractorsList.filter(t => t.operatorName && t.operatorName !== 'Unassigned').forEach(t => {
                operatorTruckMap.push({name: t.operatorName, truck: t.truckNumber, type: 'Tractor', plant: t.plant, status: t.status});
            });
        }
        if (operatorTruckMap.length > 0) {
            parts.push(`\n=== CURRENT OPERATOR TRUCK ASSIGNMENTS (${operatorTruckMap.length} assigned) ===`);
            operatorTruckMap.forEach(a => {
                parts.push(`  ${a.name} is driving ${a.type} ${a.truck} at Plant ${a.plant} (${a.status})`);
            });
        }

        if (ctx.allOperatorsList?.length > 0) {
            parts.push(`\n=== ALL OPERATORS - FULL DETAILS (${ctx.allOperatorsList.length}) ===`);
            ctx.allOperatorsList.forEach(o => {
                let details = `  ${o.name}: ${o.status} at Plant ${o.plant}, Position: ${o.position || 'Unknown'}`;
                if (o.hireDate) details += `, Hire Date: ${o.hireDate.slice(0, 10)}`;
                if (o.trainer) details += `, Trainer: ${o.trainer}`;
                parts.push(details);
            });
        }

        if (ctx.operatorAssignmentHistory?.length > 0) {
            parts.push(`\n=== OPERATOR ASSIGNMENT HISTORY (showing 50 of ${ctx.operatorAssignmentHistory.length} changes) ===`);
            ctx.operatorAssignmentHistory.slice(0, 50).forEach(h => {
                parts.push(`  ${h.changedAt?.slice(0, 10)}: ${h.assetType} ${h.truckNumber} at Plant ${h.plant} - Previous: ${h.previousOperator}, New: ${h.newOperator}`);
            });
            
            const truckOperatorMap = {};
            ctx.operatorAssignmentHistory.forEach(h => {
                const key = `${h.assetType} ${h.truckNumber}`;
                if (!truckOperatorMap[key]) truckOperatorMap[key] = new Set();
                if (h.previousOperator && h.previousOperator !== 'None' && h.previousOperator !== 'Unknown Operator') {
                    truckOperatorMap[key].add(h.previousOperator);
                }
                if (h.newOperator && h.newOperator !== 'None' && h.newOperator !== 'Unknown Operator') {
                    truckOperatorMap[key].add(h.newOperator);
                }
            });
            
            parts.push(`\n=== OPERATORS WHO HAVE DRIVEN EACH TRUCK (based on history) ===`);
            Object.keys(truckOperatorMap).sort().forEach(truck => {
                const operators = Array.from(truckOperatorMap[truck]);
                if (operators.length > 0) {
                    parts.push(`  ${truck}: ${operators.join(', ')}`);
                }
            });
        }
        
        if (ctx.operatorsTraining?.length > 0) {
            parts.push(`\n=== OPERATORS IN TRAINING (${ctx.operatorsTraining.length}) ===`);
            ctx.operatorsTraining.forEach(o => {
                parts.push(`  ${o.name} at Plant ${o.plant} (${o.position || 'Unknown Position'}), Trainer: ${o.trainer || 'Not Assigned'}`);
            });
        }
        
        if (ctx.operatorsPendingStart?.length > 0) {
            parts.push(`\n=== OPERATORS PENDING START (${ctx.operatorsPendingStart.length}) ===`);
            ctx.operatorsPendingStart.forEach(o => {
                parts.push(`  ${o.name} at Plant ${o.plant}, Start Date: ${o.pendingDate || 'TBD'}`);
            });
        }
        
        if (ctx.recentReports) {
            parts.push(`\n=== RECENT REPORTS (Last 4 Weeks) ===`);
            
            if (ctx.recentReports.plantManager?.length > 0) {
                parts.push(`\nPlant Manager Reports (${ctx.recentReports.plantManager.length}):`);
                ctx.recentReports.plantManager.forEach(r => {
                    parts.push(`  Week ${r.week}, Plant ${r.plant}: ${r.yardage || 0} yards, ${r.hours || 0} hrs, ${r.loadsLost || 0} loads lost`);
                });
            }
            
            if (ctx.recentReports.efficiency?.length > 0) {
                parts.push(`\nEfficiency Reports (${ctx.recentReports.efficiency.length}):`);
                ctx.recentReports.efficiency.forEach(r => {
                    parts.push(`  Week ${r.week}, Plant ${r.plant}: Start ${r.avgStartTime || 'N/A'}, End ${r.avgEndTime || 'N/A'}, ${r.loadsPerHour || 'N/A'} loads/hr`);
                });
            }
            
            if (ctx.recentReports.generalManager?.length > 0) {
                parts.push(`\nGeneral Manager Reports (${ctx.recentReports.generalManager.length}):`);
                ctx.recentReports.generalManager.forEach(r => {
                    parts.push(`  Week ${r.week}: ${r.totalYardage || 0} total yards, ${r.totalHours || 0} hours`);
                });
            }
        }
        
        if (ctx.pendingListItems?.length > 0) {
            parts.push(`\n=== PENDING LIST ITEMS (${ctx.pendingListItems.length}) ===`);
            ctx.pendingListItems.slice(0, 30).forEach(li => {
                let line = `  Plant ${li.plant}: ${li.description}`;
                if (li.deadline) line += ` (Due: ${li.deadline.slice(0, 10)})`;
                if (li.status) line += ` [${li.status}]`;
                if (li.responsible) line += ` - Assigned: ${li.responsible}`;
                parts.push(line);
            });
        }
        
        if (ctx.completedListItems?.length > 0) {
            parts.push(`\n=== RECENTLY COMPLETED LIST ITEMS (${ctx.completedListItems.length}) ===`);
            ctx.completedListItems.slice(0, 10).forEach(li => {
                parts.push(`  Plant ${li.plant}: ${li.description} (Completed: ${li.completedAt?.slice(0, 10) || 'N/A'})`);
            });
        }
        
        if (ctx.statusHistorySummary) {
            parts.push(`\n=== STATUS HISTORY SUMMARY (ALL TIME) ===`);
            
            const addSummary = (name, summary) => {
                parts.push(`\n${name}:`);
                parts.push(`  Total Status Changes: ${summary.totalChanges}, Entered Shop: ${summary.enteredShop}, Exited Shop: ${summary.exitedShop}`);
                if (Object.keys(summary.byPlant || {}).length > 0) {
                    parts.push(`  By Plant:`);
                    Object.entries(summary.byPlant).forEach(([plant, data]) => {
                        parts.push(`    Plant ${plant}: ${data.enteredShop} entered shop, ${data.exitedShop} exited shop, ${data.totalChanges} total changes`);
                    });
                }
            };
            
            if (ctx.statusHistorySummary.mixers) addSummary('Mixers', ctx.statusHistorySummary.mixers);
            if (ctx.statusHistorySummary.tractors) addSummary('Tractors', ctx.statusHistorySummary.tractors);
            if (ctx.statusHistorySummary.trailers) addSummary('Trailers', ctx.statusHistorySummary.trailers);
            if (ctx.statusHistorySummary.equipment) addSummary('Equipment', ctx.statusHistorySummary.equipment);
            if (ctx.statusHistorySummary.pickups) addSummary('Pickup Trucks', ctx.statusHistorySummary.pickups);
        }
        
        if (ctx.mixersHistory?.length > 0) {
            parts.push(`\n=== MIXER STATUS CHANGE HISTORY (${ctx.mixersHistory.length} records) ===`);
            ctx.mixersHistory.forEach(h => {
                parts.push(`  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`);
            });
        }
        
        if (ctx.tractorsHistory?.length > 0) {
            parts.push(`\n=== TRACTOR STATUS CHANGE HISTORY (${ctx.tractorsHistory.length} records) ===`);
            ctx.tractorsHistory.forEach(h => {
                parts.push(`  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`);
            });
        }
        
        if (ctx.trailersHistory?.length > 0) {
            parts.push(`\n=== TRAILER STATUS CHANGE HISTORY (${ctx.trailersHistory.length} records) ===`);
            ctx.trailersHistory.forEach(h => {
                parts.push(`  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`);
            });
        }
        
        if (ctx.equipmentHistory?.length > 0) {
            parts.push(`\n=== EQUIPMENT STATUS CHANGE HISTORY (${ctx.equipmentHistory.length} records) ===`);
            ctx.equipmentHistory.forEach(h => {
                parts.push(`  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`);
            });
        }
        
        if (ctx.pickupsHistory?.length > 0) {
            parts.push(`\n=== PICKUP TRUCK STATUS CHANGE HISTORY (${ctx.pickupsHistory.length} records) ===`);
            ctx.pickupsHistory.forEach(h => {
                parts.push(`  ${h.assetNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`);
            });
        }
        
        if (ctx.statusChangeHistory) {
            if (ctx.statusChangeHistory.mixers?.length > 0) {
                parts.push(`\n=== RECENT MIXER STATUS CHANGES ===`);
                ctx.statusChangeHistory.mixers.slice(0, 30).forEach(h => {
                    parts.push(`  Truck ${h.truckNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`);
                });
            }
            
            if (ctx.statusChangeHistory.tractors?.length > 0) {
                parts.push(`\n=== RECENT TRACTOR STATUS CHANGES ===`);
                ctx.statusChangeHistory.tractors.slice(0, 20).forEach(h => {
                    parts.push(`  Truck ${h.truckNumber} at Plant ${h.plant}: ${h.oldStatus} -> ${h.newStatus} on ${h.changedAt?.slice(0, 10)}`);
                });
            }
        }
        
        if (ctx.stats) {
            parts.push(`\n=== LEGACY STATS (if different from above) ===`);
            if (ctx.stats.mixers) {
                parts.push(`Mixers: ${ctx.stats.mixers.total} total, ${ctx.stats.mixers.active} active, ${ctx.stats.mixers.shop} in shop, ${ctx.stats.mixers.spare} spare`);
            }
            if (ctx.stats.tractors) {
                parts.push(`Tractors: ${ctx.stats.tractors.total} total, ${ctx.stats.tractors.active} active, ${ctx.stats.tractors.shop} in shop, ${ctx.stats.tractors.spare} spare`);
            }
            if (ctx.stats.operators) {
                parts.push(`Operators: ${ctx.stats.operators.total} total, ${ctx.stats.operators.active} active`);
                parts.push(`  Mixer operators: ${ctx.stats.operators.mixerAssigned || 0}, Tractor operators: ${ctx.stats.operators.tractorAssigned || 0}`);
            }
        }
        
        if (ctx.plantManagerReports?.length > 0) {
            parts.push(`\n=== PLANT MANAGER REPORTS (${ctx.plantManagerReports.length} reports) ===`);
            ctx.plantManagerReports.forEach(r => {
                parts.push(`  Week ${r.week} - Plant ${r.plant} (${r.plantName || 'Unknown'}): ${r.yardage} yards, ${r.totalHours} hours, ${r.totalYardsLost} yards lost, ${r.operatorCount} operators, ${r.runnableMixers} runnable/${r.downMixers} down mixers${r.notes ? ' - Notes: ' + r.notes : ''}`);
                if (r.operatorsSentToHelp?.length > 0) {
                    r.operatorsSentToHelp.forEach(h => {
                        parts.push(`    Sent help: ${h.operator_count || h.operatorCount || 1} operator(s) to Plant ${h.plant || h.plantCode} for ${h.hours || 0} hours`);
                    });
                }
            });
        }
        
        if (ctx.efficiencyReports?.length > 0) {
            parts.push(`\n=== EFFICIENCY REPORTS (${ctx.efficiencyReports.length} reports) ===`);
            ctx.efficiencyReports.forEach(r => {
                parts.push(`  Week ${r.week} - Plant ${r.plant}:`);
                if (r.rows?.length > 0) {
                    r.rows.forEach(row => {
                        parts.push(`    ${row.date}: Start ${row.avgStart || 'N/A'}, End ${row.avgEnd || 'N/A'}, ${row.loadsPerHour || 'N/A'} loads/hr`);
                    });
                }
            });
        }
        
        if (ctx.aggregateReports?.length > 0) {
            const recentAggReports = ctx.aggregateReports.slice(0, 10);
            parts.push(`\n=== AGGREGATE PRODUCTION REPORTS (showing ${recentAggReports.length} of ${ctx.aggregateReports.length} reports) ===`);
            recentAggReports.forEach(r => {
                parts.push(`  Week ${r.week} - Location ${r.location}`);
            });
        }
        
        if (ctx.rmiReports?.length > 0) {
            const recentRMI = ctx.rmiReports.slice(0, 10);
            parts.push(`\n=== RMI REPORTS (showing ${recentRMI.length} of ${ctx.rmiReports.length} reports) ===`);
            recentRMI.forEach(r => {
                parts.push(`  Week ${r.week}`);
            });
        }
        
        return parts.join('\n');
    }

    formatDashboardDataForPrompt(data) {
        const parts = [];

        parts.push(`Analysis Date: ${new Date().toLocaleDateString()}`);

        if (data.regionName) {
            parts.push(`Region: ${data.regionName}`);
        }

        if (data.selectedPlant) {
            parts.push(`Viewing Plant: ${data.selectedPlant}`);
        }

        parts.push(`\n=== FLEET STATUS ===`);

        if (data.mixerStats) {
            const utilizationRate = data.mixerStats.total > 0 
                ? Math.round((data.mixerStats.active / data.mixerStats.total) * 100) 
                : 0;
            parts.push(`\nMIXERS: ${data.mixerStats.total} total`);
            parts.push(`  Active: ${data.mixerStats.active} | Spare: ${data.mixerStats.spare} | In Shop: ${data.mixerStats.inShop}`);
            parts.push(`  Utilization: ${utilizationRate}%`);
        }

        if (data.tractorStats) {
            const utilizationRate = data.tractorStats.total > 0 
                ? Math.round((data.tractorStats.active / data.tractorStats.total) * 100) 
                : 0;
            parts.push(`\nTRACTORS: ${data.tractorStats.total} total`);
            parts.push(`  Active: ${data.tractorStats.active} | Spare: ${data.tractorStats.spare} | In Shop: ${data.tractorStats.inShop}`);
            parts.push(`  Utilization: ${utilizationRate}%`);
        }

        if (data.trailerStats) {
            parts.push(`\nTRAILERS: ${data.trailerStats.total} total`);
            parts.push(`  Active: ${data.trailerStats.active} | Spare: ${data.trailerStats.spare} | In Shop: ${data.trailerStats.inShop}`);
        }

        if (data.equipmentStats) {
            parts.push(`\nEQUIPMENT: ${data.equipmentStats.total} total`);
            parts.push(`  Active: ${data.equipmentStats.active} | Spare: ${data.equipmentStats.spare} | In Shop: ${data.equipmentStats.inShop}`);
        }

        parts.push(`\n=== OPERATORS ===`);
        
        if (data.operatorStats) {
            parts.push(`Total Operators: ${data.operatorStats.total}`);
            parts.push(`Active: ${data.operatorStats.active}`);
            parts.push(`  - Mixer Operators (assigned to mixers): ${data.operatorStats.mixerOperators || 0}`);
            parts.push(`  - Tractor Operators (assigned to tractors): ${data.operatorStats.tractorOperators || 0}`);
            parts.push(`  - Unassigned Active: ${data.operatorStats.unassigned || 0}`);
            parts.push(`Training: ${data.operatorStats.training || 0}`);
            parts.push(`Pending Start: ${data.operatorStats.pendingStart || 0}`);
            parts.push(`Light Duty: ${data.operatorStats.lightDuty || 0}`);
        }

        parts.push(`\n=== MAINTENANCE ===`);
        parts.push(`Service Overdue: ${data.overdueCount || 0} assets`);
        parts.push(`Open Issues: ${data.openIssuesCount || 0}`);

        if (data.statusHistory) {
            parts.push(`\n=== HISTORICAL TRENDS (${data.historyDateRange || 'all time'}) ===`);
            
            if (data.statusHistory.mixers?.length > 0) {
                parts.push(`Mixer Time Distribution:`);
                data.statusHistory.mixers.slice(0, 3).forEach(s => {
                    parts.push(`  ${s.status}: ${s.percentage}%`);
                });
            }
            
            if (data.statusHistory.tractors?.length > 0) {
                parts.push(`Tractor Time Distribution:`);
                data.statusHistory.tractors.slice(0, 3).forEach(s => {
                    parts.push(`  ${s.status}: ${s.percentage}%`);
                });
            }
        }

        if (data.recentReports) {
            parts.push(`\n=== RECENT REPORTS (Last 4 Weeks) ===`);
            parts.push(`Total Completed Reports: ${data.recentReports.totalReportsLast4Weeks || 0}`);
            
            if (data.recentReports.plantManagerReports?.length > 0) {
                parts.push(`\nPLANT MANAGER REPORTS:`);
                data.recentReports.plantManagerReports.forEach(r => {
                    parts.push(`  Week ${r.week} - Plant ${r.plant}: ${r.yardage || 0} yards, ${r.hours || 0} hours, ${r.operatorCount || 0} operators, ${r.loadsLost || 0} loads lost`);
                });
            }
            
            if (data.recentReports.generalManagerReports?.length > 0) {
                parts.push(`\nGENERAL MANAGER REPORTS:`);
                data.recentReports.generalManagerReports.forEach(r => {
                    parts.push(`  Week ${r.week}: ${r.totalYardage || 0} total yards, ${r.totalHours || 0} hours, ${r.operatorsActive || 0} active operators, ${r.mixersRunnable || 0} runnable/${r.mixersDown || 0} down`);
                });
            }
            
            if (data.recentReports.efficiencyReports?.length > 0) {
                parts.push(`\nEFFICIENCY REPORTS:`);
                data.recentReports.efficiencyReports.forEach(r => {
                    parts.push(`  Week ${r.week} - Plant ${r.plant}: Start ${r.avgStartTime || 'N/A'}, End ${r.avgEndTime || 'N/A'}, ${r.loadsPerHour || 'N/A'} loads/hr`);
                });
            }
            
            if (data.recentReports.rmiReports?.length > 0) {
                parts.push(`\nRMI (TRAINING/HIRING) REPORTS:`);
                data.recentReports.rmiReports.forEach(r => {
                    parts.push(`  Week ${r.week}: ${r.trainersActive || 0} active trainers, ${r.pendingHires || 0} pending hires, goal: ${r.hiringGoal || 0}`);
                });
            }
            
            if (data.recentReports.aggregateReports?.length > 0) {
                parts.push(`\nAGGREGATE PRODUCTION REPORTS:`);
                data.recentReports.aggregateReports.slice(0, 4).forEach(r => {
                    const materialCount = Array.isArray(r.materials) ? r.materials.length : 0;
                    parts.push(`  Week ${r.week}: ${materialCount} materials reported`);
                });
            }
        }

        parts.push(`\nAnalyze this data and provide 3-5 specific issues or concerns. Focus on problems, not positives. Consider production trends, yardage, hours, efficiency, and staffing levels.`);

        return parts.join('\n');
    }
}

export const AIInsightsService = new AIInsightsServiceClass();
