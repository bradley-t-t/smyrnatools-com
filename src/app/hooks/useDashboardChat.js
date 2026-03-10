import { useCallback, useRef, useState } from 'react'

import { AIService } from '../../services/AIService'
const STORAGE_KEY = 'dashboard-chat-usage'
const DAILY_LIMIT = 10
function getTodayKey() {
    return new Date().toISOString().slice(0, 10)
}
function getUsageToday() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        return data[getTodayKey()] || 0
    } catch {
        return 0
    }
}
function incrementUsage() {
    const today = getTodayKey()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [today]: getUsageToday() + 1 }))
}
// --- Tiered context: domain keyword classifier ---
const DOMAIN_KEYWORDS = {
    fleet: [
        'mixer',
        'tractor',
        'trailer',
        'equipment',
        'truck',
        'asset',
        'vehicle',
        'fleet',
        'vin',
        'blower',
        'freight',
        'pickup',
        'spare',
        'roster'
    ],
    issues: [
        'issue',
        'problem',
        'broken',
        'maintenance',
        'repair',
        'down',
        'fix',
        'overdue',
        'ticket',
        'reported',
        'resolved',
        'open issue'
    ],
    operators: [
        'operator',
        'driver',
        'employee',
        'training',
        'pending',
        'unassigned',
        'assigned',
        'trainer',
        'hire',
        'staff',
        'light duty',
        'position',
        'who drives',
        'who operates'
    ]
}
function classifyQuestion(question) {
    const q = question.toLowerCase()
    const domains = new Set()
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (keywords.some((k) => q.includes(k))) domains.add(domain)
    }
    return domains
}
// --- Compressed domain summary builders (Tier 2 — injected on demand) ---
export function buildFleetDomain(mixers, tractors, trailers, equipment) {
    const lines = []
    if (mixers?.length) {
        lines.push('[Mixers] truck#|status|plant|operator|lastService')
        mixers.forEach((m) =>
            lines.push(
                `${m.truckNumber || '-'}|${m.status || '-'}|${m.plantCode || '-'}|${m.assignedOperator || '-'}|${m.lastServiceDate || '-'}`
            )
        )
    }
    if (tractors?.length) {
        lines.push('[Tractors] truck#|status|plant|operator|freight|lastService')
        tractors.forEach((t) =>
            lines.push(
                `${t.truckNumber || '-'}|${t.status || '-'}|${t.plantCode || '-'}|${t.assignedOperator || '-'}|${t.freight || '-'}|${t.lastServiceDate || '-'}`
            )
        )
    }
    if (trailers?.length) {
        lines.push('[Trailers] id#|status|plant|type|lastService')
        trailers.forEach((t) =>
            lines.push(
                `${t.identifyingNumber || '-'}|${t.status || '-'}|${t.plantCode || '-'}|${t.trailerType || '-'}|${t.lastServiceDate || '-'}`
            )
        )
    }
    if (equipment?.length) {
        lines.push('[Equipment] id#|status|plant|lastService')
        equipment.forEach((e) =>
            lines.push(
                `${e.identifyingNumber || '-'}|${e.status || '-'}|${e.plantCode || '-'}|${e.lastServiceDate || '-'}`
            )
        )
    }
    return lines.length ? '=== DETAILED FLEET ROSTER (pipe-delimited) ===\n' + lines.join('\n') : ''
}
export function buildOperatorDomain(operators, trainingOps, pendingOps, lightDutyOps) {
    const lines = []
    if (operators?.length) {
        lines.push('[All Operators] name|status|plant|position|trainer')
        operators.forEach((o) =>
            lines.push(
                `${o.name || '-'}|${o.status || '-'}|${o.plantCode || '-'}|${o.position || '-'}|${o.assignedTrainer || '-'}`
            )
        )
    }
    if (trainingOps?.length) {
        lines.push('[Training Details] operator|plant|trainer|trainerPlant')
        trainingOps.forEach((o) =>
            lines.push(
                `${o.operatorName || '-'}|${o.operatorPlant || '-'}|${o.trainerName || '-'}|${o.trainerPlant || '-'}`
            )
        )
    }
    if (pendingOps?.length) {
        lines.push('[Pending Start] operator|plant|date|trainerPlant')
        pendingOps.forEach((o) =>
            lines.push(
                `${o.operatorName || '-'}|${o.operatorPlant || '-'}|${o.pendingDate || '-'}|${o.trainerPlant || '-'}`
            )
        )
    }
    if (lightDutyOps?.length) {
        lines.push('[Light Duty] operator|plant')
        lightDutyOps.forEach((o) => lines.push(`${o.operatorName || '-'}|${o.plant || '-'}`))
    }
    return lines.length ? '=== DETAILED OPERATOR ROSTER (pipe-delimited) ===\n' + lines.join('\n') : ''
}
export function buildIssueDomain(issueDetails) {
    if (!issueDetails?.length) return ''
    const lines = ['=== OPEN ISSUE DETAILS (pipe-delimited) ===', 'type|identifier|plant|description|resolved']
    issueDetails.forEach((d) =>
        lines.push(
            `${d.type || '-'}|${d.identifier || '-'}|${d.plant || '-'}|${d.description || '-'}|${d.resolved ? 'Yes' : 'No'}`
        )
    )
    return lines.join('\n')
}
// --- Base context builders (Tier 1 — always included) ---
/**
 * Formats plant-level leaderboard metrics and notifications into a context string
 * for the AI chat follow-up.
 */
