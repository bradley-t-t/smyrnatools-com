import { useMemo } from 'react'

import { INACTIVE_STATUSES, isTerminatedGroup } from '../components/sections/recap/recapHelpers'

const isActiveStatus = (s) => s && !INACTIVE_STATUSES.includes(s.toLowerCase())
const isInactiveStatus = (s) => s && INACTIVE_STATUSES.includes(s.toLowerCase())

const computeOperatorsNet = (operatorHistory) => {
    let operatorsNet = 0
    operatorHistory.forEach((h) => {
        if (h.field_name !== 'status') return
        const wasActive = isActiveStatus(h.old_value)
        const nowActive = isActiveStatus(h.new_value)
        const wasInactive = isInactiveStatus(h.old_value)
        const nowInactive = isInactiveStatus(h.new_value)
        if (wasActive && nowInactive) operatorsNet--
        else if (wasInactive && nowActive) operatorsNet++
    })
    return operatorsNet
}

const computeMixerMetrics = (mixerHistory, plantCode, isAllPlants) => {
    let runnableNet = 0
    let downNet = 0
    let transfersNet = 0
    mixerHistory.forEach((h) => {
        if (h.field_name === 'status') {
            const oldStatus = (h.old_value || '').toLowerCase()
            const newStatus = (h.new_value || '').toLowerCase()
            const wasDown = oldStatus === 'in shop'
            const isDown = newStatus === 'in shop'
            if (!wasDown && isDown) downNet++
            else if (wasDown && !isDown) downNet--
        }
        if (h.field_name === 'assigned_plant') {
            if (isAllPlants) {
                transfersNet++
                return
            }
            const wasAtThisPlant = h.old_value === plantCode
            const isAtThisPlant = h.new_value === plantCode
            if (!wasAtThisPlant && isAtThisPlant) {
                runnableNet++
                transfersNet++
            } else if (wasAtThisPlant && !isAtThisPlant) {
                runnableNet--
                transfersNet++
            }
        }
    })
    return { downNet, runnableNet, transfersNet }
}

const buildMixerLookup = (mixers) => {
    const lookup = {}
    if (!mixers || !Array.isArray(mixers)) return lookup
    mixers.forEach((m) => {
        if (m.id) lookup[m.id] = m
    })
    return lookup
}

const buildOperatorLookup = (operators) => {
    const lookup = {}
    if (!operators || !Array.isArray(operators)) return lookup
    operators.forEach((o) => {
        const employeeId = o.employeeId || o.employee_id
        if (employeeId) lookup[employeeId] = o
        if (o.id) lookup[o.id] = o
    })
    return lookup
}

const groupMixerHistory = (mixerHistory, groups) => {
    mixerHistory.forEach((entry) => {
        const key = `mixer_${entry.mixer_id}`
        if (!groups[key]) groups[key] = { changes: [], id: entry.mixer_id, name: null, type: 'mixer' }
        groups[key].changes.push(entry)
    })
}

const groupOperatorHistory = (operatorHistory, groups) => {
    operatorHistory.forEach((entry) => {
        const key = `operator_${entry.operator_id}`
        if (!groups[key]) groups[key] = { changes: [], id: entry.operator_id, name: null, type: 'operator' }
        groups[key].changes.push(entry)
    })
}

const resolveMixerGroupName = (group, mixerLookup) => {
    const mixer = mixerLookup[group.id]
    if (mixer) {
        group.name = mixer.truckNumber || mixer.truck_number || 'Unknown'
        return
    }
    const truckNumberChange = group.changes.find((c) => c.field_name === 'truck_number')
    group.name = truckNumberChange ? truckNumberChange.new_value || truckNumberChange.old_value || 'Unknown' : 'Unknown'
}

const resolveOperatorGroupName = (group, operatorLookup) => {
    const operator = operatorLookup[group.id]
    if (operator) {
        group.name = operator.name || 'Unknown Operator'
        group.status = operator.status || 'Unknown'
        return
    }
    const nameChange = group.changes.find((c) => c.field_name === 'name')
    group.name = nameChange ? nameChange.new_value || nameChange.old_value || 'Unknown Operator' : 'Unknown Operator'
    group.status = 'Unknown'
}

/**
 * Derives memoized read models from raw mixer/operator history:
 * - net-change metrics (operators, runnable, down, transfers)
 * - per-asset grouped history sorted by recency
 * - filtered view based on search/type/field controls
 * - available field options for the dropdown filter
 */
export function useRecapDerivedData({
    mixerHistory,
    operatorHistory,
    mixers,
    operators,
    plantCode,
    isAllPlants,
    searchQuery,
    typeFilter,
    fieldFilter
}) {
    const changeMetrics = useMemo(() => {
        if (mixerHistory.length === 0 && operatorHistory.length === 0) {
            return { downNet: 0, operatorsNet: 0, runnableNet: 0, transfersNet: 0 }
        }
        const operatorsNet = computeOperatorsNet(operatorHistory)
        const { downNet, runnableNet, transfersNet } = computeMixerMetrics(mixerHistory, plantCode, isAllPlants)
        return { downNet, operatorsNet, runnableNet, transfersNet }
    }, [mixerHistory, operatorHistory, plantCode, isAllPlants])

    const mixerLookup = useMemo(() => buildMixerLookup(mixers), [mixers])
    const operatorLookup = useMemo(() => buildOperatorLookup(operators), [operators])

    const groupedHistory = useMemo(() => {
        if (mixerHistory.length === 0 && operatorHistory.length === 0) return []
        const groups = {}
        groupMixerHistory(mixerHistory, groups)
        groupOperatorHistory(operatorHistory, groups)
        Object.values(groups).forEach((group) => {
            if (group.type === 'mixer') resolveMixerGroupName(group, mixerLookup)
            else if (group.type === 'operator') resolveOperatorGroupName(group, operatorLookup)
            group.changes.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
        })
        return Object.values(groups).sort((a, b) => {
            const aLatest = a.changes[0]?.changed_at || ''
            const bLatest = b.changes[0]?.changed_at || ''
            return new Date(bLatest) - new Date(aLatest)
        })
    }, [mixerHistory, operatorHistory, mixerLookup, operatorLookup])

    const availableFields = useMemo(() => {
        const fields = new Set()
        groupedHistory.forEach((g) => g.changes.forEach((c) => fields.add(c.field_name)))
        return [...fields].sort()
    }, [groupedHistory])

    const filteredHistory = useMemo(() => {
        return groupedHistory.filter((group) => {
            if (typeFilter === 'mixers' && group.type !== 'mixer') return false
            if (typeFilter === 'operators' && group.type !== 'operator') return false
            if (typeFilter === 'terminated' && !isTerminatedGroup(group)) return false
            if (searchQuery && !group.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false
            if (fieldFilter !== 'all' && !group.changes.some((c) => c.field_name === fieldFilter)) return false
            return true
        })
    }, [groupedHistory, typeFilter, searchQuery, fieldFilter])

    return { availableFields, changeMetrics, filteredHistory, groupedHistory }
}
