import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { supabase } from '../../../services/DatabaseService'
import { OperatorService } from '../../../services/OperatorService'
import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
/**
 * Floating recap button and modal showing recent mixer and operator history changes.
 * Displays net change metrics (runnable, down, operators, transfers) and an expandable
 * timeline of individual asset/operator modifications filtered by date range.
 */
function RecapModalSection({
    plantCode,
    plantName,
    mixers,
    operators = [],
    isAllPlants = false,
    mixersLoaded = true,
    isLoading: externalLoading = false,
    isOpen: externalIsOpen,
    onClose
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const controlled = externalIsOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const isOpen = controlled ? externalIsOpen : internalOpen
    const setIsOpen = controlled
        ? (v) => {
              if (!v && onClose) onClose()
          }
        : setInternalOpen
    const [isLoading, setIsLoading] = useState(false)
    const [mixerHistory, setMixerHistory] = useState([])
    const [operatorHistory, setOperatorHistory] = useState([])
    const [userNames, setUserNames] = useState({})
    const [operatorNames, setOperatorNames] = useState({})
    const [dateFilter, setDateFilter] = useState('week')
    const [expandedAssets, setExpandedAssets] = useState({})
    const [isTabVisible, setIsTabVisible] = useState(false)
    const isMobile = useIsMobile()
    const mixerIds = useMemo(() => {
        if (!mixers || !Array.isArray(mixers)) return []
        return mixers.map((m) => m.id).filter(Boolean)
    }, [mixers])
    const operatorIds = useMemo(() => {
        if (!operators || !Array.isArray(operators)) return []
        return operators.map((o) => o.employeeId || o.employee_id).filter(Boolean)
    }, [operators])
    const changeMetrics = useMemo(() => {
        const allHistory = [...mixerHistory, ...operatorHistory]
        if (!allHistory || allHistory.length === 0) {
            return {
                downNet: 0,
                operatorsNet: 0,
                runnableNet: 0,
                transfersNet: 0
            }
        }
        let operatorsNet = 0
        let runnableNet = 0
        let downNet = 0
        let transfersNet = 0
        const INACTIVE_STATUSES = ['terminated', 'do not hire']
        const isActiveStatus = (s) => s && !INACTIVE_STATUSES.includes(s.toLowerCase())
        const isInactiveStatus = (s) => s && INACTIVE_STATUSES.includes(s.toLowerCase())
        operatorHistory.forEach((h) => {
            if (h.field_name === 'status') {
                const wasActive = isActiveStatus(h.old_value)
                const nowActive = isActiveStatus(h.new_value)
                const wasInactive = isInactiveStatus(h.old_value)
                const nowInactive = isInactiveStatus(h.new_value)
                if (wasActive && nowInactive) operatorsNet--
                else if (wasInactive && nowActive) operatorsNet++
            }
        })
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
                } else {
                    const oldPlant = h.old_value
                    const newPlant = h.new_value
                    const wasAtThisPlant = oldPlant === plantCode
                    const isAtThisPlant = newPlant === plantCode
                    if (!wasAtThisPlant && isAtThisPlant) {
                        runnableNet++
                        transfersNet++
                    } else if (wasAtThisPlant && !isAtThisPlant) {
                        runnableNet--
                        transfersNet++
                    }
                }
            }
        })
        return {
            downNet,
            operatorsNet,
            runnableNet,
            transfersNet
        }
    }, [mixerHistory, operatorHistory, plantCode, isAllPlants])
    const mixerLookup = useMemo(() => {
        const lookup = {}
        if (mixers && Array.isArray(mixers)) {
            mixers.forEach((m) => {
                if (m.id) lookup[m.id] = m
            })
        }
        return lookup
    }, [mixers])
    const operatorLookup = useMemo(() => {
        const lookup = {}
        if (operators && Array.isArray(operators)) {
            operators.forEach((o) => {
                const employeeId = o.employeeId || o.employee_id
                const id = o.id
                if (employeeId) lookup[employeeId] = o
                if (id) lookup[id] = o
            })
        }
        return lookup
    }, [operators])
    const groupedHistory = useMemo(() => {
        const allHistory = [...mixerHistory, ...operatorHistory]
        if (!allHistory || allHistory.length === 0) return []
        const groups = {}
        mixerHistory.forEach((entry) => {
            const mixerId = entry.mixer_id
            const key = `mixer_${mixerId}`
            if (!groups[key]) {
                groups[key] = {
                    changes: [],
                    id: mixerId,
                    name: null,
                    type: 'mixer'
                }
            }
            groups[key].changes.push(entry)
        })
        operatorHistory.forEach((entry) => {
            const operatorId = entry.operator_id
            const key = `operator_${operatorId}`
            if (!groups[key]) {
                groups[key] = {
                    changes: [],
                    id: operatorId,
                    name: null,
                    type: 'operator'
                }
            }
            groups[key].changes.push(entry)
        })
        Object.values(groups).forEach((group) => {
            if (group.type === 'mixer') {
                const mixer = mixerLookup[group.id]
                if (mixer) {
                    group.name = mixer.truckNumber || mixer.truck_number || 'Unknown'
                } else {
                    const truckNumberChange = group.changes.find((c) => c.field_name === 'truck_number')
                    if (truckNumberChange) {
                        group.name = truckNumberChange.new_value || truckNumberChange.old_value || 'Unknown'
                    } else {
                        group.name = 'Unknown'
                    }
                }
            } else if (group.type === 'operator') {
                const operator = operatorLookup[group.id]
                if (operator) {
                    group.name = operator.name || 'Unknown Operator'
                    group.status = operator.status || 'Unknown'
                } else {
                    const nameChange = group.changes.find((c) => c.field_name === 'name')
                    if (nameChange) {
                        group.name = nameChange.new_value || nameChange.old_value || 'Unknown Operator'
                    } else {
                        group.name = 'Unknown Operator'
                    }
                    group.status = 'Unknown'
                }
            }
            group.changes.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
        })
        return Object.values(groups).sort((a, b) => {
            const aLatest = a.changes[0]?.changed_at || ''
            const bLatest = b.changes[0]?.changed_at || ''
            return new Date(bLatest) - new Date(aLatest)
        })
    }, [mixerHistory, operatorHistory, mixerLookup, operatorLookup])
    const userNamesRef = useRef(userNames)
    userNamesRef.current = userNames
    const operatorNamesRef = useRef(operatorNames)
    operatorNamesRef.current = operatorNames
    const fetchHistory = useCallback(async () => {
        if (mixerIds.length === 0 && operatorIds.length === 0) return
        setIsLoading(true)
        try {
            let startDate = new Date()
            if (dateFilter === 'day') {
                startDate.setDate(startDate.getDate() - 1)
            } else if (dateFilter === 'week') {
                startDate.setDate(startDate.getDate() - 7)
            } else if (dateFilter === 'month') {
                startDate.setMonth(startDate.getMonth() - 1)
            } else if (dateFilter === 'all') {
                startDate = new Date('2020-01-01')
            }
            const [mixerResult, operatorResult] = await Promise.all([
                mixerIds.length > 0
                    ? supabase
                          .from('mixers_history')
                          .select('id,mixer_id,field_name,old_value,new_value,changed_at,changed_by')
                          .in('mixer_id', mixerIds)
                          .gte('changed_at', startDate.toISOString())
                          .order('changed_at', { ascending: false })
                          .limit(500)
                    : Promise.resolve({ data: [], error: null }),
                operatorIds.length > 0
                    ? supabase
                          .from('operators_history')
                          .select('id,operator_id,field_name,old_value,new_value,changed_at,changed_by')
                          .in('operator_id', operatorIds)
                          .gte('changed_at', startDate.toISOString())
                          .order('changed_at', { ascending: false })
                          .limit(500)
                    : Promise.resolve({ data: [], error: null })
            ])
            const mixerData = !mixerResult.error ? mixerResult.data || [] : []
            const operatorData = !operatorResult.error ? operatorResult.data || [] : []
            const filterHistory = (entries) => {
                return (entries || []).filter((entry) => {
                    const oldVal = entry.old_value
                    const newVal = entry.new_value
                    if (oldVal === newVal) return false
                    if (!oldVal && !newVal) return false
                    if (oldVal === 'null' && !newVal) return false
                    if (!oldVal && newVal === 'null') return false
                    return true
                })
            }
            const filteredMixerHistory = filterHistory(mixerData)
            const filteredOperatorHistory = filterHistory(operatorData)
            setMixerHistory(filteredMixerHistory)
            setOperatorHistory(filteredOperatorHistory)
            const allHistory = [...filteredMixerHistory, ...filteredOperatorHistory]
            const userIds = new Set()
            const opIdsForNames = new Set()
            allHistory.forEach((entry) => {
                if (entry.changed_by) userIds.add(entry.changed_by)
                if (entry.field_name === 'assigned_operator') {
                    if (
                        entry.old_value &&
                        entry.old_value !== 'null' &&
                        entry.old_value !== '' &&
                        entry.old_value !== '0'
                    ) {
                        opIdsForNames.add(entry.old_value)
                    }
                    if (
                        entry.new_value &&
                        entry.new_value !== 'null' &&
                        entry.new_value !== '' &&
                        entry.new_value !== '0'
                    ) {
                        opIdsForNames.add(entry.new_value)
                    }
                }
            })
            const cachedUserNames = userNamesRef.current
            const cachedOpNames = operatorNamesRef.current
            const userIdsToFetch = [...userIds].filter((id) => !cachedUserNames[id])
            const opIdsToFetch = [...opIdsForNames].filter((id) => !cachedOpNames[id])
            const [userNamesResults, opNamesResults] = await Promise.all([
                Promise.all(
                    userIdsToFetch.map(async (userId) => {
                        try {
                            const displayName = await UserService.getUserDisplayName(userId)
                            return { id: userId, name: displayName || 'Unknown' }
                        } catch {
                            return { id: userId, name: 'Unknown' }
                        }
                    })
                ),
                Promise.all(
                    opIdsToFetch.map(async (opId) => {
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
                                data: {
                                    name: 'Unknown Operator',
                                    status: 'Unknown'
                                },
                                id: opId
                            }
                        }
                    })
                )
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
        } catch (err) {
        } finally {
            setIsLoading(false)
        }
    }, [mixerIds, operatorIds, dateFilter])
    useEffect(() => {
        if (isOpen && (mixerIds.length > 0 || operatorIds.length > 0)) {
            fetchHistory()
        }
    }, [isOpen, mixerIds, operatorIds, dateFilter, fetchHistory])
    useEffect(() => {
        if (!mixersLoaded || externalLoading) {
            setIsTabVisible(false)
            return
        }
        const timer = setTimeout(() => {
            setIsTabVisible(true)
        }, 2000)
        return () => clearTimeout(timer)
    }, [mixersLoaded, externalLoading])
    const formatFieldName = (fieldName) => {
        if (!fieldName) return 'Unknown Field'
        const mappings = {
            assigned_operator: 'Assigned Operator',
            assigned_plant: 'Assigned Plant',
            assigned_trainer: 'Assigned Trainer',
            automatic_restriction: 'Automatic Restriction',
            cleanliness_rating: 'Cleanliness',
            condition_rating: 'Condition',
            down_in_yard: 'Down In Yard',
            is_trainer: 'Trainer',
            last_chip_date: 'Last Chip Date',
            last_service_date: 'Last Service Date',
            make: 'Make',
            model: 'Model',
            name: 'Name',
            pending_start_date: 'Pending Start Date',
            phone: 'Phone',
            plant_code: 'Plant',
            position: 'Position',
            rating: 'Rating',
            smyrna_id: 'Smyrna ID',
            status: 'Status',
            truck_number: 'Truck Number',
            verified: 'Verified',
            vin: 'VIN',
            year: 'Year'
        }
        return mappings[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }
    const formatValue = (value, fieldName) => {
        if (value === null || value === undefined || value === '' || value === 'null') return 'None'
        if (fieldName === 'assigned_operator') {
            if (value === '0') return 'None'
            const opData = operatorNames[value]
            if (opData) {
                const isTerminated = opData.status === 'Terminated'
                if (isTerminated) {
                    return (
                        <span className="operator-terminated">
                            <span className="operator-name-strikethrough">{opData.name}</span>
                            <span className="terminated-badge">Terminated</span>
                        </span>
                    )
                }
                return opData.name
            }
            return value
        }
        if (fieldName === 'cleanliness_rating' || fieldName === 'condition_rating') {
            const num = parseInt(value)
            if (!isNaN(num)) return `${num} Star${num !== 1 ? 's' : ''}`
        }
        if (fieldName === 'last_service_date' || fieldName === 'last_chip_date') {
            try {
                return new Date(value).toLocaleDateString()
            } catch {
                return value
            }
        }
        if (fieldName === 'down_in_yard' || fieldName === 'is_trainer' || fieldName === 'automatic_restriction') {
            return value === 'true' || value === true ? 'Yes' : 'No'
        }
        if (fieldName === 'rating') {
            const num = parseFloat(value)
            if (!isNaN(num)) return num.toFixed(1)
        }
        if (fieldName === 'pending_start_date') {
            try {
                return new Date(value).toLocaleDateString()
            } catch {
                return value
            }
        }
        return String(value)
    }
    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr)
            const now = new Date()
            const diff = now - date
            const mins = Math.floor(diff / 60000)
            const hours = Math.floor(diff / 3600000)
            const days = Math.floor(diff / 86400000)
            if (mins < 1) return 'Just now'
            if (mins < 60) return `${mins}m ago`
            if (hours < 24) return `${hours}h ago`
            if (days < 7) return `${days}d ago`
            return date.toLocaleDateString('en-US', {
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                month: 'short'
            })
        } catch {
            return dateStr
        }
    }
    const getChangeIcon = (fieldName) => {
        const iconMap = {
            assigned_operator: 'fa-solid fa-user',
            assigned_plant: 'fa-solid fa-industry',
            assigned_trainer: 'fa-solid fa-user-graduate',
            automatic_restriction: 'fa-solid fa-car-side',
            cleanliness_rating: 'fa-solid fa-sparkles',
            down_in_yard: 'fa-solid fa-parking',
            is_trainer: 'fa-solid fa-chalkboard-teacher',
            last_chip_date: 'fa-solid fa-hammer',
            last_service_date: 'fa-solid fa-wrench',
            make: 'fa-solid fa-car',
            model: 'fa-solid fa-tag',
            name: 'fa-solid fa-id-card',
            pending_start_date: 'fa-solid fa-calendar-plus',
            phone: 'fa-solid fa-phone',
            plant_code: 'fa-solid fa-industry',
            position: 'fa-solid fa-briefcase',
            rating: 'fa-solid fa-star',
            smyrna_id: 'fa-solid fa-hashtag',
            status: 'fa-solid fa-circle-dot',
            truck_number: 'fa-solid fa-truck',
            vin: 'fa-solid fa-barcode',
            year: 'fa-solid fa-calendar'
        }
        return iconMap[fieldName] || 'fa-solid fa-pen'
    }
    const handleToggle = () => {
        setIsOpen(!isOpen)
    }
    const toggleAssetExpanded = (assetKey) => {
        setExpandedAssets((prev) => ({
            ...prev,
            [assetKey]: !prev[assetKey]
        }))
    }
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [fieldFilter, setFieldFilter] = useState('all')
    const availableFields = useMemo(() => {
        const fields = new Set()
        groupedHistory.forEach((g) => g.changes.forEach((c) => fields.add(c.field_name)))
        return [...fields].sort()
    }, [groupedHistory])
    const isTerminatedGroup = (group) => {
        if (group.type !== 'operator') return false
        const status = (group.status || '').toLowerCase()
        if (status === 'terminated' || status === 'do not hire') return true
        return group.changes.some((c) => {
            if (c.field_name !== 'status') return false
            const val = (c.new_value || '').toLowerCase()
            return val === 'terminated' || val === 'do not hire'
        })
    }
    const filteredHistory = useMemo(() => {
        return groupedHistory.filter((group) => {
            if (typeFilter === 'mixers' && group.type !== 'mixer') return false
            if (typeFilter === 'operators' && group.type !== 'operator') return false
            if (typeFilter === 'terminated' && !isTerminatedGroup(group)) return false
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                if (!group.name?.toLowerCase().includes(q)) return false
            }
            if (fieldFilter !== 'all') {
                const hasField = group.changes.some((c) => c.field_name === fieldFilter)
                if (!hasField) return false
            }
            return true
        })
    }, [groupedHistory, typeFilter, searchQuery, fieldFilter])
    const filteredChangesForGroup = (group) => {
        if (fieldFilter === 'all') return group.changes
        return group.changes.filter((c) => c.field_name === fieldFilter)
    }
    if (!plantCode && !isAllPlants) return null
    const displayTitle = isAllPlants ? 'All Plants Recap' : `Plant ${plantCode} Recap`
    const displaySubtitle = isAllPlants ? 'All Fleet Changes' : plantName || 'Changes History'
    const tab = !controlled ? (
        <div
            className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-3 py-2.5 text-white rounded-r-lg cursor-pointer shadow-lg transition-all duration-300 hover:pl-4 ${isTabVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
            style={{ backgroundColor: accentColor }}
            onClick={handleToggle}
        >
            <i className="fa-solid fa-clock-rotate-left text-sm"></i>
            <span className="text-sm font-medium">Recap</span>
        </div>
    ) : null
    const filteredTotal = filteredHistory.reduce((sum, g) => sum + filteredChangesForGroup(g).length, 0)
    const DATE_OPTIONS = [
        { id: 'day', label: '24h' },
        { id: 'week', label: '7d' },
        { id: 'month', label: '30d' },
        { id: 'all', label: 'All' }
    ]
    const TYPE_OPTIONS = [
        { id: 'all', label: 'All' },
        { id: 'mixers', label: 'Mixers' },
        { id: 'operators', label: 'Operators' },
        { id: 'terminated', label: 'Terminated' }
    ]
    const MetricBadge = ({ value, label, icon, iconBg, iconColor, positive }) => {
        const color =
            value > 0
                ? positive
                    ? 'text-emerald-600'
                    : 'text-red-600'
                : value < 0
                  ? positive
                      ? 'text-red-600'
                      : 'text-emerald-600'
                  : 'text-slate-500'
        return (
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-0"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
            >
                <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`fa-solid ${icon} text-[10px] ${iconColor}`}></i>
                </div>
                <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-bold leading-tight ${color}`}>
                        {value === 0 ? '0' : `${value > 0 ? '+' : ''}${value}`}
                    </span>
                    <span className="text-[10px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                        {label}
                    </span>
                </div>
            </div>
        )
    }
    const FilterPill = ({ active, label, onClick }) => (
        <button
            className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
            style={{
                backgroundColor: active ? accentColor : 'var(--bg-primary)',
                border: active ? 'none' : '1px solid var(--border-light)',
                color: active ? 'white' : 'var(--text-secondary)'
            }}
            onClick={onClick}
        >
            {label}
        </button>
    )
    const modal = isOpen ? (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
                style={{ backgroundColor: 'var(--bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{
                        backgroundColor: accentColor,
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
                            radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 50%)
                        `,
                        backgroundPosition: '0 0, 0 0, 0 0',
                        backgroundSize: '20px 20px, 20px 20px, 40px 40px'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                            <i className="fa-solid fa-clock-rotate-left text-white text-sm"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white m-0">{displayTitle}</h2>
                            <span className="text-xs text-white/60">{displaySubtitle}</span>
                        </div>
                    </div>
                    <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>
                {/* Filters toolbar */}
                <div
                    className="px-4 py-3 border-b flex-shrink-0 space-y-2.5"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
                >
                    {/* Search */}
                    <div className="relative">
                        <i
                            className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                        ></i>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none"
                            style={{
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        )}
                    </div>
                    {/* Filter row */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1">
                            {DATE_OPTIONS.map((d) => (
                                <FilterPill
                                    key={d.id}
                                    active={dateFilter === d.id}
                                    label={d.label}
                                    onClick={() => setDateFilter(d.id)}
                                />
                            ))}
                        </div>
                        <div className="w-px h-5" style={{ backgroundColor: 'var(--border-light)' }}></div>
                        <div className="flex items-center gap-1">
                            {TYPE_OPTIONS.map((t) => (
                                <FilterPill
                                    key={t.id}
                                    active={typeFilter === t.id}
                                    label={t.label}
                                    onClick={() => setTypeFilter(t.id)}
                                />
                            ))}
                        </div>
                        {availableFields.length > 1 && (
                            <>
                                <div className="w-px h-5" style={{ backgroundColor: 'var(--border-light)' }}></div>
                                <select
                                    value={fieldFilter}
                                    onChange={(e) => setFieldFilter(e.target.value)}
                                    className="text-xs rounded-md px-2 py-1 focus:outline-none"
                                    style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        border: '1px solid var(--border-light)',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    <option value="all">All fields</option>
                                    {availableFields.map((f) => (
                                        <option key={f} value={f}>
                                            {formatFieldName(f)}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                    </div>
                    {/* Metrics row */}
                    <div className="flex gap-2">
                        <MetricBadge
                            value={changeMetrics.operatorsNet}
                            label="Operators"
                            icon="fa-user"
                            iconBg="bg-blue-50 dark:bg-blue-500/20"
                            iconColor="text-blue-500 dark:text-blue-400"
                            positive
                        />
                        <MetricBadge
                            value={changeMetrics.runnableNet}
                            label="Runnable"
                            icon="fa-truck"
                            iconBg="bg-emerald-50 dark:bg-emerald-500/20"
                            iconColor="text-emerald-500 dark:text-emerald-400"
                            positive
                        />
                        <MetricBadge
                            value={changeMetrics.downNet}
                            label="Down"
                            icon="fa-wrench"
                            iconBg="bg-amber-50 dark:bg-amber-500/20"
                            iconColor="text-amber-500 dark:text-amber-400"
                            positive={false}
                        />
                        <MetricBadge
                            value={changeMetrics.transfersNet}
                            label="Transfers"
                            icon="fa-right-left"
                            iconBg="bg-purple-50 dark:bg-purple-500/20"
                            iconColor="text-purple-500 dark:text-purple-400"
                            positive
                        />
                    </div>
                </div>
                {/* Results count */}
                <div
                    className="px-4 py-2 border-b flex items-center justify-between flex-shrink-0"
                    style={{ borderColor: 'var(--border-light)' }}
                >
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {filteredHistory.length} asset{filteredHistory.length !== 1 ? 's' : ''} · {filteredTotal} change
                        {filteredTotal !== 1 ? 's' : ''}
                    </span>
                    {(searchQuery || typeFilter !== 'all' || fieldFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('')
                                setTypeFilter('all')
                                setFieldFilter('all')
                            }}
                            className="text-xs font-medium hover:text-slate-700 transition-colors"
                            style={{ color: accentColor }}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-3">
                        {isLoading ? (
                            <div
                                className="flex flex-col items-center justify-center py-16"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <i className="fa-solid fa-spinner fa-spin text-xl mb-3"></i>
                                <span className="text-sm">Loading history...</span>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center py-16"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <i className="fa-solid fa-filter-circle-xmark text-2xl mb-3"></i>
                                <p className="text-sm font-medium m-0">No changes found</p>
                                <p className="text-xs mt-1 m-0">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {filteredHistory.map((group, groupIndex) => {
                                    const assetKey = `${group.type}_${group.id}`
                                    const isExpanded = expandedAssets[assetKey] || false
                                    const isMixer = group.type === 'mixer'
                                    const isTerminated = group.type === 'operator' && group.status === 'Terminated'
                                    const changes = filteredChangesForGroup(group)
                                    return (
                                        <div
                                            key={assetKey || groupIndex}
                                            className="rounded-xl overflow-hidden border"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <div
                                                className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors"
                                                style={{ backgroundColor: 'var(--bg-primary)' }}
                                                onClick={() => toggleAssetExpanded(assetKey)}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                                                }}
                                            >
                                                <div
                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isMixer ? 'bg-blue-50' : 'bg-amber-50'}`}
                                                >
                                                    <i
                                                        className={`fa-solid ${isMixer ? 'fa-truck text-blue-500' : 'fa-hard-hat text-amber-500'} text-[10px]`}
                                                    ></i>
                                                </div>
                                                {isTerminated ? (
                                                    <span className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span
                                                            className="line-through text-sm truncate"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            {group.name}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] font-semibold rounded flex-shrink-0">
                                                            Terminated
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="flex-1 text-sm font-medium truncate"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {group.name}
                                                    </span>
                                                )}
                                                <span
                                                    className="text-[11px] font-medium flex-shrink-0"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    {changes.length}
                                                </span>
                                                <i
                                                    className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                    style={{ color: 'var(--border-medium)' }}
                                                ></i>
                                            </div>
                                            {isExpanded && (
                                                <div
                                                    className="border-t divide-y"
                                                    style={{ borderColor: 'var(--border-light)' }}
                                                >
                                                    {changes.map((entry, index) => (
                                                        <div
                                                            key={entry.id || index}
                                                            className="flex gap-2.5 px-3.5 py-2.5"
                                                        >
                                                            <div
                                                                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                                                                style={{ backgroundColor: 'var(--bg-secondary)' }}
                                                            >
                                                                <i
                                                                    className={`${getChangeIcon(entry.field_name)} text-[9px]`}
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                ></i>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span
                                                                        className="text-xs font-semibold"
                                                                        style={{ color: 'var(--text-primary)' }}
                                                                    >
                                                                        {formatFieldName(entry.field_name)}
                                                                    </span>
                                                                    <span
                                                                        className="text-[10px] flex-shrink-0"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        {formatDate(entry.changed_at)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-1 text-xs">
                                                                    <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                                                        {formatValue(entry.old_value, entry.field_name)}
                                                                    </span>
                                                                    <i
                                                                        className="fa-solid fa-arrow-right text-[8px] flex-shrink-0"
                                                                        style={{ color: 'var(--border-medium)' }}
                                                                    ></i>
                                                                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                                                        {formatValue(entry.new_value, entry.field_name)}
                                                                    </span>
                                                                </div>
                                                                {entry.changed_by && userNames[entry.changed_by] && (
                                                                    <div
                                                                        className="flex items-center gap-1 mt-1 text-[10px]"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        <i className="fa-solid fa-user-pen text-[8px]"></i>
                                                                        <span>{userNames[entry.changed_by]}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : null
    return (
        <>
            {!isMobile && tab}
            {modal && ReactDOM.createPortal(modal, document.body)}
        </>
    )
}
export default RecapModalSection
