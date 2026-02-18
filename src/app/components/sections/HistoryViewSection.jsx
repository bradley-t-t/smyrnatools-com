import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import { AIService } from '../../../services/AIService'
import { supabase } from '../../../services/DatabaseService'
import { OperatorService } from '../../../services/OperatorService'
import { UserService } from '../../../services/UserService'
import { FormatUtility } from '../../../utils/FormatUtility'
import { HistoryUtility } from '../../../utils/HistoryUtility'
import ErrorMessage from '../common/ErrorMessage'
import LoadingScreen from '../common/LoadingScreen'
import UserLabel from '../common/UserLabel'

function HistoryViewSection({ item, type, onClose }) {
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [operators, setOperators] = useState([])
    const [users, setUsers] = useState([])
    const [activeTab, setActiveTab] = useState('ai-summary')
    const [sortConfig] = useState({
        direction: 'descending',
        key: 'changedAt'
    })
    const [issues, setIssues] = useState([])
    const [newIssue, setNewIssue] = useState('')
    const [severity, setSeverity] = useState('Medium')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [userNames, setUserNames] = useState({})
    const [aiSummary, setAiSummary] = useState(null)
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
    const [aiSummaryError, setAiSummaryError] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            await Promise.all([fetchHistory(), fetchOperators(), fetchUsers(), fetchIssues()])
            setIsLoading(false)
        }
        loadData()
    }, [item.id])

    const fetchOperators = async () => {
        try {
            const operatorsData = await OperatorService.fetchOperators()
            setOperators(operatorsData)
        } catch (err) {}
    }

    const fetchUsers = async () => {
        try {
            const { data } = await supabase.from('profiles').select('id, name, email')
            setUsers(data || [])
        } catch (err) {}
    }

    const fetchIssues = async () => {
        if (type === 'operator') return

        try {
            const serviceMap = {
                equipment: 'EquipmentService',
                mixer: 'MixerService',
                'pickup-truck': 'PickupTruckService',
                tractor: 'TractorService',
                trailer: 'TrailerService'
            }

            const serviceName = serviceMap[type]
            if (!serviceName) return

            const { [serviceName]: Service } = await import(`../../services/${serviceName}`)
            const fetchedIssues = await Service.fetchIssues(item.id)
            setIssues(Array.isArray(fetchedIssues) ? fetchedIssues : [])

            const userIds = new Set()
            fetchedIssues.forEach((issue) => {
                if (issue.created_by) {
                    userIds.add(issue.created_by)
                }
            })

            const names = {}
            for (const userId of userIds) {
                try {
                    const displayName = await UserService.getUserDisplayName(userId)
                    names[userId] = displayName || 'Unknown'
                } catch {
                    names[userId] = 'Unknown'
                }
            }
            setUserNames((prevNames) => ({ ...prevNames, ...names }))
        } catch (err) {
            setIssues([])
        }
    }

    const fetchHistory = async () => {
        const serviceMap = {
            equipment: { method: 'getEquipmentHistory', service: 'EquipmentService' },
            mixer: { method: 'getMixerHistory', service: 'MixerService' },
            operator: { method: 'getOperatorHistory', service: 'OperatorService' },
            'pickup-truck': { method: 'fetchHistory', service: 'PickupTruckService' },
            tractor: { method: 'getTractorHistory', service: 'TractorService' },
            trailer: { method: 'getTrailerHistory', service: 'TrailerService' }
        }
        const tableMap = {
            equipment: 'heavy_equipment_history',
            mixer: 'mixers_history',
            operator: 'operators_history',
            'pickup-truck': 'pickup_trucks_history',
            tractor: 'tractors_history',
            trailer: 'trailers_history'
        }
        try {
            const { service, method } = serviceMap[type]
            const { [service]: Service } = await import(`../../services/${service}`)
            const id = type === 'operator' ? item.employeeId : item.id
            let historyData = await Service[method](id)
            let filtered = historyData || []
            try {
                filtered = filtered.filter(
                    (entry) =>
                        !HistoryUtility.areEquivalent(
                            entry.fieldName || entry.field_name,
                            entry.oldValue || entry.old_value,
                            entry.newValue || entry.new_value
                        )
                )
            } catch (_) {}
            setHistory(filtered)
            setError(null)
        } catch (err) {
            try {
                const tableName = tableMap[type]
                const id = type === 'operator' ? item.employeeId : item.id
                const idField = type === 'pickup-truck' ? 'truck_id' : `${type}_id`
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq(idField, id)
                    .order('changed_at', { ascending: false })
                if (error) throw error
                let rows = data || []
                try {
                    rows = rows.filter(
                        (entry) => !HistoryUtility.areEquivalent(entry.field_name, entry.old_value, entry.new_value)
                    )
                } catch (_) {}
                setHistory(rows)
                setError(null)
            } catch (_) {
                setError('Failed to load history. Please try again.')
            }
        }
    }

    const formatFieldName = (fieldName) => {
        const snakeCaseField = fieldName.includes('_') ? fieldName : fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()
        const commonFields = {
            assigned_operator: 'Operator',
            assigned_plant: 'Plant',
            cleanliness_rating: 'Cleanliness',
            created: 'Created',
            last_chip_date: 'Chip Date',
            last_service_date: 'Service Date',
            status: 'Status',
            truck_number: 'Truck Number',
            verification: 'Verification'
        }
        if (type === 'tractor') {
            commonFields['has_blower'] = 'Has Blower'
        }
        if (type === 'operator') {
            commonFields['assigned_mixer'] = 'Assigned Mixer'
            commonFields['assigned_tractor'] = 'Assigned Tractor'
            commonFields['assigned_trainer'] = 'Assigned Trainer'
        }
        return (
            commonFields[snakeCaseField] || snakeCaseField.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        )
    }

    const formatTimestamp = (dateString) => {
        if (!dateString) return 'Not Assigned'
        return FormatUtility.formatDateTime(dateString)
    }

    const getOperatorName = (operatorId) => {
        if (!operatorId || operatorId === '0') return 'None'
        const operator = operators.find((op) => op.employeeId === operatorId)
        return operator ? operator.name : 'Unknown'
    }

    const getUserName = (userId) => {
        if (!userId) return 'Unknown'
        const operator = operators.find((op) => op.employeeId === userId)
        if (operator) return operator.name
        const user = users.find((u) => u.id === userId)
        return user ? user.name : 'Unknown'
    }

    const formatValue = (fieldName, value) => {
        const key =
            fieldName && fieldName.includes('_')
                ? fieldName
                : String(fieldName || '')
                      .replace(/([A-Z])/g, '_$1')
                      .toLowerCase()
        if (key === 'created') {
            return value || ''
        }
        if (value === null || value === undefined || value === '') return 'Not Assigned'
        if (key === 'assigned_operator') {
            return getOperatorName(value)
        }
        if (key === 'cleanliness_rating') {
            const n = parseInt(value, 10)
            return Number.isFinite(n) && n > 0 ? '\u2605'.repeat(n) : String(value)
        }
        if (key === 'last_service_date' || key === 'last_chip_date') {
            return value ? FormatUtility.formatDate(value) : 'Not Assigned'
        }
        if (type === 'tractor' && key === 'has_blower') {
            return value ? 'Yes' : 'No'
        }
        if (key.includes('date') && value) {
            return FormatUtility.formatDate(value)
        }
        if (key === 'assigned_trainer') {
            return getUserName(value)
        }
        return value
    }

    const sortedHistory = useMemo(() => {
        let sortableItems = [...history]
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue, bValue
                if (sortConfig.key === 'changedAt') {
                    aValue = a.changedAt || a.changed_at
                    bValue = b.changedAt || b.changed_at
                } else if (sortConfig.key === 'fieldName') {
                    aValue = a.fieldName || a.field_name
                    bValue = b.fieldName || b.field_name
                } else if (sortConfig.key === 'oldValue') {
                    aValue = a.oldValue || a.old_value
                    bValue = b.oldValue || b.old_value
                } else if (sortConfig.key === 'newValue') {
                    aValue = a.newValue || a.new_value
                    bValue = b.newValue || b.new_value
                } else if (sortConfig.key === 'changedBy') {
                    aValue = a.changedBy || a.changed_by
                    bValue = b.changedBy || b.changed_by
                }
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1
                }
                return 0
            })
        }
        return sortableItems
    }, [history, sortConfig])

    const cleanlinessData = useMemo(() => {
        const cleanlinessEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'cleanliness_rating'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return cleanlinessEntries
            .map((entry) => ({
                date: new Date(entry.changedAt || entry.changed_at),
                rating: parseInt(entry.newValue || entry.new_value, 10),
                timestamp: entry.changedAt || entry.changed_at
            }))
            .filter((d) => !isNaN(d.rating) && d.rating > 0)
    }, [history])

    const conditionData = useMemo(() => {
        const conditionEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'condition_rating'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return conditionEntries
            .map((entry) => ({
                date: new Date(entry.changedAt || entry.changed_at),
                rating: parseInt(entry.newValue || entry.new_value, 10),
                timestamp: entry.changedAt || entry.changed_at
            }))
            .filter((d) => !isNaN(d.rating) && d.rating > 0)
    }, [history])

    const operatorData = useMemo(() => {
        const operatorEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'assigned_operator'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return operatorEntries
            .map((entry) => {
                const operatorId = entry.newValue || entry.new_value
                const operatorName = getOperatorName(operatorId)
                const isEmpty = !operatorId || operatorId === '0' || operatorId === 'null' || operatorName === 'None'

                return {
                    date: new Date(entry.changedAt || entry.changed_at),
                    isEmpty: isEmpty,
                    operator: isEmpty ? 'Empty' : operatorName,
                    operatorId: operatorId,
                    timestamp: entry.changedAt || entry.changed_at
                }
            })
            .filter((entry) => entry.operator !== 'Unknown')
    }, [history, operators])

    const serviceData = useMemo(() => {
        const serviceEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'last_service_date' || key === 'last_chip_date'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return serviceEntries
            .map((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                const serviceDate = entry.newValue || entry.new_value

                return {
                    changedBy: entry.changedBy || entry.changed_by,
                    date: new Date(entry.changedAt || entry.changed_at),
                    serviceDate: serviceDate,
                    serviceType: key === 'last_chip_date' ? 'Chip' : 'Service',
                    timestamp: entry.changedAt || entry.changed_at
                }
            })
            .filter((entry) => entry.serviceDate)
    }, [history])

    const plantData = useMemo(() => {
        const plantEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'assigned_plant'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return plantEntries
            .map((entry) => ({
                changedBy: entry.changedBy || entry.changed_by,
                date: new Date(entry.changedAt || entry.changed_at),
                plant: entry.newValue || entry.new_value,
                timestamp: entry.changedAt || entry.changed_at
            }))
            .filter((entry) => entry.plant && entry.plant !== 'null' && entry.plant !== '')
    }, [history])

    const statusData = useMemo(() => {
        const statusEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'status'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return statusEntries
            .map((entry) => ({
                changedBy: entry.changedBy || entry.changed_by,
                date: new Date(entry.changedAt || entry.changed_at),
                status: entry.newValue || entry.new_value,
                timestamp: entry.changedAt || entry.changed_at
            }))
            .filter((entry) => entry.status && entry.status !== 'null' && entry.status !== '')
    }, [history])

    const positionData = useMemo(() => {
        const positionEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'position'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return positionEntries
            .map((entry) => ({
                changedBy: entry.changedBy || entry.changed_by,
                date: new Date(entry.changedAt || entry.changed_at),
                position: entry.newValue || entry.new_value,
                timestamp: entry.changedAt || entry.changed_at
            }))
            .filter((entry) => entry.position && entry.position !== 'null' && entry.position !== '')
    }, [history])

    const ratingsData = useMemo(() => {
        const ratingEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'rating'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return ratingEntries
            .map((entry) => ({
                changedBy: entry.changedBy || entry.changed_by,
                date: new Date(entry.changedAt || entry.changed_at),
                rating: parseInt(entry.newValue || entry.new_value, 10),
                timestamp: entry.changedAt || entry.changed_at
            }))
            .filter((d) => !isNaN(d.rating) && d.rating >= 0)
    }, [history])

    const mileageData = useMemo(() => {
        const mileageEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'mileage'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return mileageEntries
            .map((entry) => ({
                changedBy: entry.changedBy || entry.changed_by,
                date: new Date(entry.changedAt || entry.changed_at),
                mileage: parseInt(entry.newValue || entry.new_value, 10),
                timestamp: entry.changedAt || entry.changed_at
            }))
            .filter((entry) => !isNaN(entry.mileage) && entry.mileage >= 0)
    }, [history])

    const assignmentsData = useMemo(() => {
        const assignmentEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'assigned_mixer' || key === 'assigned_tractor'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        return assignmentEntries.map((entry) => {
            const fieldName = entry.fieldName || entry.field_name
            const key =
                fieldName && fieldName.includes('_')
                    ? fieldName
                    : String(fieldName || '')
                          .replace(/([A-Z])/g, '_$1')
                          .toLowerCase()
            const assignmentType = key === 'assigned_mixer' ? 'Mixer' : 'Tractor'
            const newValue = entry.newValue || entry.new_value
            const oldValue = entry.oldValue || entry.old_value

            return {
                assignmentType: assignmentType,
                changedBy: entry.changedBy || entry.changed_by,
                date: new Date(entry.changedAt || entry.changed_at),
                isAssignment: newValue && newValue !== 'null' && newValue !== '',
                isUnassignment: !newValue || newValue === 'null' || newValue === '',
                previousVehicleNumber: oldValue && oldValue !== 'null' && oldValue !== '' ? oldValue : null,
                timestamp: entry.changedAt || entry.changed_at,
                vehicleNumber: newValue && newValue !== 'null' && newValue !== '' ? newValue : null
            }
        })
    }, [history])

    const allStatusPeriodsData = useMemo(() => {
        const statusEntries = history
            .filter((entry) => {
                const fieldName = entry.fieldName || entry.field_name
                const key =
                    fieldName && fieldName.includes('_')
                        ? fieldName
                        : String(fieldName || '')
                              .replace(/([A-Z])/g, '_$1')
                              .toLowerCase()
                return key === 'status'
            })
            .sort((a, b) => {
                const aTime = new Date(a.changedAt || a.changed_at)
                const bTime = new Date(b.changedAt || b.changed_at)
                return aTime - bTime
            })

        const statusPeriods = []

        if (statusEntries.length > 0) {
            const firstEntry = statusEntries[0]
            const oldStatus = firstEntry.oldValue || firstEntry.old_value

            if (oldStatus && oldStatus !== 'null' && oldStatus !== '') {
                const oldestHistoryEntry =
                    history.length > 0
                        ? new Date(Math.min(...history.map((h) => new Date(h.changedAt || h.changed_at))))
                        : new Date(firstEntry.changedAt || firstEntry.changed_at)
                const firstChangeDate = new Date(firstEntry.changedAt || firstEntry.changed_at)
                const initialDays = Math.round((firstChangeDate - oldestHistoryEntry) / (1000 * 60 * 60 * 24))

                if (initialDays > 0) {
                    statusPeriods.push({
                        changedBy: null,
                        days: initialDays,
                        endChangedBy: firstEntry.changedBy || firstEntry.changed_by,
                        endDate: firstChangeDate,
                        endTimestamp: firstEntry.changedAt || firstEntry.changed_at,
                        isCurrent: false,
                        startDate: oldestHistoryEntry,
                        startTimestamp: oldestHistoryEntry.toISOString(),
                        status: oldStatus
                    })
                }
            }
        }

        statusEntries.forEach((entry, index) => {
            const status = entry.newValue || entry.new_value
            const timestamp = entry.changedAt || entry.changed_at
            const changedBy = entry.changedBy || entry.changed_by
            const startDate = new Date(timestamp)

            const nextEntry = statusEntries[index + 1]
            const endDate = nextEntry ? new Date(nextEntry.changedAt || nextEntry.changed_at) : new Date()
            const endTimestamp = nextEntry ? nextEntry.changedAt || nextEntry.changed_at : null
            const endChangedBy = nextEntry ? nextEntry.changedBy || nextEntry.changed_by : null
            const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))

            statusPeriods.push({
                changedBy: changedBy,
                days: days,
                endChangedBy: endChangedBy,
                endDate: endDate,
                endTimestamp: endTimestamp,
                isCurrent: !nextEntry,
                startDate: startDate,
                startTimestamp: timestamp,
                status: status
            })
        })

        return statusPeriods
    }, [history])

    const itemName =
        type === 'mixer' || type === 'tractor'
            ? `Truck #${item.truckNumber}`
            : type === 'pickup-truck'
              ? `${item.make || ''} ${item.model || ''} (${item.vin || 'Unknown'})`.trim()
              : item.name || 'Item'

    const AI_HISTORY_CACHE_KEY = 'srm_history_ai_summaries'
    const AI_CACHE_DURATION = 24 * 60 * 60 * 1000

    const getAssetCacheKey = useCallback(() => {
        const assetId = type === 'operator' ? item.employeeId : item.id
        return `${type}-${assetId}`
    }, [type, item])

    const getAISummaryFromCache = useCallback(() => {
        try {
            const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
            if (!cached) return null
            const cacheData = JSON.parse(cached)
            const assetCache = cacheData[getAssetCacheKey()]
            if (!assetCache) return null
            if (Date.now() - assetCache.timestamp > AI_CACHE_DURATION) {
                return null
            }
            if (assetCache.historyCount !== history.length) {
                return null
            }
            return assetCache.summary
        } catch {
            return null
        }
    }, [getAssetCacheKey, history.length])

    const setAISummaryToCache = useCallback(
        (summary) => {
            try {
                const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
                const cacheData = cached ? JSON.parse(cached) : {}
                cacheData[getAssetCacheKey()] = {
                    historyCount: history.length,
                    summary,
                    timestamp: Date.now()
                }
                localStorage.setItem(AI_HISTORY_CACHE_KEY, JSON.stringify(cacheData))
            } catch {}
        },
        [getAssetCacheKey, history.length]
    )

    const clearAISummaryCache = useCallback(() => {
        try {
            const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
            if (!cached) return
            const cacheData = JSON.parse(cached)
            delete cacheData[getAssetCacheKey()]
            localStorage.setItem(AI_HISTORY_CACHE_KEY, JSON.stringify(cacheData))
        } catch {}
    }, [getAssetCacheKey])

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
                    assetIdentifier:
                        type === 'mixer' || type === 'tractor'
                            ? item.truckNumber
                            : type === 'operator'
                              ? item.name
                              : type === 'pickup-truck'
                                ? `${item.make} ${item.model}`
                                : item.identifyingNumber || item.name || 'Unknown',
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
                    currentPlant: item.plantCode || item.assignedPlant || 'Unknown',
                    currentStatus: item.status || 'Unknown',
                    currentStatusDays: statusData.find((s) => s.isCurrent)?.days || 0,
                    highSeverityIssues: issues.filter((i) => i.severity === 'High' && i.status !== 'Resolved').length,
                    openIssues: issues.filter((i) => i.status !== 'Resolved').length,
                    operatorChanges: type === 'mixer' || type === 'tractor' ? operatorData.length : 0,
                    plantChanges: plantData?.length || 0,
                    recentChanges: history.slice(0, 10).map((h) => ({
                        date: h.changedAt || h.changed_at,
                        field: h.fieldName || h.field_name,
                        from: h.oldValue || h.old_value,
                        to: h.newValue || h.new_value
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
                                                        sum + (s.date - serviceData[i - 1].date) / (1000 * 60 * 60 * 24)
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
            } catch (err) {
                console.error('Error generating AI summary:', err)
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

    useEffect(() => {
        if (!isLoading && activeTab === 'ai-summary' && !aiSummary && !aiSummaryLoading) {
            generateAISummary()
        }
    }, [isLoading, activeTab, aiSummary, aiSummaryLoading, generateAISummary])

    const handleRegenerateAISummary = useCallback(() => {
        clearAISummaryCache()
        setAiSummary(null)
        generateAISummary(true)
    }, [clearAISummaryCache, generateAISummary])

    const renderAISummary = () => {
        if (aiSummaryLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mb-4">
                        <i className="fas fa-robot text-[#1e3a5f] text-xl animate-pulse"></i>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Analyzing history...</p>
                    <p className="text-xs text-slate-400 mt-1">This may take a moment</p>
                </div>
            )
        }

        if (aiSummaryError) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Failed to generate analysis</p>
                    <button
                        onClick={handleRegenerateAISummary}
                        className="mt-3 px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#2d5a8a] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )
        }

        if (!aiSummary) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <i className="fas fa-robot text-slate-400 text-xl"></i>
                    </div>
                    <p className="text-sm text-slate-500">No analysis available</p>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8a] rounded-xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <i className="fas fa-robot text-lg"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base m-0">AI Analysis</h3>
                            <p className="text-xs text-white/70 m-0">Based on {history.length} history entries</p>
                        </div>
                    </div>
                    <div className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{aiSummary}</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-[#1e3a5f]">{history.length}</div>
                        <div className="text-xs text-slate-500">Total Changes</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-[#1e3a5f]">{statusData.length}</div>
                        <div className="text-xs text-slate-500">Status Changes</div>
                    </div>
                    {(type === 'mixer' || type === 'tractor') && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-[#1e3a5f]">{operatorData.length}</div>
                            <div className="text-xs text-slate-500">Operator Changes</div>
                        </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-[#1e3a5f]">{issues.length}</div>
                        <div className="text-xs text-slate-500">Total Issues</div>
                    </div>
                </div>

                <button
                    onClick={handleRegenerateAISummary}
                    className="w-full py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                    <i className="fas fa-sync-alt text-xs"></i>
                    Regenerate Analysis
                </button>
            </div>
        )
    }

    const renderCleanlinessChart = () => {
        if (cleanlinessData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No cleanliness rating history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Cleanliness ratings will be charted here once they are recorded.
                    </p>
                </div>
            )
        }

        const maxRating = 5
        const chartHeight = 300
        const padding = 40

        return (
            <div className="flex flex-col gap-2.5">
                <h3 className="m-0 mb-3 text-sm font-bold text-slate-800">Cleanliness Rating Over Time</h3>
                <div className="flex gap-4 mb-4 flex-wrap">
                    <div className="flex flex-col gap-0.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-gray-200">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                            Average Rating:
                        </span>
                        <span className="text-[15px] font-bold text-slate-800">
                            {(cleanlinessData.reduce((sum, d) => sum + d.rating, 0) / cleanlinessData.length).toFixed(
                                1
                            )}
                            ★
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-gray-200">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                            Total Ratings:
                        </span>
                        <span className="text-[15px] font-bold text-slate-800">{cleanlinessData.length}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-gray-200">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                            Current Rating:
                        </span>
                        <span className="text-[15px] font-bold text-slate-800">
                            {cleanlinessData[cleanlinessData.length - 1].rating}★
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto my-3 bg-slate-50 rounded-md p-3 border border-gray-200">
                    <svg
                        className="w-full min-h-[250px]"
                        viewBox={`0 0 ${1000} ${chartHeight + padding * 2}`}
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <g transform={`translate(${padding}, ${padding})`}>
                            {[5, 4, 3, 2, 1].map((rating) => (
                                <g key={rating}>
                                    <line
                                        x1="0"
                                        y1={(maxRating - rating) * (chartHeight / maxRating)}
                                        x2={1000 - padding * 2}
                                        y2={(maxRating - rating) * (chartHeight / maxRating)}
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                        strokeDasharray="4"
                                    />
                                    <text
                                        x="-10"
                                        y={(maxRating - rating) * (chartHeight / maxRating) + 5}
                                        textAnchor="end"
                                        fontSize="12"
                                        fill="#64748b"
                                    >
                                        {rating}★
                                    </text>
                                </g>
                            ))}

                            {cleanlinessData.map((point, index) => {
                                const x = (index / (cleanlinessData.length - 1 || 1)) * (1000 - padding * 2)
                                const y = (maxRating - point.rating) * (chartHeight / maxRating)

                                return (
                                    <g key={index}>
                                        {index < cleanlinessData.length - 1 && (
                                            <line
                                                x1={x}
                                                y1={y}
                                                x2={((index + 1) / (cleanlinessData.length - 1)) * (1000 - padding * 2)}
                                                y2={
                                                    (maxRating - cleanlinessData[index + 1].rating) *
                                                    (chartHeight / maxRating)
                                                }
                                                stroke="#1e3a5f"
                                                strokeWidth="3"
                                            />
                                        )}
                                        <circle cx={x} cy={y} r="6" fill="#1e3a5f" stroke="white" strokeWidth="2" />
                                        <text
                                            x={x}
                                            y={chartHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="#64748b"
                                            transform={`rotate(-45, ${x}, ${chartHeight + 20})`}
                                        >
                                            {FormatUtility.formatDate(point.timestamp)}
                                        </text>
                                    </g>
                                )
                            })}
                        </g>
                    </svg>
                </div>
            </div>
        )
    }

    const renderConditionChart = () => {
        if (conditionData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No condition rating history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Condition ratings will be charted here once they are recorded.
                    </p>
                </div>
            )
        }

        const maxRating = 5
        const chartHeight = 300
        const padding = 40

        return (
            <div className="flex flex-col gap-2.5">
                <h3 className="m-0 mb-3 text-sm font-bold text-slate-800">Condition Rating Over Time</h3>
                <div className="flex gap-4 mb-4 flex-wrap">
                    <div className="flex flex-col gap-0.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-gray-200">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                            Average Rating:
                        </span>
                        <span className="text-[15px] font-bold text-slate-800">
                            {(conditionData.reduce((sum, d) => sum + d.rating, 0) / conditionData.length).toFixed(1)}★
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-gray-200">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                            Total Ratings:
                        </span>
                        <span className="text-[15px] font-bold text-slate-800">{conditionData.length}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-gray-200">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                            Current Rating:
                        </span>
                        <span className="text-[15px] font-bold text-slate-800">
                            {conditionData[conditionData.length - 1].rating}★
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto my-3 bg-slate-50 rounded-md p-3 border border-gray-200">
                    <svg
                        className="w-full min-h-[250px]"
                        viewBox={`0 0 ${1000} ${chartHeight + padding * 2}`}
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <g transform={`translate(${padding}, ${padding})`}>
                            {[5, 4, 3, 2, 1].map((rating) => (
                                <g key={rating}>
                                    <line
                                        x1="0"
                                        y1={(maxRating - rating) * (chartHeight / maxRating)}
                                        x2={1000 - padding * 2}
                                        y2={(maxRating - rating) * (chartHeight / maxRating)}
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                        strokeDasharray="4"
                                    />
                                    <text
                                        x="-10"
                                        y={(maxRating - rating) * (chartHeight / maxRating) + 5}
                                        textAnchor="end"
                                        fontSize="12"
                                        fill="#64748b"
                                    >
                                        {rating}★
                                    </text>
                                </g>
                            ))}

                            {conditionData.map((point, index) => {
                                const x = (index / (conditionData.length - 1 || 1)) * (1000 - padding * 2)
                                const y = (maxRating - point.rating) * (chartHeight / maxRating)

                                return (
                                    <g key={index}>
                                        {index < conditionData.length - 1 && (
                                            <line
                                                x1={x}
                                                y1={y}
                                                x2={((index + 1) / (conditionData.length - 1)) * (1000 - padding * 2)}
                                                y2={
                                                    (maxRating - conditionData[index + 1].rating) *
                                                    (chartHeight / maxRating)
                                                }
                                                stroke="#1e3a5f"
                                                strokeWidth="3"
                                            />
                                        )}
                                        <circle cx={x} cy={y} r="6" fill="#1e3a5f" stroke="white" strokeWidth="2" />
                                        <text
                                            x={x}
                                            y={chartHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="#64748b"
                                            transform={`rotate(-45, ${x}, ${chartHeight + 20})`}
                                        >
                                            {FormatUtility.formatDate(point.timestamp)}
                                        </text>
                                    </g>
                                )
                            })}
                        </g>
                    </svg>
                </div>
            </div>
        )
    }

    const renderOperatorChart = () => {
        if (operatorData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">
                        No operator assignment history available
                    </p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Operator assignments will be charted here once they are recorded.
                    </p>
                </div>
            )
        }

        const operatorCounts = operatorData.reduce((acc, entry) => {
            acc[entry.operator] = (acc[entry.operator] || 0) + 1
            return acc
        }, {})

        const calculateDuration = (startIndex, operatorName) => {
            let endIndex = startIndex + 1
            while (endIndex < operatorData.length && operatorData[endIndex].operator === operatorName) {
                endIndex++
            }
            const start = operatorData[startIndex].date
            const end = endIndex < operatorData.length ? operatorData[endIndex].date : new Date()
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24))
            return { days, endIndex }
        }

        const operatorDurations = {}
        let i = 0
        while (i < operatorData.length) {
            const entry = operatorData[i]
            const { days, endIndex } = calculateDuration(i, entry.operator)
            if (!operatorDurations[entry.operator]) {
                operatorDurations[entry.operator] = 0
            }
            operatorDurations[entry.operator] += days
            i = endIndex
        }

        const totalAssignments = operatorData.length
        const uniqueOperators = Object.keys(operatorCounts).filter((op) => op !== 'Empty').length
        const isActive = item.status === 'Active'
        const lastEntry = operatorData.length > 0 ? operatorData[operatorData.length - 1] : null
        const currentOperator = lastEntry ? (lastEntry.isEmpty ? 'Empty' : lastEntry.operator) : null
        const mostFrequentOperator =
            Object.keys(operatorDurations).length > 0
                ? Object.entries(operatorDurations)
                      .filter(([op]) => op !== 'Empty')
                      .reduce((a, b) => (!a || b[1] > a[1] ? b : a), null)?.[0] || 'Not Assigned'
                : null

        const consolidatedTimeline = []
        let j = 0
        while (j < operatorData.length) {
            const entry = operatorData[j]
            const { days, endIndex } = calculateDuration(j, entry.operator)

            let statusPeriods = []
            if (entry.isEmpty) {
                const periodStart = new Date(entry.timestamp)
                const periodEnd =
                    endIndex < operatorData.length ? new Date(operatorData[endIndex].timestamp) : new Date()

                const statusChangesInPeriod = statusData.filter((statusEntry) => {
                    const statusDate = new Date(statusEntry.timestamp)
                    return statusDate >= periodStart && statusDate < periodEnd
                })

                if (statusChangesInPeriod.length > 0) {
                    const statusDaysMap = {}
                    let currentStatus = statusChangesInPeriod[0]
                    let statusStart = periodStart

                    for (let k = 1; k < statusChangesInPeriod.length; k++) {
                        const nextStatus = statusChangesInPeriod[k]
                        const statusEnd = new Date(nextStatus.timestamp)
                        const statusDays = Math.round((statusEnd - statusStart) / (1000 * 60 * 60 * 24))

                        if (!statusDaysMap[currentStatus.status]) {
                            statusDaysMap[currentStatus.status] = 0
                        }
                        statusDaysMap[currentStatus.status] += statusDays

                        currentStatus = nextStatus
                        statusStart = statusEnd
                    }

                    const lastStatusDays = Math.round((periodEnd - statusStart) / (1000 * 60 * 60 * 24))
                    if (!statusDaysMap[currentStatus.status]) {
                        statusDaysMap[currentStatus.status] = 0
                    }
                    statusDaysMap[currentStatus.status] += lastStatusDays

                    statusPeriods = Object.entries(statusDaysMap).map(([status, totalDays]) => ({
                        days: totalDays,
                        status: status
                    }))
                } else {
                    const currentStatus = item.status || 'Unknown'
                    statusPeriods.push({
                        days: days,
                        status: currentStatus
                    })
                }
            }

            consolidatedTimeline.push({
                days: days,
                isCurrent: endIndex >= operatorData.length,
                isEmpty: entry.isEmpty,
                operator: entry.operator,
                startDate: entry.timestamp,
                statusPeriods: statusPeriods
            })
            j = endIndex
        }

        return (
            <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mb-3">
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Operator
                        </div>
                        <div className="text-base font-bold text-slate-800">{currentOperator || 'Not Assigned'}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Assignments
                        </div>
                        <div className="text-base font-bold text-slate-800">{totalAssignments}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Unique Operators
                        </div>
                        <div className="text-base font-bold text-slate-800">{uniqueOperators}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Most Frequent
                        </div>
                        <div className="text-base font-bold text-slate-800">
                            {mostFrequentOperator || 'Not Assigned'}
                        </div>
                    </div>
                </div>

                <h3 className="m-0 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide pb-1.5 border-b border-gray-200">
                    Assignment Timeline
                </h3>
                <div className="flex flex-col gap-0">
                    {consolidatedTimeline
                        .slice()
                        .reverse()
                        .map((entry, index) => (
                            <div key={index} className="flex gap-3 py-2">
                                <div className="flex flex-col items-center w-5 flex-shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-[#1e3a5f] border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"></div>
                                    {index < consolidatedTimeline.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                    )}
                                </div>
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm font-semibold text-slate-800">{entry.operator}</span>
                                        {entry.isCurrent && (
                                            <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                                                Current
                                            </span>
                                        )}
                                        {entry.isEmpty && !entry.isCurrent && (
                                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                                                No Operator
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-slate-500">
                                            {FormatUtility.formatDate(entry.startDate)}
                                        </span>
                                        <span className="text-xs text-[#1e3a5f] font-semibold">
                                            {entry.days} {entry.days === 1 ? 'day' : 'days'}
                                        </span>
                                    </div>
                                    {entry.isEmpty && entry.statusPeriods && entry.statusPeriods.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="text-[10px] text-slate-500 font-semibold mb-1">
                                                Status during period:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {entry.statusPeriods.map((statusPeriod, spIndex) => (
                                                    <div
                                                        key={spIndex}
                                                        className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"
                                                    >
                                                        <span className="font-medium">{statusPeriod.status}</span>
                                                        <span className="text-slate-400 ml-1">
                                                            ({statusPeriod.days}{' '}
                                                            {statusPeriod.days === 1 ? 'day' : 'days'})
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        )
    }

    const renderOverviewChart = () => {
        const currentStatus = item.status || 'Unknown'

        const oldestEntry =
            history.length > 0
                ? new Date(Math.min(...history.map((h) => new Date(h.changedAt || h.changed_at))))
                : new Date()
        const totalDaysSinceCreation = Math.round((new Date() - oldestEntry) / (1000 * 60 * 60 * 24))

        let statusDaysMap = {}
        let statusPercentages
        let totalShopDays = 0

        if (allStatusPeriodsData.length === 0) {
            statusDaysMap[currentStatus] = totalDaysSinceCreation > 0 ? totalDaysSinceCreation : 1
            statusPercentages = [
                {
                    days: statusDaysMap[currentStatus],
                    percentage: '100.0',
                    status: currentStatus
                }
            ]
        } else {
            totalShopDays = allStatusPeriodsData
                .filter((p) => p.status === 'In Shop')
                .reduce((sum, period) => sum + period.days, 0)

            allStatusPeriodsData.forEach((period) => {
                if (!statusDaysMap[period.status]) {
                    statusDaysMap[period.status] = 0
                }
                statusDaysMap[period.status] += period.days
            })

            statusPercentages = Object.entries(statusDaysMap)
                .map(([status, days]) => ({
                    days,
                    percentage: totalDaysSinceCreation > 0 ? ((days / totalDaysSinceCreation) * 100).toFixed(1) : 0,
                    status
                }))
                .sort((a, b) => b.days - a.days)
        }

        const getStatusColor = (status) => {
            switch (status) {
                case 'Active':
                    return '#16a34a'
                case 'Spare':
                    return '#9333ea'
                case 'In Shop':
                    return '#3b82f6'
                case 'Retired':
                    return '#dc2626'
                default:
                    return '#1e3a5f'
            }
        }

        return (
            <div className="flex flex-col gap-2.5">
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 m-0 mb-4">Asset Status Distribution</h3>
                    <div className="mb-4">
                        <div className="flex h-6 rounded-xl overflow-hidden bg-slate-100">
                            {statusPercentages.map(
                                (item, index) =>
                                    parseFloat(item.percentage) > 0 && (
                                        <div
                                            key={index}
                                            className="flex items-center justify-center text-white text-xs font-semibold min-w-[30px] transition-all"
                                            style={{
                                                background: getStatusColor(item.status),
                                                width: `${item.percentage}%`
                                            }}
                                            title={`${item.status}: ${item.percentage}%`}
                                        >
                                            {parseFloat(item.percentage) > 10 && <span>{item.percentage}%</span>}
                                        </div>
                                    )
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {statusPercentages.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded"
                                    style={{ background: getStatusColor(item.status) }}
                                ></div>
                                <div className="flex flex-col">
                                    <div className="text-xs font-semibold text-slate-800">{item.status}</div>
                                    <div className="text-[11px] text-slate-500">
                                        {item.days} days ({item.percentage}%)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mb-3">
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Status
                        </div>
                        <div className="text-base font-bold text-slate-800">{currentStatus}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Status Changes
                        </div>
                        <div className="text-base font-bold text-slate-800">{allStatusPeriodsData.length}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Shop Days
                        </div>
                        <div className="text-base font-bold text-slate-800">{totalShopDays}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Days Since Creation
                        </div>
                        <div className="text-base font-bold text-slate-800">{totalDaysSinceCreation}</div>
                    </div>
                </div>

                <h3 className="m-0 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide pb-1.5 border-b border-gray-200">
                    Status Timeline
                </h3>
                <div className="flex flex-col gap-0">
                    {allStatusPeriodsData.length === 0 ? (
                        <div className="flex gap-3 py-2">
                            <div className="flex flex-col items-center w-5 flex-shrink-0">
                                <div
                                    className="w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"
                                    style={{ background: getStatusColor(currentStatus) }}
                                ></div>
                            </div>
                            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm font-semibold text-slate-800">{currentStatus}</span>
                                    <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                                        Current
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-xs text-slate-500">Since Creation</span>
                                    <span className="text-xs text-[#1e3a5f] font-semibold">
                                        {statusDaysMap[currentStatus]}{' '}
                                        {statusDaysMap[currentStatus] === 1 ? 'day' : 'days'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap mt-1">
                                    <span className="text-xs text-slate-500 italic">No status changes recorded</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        allStatusPeriodsData
                            .slice()
                            .reverse()
                            .map((period, index) => (
                                <div key={index} className="flex gap-3 py-2">
                                    <div className="flex flex-col items-center w-5 flex-shrink-0">
                                        <div
                                            className="w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"
                                            style={{ background: getStatusColor(period.status) }}
                                        ></div>
                                        {index < allStatusPeriodsData.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-sm font-semibold text-slate-800">
                                                {period.status}
                                            </span>
                                            {period.isCurrent && (
                                                <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs text-slate-500">
                                                {FormatUtility.formatDate(period.startTimestamp)}
                                                {period.endTimestamp &&
                                                    ` - ${FormatUtility.formatDate(period.endTimestamp)}`}
                                                {!period.endTimestamp && ' - Present'}
                                            </span>
                                            <span className="text-xs text-[#1e3a5f] font-semibold">
                                                {period.days} {period.days === 1 ? 'day' : 'days'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap mt-1">
                                            <span className="text-xs text-slate-500">
                                                Started by: <UserLabel userId={period.changedBy} showIcon={false} />
                                            </span>
                                            {period.endChangedBy && (
                                                <span className="text-xs text-slate-500">
                                                    Ended by:{' '}
                                                    <UserLabel userId={period.endChangedBy} showIcon={false} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>
        )
    }

    const renderServiceHistory = () => {
        const sortedIssues = [...issues].sort((a, b) => {
            return new Date(b.time_created) - new Date(a.time_created)
        })

        const openIssues = sortedIssues.filter((issue) => !issue.time_completed)
        const resolvedIssues = sortedIssues.filter((issue) => issue.time_completed)

        if (serviceData.length === 0 && issues.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No service history or issues available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Service records and issues will appear here once they are logged.
                    </p>
                </div>
            )
        }

        const servicesByType = serviceData.reduce((acc, entry) => {
            if (!acc[entry.serviceType]) acc[entry.serviceType] = []
            acc[entry.serviceType].push(entry)
            return acc
        }, {})

        const calculateAverageDays = (services) => {
            if (services.length < 2) return null
            const intervals = []
            for (let i = 1; i < services.length; i++) {
                const date1 = new Date(services[i - 1].serviceDate)
                const date2 = new Date(services[i].serviceDate)
                const days = Math.round((date2 - date1) / (1000 * 60 * 60 * 24))
                if (days > 0) intervals.push(days)
            }
            return intervals.length > 0 ? Math.round(intervals.reduce((sum, d) => sum + d, 0) / intervals.length) : null
        }

        const actualServices = serviceData.filter((s) => s.serviceType === 'Service')
        const lastService = actualServices.length > 0 ? actualServices[actualServices.length - 1] : null
        const daysSinceLastService = lastService
            ? Math.round((new Date() - new Date(lastService.serviceDate)) / (1000 * 60 * 60 * 24))
            : null
        const avgDaysService = calculateAverageDays(servicesByType['Service'] || [])

        const combinedTimeline = []

        serviceData.forEach((service) => {
            combinedTimeline.push({
                changedBy: service.changedBy,
                date: service.serviceDate,
                serviceType: service.serviceType,
                timestamp: service.timestamp,
                type: 'service'
            })
        })

        issues.forEach((issue) => {
            combinedTimeline.push({
                completedDate: issue.time_completed,
                date: issue.time_created,
                isCompleted: !!issue.time_completed,
                issue: issue,
                timestamp: issue.time_created,
                type: 'issue'
            })
        })

        combinedTimeline.sort((a, b) => {
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)
            return dateB - dateA
        })

        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-200">
                    {lastService && (
                        <div className="flex items-center gap-2">
                            <i className="fas fa-wrench text-[#1e3a5f]"></i>
                            <div>
                                <div className="text-xs text-slate-500">Last Service</div>
                                <div className="text-sm font-semibold text-slate-800">
                                    {FormatUtility.formatDate(lastService.serviceDate)} ({daysSinceLastService} days
                                    ago)
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <i className="fas fa-exclamation-circle text-amber-500"></i>
                        <div>
                            <div className="text-xs text-slate-500">Open Issues</div>
                            <div className="text-sm font-semibold text-slate-800">{openIssues.length}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fas fa-check-circle text-green-600"></i>
                        <div>
                            <div className="text-xs text-slate-500">Resolved</div>
                            <div className="text-sm font-semibold text-slate-800">{resolvedIssues.length}</div>
                        </div>
                    </div>
                </div>

                <h3 className="m-0 text-xs font-bold text-slate-800 uppercase tracking-wide">Timeline</h3>
                <ErrorMessage message={error} onDismiss={() => setError(null)} />

                <div className="flex flex-col gap-0">
                    {combinedTimeline.map((entry, index) => {
                        if (entry.type === 'service') {
                            return (
                                <div key={`service-${index}`} className="flex gap-3 py-2">
                                    <div className="flex flex-col items-center w-5 flex-shrink-0">
                                        <div className="w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1] bg-green-600"></div>
                                        {index < combinedTimeline.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-sm font-semibold text-slate-800">
                                                <i className="fas fa-wrench mr-1"></i> {entry.serviceType}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs text-slate-500">
                                                {FormatUtility.formatDate(entry.date)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        } else {
                            const issue = entry.issue
                            const severityColor = entry.isCompleted
                                ? '#16a34a'
                                : issue.severity === 'High'
                                  ? '#dc2626'
                                  : issue.severity === 'Medium'
                                    ? '#f59e0b'
                                    : '#3b82f6'
                            return (
                                <div key={`issue-${issue.id}`} className="flex gap-3 py-2">
                                    <div className="flex flex-col items-center w-5 flex-shrink-0">
                                        <div
                                            className="w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"
                                            style={{ background: severityColor }}
                                        ></div>
                                        {index < combinedTimeline.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                        )}
                                    </div>
                                    <div
                                        className={`flex-1 bg-white border rounded-lg p-3 ${entry.isCompleted ? 'border-green-200' : 'border-gray-200'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <i
                                                        className={`${entry.isCompleted ? 'fas fa-check-circle text-green-600' : 'fas fa-exclamation-circle text-amber-500'}`}
                                                    ></i>
                                                    <span
                                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${issue.severity === 'High' ? 'bg-red-100 text-red-800' : issue.severity === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
                                                    >
                                                        {issue.severity}
                                                    </span>
                                                    {entry.isCompleted && (
                                                        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase">
                                                            RESOLVED
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-700">{issue.issue}</div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteIssue(issue.id)}
                                                title="Delete issue"
                                                className="text-slate-400 hover:text-red-600 p-1"
                                            >
                                                <i className="fas fa-trash text-xs"></i>
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 flex-wrap gap-2">
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>
                                                    <i className="fas fa-user mr-1"></i> {getCreatorName(issue)}
                                                </span>
                                                <span>
                                                    <i className="fas fa-calendar-plus mr-1"></i>{' '}
                                                    {formatDate(issue.time_created)}
                                                </span>
                                            </div>
                                            {entry.isCompleted && entry.completedDate && (
                                                <span className="text-xs text-green-600">
                                                    <i className="fas fa-check mr-1"></i> Completed:{' '}
                                                    {formatDate(issue.time_completed)}
                                                </span>
                                            )}
                                            {!entry.isCompleted && (
                                                <button
                                                    onClick={() => handleCompleteIssue(issue.id)}
                                                    title="Mark as resolved"
                                                    className="text-xs text-green-600 hover:text-green-800 font-semibold"
                                                >
                                                    <i className="fas fa-check mr-1"></i> Mark as Resolved
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    })}
                </div>
            </div>
        )
    }

    const renderPlantAssignments = () => {
        if (plantData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No plant assignment history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Plant assignments will appear here once they are recorded.
                    </p>
                </div>
            )
        }

        const plantCounts = plantData.reduce((acc, entry) => {
            acc[entry.plant] = (acc[entry.plant] || 0) + 1
            return acc
        }, {})

        const totalAssignments = plantData.length
        const uniquePlants = Object.keys(plantCounts).length
        const currentPlant = plantData[plantData.length - 1].plant
        const mostFrequentPlant = Object.entries(plantCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]

        const calculateDuration = (startIndex, plantCode) => {
            let endIndex = startIndex + 1
            while (endIndex < plantData.length && plantData[endIndex].plant === plantCode) {
                endIndex++
            }
            const start = plantData[startIndex].date
            const end = endIndex < plantData.length ? plantData[endIndex].date : new Date()
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24))
            return { days, endIndex }
        }

        const consolidatedTimeline = []
        let i = 0
        while (i < plantData.length) {
            const entry = plantData[i]
            const { days, endIndex } = calculateDuration(i, entry.plant)
            consolidatedTimeline.push({
                days: days,
                isCurrent: endIndex >= plantData.length,
                plant: entry.plant,
                startDate: entry.timestamp
            })
            i = endIndex
        }

        return (
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mb-3">
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Plant
                        </div>
                        <div className="text-base font-bold text-slate-800">{currentPlant}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Transfers
                        </div>
                        <div className="text-base font-bold text-slate-800">{totalAssignments}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Unique Plants
                        </div>
                        <div className="text-base font-bold text-slate-800">{uniquePlants}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Most Frequent
                        </div>
                        <div className="text-[13px] font-bold text-slate-800">{mostFrequentPlant}</div>
                    </div>
                </div>

                <h3 className="m-0 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide pb-1.5 border-b border-gray-200">
                    Assignment Timeline
                </h3>
                <div className="flex flex-col gap-0">
                    {consolidatedTimeline
                        .slice()
                        .reverse()
                        .map((entry, index) => (
                            <div key={index} className="flex gap-3 py-2">
                                <div className="flex flex-col items-center w-5 flex-shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-[#1e3a5f] border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"></div>
                                    {index < consolidatedTimeline.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                    )}
                                </div>
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm font-semibold text-slate-800">{entry.plant}</span>
                                        {entry.isCurrent && (
                                            <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-slate-500">
                                            {FormatUtility.formatDate(entry.startDate)}
                                        </span>
                                        <span className="text-xs text-[#1e3a5f] font-semibold">
                                            {entry.days} {entry.days === 1 ? 'day' : 'days'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        )
    }

    const renderStatusHistory = () => {
        if (statusData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No status history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Status changes will appear here once they are recorded.
                    </p>
                </div>
            )
        }

        const statusCounts = statusData.reduce((acc, entry) => {
            acc[entry.status] = (acc[entry.status] || 0) + 1
            return acc
        }, {})

        const totalChanges = statusData.length
        const uniqueStatuses = Object.keys(statusCounts).length
        const currentStatus = statusData[statusData.length - 1].status
        const mostFrequentStatus = Object.entries(statusCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]

        const calculateDuration = (startIndex, statusValue) => {
            let endIndex = startIndex + 1
            while (endIndex < statusData.length && statusData[endIndex].status === statusValue) {
                endIndex++
            }
            const start = statusData[startIndex].date
            const end = endIndex < statusData.length ? statusData[endIndex].date : new Date()
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24))
            return { days, endIndex }
        }

        const consolidatedTimeline = []
        let i = 0
        while (i < statusData.length) {
            const entry = statusData[i]
            const { days, endIndex } = calculateDuration(i, entry.status)
            consolidatedTimeline.push({
                changedBy: entry.changedBy,
                days: days,
                isCurrent: endIndex >= statusData.length,
                startDate: entry.timestamp,
                status: entry.status
            })
            i = endIndex
        }

        return (
            <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mb-3">
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Status
                        </div>
                        <div className="text-base font-bold text-slate-800">{currentStatus}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Changes
                        </div>
                        <div className="text-base font-bold text-slate-800">{totalChanges}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Unique Statuses
                        </div>
                        <div className="text-base font-bold text-slate-800">{uniqueStatuses}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Most Frequent
                        </div>
                        <div className="text-base font-bold text-slate-800">{mostFrequentStatus}</div>
                    </div>
                </div>

                <h3 className="m-0 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide pb-1.5 border-b border-gray-200">
                    Status Timeline
                </h3>
                <div className="flex flex-col gap-0">
                    {consolidatedTimeline
                        .slice()
                        .reverse()
                        .map((entry, index) => (
                            <div key={index} className="flex gap-3 py-2">
                                <div className="flex flex-col items-center w-5 flex-shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-[#1e3a5f] border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"></div>
                                    {index < consolidatedTimeline.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                    )}
                                </div>
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm font-semibold text-slate-800">{entry.status}</span>
                                        {entry.isCurrent && (
                                            <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-slate-500">
                                            {FormatUtility.formatDate(entry.startDate)}
                                        </span>
                                        <span className="text-xs text-[#1e3a5f] font-semibold">
                                            {entry.days} {entry.days === 1 ? 'day' : 'days'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        )
    }

    const renderPositionHistory = () => {
        if (positionData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No position history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Position changes will appear here once they are recorded.
                    </p>
                </div>
            )
        }

        const positionCounts = positionData.reduce((acc, entry) => {
            acc[entry.position] = (acc[entry.position] || 0) + 1
            return acc
        }, {})

        const totalChanges = positionData.length
        const uniquePositions = Object.keys(positionCounts).length
        const currentPosition = positionData[positionData.length - 1].position
        const mostFrequentPosition = Object.entries(positionCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]

        const chartData = Object.entries(positionCounts)
            .map(([position, count]) => ({
                count,
                percentage: ((count / totalChanges) * 100).toFixed(1),
                position
            }))
            .sort((a, b) => b.count - a.count)

        const calculateDuration = (startIndex, positionValue) => {
            let endIndex = startIndex + 1
            while (endIndex < positionData.length && positionData[endIndex].position === positionValue) {
                endIndex++
            }
            const start = positionData[startIndex].date
            const end = endIndex < positionData.length ? positionData[endIndex].date : new Date()
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24))
            return { days, endIndex }
        }

        const consolidatedTimeline = []
        let i = 0
        while (i < positionData.length) {
            const entry = positionData[i]
            const { days, endIndex } = calculateDuration(i, entry.position)
            consolidatedTimeline.push({
                changedBy: entry.changedBy,
                days: days,
                isCurrent: endIndex >= positionData.length,
                position: entry.position,
                startDate: entry.timestamp
            })
            i = endIndex
        }

        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Position
                        </div>
                        <div className="text-sm font-bold text-slate-800 truncate">{currentPosition}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Changes
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{totalChanges}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Unique Positions
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{uniquePositions}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Most Frequent
                        </div>
                        <div className="text-sm font-bold text-slate-800 truncate">{mostFrequentPosition}</div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <i className="fas fa-clock text-blue-500"></i>
                        Position Timeline
                    </h3>
                    <div className="relative pl-6">
                        {consolidatedTimeline
                            .slice()
                            .reverse()
                            .map((entry, index) => (
                                <div key={index} className="relative pb-4 last:pb-0">
                                    <div
                                        className="absolute left-0 top-0 flex flex-col items-center"
                                        style={{ transform: 'translateX(-50%)' }}
                                    >
                                        <div
                                            className={`w-3 h-3 rounded-full border-2 ${entry.isCurrent ? 'bg-green-500 border-green-500' : 'bg-white border-blue-500'}`}
                                        ></div>
                                        {index < consolidatedTimeline.length - 1 && (
                                            <div className="w-0.5 bg-gray-200 flex-1 min-h-[40px]"></div>
                                        )}
                                    </div>
                                    <div
                                        className={`ml-4 p-3 rounded-lg border ${entry.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-800">{entry.position}</span>
                                            {entry.isCurrent && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                            <span>
                                                <i className="fas fa-calendar-alt mr-1"></i>
                                                {FormatUtility.formatDate(entry.startDate)}
                                            </span>
                                            <span>
                                                <i className="fas fa-hourglass-half mr-1"></i>
                                                {entry.days} {entry.days === 1 ? 'day' : 'days'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <i className="fas fa-chart-bar text-blue-500"></i>
                        Position Distribution
                    </h3>
                    <div className="flex flex-col gap-2">
                        {chartData.map((data, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg border ${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-800">{data.position}</span>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>
                                            {data.count} {data.count === 1 ? 'time' : 'times'}
                                        </span>
                                        <span className="font-semibold text-slate-700">{data.percentage}%</span>
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-slate-400'}`}
                                        style={{ width: `${data.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const renderRatingsHistory = () => {
        if (ratingsData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No rating history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Rating changes will be charted here once they are recorded.
                    </p>
                </div>
            )
        }

        const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
        const avgRating = ratingsData.reduce((sum, d) => sum + d.rating, 0) / ratingsData.length
        const currentRating = ratingsData[ratingsData.length - 1].rating
        const highestRating = Math.max(...ratingsData.map((d) => d.rating))

        return (
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mb-3">
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Rating
                        </div>
                        <div className="text-base font-bold text-slate-800">
                            {currentRating > 0 ? `${currentRating}★` : 'None'}
                        </div>
                        {currentRating > 0 && (
                            <div className="text-[10px] text-slate-500">{ratingLabels[currentRating]}</div>
                        )}
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Average Rating
                        </div>
                        <div className="text-base font-bold text-slate-800">{avgRating.toFixed(1)}★</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Highest Rating
                        </div>
                        <div className="text-base font-bold text-slate-800">{highestRating}★</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Changes
                        </div>
                        <div className="text-base font-bold text-slate-800">{ratingsData.length}</div>
                    </div>
                </div>

                <h3 className="m-0 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide pb-1.5 border-b border-gray-200">
                    Rating Timeline
                </h3>
                <div className="flex flex-col gap-0">
                    {ratingsData
                        .slice()
                        .reverse()
                        .map((entry, index) => (
                            <div key={index} className="flex gap-3 py-2">
                                <div className="flex flex-col items-center w-5 flex-shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-[#1e3a5f] border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"></div>
                                    {index < ratingsData.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                    )}
                                </div>
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm font-semibold text-slate-800">
                                            {entry.rating}★ - {ratingLabels[entry.rating]}
                                        </span>
                                        {index === 0 && (
                                            <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-slate-500">
                                            {FormatUtility.formatDate(entry.timestamp)}
                                        </span>
                                        <UserLabel userId={entry.changedBy} showIcon={true} />
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        )
    }

    const renderMileageTracking = () => {
        if (mileageData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No mileage history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Mileage updates will be tracked here once they are recorded.
                    </p>
                </div>
            )
        }

        const currentMileage = mileageData[mileageData.length - 1].mileage
        const totalMileageChange = currentMileage - mileageData[0].mileage
        const avgMileage = mileageData.reduce((sum, d) => sum + d.mileage, 0) / mileageData.length

        const getMaintenanceMilestone = (miles) => {
            if (miles >= 300000) return { label: 'High Mileage', level: 'critical' }
            if (miles >= 200000) return { label: 'Elevated', level: 'warning' }
            if (miles >= 100000) return { label: 'Moderate', level: 'info' }
            return { label: 'Low', level: 'good' }
        }

        const milestone = getMaintenanceMilestone(currentMileage)

        return (
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mb-3">
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Mileage
                        </div>
                        <div className="text-base font-bold text-slate-800">{currentMileage.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">{milestone.label}</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Change
                        </div>
                        <div className="text-base font-bold text-slate-800">
                            {totalMileageChange > 0 ? '+' : ''}
                            {totalMileageChange.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">miles tracked</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Average
                        </div>
                        <div className="text-base font-bold text-slate-800">
                            {Math.round(avgMileage).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">miles</div>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center">
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Updates
                        </div>
                        <div className="text-base font-bold text-slate-800">{mileageData.length}</div>
                        <div className="text-[10px] text-slate-500">recorded</div>
                    </div>
                </div>

                <h3 className="m-0 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide pb-1.5 border-b border-gray-200">
                    Mileage Timeline
                </h3>
                <div className="flex flex-col gap-0">
                    {mileageData
                        .slice()
                        .reverse()
                        .map((entry, index) => {
                            const reversedIndex = mileageData.length - 1 - index
                            const milesDriven =
                                reversedIndex > 0 ? entry.mileage - mileageData[reversedIndex - 1].mileage : 0
                            const daysSince =
                                reversedIndex > 0
                                    ? Math.round(
                                          (entry.date - mileageData[reversedIndex - 1].date) / (1000 * 60 * 60 * 24)
                                      )
                                    : 0

                            return (
                                <div key={index} className="flex gap-3 py-2">
                                    <div className="flex flex-col items-center w-5 flex-shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-[#1e3a5f] border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1]"></div>
                                        {index < mileageData.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-sm font-semibold text-slate-800">
                                                {entry.mileage.toLocaleString()} miles
                                            </span>
                                            {index === 0 && (
                                                <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs text-slate-500">
                                                {FormatUtility.formatDate(entry.timestamp)}
                                            </span>
                                            {milesDriven > 0 && daysSince > 0 && (
                                                <span className="text-xs text-[#1e3a5f] font-semibold">
                                                    +{milesDriven.toLocaleString()} miles in {daysSince}{' '}
                                                    {daysSince === 1 ? 'day' : 'days'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                </div>
            </div>
        )
    }

    const renderAssignmentsHistory = () => {
        if (assignmentsData.length === 0) {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">No assignment history available</p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        Vehicle assignments will be tracked here once they are recorded.
                    </p>
                </div>
            )
        }

        const mixerAssignments = assignmentsData.filter((a) => a.assignmentType === 'Mixer')
        const tractorAssignments = assignmentsData.filter((a) => a.assignmentType === 'Tractor')
        const totalAssignments = assignmentsData.filter((a) => a.isAssignment).length
        const currentMixerAssignment =
            mixerAssignments.length > 0 ? mixerAssignments[mixerAssignments.length - 1] : null
        const currentTractorAssignment =
            tractorAssignments.length > 0 ? tractorAssignments[tractorAssignments.length - 1] : null

        const currentMixer =
            currentMixerAssignment && currentMixerAssignment.vehicleNumber ? currentMixerAssignment.vehicleNumber : null
        const currentTractor =
            currentTractorAssignment && currentTractorAssignment.vehicleNumber
                ? currentTractorAssignment.vehicleNumber
                : null

        const calculateDuration = (startDate, endDate) => {
            const start = new Date(startDate)
            const end = endDate ? new Date(endDate) : new Date()
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24))
            return days
        }

        const consolidatedTimeline = []
        let currentMixerEntry = null
        let currentTractorEntry = null

        assignmentsData.forEach((entry, index) => {
            if (entry.assignmentType === 'Mixer') {
                if (currentMixerEntry && currentMixerEntry.vehicleNumber) {
                    currentMixerEntry.endDate = entry.timestamp
                    currentMixerEntry.duration = calculateDuration(
                        currentMixerEntry.startDate,
                        currentMixerEntry.endDate
                    )
                    consolidatedTimeline.push({ ...currentMixerEntry })
                }
                if (entry.vehicleNumber) {
                    currentMixerEntry = {
                        assignmentType: 'Mixer',
                        changedBy: entry.changedBy,
                        endDate: null,
                        isCurrent:
                            index === assignmentsData.length - 1 ||
                            !assignmentsData.slice(index + 1).some((e) => e.assignmentType === 'Mixer'),
                        startDate: entry.timestamp,
                        vehicleNumber: entry.vehicleNumber
                    }
                } else {
                    currentMixerEntry = null
                }
            } else if (entry.assignmentType === 'Tractor') {
                if (currentTractorEntry && currentTractorEntry.vehicleNumber) {
                    currentTractorEntry.endDate = entry.timestamp
                    currentTractorEntry.duration = calculateDuration(
                        currentTractorEntry.startDate,
                        currentTractorEntry.endDate
                    )
                    consolidatedTimeline.push({ ...currentTractorEntry })
                }
                if (entry.vehicleNumber) {
                    currentTractorEntry = {
                        assignmentType: 'Tractor',
                        changedBy: entry.changedBy,
                        endDate: null,
                        isCurrent:
                            index === assignmentsData.length - 1 ||
                            !assignmentsData.slice(index + 1).some((e) => e.assignmentType === 'Tractor'),
                        startDate: entry.timestamp,
                        vehicleNumber: entry.vehicleNumber
                    }
                } else {
                    currentTractorEntry = null
                }
            }
        })

        if (currentMixerEntry && currentMixerEntry.vehicleNumber) {
            currentMixerEntry.duration = calculateDuration(currentMixerEntry.startDate, new Date())
            currentMixerEntry.isCurrent = true
            consolidatedTimeline.push(currentMixerEntry)
        }

        if (currentTractorEntry && currentTractorEntry.vehicleNumber) {
            currentTractorEntry.duration = calculateDuration(currentTractorEntry.startDate, new Date())
            currentTractorEntry.isCurrent = true
            consolidatedTimeline.push(currentTractorEntry)
        }

        consolidatedTimeline.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))

        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Mixer
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                            {currentMixer ? `#${currentMixer}` : 'Not Assigned'}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Current Tractor
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                            {currentTractor ? `#${currentTractor}` : 'Not Assigned'}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Total Assignments
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{totalAssignments}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                            Assignment Changes
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{assignmentsData.length}</div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <i className="fas fa-clock text-blue-500"></i>
                        Assignment Timeline
                    </h3>
                    <div className="relative pl-6">
                        {consolidatedTimeline.map((entry, index) => {
                            const durationText =
                                entry.duration === 0
                                    ? 'Less than a day'
                                    : entry.duration === 1
                                      ? '1 day'
                                      : entry.duration < 30
                                        ? `${entry.duration} days`
                                        : entry.duration < 365
                                          ? `${Math.round(entry.duration / 30.44)} months`
                                          : `${(entry.duration / 365.25).toFixed(1)} years`

                            return (
                                <div key={index} className="relative pb-4 last:pb-0">
                                    <div
                                        className="absolute left-0 top-0 flex flex-col items-center"
                                        style={{ transform: 'translateX(-50%)' }}
                                    >
                                        <div
                                            className={`w-3 h-3 rounded-full border-2 ${entry.isCurrent ? 'bg-green-500 border-green-500' : 'bg-white border-blue-500'}`}
                                        ></div>
                                        {index < consolidatedTimeline.length - 1 && (
                                            <div className="w-0.5 bg-gray-200 flex-1 min-h-[40px]"></div>
                                        )}
                                    </div>
                                    <div
                                        className={`ml-4 p-3 rounded-lg border ${entry.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-800">
                                                {entry.assignmentType} #{entry.vehicleNumber}
                                            </span>
                                            {entry.isCurrent && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                            <span>
                                                <i className="fas fa-calendar-alt mr-1"></i>
                                                {FormatUtility.formatDate(entry.startDate)}
                                                {entry.endDate && ` - ${FormatUtility.formatDate(entry.endDate)}`}
                                                {!entry.endDate && ' - Present'}
                                            </span>
                                            <span>
                                                <i className="fas fa-hourglass-half mr-1"></i>({durationText})
                                            </span>
                                        </div>
                                        <div className="mt-2">
                                            <UserLabel userId={entry.changedBy} showIcon={true} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-slate-500">
                    <LoadingScreen message="Loading history..." inline={true} />
                </div>
            )
        }

        if (error) {
            return (
                <div className="text-center py-8 text-red-600">
                    <p>{error}</p>
                    <button
                        className="bg-red-600 text-white border-none rounded-lg px-5 py-2.5 mt-4 text-sm font-semibold cursor-pointer hover:bg-red-700"
                        onClick={fetchHistory}
                    >
                        Retry
                    </button>
                </div>
            )
        }

        if (history.length === 0 && activeTab !== 'ai-summary') {
            return (
                <div className="text-center py-12 px-6 text-slate-500">
                    <p className="m-0 text-[15px] font-medium text-gray-700">
                        No history records found for this {type}.
                    </p>
                    <p className="text-[13px] text-slate-400 mt-2">
                        History entries will appear here when changes are made to this {type}.
                    </p>
                </div>
            )
        }

        switch (activeTab) {
            case 'ai-summary':
                return renderAISummary()
            case 'timeline':
                return (
                    <div className="flex flex-col gap-3">
                        {sortedHistory.map((entry, index) => {
                            const fieldName = entry.fieldName || entry.field_name
                            const isCreatedEntry = fieldName === 'created'

                            return (
                                <div
                                    key={entry.id || index}
                                    className="bg-white border border-gray-200 rounded-lg p-3.5 hover:border-slate-400 hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-center mb-2.5">
                                        <div className="text-sm font-bold text-slate-800 capitalize">
                                            {formatFieldName(fieldName)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium">
                                            {formatTimestamp(entry.changedAt || entry.changed_at)}
                                        </div>
                                    </div>
                                    {isCreatedEntry ? (
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <div className="text-sm text-green-600 font-semibold">
                                                {formatValue(fieldName, entry.newValue || entry.new_value)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <div className="text-[13px] text-slate-500">
                                                <span className="text-[11px] uppercase font-bold tracking-wide opacity-70">
                                                    From:
                                                </span>{' '}
                                                {formatValue(fieldName, entry.oldValue || entry.old_value)}
                                            </div>
                                            <div className="text-[#1e3a5f] text-sm">→</div>
                                            <div className="text-[13px] text-slate-800 font-semibold">
                                                <span className="text-[11px] uppercase font-bold tracking-wide opacity-70">
                                                    To:
                                                </span>{' '}
                                                {formatValue(fieldName, entry.newValue || entry.new_value)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-500">
                                        <UserLabel userId={entry.changedBy || entry.changed_by} showIcon={true} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            case 'cleanliness':
                return renderCleanlinessChart()
            case 'condition':
                return renderConditionChart()
            case 'overview':
                return renderOverviewChart()
            case 'operators':
                return renderOperatorChart()
            case 'service':
                return renderServiceHistory()
            case 'plant':
                return renderPlantAssignments()
            case 'status':
                return renderStatusHistory()
            case 'position':
                return renderPositionHistory()
            case 'ratings':
                return renderRatingsHistory()
            case 'mileage':
                return renderMileageTracking()
            case 'assignments':
                return renderAssignmentsHistory()
            default:
                return null
        }
    }

    const handleAddIssue = async (e) => {
        e.preventDefault()
        if (!newIssue.trim()) {
            setError('Please enter an issue description')
            return
        }
        setIsSubmitting(true)
        setError(null)
        try {
            const serviceMap = {
                equipment: 'EquipmentService',
                mixer: 'MixerService',
                tractor: 'TractorService',
                trailer: 'TrailerService'
            }

            const serviceName = serviceMap[type]
            if (!serviceName) throw new Error('Invalid item type')

            const { [serviceName]: Service } = await import(`../../services/${serviceName}`)
            const currentUser = await UserService.getCurrentUser()
            const userId = currentUser?.id || null
            if (!userId) {
                throw new Error('You must be logged in to add an issue')
            }
            await Service.addIssue(item.id, newIssue, severity, userId)
            setNewIssue('')
            setSeverity('Medium')
            fetchIssues()
        } catch (err) {
            setError(err.message || 'Failed to add issue. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteIssue = async (issueId) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) {
            return
        }
        try {
            const serviceMap = {
                equipment: 'EquipmentService',
                mixer: 'MixerService',
                tractor: 'TractorService',
                trailer: 'TrailerService'
            }

            const serviceName = serviceMap[type]
            if (!serviceName) throw new Error('Invalid item type')

            const { [serviceName]: Service } = await import(`../../services/${serviceName}`)
            await Service.deleteIssue(issueId)
            fetchIssues()
        } catch (err) {
            setError('Failed to delete issue. Please try again.')
        }
    }

    const handleCompleteIssue = async (issueId) => {
        try {
            const serviceMap = {
                equipment: 'EquipmentService',
                mixer: 'MixerService',
                tractor: 'TractorService',
                trailer: 'TrailerService'
            }

            const serviceName = serviceMap[type]
            if (!serviceName) throw new Error('Invalid item type')

            const { [serviceName]: Service } = await import(`../../services/${serviceName}`)
            await Service.completeIssue(issueId)
            fetchIssues()
        } catch (err) {
            setError('Failed to complete issue. Please try again.')
        }
    }

    const getSeverityClass = (severityLevel) => {
        switch (severityLevel) {
            case 'High':
                return 'severity-high'
            case 'Medium':
                return 'severity-medium'
            case 'Low':
                return 'severity-low'
            default:
                return ''
        }
    }

    const getCreatorName = (issue) => {
        if (issue.created_by && userNames[issue.created_by]) {
            return userNames[issue.created_by]
        }
        return 'Unknown'
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Not completed'
        return FormatUtility.formatDateTime(dateString)
    }

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-[900px] w-full max-h-[85vh] flex flex-col border border-gray-200">
                <div className="bg-slate-50 flex justify-between items-center px-6 py-5 border-b border-gray-200 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-history text-xl text-[#1e3a5f]"></i>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 m-0">{itemName}</h2>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                Change History
                            </span>
                        </div>
                    </div>
                    <button
                        className="bg-transparent border-none text-xl text-slate-500 cursor-pointer p-2 flex items-center justify-center rounded-md hover:bg-gray-200 hover:text-slate-800 w-8 h-8"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="flex gap-2 px-6 py-4 overflow-x-auto border-b border-gray-200 bg-slate-50 flex-shrink-0">
                    <button
                        className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'timeline' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        Timeline
                    </button>
                    {(type === 'mixer' ||
                        type === 'tractor' ||
                        type === 'trailer' ||
                        type === 'equipment' ||
                        type === 'pickup-truck') && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'overview' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                    )}
                    {(type === 'mixer' || type === 'tractor') && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'operators' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('operators')}
                        >
                            Operators
                        </button>
                    )}
                    {(type === 'mixer' || type === 'tractor' || type === 'equipment' || type === 'pickup-truck') && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'service' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('service')}
                        >
                            Service History
                        </button>
                    )}
                    {(type === 'mixer' ||
                        type === 'tractor' ||
                        type === 'trailer' ||
                        type === 'equipment' ||
                        type === 'pickup-truck') && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'plant' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('plant')}
                        >
                            Plant Assignments
                        </button>
                    )}
                    {(type === 'operator' || type === 'pickup-truck') && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'status' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('status')}
                        >
                            Status History
                        </button>
                    )}
                    {type === 'operator' && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'position' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('position')}
                        >
                            Position History
                        </button>
                    )}
                    {type === 'operator' && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'ratings' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('ratings')}
                        >
                            Ratings History
                        </button>
                    )}
                    {type === 'operator' && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'assignments' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('assignments')}
                        >
                            Assignments
                        </button>
                    )}
                    {type === 'pickup-truck' && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'mileage' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('mileage')}
                        >
                            Mileage Tracking
                        </button>
                    )}
                    {type === 'equipment' && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'condition' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('condition')}
                        >
                            Condition
                        </button>
                    )}
                    {(type === 'mixer' || type === 'tractor' || type === 'trailer' || type === 'equipment') && (
                        <button
                            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${activeTab === 'cleanliness' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'}`}
                            onClick={() => setActiveTab('cleanliness')}
                        >
                            Cleanliness
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white">{renderContent()}</div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-slate-50 rounded-b-2xl">
                    <button
                        className="px-6 py-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-semibold cursor-pointer hover:bg-slate-100 hover:border-slate-300"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default HistoryViewSection
