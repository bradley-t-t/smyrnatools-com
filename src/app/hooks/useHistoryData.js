import { useCallback, useEffect, useMemo, useState } from 'react'

import { AIService } from '../../services/AIService'
import { supabase } from '../../services/DatabaseService'
import { OperatorService } from '../../services/OperatorService'
import { UserService } from '../../services/UserService'
import { HistoryUtility } from '../../utils/HistoryUtility'
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
    const assetId = HistoryUtility.resolveAssetId(type, item)
    const assetCacheKey = `${type}-${assetId}`
    const fetchOperators = useCallback(async () => {
        try {
            setOperators(await OperatorService.fetchOperators())
        } catch {}
    }, [])
    const fetchUsers = useCallback(async () => {
        try {
            const { data } = await supabase.from('profiles').select('id, name, email')
            setUsers(data ?? [])
        } catch {}
    }, [])
    const fetchIssues = useCallback(async () => {
        if (type === 'operator') return
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) return
        try {
            const Service = await HistoryUtility.loadServiceModule(serviceName)
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
            const Service = await HistoryUtility.loadServiceModule(config.service)
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
                const aVal = HistoryUtility.getEntryTimestamp(a)
                const bVal = HistoryUtility.getEntryTimestamp(b)
                if (aVal < bVal) return 1
                if (aVal > bVal) return -1
                return 0
            }),
        [history]
    )
    const buildRatingData = useCallback(
        (fieldKey) =>
            HistoryUtility.filterAndSortByFieldKey(history, (key) => key === fieldKey)
                .map((entry) => ({
                    date: new Date(HistoryUtility.getEntryTimestamp(entry)),
                    rating: parseInt(HistoryUtility.getEntryNewValue(entry), 10),
                    timestamp: HistoryUtility.getEntryTimestamp(entry)
                }))
                .filter((d) => !isNaN(d.rating) && d.rating > 0),
        [history]
    )
    const cleanlinessData = useMemo(() => buildRatingData('cleanliness_rating'), [buildRatingData])
    const conditionData = useMemo(() => buildRatingData('condition_rating'), [buildRatingData])
    const operatorData = useMemo(
        () =>
            HistoryUtility.filterAndSortByFieldKey(history, (key) => key === 'assigned_operator')
                .map((entry) => {
                    const operatorId = HistoryUtility.getEntryNewValue(entry)
                    const operatorName = getOperatorName(operatorId)
                    const isEmpty =
                        !operatorId || operatorId === '0' || operatorId === 'null' || operatorName === 'None'
                    return {
                        date: new Date(HistoryUtility.getEntryTimestamp(entry)),
                        isEmpty,
                        operator: isEmpty ? 'Empty' : operatorName,
                        operatorId,
                        timestamp: HistoryUtility.getEntryTimestamp(entry)
                    }
                })
                .filter((entry) => entry.operator !== 'Unknown'),
        [history, getOperatorName]
    )
    const serviceData = useMemo(
        () =>
            HistoryUtility.filterAndSortByFieldKey(
                history,
                (key) => key === 'last_service_date' || key === 'last_chip_date'
            )
                .map((entry) => {
                    const key = HistoryUtility.normalizeFieldToSnakeCase(HistoryUtility.getEntryFieldName(entry))
                    return {
                        changedBy: HistoryUtility.getEntryChangedBy(entry),
                        date: new Date(HistoryUtility.getEntryTimestamp(entry)),
                        serviceDate: HistoryUtility.getEntryNewValue(entry),
                        serviceType: key === 'last_chip_date' ? 'Chip' : 'Service',
                        timestamp: HistoryUtility.getEntryTimestamp(entry)
                    }
                })
                .filter((entry) => entry.serviceDate),
        [history]
    )
    const buildSimpleFieldData = useCallback(
        (fieldKey, valueKey) =>
            HistoryUtility.filterAndSortByFieldKey(history, (key) => key === fieldKey)
                .map((entry) => ({
                    changedBy: HistoryUtility.getEntryChangedBy(entry),
                    date: new Date(HistoryUtility.getEntryTimestamp(entry)),
                    timestamp: HistoryUtility.getEntryTimestamp(entry),
                    [valueKey]: HistoryUtility.getEntryNewValue(entry)
                }))
                .filter((entry) => {
                    const val = entry[valueKey]
                    return val && val !== 'null' && val !== ''
                }),
        [history]
    )
    const plantData = useMemo(() => buildSimpleFieldData('assigned_plant', 'plant'), [buildSimpleFieldData])
    const statusData = useMemo(() => buildSimpleFieldData('status', 'status'), [buildSimpleFieldData])
    const positionData = useMemo(() => buildSimpleFieldData('position', 'position'), [buildSimpleFieldData])
    const ratingsData = useMemo(
        () =>
            HistoryUtility.filterAndSortByFieldKey(history, (key) => key === 'rating')
                .map((entry) => ({
                    changedBy: HistoryUtility.getEntryChangedBy(entry),
                    date: new Date(HistoryUtility.getEntryTimestamp(entry)),
                    rating: parseInt(HistoryUtility.getEntryNewValue(entry), 10),
                    timestamp: HistoryUtility.getEntryTimestamp(entry)
                }))
                .filter((d) => !isNaN(d.rating) && d.rating >= 0),
        [history]
    )
    const mileageData = useMemo(
        () =>
            HistoryUtility.filterAndSortByFieldKey(history, (key) => key === 'mileage')
                .map((entry) => ({
                    changedBy: HistoryUtility.getEntryChangedBy(entry),
                    date: new Date(HistoryUtility.getEntryTimestamp(entry)),
                    mileage: parseInt(HistoryUtility.getEntryNewValue(entry), 10),
                    timestamp: HistoryUtility.getEntryTimestamp(entry)
                }))
                .filter((entry) => !isNaN(entry.mileage) && entry.mileage >= 0),
        [history]
    )
    const assignmentsData = useMemo(
        () =>
            HistoryUtility.filterAndSortByFieldKey(
                history,
                (key) => key === 'assigned_mixer' || key === 'assigned_tractor'
            ).map((entry) => {
                const key = HistoryUtility.normalizeFieldToSnakeCase(HistoryUtility.getEntryFieldName(entry))
                const newValue = HistoryUtility.getEntryNewValue(entry)
                const oldValue = HistoryUtility.getEntryOldValue(entry)
                const hasValue = newValue && newValue !== 'null' && newValue !== ''
                return {
                    assignmentType: key === 'assigned_mixer' ? 'Mixer' : 'Tractor',
                    changedBy: HistoryUtility.getEntryChangedBy(entry),
                    date: new Date(HistoryUtility.getEntryTimestamp(entry)),
                    isAssignment: hasValue,
                    isUnassignment: !hasValue,
                    previousVehicleNumber: oldValue && oldValue !== 'null' && oldValue !== '' ? oldValue : null,
                    timestamp: HistoryUtility.getEntryTimestamp(entry),
                    vehicleNumber: hasValue ? newValue : null
                }
            }),
        [history]
    )
    const allStatusPeriodsData = useMemo(() => {
        const statusEntries = HistoryUtility.filterAndSortByFieldKey(history, (key) => key === 'status')
        const statusPeriods = []
        if (statusEntries.length > 0) {
            const firstEntry = statusEntries[0]
            const oldStatus = HistoryUtility.getEntryOldValue(firstEntry)
            if (oldStatus && oldStatus !== 'null' && oldStatus !== '') {
                const oldestHistoryDate =
                    history.length > 0
                        ? new Date(Math.min(...history.map((h) => new Date(HistoryUtility.getEntryTimestamp(h)))))
                        : new Date(HistoryUtility.getEntryTimestamp(firstEntry))
                const firstChangeDate = new Date(HistoryUtility.getEntryTimestamp(firstEntry))
                const initialDays = HistoryUtility.daysBetween(oldestHistoryDate, firstChangeDate)
                if (initialDays > 0) {
                    statusPeriods.push({
                        changedBy: null,
                        days: initialDays,
                        endChangedBy: HistoryUtility.getEntryChangedBy(firstEntry),
                        endDate: firstChangeDate,
                        endTimestamp: HistoryUtility.getEntryTimestamp(firstEntry),
                        isCurrent: false,
                        startDate: oldestHistoryDate,
                        startTimestamp: oldestHistoryDate.toISOString(),
                        status: oldStatus
                    })
                }
            }
        }
        statusEntries.forEach((entry, index) => {
            const status = HistoryUtility.getEntryNewValue(entry)
            const timestamp = HistoryUtility.getEntryTimestamp(entry)
            const changedBy = HistoryUtility.getEntryChangedBy(entry)
            const startDate = new Date(timestamp)
            const nextEntry = statusEntries[index + 1]
            const endDate = nextEntry ? new Date(HistoryUtility.getEntryTimestamp(nextEntry)) : new Date()
            const endTimestamp = nextEntry ? HistoryUtility.getEntryTimestamp(nextEntry) : null
            const endChangedBy = nextEntry ? HistoryUtility.getEntryChangedBy(nextEntry) : null
            statusPeriods.push({
                changedBy,
                days: HistoryUtility.daysBetween(startDate, endDate),
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
                    assetIdentifier: HistoryUtility.resolveAssetIdentifier(type, item),
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
                        date: HistoryUtility.getEntryTimestamp(h),
                        field: HistoryUtility.getEntryFieldName(h),
                        from: HistoryUtility.getEntryOldValue(h),
                        to: HistoryUtility.getEntryNewValue(h)
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
                                                    return (
                                                        sum +
                                                        HistoryUtility.daysBetween(serviceData[i - 1].date, s.date)
                                                    )
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
        const Service = await HistoryUtility.loadServiceModule(serviceName)
        const currentUser = await UserService.getCurrentUser()
        if (!currentUser?.id) throw new Error('You must be logged in to add an issue')
        await Service.addIssue(item.id, newIssue, severity, currentUser.id)
        fetchIssues()
    }
    const handleDeleteIssue = async (issueId) => {
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) throw new Error('Invalid item type')
        const Service = await HistoryUtility.loadServiceModule(serviceName)
        await Service.deleteIssue(issueId)
        fetchIssues()
    }
    const handleCompleteIssue = async (issueId) => {
        const serviceName = ISSUE_SERVICE_MAP[type]
        if (!serviceName) throw new Error('Invalid item type')
        const Service = await HistoryUtility.loadServiceModule(serviceName)
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
