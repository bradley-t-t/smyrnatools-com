import { useCallback, useEffect, useMemo, useState } from 'react'

import { AIService } from '../../services/AIService'
import { supabase } from '../../services/DatabaseService'
import { OperatorService } from '../../services/OperatorService'
import { UserService } from '../../services/UserService'
import { HistoryUtility } from '../../utils/HistoryUtility'
import {
    daysBetween,
    filterAndSortByFieldKey,
    getEntryChangedBy,
    getEntryFieldName,
    getEntryNewValue,
    getEntryOldValue,
    getEntryTimestamp,
    loadServiceModule,
    normalizeFieldToSnakeCase,
    resolveAssetId,
    resolveAssetIdentifier
} from '../../utils/HistoryViewHelpersUtility'
import {
    AI_CACHE_DURATION_MS,
    AI_HISTORY_CACHE_KEY,
    HISTORY_SERVICE_MAP,
    HISTORY_TABLE_MAP,
    ISSUE_SERVICE_MAP
} from '../constants/historyConstants'

const filterEquivalentEntries = (entries) => {
    try {
        return entries.filter(
            (entry) =>
                !HistoryUtility.areEquivalent(
                    entry.fieldName ?? entry.field_name,
                    entry.oldValue ?? entry.old_value,
                    entry.newValue ?? entry.new_value
                )
        )
    } catch {
        return entries
    }
}

/**
 * Loads and manages asset/operator history data, issues, comments, AI summaries,
 * and user display names for the history detail view.
 */
