import { useCallback, useRef, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { OperatorService } from '../../services/OperatorService'
import { UserService } from '../../services/UserService'

const HISTORY_LIMIT = 500

const startDateForFilter = (dateFilter) => {
    const startDate = new Date()
    if (dateFilter === 'day') {
        startDate.setDate(startDate.getDate() - 1)
        return startDate
    }
    if (dateFilter === 'week') {
        startDate.setDate(startDate.getDate() - 7)
        return startDate
    }
    if (dateFilter === 'month') {
        startDate.setMonth(startDate.getMonth() - 1)
        return startDate
    }
    if (dateFilter === 'all') return new Date('2020-01-01')
    return startDate
}

const isMeaningfulChange = (entry) => {
    const oldVal = entry.old_value
    const newVal = entry.new_value
    if (oldVal === newVal) return false
    if (!oldVal && !newVal) return false
    if (oldVal === 'null' && !newVal) return false
    if (!oldVal && newVal === 'null') return false
    return true
}

const filterHistory = (entries) => (entries || []).filter(isMeaningfulChange)

const isAssignedOperatorValue = (val) => val && val !== 'null' && val !== '' && val !== '0'

const collectReferenceIds = (allHistory) => {
    const userIds = new Set()
    const opIdsForNames = new Set()
    allHistory.forEach((entry) => {
        if (entry.changed_by) userIds.add(entry.changed_by)
        if (entry.field_name === 'assigned_operator') {
            if (isAssignedOperatorValue(entry.old_value)) opIdsForNames.add(entry.old_value)
            if (isAssignedOperatorValue(entry.new_value)) opIdsForNames.add(entry.new_value)
        }
    })
    return { opIdsForNames, userIds }
}

const fetchUserDisplayName = async (userId) => {
    try {
        const displayName = await UserService.getUserDisplayName(userId)
        return { id: userId, name: displayName || 'Unknown' }
    } catch {
        return { id: userId, name: 'Unknown' }
    }
}

const fetchOperatorData = async (opId) => {
    try {
        const operator = await OperatorService.getOperatorById(opId)
        return {
            data: {
                name: operator?.name || 'Unknown Operator',
                status: operator?.status || 'Unknown'
            },
            id: opId
        }
    } catch {
        return {
            data: { name: 'Unknown Operator', status: 'Unknown' },
            id: opId
        }
    }
}

/**
 * Fetches mixer + operator history entries for the given asset ids within the
 * selected date window. Also lazily resolves display names for user ids
 * referenced in `changed_by` and operator ids referenced in
 * `assigned_operator` change values, caching the results across calls so
 * date-filter changes don't re-fetch names already on hand.
 */
export function useRecapHistory({ mixerIds, operatorIds, dateFilter }) {
    const [isLoading, setIsLoading] = useState(false)
    const [mixerHistory, setMixerHistory] = useState([])
    const [operatorHistory, setOperatorHistory] = useState([])
    const [userNames, setUserNames] = useState({})
    const [operatorNames, setOperatorNames] = useState({})
    const userNamesRef = useRef(userNames)
    userNamesRef.current = userNames
    const operatorNamesRef = useRef(operatorNames)
    operatorNamesRef.current = operatorNames

    const fetchHistory = useCallback(async () => {
        if (mixerIds.length === 0 && operatorIds.length === 0) return
        setIsLoading(true)
        try {
            const startDate = startDateForFilter(dateFilter)
            const [mixerResult, operatorResult] = await Promise.all([
                mixerIds.length > 0
                    ? Database.from('mixers_history')
                          .select('id,mixer_id,field_name,old_value,new_value,changed_at,changed_by')
                          .in('mixer_id', mixerIds)
                          .gte('changed_at', startDate.toISOString())
                          .order('changed_at', { ascending: false })
                          .limit(HISTORY_LIMIT)
                    : Promise.resolve({ data: [], error: null }),
                operatorIds.length > 0
                    ? Database.from('operators_history')
                          .select('id,operator_id,field_name,old_value,new_value,changed_at,changed_by')
                          .in('operator_id', operatorIds)
                          .gte('changed_at', startDate.toISOString())
                          .order('changed_at', { ascending: false })
                          .limit(HISTORY_LIMIT)
                    : Promise.resolve({ data: [], error: null })
            ])
            const mixerData = !mixerResult.error ? mixerResult.data || [] : []
            const operatorData = !operatorResult.error ? operatorResult.data || [] : []
            const filteredMixerHistory = filterHistory(mixerData)
            const filteredOperatorHistory = filterHistory(operatorData)
            setMixerHistory(filteredMixerHistory)
            setOperatorHistory(filteredOperatorHistory)

            const allHistory = [...filteredMixerHistory, ...filteredOperatorHistory]
            const { opIdsForNames, userIds } = collectReferenceIds(allHistory)
            const cachedUserNames = userNamesRef.current
            const cachedOpNames = operatorNamesRef.current
            const userIdsToFetch = [...userIds].filter((id) => !cachedUserNames[id])
            const opIdsToFetch = [...opIdsForNames].filter((id) => !cachedOpNames[id])

            const [userNamesResults, opNamesResults] = await Promise.all([
                Promise.all(userIdsToFetch.map(fetchUserDisplayName)),
                Promise.all(opIdsToFetch.map(fetchOperatorData))
            ])
            if (userNamesResults.length > 0) {
                setUserNames((prev) => {
                    const next = { ...prev }
                    userNamesResults.forEach((r) => {
                        next[r.id] = r.name
                    })
                    return next
                })
            }
            if (opNamesResults.length > 0) {
                setOperatorNames((prev) => {
                    const next = { ...prev }
                    opNamesResults.forEach((r) => {
                        next[r.id] = r.data
                    })
                    return next
                })
            }
        } catch {
        } finally {
            setIsLoading(false)
        }
    }, [mixerIds, operatorIds, dateFilter])

    return { fetchHistory, isLoading, mixerHistory, operatorHistory, operatorNames, userNames }
}