export function buildPlantChatContext({
    aiSummary,
    dashboardPlant,
    isPlantManager,
    plantNotifications,
    userPlantCode,
    userRoleName
}) {
    const parts = [`Date: ${new Date().toLocaleDateString()}`, `Plant: ${dashboardPlant}`]
    if (userRoleName) parts.push(`User Role: ${userRoleName}`)
    if (isPlantManager && userPlantCode === dashboardPlant) parts.push('User is the plant manager of this plant')
    const m = plantNotifications.leaderboardMetrics
    if (m) {
        parts.push(
            '\n=== LEADERBOARD METRICS ===',
            `Efficiency Rank: #${m.rank} of ${m.totalPlants} (ties share the same rank — check the leaderboard below for plants with identical efficiency)`,
            `Efficiency Score: ${m.efficiency?.toFixed(1)}%`,
            `Adjusted YPH: ${m.adjustedYPH?.toFixed(2)} (target: 3.0)`,
            `Raw YPH: ${m.rawYPH?.toFixed(2)}`,
            `Help Given: ${Math.round(m.helpGiven || 0)} hours`,
            `Help Received: ${Math.round(m.helpReceived || 0)} hours`,
            `Net Help: ${Math.round(m.netHelp || 0)} hours`
        )
        if (m.loadsPerOperatorPerDay !== undefined) {
            parts.push(`Loads Per Operator Per Day: ${m.loadsPerOperatorPerDay?.toFixed(2)} (target: 3.0)`)
        }
        if (m.missingReports || m.incompleteReports) {
            parts.push(`Missing Reports: ${m.missingReports || 0}, Incomplete: ${m.incompleteReports || 0}`)
        }
        if (m.avgCleanliness !== undefined) {
            parts.push(`Fleet Avg Cleanliness: ${m.avgCleanliness > 0 ? m.avgCleanliness.toFixed(1) : 'N/A'}/5`)
        }
        if (m.safetyIncidents !== undefined) {
            parts.push(`Safety Incidents: ${m.safetyIncidents || 0}`)
        }
    }
    parts.push('\n=== ALERTS & ISSUES ===')
    if (plantNotifications.unverifiedMixers?.length > 0) {
        parts.push(
            `Unverified Mixers: ${plantNotifications.unverifiedMixers.length} — ${plantNotifications.unverifiedMixers.map((m) => m.truckNumber || 'N/A').join(', ')}`
        )
    }
    if (plantNotifications.overdueService?.length > 0) {
        parts.push(`Service Overdue: ${plantNotifications.overdueService.length} assets`)
    }
    if (plantNotifications.assetsWithMostIssues?.length > 0) {
        parts.push(`Assets with Open Issues: ${plantNotifications.assetsWithMostIssues.length}`)
        plantNotifications.assetsWithMostIssues
            .slice(0, 5)
            .forEach((a) =>
                parts.push(`  - ${a.type} ${a.identifier}: ${a.openIssueCount} open, ${a.resolvedIssueCount} resolved`)
            )
    }
    if (plantNotifications.longTermShopAssets?.length > 0) {
        parts.push(`Long-Term Shop: ${plantNotifications.longTermShopAssets.length} assets`)
        plantNotifications.longTermShopAssets.forEach((a) =>
            parts.push(`  - ${a.type} ${a.identifier}: ${a.daysInShop} days${a.downInYard ? ' (down in yard)' : ''}`)
        )
    }
    if (plantNotifications.shopIssue) {
        parts.push(
            `SHOP ALERT: ${plantNotifications.shopIssue.inShopCount} in shop, ${plantNotifications.shopIssue.spareCount} spare`
        )
    }
    if (plantNotifications.totalOpenIssues > 0 || plantNotifications.totalResolvedIssues > 0) {
        parts.push(
            `Total Open Issues: ${plantNotifications.totalOpenIssues || 0}, Resolved: ${plantNotifications.totalResolvedIssues || 0}`
        )
    }
    parts.push('\n=== OPERATORS ===')
    if (plantNotifications.unassignedOperators?.length > 0) {
        parts.push(
            `Unassigned: ${plantNotifications.unassignedOperators.length} — ${plantNotifications.unassignedOperators.map((o) => o.name).join(', ')}`
        )
    }
    if (plantNotifications.pendingOperators?.length > 0) {
        parts.push(
            `Pending Start: ${plantNotifications.pendingOperators.length} — ${plantNotifications.pendingOperators.map((o) => o.operatorName).join(', ')}`
        )
    }
    if (plantNotifications.trainingOperators?.length > 0) {
        parts.push(
            `In Training: ${plantNotifications.trainingOperators.length} — ${plantNotifications.trainingOperators.map((o) => o.operatorName).join(', ')}`
        )
    }
    const rankings = plantNotifications.allPlantRankings
    if (rankings?.length > 0) {
        parts.push('\n=== ALL PLANTS LEADERBOARD (ranked by efficiency) ===')
        rankings.forEach((p) => {
            const f = p.fleet
            const fleetLine = f
                ? ` | Mixers: ${p.mixers} (${f.mixersActive} active, ${f.mixersInShop} shop, ${f.mixersSpare} spare), Tractors: ${p.tractors} (${f.tractorsActive} active, ${f.tractorsInShop} shop), Trailers: ${p.trailers} (${f.trailersActive} active, ${f.trailersInShop} shop), Operators: ${p.operators}, Total Assets: ${p.totalAssets}`
                : ''
            parts.push(
                `#${p.rank} Plant ${p.plantCode}: Efficiency ${p.efficiency?.toFixed(1)}%, Adj YPH ${p.adjustedYPH?.toFixed(2)}, Raw YPH ${p.rawYPH?.toFixed(2)}, Cleanliness ${p.avgCleanliness > 0 ? p.avgCleanliness.toFixed(1) : 'N/A'}/5, Net Help ${Math.round(p.netHelp || 0)}h, Safety ${p.safetyIncidents || 0}${p.loadsPerOperatorPerDay !== undefined ? `, Loads/Op/Day ${p.loadsPerOperatorPerDay.toFixed(2)}` : ''}${fleetLine}`
            )
        })
    }
    if (aiSummary) {
        parts.push('\n=== AI ANALYSIS ===', aiSummary)
    }
    return parts.join('\n')
}
/**
 * Formats region-level stats and notifications into a context string
 * for the AI chat follow-up.
 */
