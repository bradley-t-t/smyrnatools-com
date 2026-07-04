import { useCallback, useMemo, useState } from 'react'

import { AIService } from '../../services/AIService'
import {
    buildAIHistoryContext,
    clearAISummaryCache,
    getAISummaryFromCache,
    setAISummaryToCache
} from '../../utils/HistoryDataUtility'
import { HistoryUtility } from '../../utils/HistoryUtility'
import { useHistoryDataFetchers } from './useHistoryDataFetchers'

/**
 * Loads and manages asset/operator history data, issues, comments, AI summaries,
 * and user display names for the history detail view.
 */
export default function useHistoryData(item, type) {
    const assetId = HistoryUtility.resolveAssetId(type, item)
    const assetCacheKey = `${type}-${assetId}`

    const {
        error,
        fetchHistory,
        handleAddIssue,
        handleCompleteIssue,
        handleDeleteIssue,
        history,
        isLoading,
        issues,
        operators,
        setError,
        userNames,
        users
    } = useHistoryDataFetchers({ assetId, item, type })

    const [aiSummary, setAiSummary] = useState(null)
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
    const [aiSummaryError, setAiSummaryError] = useState(false)

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

    const generateAISummary = useCallback(
        async (forceRegenerate = false) => {
            if (!forceRegenerate) {
                const cachedSummary = getAISummaryFromCache(assetCacheKey, history.length)
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
                const historyContext = buildAIHistoryContext({
                    cleanlinessData,
                    history,
                    issues,
                    item,
                    operatorData,
                    plantData,
                    serviceData,
                    statusData,
                    type
                })
                const summary = await AIService.generateHistorySummary(historyContext)
                if (summary) {
                    setAiSummary(summary)
                    setAISummaryToCache(assetCacheKey, history.length, summary)
                } else {
                    setAiSummaryError(true)
                    setAiSummary(null)
                }
            } catch (e) {
                console.error('Failed to generate AI history summary:', e)
                setAiSummaryError(true)
                setAiSummary(null)
            } finally {
                setAiSummaryLoading(false)
            }
        },
        [assetCacheKey, cleanlinessData, history, issues, item, operatorData, plantData, serviceData, statusData, type]
    )
    const handleRegenerateAISummary = useCallback(() => {
        clearAISummaryCache(assetCacheKey)
        setAiSummary(null)
        generateAISummary(true)
    }, [assetCacheKey, generateAISummary])

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