export default function useHistoryData(item, type) {
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [operators, setOperators] = useState([])
    const [users, setUsers] = useState([])
    const [issues, setIssues] = useState([])
    const [userNames, setUserNames] = useState({})
    const [aiSummary, setAiSummary] = useState(null)
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
    const [aiSummaryError, setAiSummaryError] = useState(false)

    const assetId = resolveAssetId(type, item)
    const assetCacheKey = `${type}-${assetId}`

    const fetchOperators = async () => {
        try {
            setOperators(await OperatorService.fetchOperators())
        } catch {}
    }

    const fetchUsers = async () => {
        try {
            const { data } = await supabase.from('profiles').select('id, name, email')
            setUsers(data ?? [])
        } catch {}
    }

    const fetchIssues = useCallback(async () => {
        if (type === 'operator') return

        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) return

        try {
            const Service = await loadServiceModule(serviceName)
            const fetchedIssues = await Service.fetchIssues(item.id)
            const issuesList = Array.isArray(fetchedIssues) ? fetchedIssues : []
            setIssues(issuesList)

            const userIds = new Set(issuesList.filter((i) => i.created_by).map((i) => i.created_by))
            const names = {}
            for (const userId of userIds) {
                try {
                    names[userId] = (await UserService.getUserDisplayName(userId)) ?? 'Unknown'
                } catch {
                    names[userId] = 'Unknown'
                }
            }
            setUserNames((prev) => ({ ...prev, ...names }))
        } catch {
            setIssues([])
        }
    }, [item.id, type])

    const fetchHistory = useCallback(async () => {
        const config = HISTORY_SERVICE_MAP[type]
        if (!config) return

        try {
            const Service = await loadServiceModule(config.service)
            const historyData = await Service[config.method](assetId)
            setHistory(filterEquivalentEntries(historyData ?? []))
            setError(null)
        } catch {
            try {
                const tableName = HISTORY_TABLE_MAP[type]
                const idField = type === 'pickup-truck' ? 'truck_id' : `${type}_id`
                const { data, error: queryError } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq(idField, assetId)
                    .order('changed_at', { ascending: false })

                if (queryError) throw queryError
                setHistory(filterEquivalentEntries(data ?? []))
                setError(null)
            } catch {
                setError('Failed to load history. Please try again.')
            }
        }
    }, [type, assetId])

    useEffect(() => {
        let cancelled = false
        const loadData = async () => {
            setIsLoading(true)
            await Promise.all([fetchHistory(), fetchOperators(), fetchUsers(), fetchIssues()])
            if (!cancelled) setIsLoading(false)
        }
        loadData()
        return () => {
            cancelled = true
        }
    }, [item.id, fetchHistory, fetchOperators, fetchUsers, fetchIssues])

    const getOperatorName = useCallback(
        (operatorId) => {
            if (!operatorId || operatorId === '0') return 'None'
            return operators.find((op) => op.employeeId === operatorId)?.name ?? 'Unknown'
        },
        [operators]
    )

    const getUserName = useCallback(
        (userId) => {
            if (!userId) return 'Unknown'
            return (
                operators.find((op) => op.employeeId === userId)?.name ??
                users.find((u) => u.id === userId)?.name ??
                'Unknown'
            )
        },
        [operators, users]
    )

    const sortedHistory = useMemo(
        () =>
            [...history].sort((a, b) => {
                const aVal = getEntryTimestamp(a)
                const bVal = getEntryTimestamp(b)
                if (aVal < bVal) return 1
                if (aVal > bVal) return -1
                return 0
            }),
        [history]
    )

    const buildRatingData = (fieldKey) =>
        filterAndSortByFieldKey(history, (key) => key === fieldKey)
            .map((entry) => ({
                date: new Date(getEntryTimestamp(entry)),
                rating: parseInt(getEntryNewValue(entry), 10),
                timestamp: getEntryTimestamp(entry)
            }))
            .filter((d) => !isNaN(d.rating) && d.rating > 0)

    const cleanlinessData = useMemo(() => buildRatingData('cleanliness_rating'), [history])
    const conditionData = useMemo(() => buildRatingData('condition_rating'), [history])

    const operatorData = useMemo(
        () =>
            filterAndSortByFieldKey(history, (key) => key === 'assigned_operator')
                .map((entry) => {
                    const operatorId = getEntryNewValue(entry)
                    const operatorName = getOperatorName(operatorId)
                    const isEmpty =
                        !operatorId || operatorId === '0' || operatorId === 'null' || operatorName === 'None'

                    return {
                        date: new Date(getEntryTimestamp(entry)),
                        isEmpty,
                        operator: isEmpty ? 'Empty' : operatorName,
                        operatorId,
                        timestamp: getEntryTimestamp(entry)
                    }
                })
                .filter((entry) => entry.operator !== 'Unknown'),
        [history, operators, getOperatorName]
    )

    const serviceData = useMemo(
        () =>
            filterAndSortByFieldKey(history, (key) => key === 'last_service_date' || key === 'last_chip_date')
                .map((entry) => {
                    const key = normalizeFieldToSnakeCase(getEntryFieldName(entry))
                    return {
                        changedBy: getEntryChangedBy(entry),
                        date: new Date(getEntryTimestamp(entry)),
                        serviceDate: getEntryNewValue(entry),
                        serviceType: key === 'last_chip_date' ? 'Chip' : 'Service',
                        timestamp: getEntryTimestamp(entry)
                    }
                })
                .filter((entry) => entry.serviceDate),
        [history]
    )

    const buildSimpleFieldData = (fieldKey, valueKey) =>
        filterAndSortByFieldKey(history, (key) => key === fieldKey)
            .map((entry) => ({
                changedBy: getEntryChangedBy(entry),
                date: new Date(getEntryTimestamp(entry)),
                timestamp: getEntryTimestamp(entry),
                [valueKey]: getEntryNewValue(entry)
            }))
            .filter((entry) => {
                const val = entry[valueKey]
                return val && val !== 'null' && val !== ''
            })

    const plantData = useMemo(() => buildSimpleFieldData('assigned_plant', 'plant'), [history])
    const statusData = useMemo(() => buildSimpleFieldData('status', 'status'), [history])
    const positionData = useMemo(() => buildSimpleFieldData('position', 'position'), [history])

    const ratingsData = useMemo(
        () =>
            filterAndSortByFieldKey(history, (key) => key === 'rating')
                .map((entry) => ({
                    changedBy: getEntryChangedBy(entry),
                    date: new Date(getEntryTimestamp(entry)),
                    rating: parseInt(getEntryNewValue(entry), 10),
                    timestamp: getEntryTimestamp(entry)
                }))
                .filter((d) => !isNaN(d.rating) && d.rating >= 0),
        [history]
    )

    const mileageData = useMemo(
        () =>
            filterAndSortByFieldKey(history, (key) => key === 'mileage')
                .map((entry) => ({
                    changedBy: getEntryChangedBy(entry),
                    date: new Date(getEntryTimestamp(entry)),
                    mileage: parseInt(getEntryNewValue(entry), 10),
                    timestamp: getEntryTimestamp(entry)
                }))
                .filter((entry) => !isNaN(entry.mileage) && entry.mileage >= 0),
        [history]
    )

    const assignmentsData = useMemo(
        () =>
            filterAndSortByFieldKey(history, (key) => key === 'assigned_mixer' || key === 'assigned_tractor').map(
                (entry) => {
                    const key = normalizeFieldToSnakeCase(getEntryFieldName(entry))
                    const newValue = getEntryNewValue(entry)
                    const oldValue = getEntryOldValue(entry)
                    const hasValue = newValue && newValue !== 'null' && newValue !== ''

                    return {
                        assignmentType: key === 'assigned_mixer' ? 'Mixer' : 'Tractor',
                        changedBy: getEntryChangedBy(entry),
                        date: new Date(getEntryTimestamp(entry)),
                        isAssignment: hasValue,
                        isUnassignment: !hasValue,
                        previousVehicleNumber: oldValue && oldValue !== 'null' && oldValue !== '' ? oldValue : null,
                        timestamp: getEntryTimestamp(entry),
                        vehicleNumber: hasValue ? newValue : null
                    }
                }
            ),
        [history]
    )

    const allStatusPeriodsData = useMemo(() => {
        const statusEntries = filterAndSortByFieldKey(history, (key) => key === 'status')
        const statusPeriods = []

        if (statusEntries.length > 0) {
            const firstEntry = statusEntries[0]
            const oldStatus = getEntryOldValue(firstEntry)

            if (oldStatus && oldStatus !== 'null' && oldStatus !== '') {
                const oldestHistoryDate =
                    history.length > 0
                        ? new Date(Math.min(...history.map((h) => new Date(getEntryTimestamp(h)))))
                        : new Date(getEntryTimestamp(firstEntry))
                const firstChangeDate = new Date(getEntryTimestamp(firstEntry))
                const initialDays = daysBetween(oldestHistoryDate, firstChangeDate)

                if (initialDays > 0) {
                    statusPeriods.push({
                        changedBy: null,
                        days: initialDays,
                        endChangedBy: getEntryChangedBy(firstEntry),
                        endDate: firstChangeDate,
                        endTimestamp: getEntryTimestamp(firstEntry),
                        isCurrent: false,
                        startDate: oldestHistoryDate,
                        startTimestamp: oldestHistoryDate.toISOString(),
                        status: oldStatus
                    })
                }
            }
        }

        statusEntries.forEach((entry, index) => {
            const status = getEntryNewValue(entry)
            const timestamp = getEntryTimestamp(entry)
            const changedBy = getEntryChangedBy(entry)
            const startDate = new Date(timestamp)
            const nextEntry = statusEntries[index + 1]
            const endDate = nextEntry ? new Date(getEntryTimestamp(nextEntry)) : new Date()
            const endTimestamp = nextEntry ? getEntryTimestamp(nextEntry) : null
            const endChangedBy = nextEntry ? getEntryChangedBy(nextEntry) : null

            statusPeriods.push({
                changedBy,
                days: daysBetween(startDate, endDate),
                endChangedBy,
                endDate,
                endTimestamp,
                isCurrent: !nextEntry,
                startDate,
                startTimestamp: timestamp,
                status
            })
        })

        return statusPeriods
    }, [history])

    const getAISummaryFromCache = useCallback(() => {
        try {
            const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
            if (!cached) return null
            const cacheData = JSON.parse(cached)
            const assetCache = cacheData[assetCacheKey]
            if (!assetCache) return null
            if (Date.now() - assetCache.timestamp > AI_CACHE_DURATION_MS) return null
            if (assetCache.historyCount !== history.length) return null
            return assetCache.summary
        } catch {
            return null
        }
    }, [assetCacheKey, history.length])

    const setAISummaryToCache = useCallback(
        (summary) => {
            try {
                const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
                const cacheData = cached ? JSON.parse(cached) : {}
                cacheData[assetCacheKey] = { historyCount: history.length, summary, timestamp: Date.now() }
                localStorage.setItem(AI_HISTORY_CACHE_KEY, JSON.stringify(cacheData))
            } catch {}
        },
        [assetCacheKey, history.length]
    )

    const clearAISummaryCache = useCallback(() => {
        try {
            const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
            if (!cached) return
            const cacheData = JSON.parse(cached)
            delete cacheData[assetCacheKey]
            localStorage.setItem(AI_HISTORY_CACHE_KEY, JSON.stringify(cacheData))
        } catch {}
    }, [assetCacheKey])

    const generateAISummary = useCallback(
        async (forceRegenerate = false) => {
            if (!forceRegenerate) {
                const cachedSummary = getAISummaryFromCache()
                if (cachedSummary) {
                    setAiSummary(cachedSummary)
                    return
                }
            }

            if (!history.length && !issues.length) {
                setAiSummary('No historical data available to analyze yet.')
                return
            }

            setAiSummaryLoading(true)
            setAiSummaryError(false)

            try {
                const historyContext = {
                    assetIdentifier: resolveAssetIdentifier(type, item),
                    assetType: type,
                    cleanlinessHistory:
                        cleanlinessData.length > 0
                            ? {
                                  average:
                                      cleanlinessData.reduce((sum, c) => sum + c.rating, 0) / cleanlinessData.length,
                                  count: cleanlinessData.length,
                                  current: cleanlinessData[cleanlinessData.length - 1]?.rating,
                                  trend:
                                      cleanlinessData.length >= 2
                                          ? cleanlinessData[cleanlinessData.length - 1]?.rating -
                                            cleanlinessData[0]?.rating
                                          : 0
                              }
                            : null,
                    currentPlant: item.plantCode ?? item.assignedPlant ?? 'Unknown',
                    currentStatus: item.status ?? 'Unknown',
                    currentStatusDays: statusData.find((s) => s.isCurrent)?.days ?? 0,
                    highSeverityIssues: issues.filter((i) => i.severity === 'High' && i.status !== 'Resolved').length,
                    openIssues: issues.filter((i) => i.status !== 'Resolved').length,
                    operatorChanges: type === 'mixer' || type === 'tractor' ? operatorData.length : 0,
                    plantChanges: plantData?.length ?? 0,
                    recentChanges: history.slice(0, 10).map((h) => ({
                        date: getEntryTimestamp(h),
                        field: getEntryFieldName(h),
                        from: getEntryOldValue(h),
                        to: getEntryNewValue(h)
                    })),
                    resolvedIssues: issues.filter((i) => i.status === 'Resolved').length,
                    serviceHistory:
                        serviceData.length > 0
                            ? {
                                  avgDaysBetweenService:
                                      serviceData.length >= 2
                                          ? Math.round(
                                                serviceData.reduce((sum, s, i) => {
                                                    if (i === 0) return 0
                                                    return sum + daysBetween(serviceData[i - 1].date, s.date)
                                                }, 0) /
                                                    (serviceData.length - 1)
                                            )
                                          : null,
                                  count: serviceData.length,
                                  lastService: serviceData[serviceData.length - 1]?.date
                              }
                            : null,
                    statusBreakdown: statusData.reduce((acc, s) => {
                        acc[s.status] = (acc[s.status] || 0) + s.days
                        return acc
                    }, {}),
                    statusChanges: statusData.length,
                    totalHistoryEntries: history.length,
                    uniqueOperators:
                        type === 'mixer' || type === 'tractor'
                            ? new Set(operatorData.filter((o) => !o.isEmpty).map((o) => o.operatorId)).size
                            : 0
                }

                const summary = await AIService.generateHistorySummary(historyContext)
                if (summary) {
                    setAiSummary(summary)
                    setAISummaryToCache(summary)
                } else {
                    setAiSummaryError(true)
                    setAiSummary(null)
                }
            } catch {
                setAiSummaryError(true)
                setAiSummary(null)
            } finally {
                setAiSummaryLoading(false)
            }
        },
        [
            history,
            issues,
            item,
            type,
            statusData,
            cleanlinessData,
            operatorData,
            serviceData,
            plantData,
            getAISummaryFromCache,
            setAISummaryToCache
        ]
    )

    const handleRegenerateAISummary = useCallback(() => {
        clearAISummaryCache()
        setAiSummary(null)
        generateAISummary(true)
    }, [clearAISummaryCache, generateAISummary])

    const handleAddIssue = async (newIssue, severity) => {
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) throw new Error('Invalid item type')

        const Service = await loadServiceModule(serviceName)
        const currentUser = await UserService.getCurrentUser()
        if (!currentUser?.id) throw new Error('You must be logged in to add an issue')

        await Service.addIssue(item.id, newIssue, severity, currentUser.id)
        fetchIssues()
    }

    const handleDeleteIssue = async (issueId) => {
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) throw new Error('Invalid item type')

        const Service = await loadServiceModule(serviceName)
        await Service.deleteIssue(issueId)
        fetchIssues()
    }

    const handleCompleteIssue = async (issueId) => {
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) throw new Error('Invalid item type')

        const Service = await loadServiceModule(serviceName)
        await Service.completeIssue(issueId)
        fetchIssues()
    }

    return {
        aiSummary,
        aiSummaryError,
        aiSummaryLoading,
        allStatusPeriodsData,
        assignmentsData,
        cleanlinessData,
        conditionData,
        error,
        fetchHistory,
        generateAISummary,
        getOperatorName,
        getUserName,
        handleAddIssue,
        handleCompleteIssue,
        handleDeleteIssue,
        handleRegenerateAISummary,
        history,
        isLoading,
        issues,
        mileageData,
        operatorData,
        plantData,
        positionData,
        ratingsData,
        serviceData,
        setError,
        sortedHistory,
        statusData,
        userNames
    }
}