export function buildRegionChatContext({
    aiSummary,
    displayStats,
    plantNotifications,
    regionDisplayName,
    userRoleName
}) {
    const parts = [`Date: ${new Date().toLocaleDateString()}`, `Region: ${regionDisplayName}`]
    if (userRoleName) parts.push(`User Role: ${userRoleName}`)
    const s = displayStats || {}
    parts.push(
        '\n=== FLEET OVERVIEW ===',
        `Fleet Total: ${s.fleetTotal || 0}`,
        `Overall Allocation: ${Math.round(s.overallAllocationPercent || 0)}%`,
        `Verification Average: ${Math.round(s.verificationAverage || 0)}%`,
        `Service Overdue: ${s.overdueTotal || 0}`
    )
    const types = ['mixers', 'tractors', 'trailers', 'equipment']
    types.forEach((t) => {
        const ts = s[t]
        if (ts?.total > 0) {
            parts.push(
                `${t.charAt(0).toUpperCase() + t.slice(1)}: ${ts.total} total, ${ts.active || 0} active, ${ts.inShop || ts.shop || 0} in shop, ${ts.spare || 0} spare`
            )
        }
    })
    const ops = s.operators || {}
    if (ops.total > 0) {
        parts.push(
            '\n=== OPERATORS ===',
            `Total: ${ops.total}, Active: ${ops.active || 0}, Unassigned: ${ops.unassigned || 0}, Pending: ${ops.pending || 0}, Training: ${ops.training || 0}, Light Duty: ${ops.lightDuty || 0}`
        )
    }
    parts.push('\n=== ALERTS & ISSUES ===')
    if (plantNotifications.unverifiedMixers?.length > 0) {
        parts.push(`Unverified Mixers: ${plantNotifications.unverifiedMixers.length}`)
    }
    if (plantNotifications.overdueService?.length > 0) {
        parts.push(`Service Overdue: ${plantNotifications.overdueService.length} assets`)
    }
    if (plantNotifications.assetsWithMostIssues?.length > 0) {
        parts.push(`Assets with Open Issues: ${plantNotifications.assetsWithMostIssues.length}`)
        plantNotifications.assetsWithMostIssues
            .slice(0, 5)
            .forEach((a) => parts.push(`  - ${a.type} ${a.identifier}: ${a.openIssueCount} open`))
    }
    if (plantNotifications.longTermShopAssets?.length > 0) {
        parts.push(`Long-Term Shop: ${plantNotifications.longTermShopAssets.length} assets`)
        plantNotifications.longTermShopAssets.forEach((a) =>
            parts.push(`  - ${a.type} ${a.identifier}: ${a.daysInShop} days`)
        )
    }
    if (plantNotifications.shopIssue) {
        parts.push(
            `SHOP ALERT: ${plantNotifications.shopIssue.inShopCount} in shop, ${plantNotifications.shopIssue.spareCount} spare`
        )
    }
    if (plantNotifications.totalOpenIssues > 0 || plantNotifications.totalResolvedIssues > 0) {
        parts.push(
            `Total Open Issues: ${plantNotifications.totalOpenIssues || 0}, Resolved: ${plantNotifications.totalResolvedIssues || 0}`
        )
    }
    if (plantNotifications.unassignedOperators?.length > 0) {
        parts.push(`Unassigned Operators: ${plantNotifications.unassignedOperators.length}`)
    }
    if (plantNotifications.pendingOperators?.length > 0) {
        parts.push(`Pending Operators: ${plantNotifications.pendingOperators.length}`)
    }
    if (plantNotifications.trainingOperators?.length > 0) {
        parts.push(`Training Operators: ${plantNotifications.trainingOperators.length}`)
    }
    const rankings = plantNotifications.allPlantRankings
    if (rankings?.length > 0) {
        parts.push('\n=== ALL PLANTS LEADERBOARD (ranked by efficiency) ===')
        rankings.forEach((p) => {
            const f = p.fleet
            const fleetLine = f
                ? ` | Mixers: ${p.mixers} (${f.mixersActive} active, ${f.mixersInShop} shop, ${f.mixersSpare} spare), Tractors: ${p.tractors} (${f.tractorsActive} active, ${f.tractorsInShop} shop), Trailers: ${p.trailers} (${f.trailersActive} active, ${f.trailersInShop} shop), Operators: ${p.operators}, Total Assets: ${p.totalAssets}`
                : ''
            parts.push(
                `#${p.rank} Plant ${p.plantCode}: Efficiency ${p.efficiency?.toFixed(1)}%, Adj YPH ${p.adjustedYPH?.toFixed(2)}, Raw YPH ${p.rawYPH?.toFixed(2)}, Cleanliness ${p.avgCleanliness > 0 ? p.avgCleanliness.toFixed(1) : 'N/A'}/5, Net Help ${Math.round(p.netHelp || 0)}h, Safety ${p.safetyIncidents || 0}${p.loadsPerOperatorPerDay !== undefined ? `, Loads/Op/Day ${p.loadsPerOperatorPerDay.toFixed(2)}` : ''}${fleetLine}`
            )
        })
    }
    if (aiSummary) {
        parts.push('\n=== AI ANALYSIS ===', aiSummary)
    }
    return parts.join('\n')
}
// --- Chat hook with tiered context ---
export function useDashboardChat(baseContext, domainData) {
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')
    const [isChatFocused, setIsChatFocused] = useState(false)
    const [isChatLoading, setIsChatLoading] = useState(false)
    const domainDataRef = useRef(domainData)
    domainDataRef.current = domainData
    const usedDomainsRef = useRef(new Set())
    const sendMessage = useCallback(async () => {
        const question = chatInput.trim()
        if (!question || isChatLoading || getUsageToday() >= DAILY_LIMIT) return
        setChatInput('')
        setChatMessages((prev) => [...prev, { content: question, role: 'user' }])
        setIsChatLoading(true)
        incrementUsage()
        try {
            // Classify question and accumulate activated domains across conversation
            const newDomains = classifyQuestion(question)
            for (const d of newDomains) usedDomainsRef.current.add(d)
            // Build tiered context: Tier 1 base + Tier 2 relevant domain summaries
            let contextText = baseContext || ''
            const dd = domainDataRef.current
            if (dd) {
                for (const domain of usedDomainsRef.current) {
                    if (dd[domain]) contextText += '\n\n' + dd[domain]
                }
            }
            const messages = [
                { content: `Current dashboard data:\n\n${contextText}`, role: 'user' },
                {
                    content:
                        'Understood. I have the full dashboard context including metrics, alerts, fleet roster, operator details, issue data, and analysis. What would you like to know?',
                    role: 'assistant'
                },
                ...chatMessages.map(({ content, role }) => ({ content, role })),
                { content: question, role: 'user' }
            ]
            const response = await AIService.callAPIWithMessages(
                'You are a fleet management AI assistant with full access to dashboard metrics, leaderboard rankings, alerts, detailed fleet rosters, operator data, issue details, and analysis. Data in pipe-delimited sections uses | as column separator with headers in brackets. Answer follow-up questions using the provided data. Be concise, specific, and actionable. Reference actual numbers, asset identifiers, and metrics in your answers.',
                messages,
                { model: 'grok-3-mini-fast', temperature: 0.4 }
            )
            setChatMessages((prev) => [...prev, { content: response, role: 'assistant' }])
        } catch {
            setChatMessages((prev) => [
                ...prev,
                { content: "Sorry, I couldn't process that question.", role: 'assistant' }
            ])
        } finally {
            setIsChatLoading(false)
        }
    }, [chatInput, chatMessages, baseContext, isChatLoading])
    return {
        atLimit: getUsageToday() >= DAILY_LIMIT,
        chatInput,
        chatMessages,
        isChatFocused,
        isChatLoading,
        remainingMessages: DAILY_LIMIT - getUsageToday(),
        sendMessage,
        setChatInput,
        setIsChatFocused
    }
}
