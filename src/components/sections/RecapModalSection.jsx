import React, {useEffect, useMemo, useState} from 'react'
import ReactDOM from 'react-dom'
import {supabase} from '../../services/DatabaseService'
import {UserService} from '../../services/UserService'
import {OperatorService} from '../../services/OperatorService'

function RecapModalSection({
                               plantCode,
                               plantName,
                               mixers,
                               operators = [],
                               isAllPlants = false,
                               mixersLoaded = true,
                               isLoading: externalLoading = false
                           }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [mixerHistory, setMixerHistory] = useState([])
    const [operatorHistory, setOperatorHistory] = useState([])
    const [userNames, setUserNames] = useState({})
    const [operatorNames, setOperatorNames] = useState({})
    const [dateFilter, setDateFilter] = useState('week')
    const [expandedAssets, setExpandedAssets] = useState({})
    const [isTabVisible, setIsTabVisible] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    const mixerIds = useMemo(() => {
        if (!mixers || !Array.isArray(mixers)) return []
        return mixers.map(m => m.id).filter(Boolean)
    }, [mixers])

    const operatorIds = useMemo(() => {
        if (!operators || !Array.isArray(operators)) return []
        return operators.map(o => o.employeeId || o.employee_id).filter(Boolean)
    }, [operators])

    const changeMetrics = useMemo(() => {
        const allHistory = [...mixerHistory, ...operatorHistory]
        if (!allHistory || allHistory.length === 0) {
            return {
                operatorsNet: 0,
                runnableNet: 0,
                downNet: 0,
                transfersNet: 0
            }
        }

        let operatorsNet = 0
        let runnableNet = 0
        let downNet = 0
        let transfersNet = 0

        mixerHistory.forEach(h => {
            if (h.field_name === 'assigned_operator') {
                const oldVal = h.old_value
                const newVal = h.new_value
                const hadOperator = oldVal && oldVal !== '' && oldVal !== 'null' && oldVal !== '0'
                const hasOperator = newVal && newVal !== '' && newVal !== 'null' && newVal !== '0'
                if (!hadOperator && hasOperator) operatorsNet++
                else if (hadOperator && !hasOperator) operatorsNet--
            }

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
            operatorsNet,
            runnableNet,
            downNet,
            transfersNet
        }
    }, [mixerHistory, operatorHistory, plantCode, isAllPlants])

    const mixerLookup = useMemo(() => {
        const lookup = {}
        if (mixers && Array.isArray(mixers)) {
            mixers.forEach(m => {
                if (m.id) lookup[m.id] = m
            })
        }
        return lookup
    }, [mixers])

    const operatorLookup = useMemo(() => {
        const lookup = {}
        if (operators && Array.isArray(operators)) {
            operators.forEach(o => {
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

        mixerHistory.forEach(entry => {
            const mixerId = entry.mixer_id
            const key = `mixer_${mixerId}`
            if (!groups[key]) {
                groups[key] = {
                    id: mixerId,
                    type: 'mixer',
                    name: null,
                    changes: []
                }
            }
            groups[key].changes.push(entry)
        })

        operatorHistory.forEach(entry => {
            const operatorId = entry.operator_id
            const key = `operator_${operatorId}`
            if (!groups[key]) {
                groups[key] = {
                    id: operatorId,
                    type: 'operator',
                    name: null,
                    changes: []
                }
            }
            groups[key].changes.push(entry)
        })

        Object.values(groups).forEach(group => {
            if (group.type === 'mixer') {
                const mixer = mixerLookup[group.id]
                if (mixer) {
                    group.name = mixer.truckNumber || mixer.truck_number || 'Unknown'
                } else {
                    const truckNumberChange = group.changes.find(c => c.field_name === 'truck_number')
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
                    const nameChange = group.changes.find(c => c.field_name === 'name')
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

    const fetchHistory = async () => {
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
                        .order('changed_at', {ascending: false})
                        .limit(500)
                    : Promise.resolve({data: [], error: null}),
                operatorIds.length > 0
                    ? supabase
                        .from('operators_history')
                        .select('id,operator_id,field_name,old_value,new_value,changed_at,changed_by')
                        .in('operator_id', operatorIds)
                        .gte('changed_at', startDate.toISOString())
                        .order('changed_at', {ascending: false})
                        .limit(500)
                    : Promise.resolve({data: [], error: null})
            ])

            const mixerData = !mixerResult.error ? (mixerResult.data || []) : []
            const operatorData = !operatorResult.error ? (operatorResult.data || []) : []

            const filterHistory = (entries) => {
                return (entries || []).filter(entry => {
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
            allHistory.forEach(entry => {
                if (entry.changed_by) userIds.add(entry.changed_by)
                if (entry.field_name === 'assigned_operator') {
                    if (entry.old_value && entry.old_value !== 'null' && entry.old_value !== '' && entry.old_value !== '0') {
                        opIdsForNames.add(entry.old_value)
                    }
                    if (entry.new_value && entry.new_value !== 'null' && entry.new_value !== '' && entry.new_value !== '0') {
                        opIdsForNames.add(entry.new_value)
                    }
                }
            })

            const userIdsToFetch = [...userIds].filter(id => !userNames[id])
            const opIdsToFetch = [...opIdsForNames].filter(id => !operatorNames[id])

            const [userNamesResults, opNamesResults] = await Promise.all([
                Promise.all(userIdsToFetch.map(async userId => {
                    try {
                        const displayName = await UserService.getUserDisplayName(userId)
                        return {id: userId, name: displayName || 'Unknown'}
                    } catch {
                        return {id: userId, name: 'Unknown'}
                    }
                })),
                Promise.all(opIdsToFetch.map(async opId => {
                    try {
                        const operator = await OperatorService.getOperatorById(opId)
                        return {
                            id: opId,
                            data: {
                                name: operator?.name || 'Unknown Operator',
                                status: operator?.status || 'Unknown'
                            }
                        }
                    } catch {
                        return {
                            id: opId,
                            data: {
                                name: 'Unknown Operator',
                                status: 'Unknown'
                            }
                        }
                    }
                }))
            ])

            const names = {...userNames}
            userNamesResults.forEach(result => {
                names[result.id] = result.name
            })
            setUserNames(names)

            const opNames = {...operatorNames}
            opNamesResults.forEach(result => {
                opNames[result.id] = result.data
            })
            setOperatorNames(opNames)
        } catch (err) {
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && (mixerIds.length > 0 || operatorIds.length > 0)) {
            fetchHistory()
        }
    }, [isOpen, mixerIds, operatorIds, dateFilter])

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

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const formatFieldName = (fieldName) => {
        if (!fieldName) return 'Unknown Field'
        const mappings = {
            'truck_number': 'Truck Number',
            'assigned_plant': 'Assigned Plant',
            'assigned_operator': 'Assigned Operator',
            'status': 'Status',
            'cleanliness_rating': 'Cleanliness',
            'last_service_date': 'Last Service Date',
            'last_chip_date': 'Last Chip Date',
            'vin': 'VIN',
            'make': 'Make',
            'model': 'Model',
            'year': 'Year',
            'condition_rating': 'Condition',
            'verified': 'Verified',
            'down_in_yard': 'Down In Yard',
            'name': 'Name',
            'plant_code': 'Plant',
            'is_trainer': 'Trainer',
            'assigned_trainer': 'Assigned Trainer',
            'position': 'Position',
            'smyrna_id': 'Smyrna ID',
            'phone': 'Phone',
            'pending_start_date': 'Pending Start Date',
            'rating': 'Rating',
            'automatic_restriction': 'Automatic Restriction'
        }
        return mappings[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })
        } catch {
            return dateStr
        }
    }

    const getChangeIcon = (fieldName) => {
        const iconMap = {
            'status': 'fa-solid fa-circle-dot',
            'assigned_operator': 'fa-solid fa-user',
            'assigned_plant': 'fa-solid fa-industry',
            'plant_code': 'fa-solid fa-industry',
            'cleanliness_rating': 'fa-solid fa-sparkles',
            'last_service_date': 'fa-solid fa-wrench',
            'last_chip_date': 'fa-solid fa-hammer',
            'vin': 'fa-solid fa-barcode',
            'make': 'fa-solid fa-car',
            'model': 'fa-solid fa-tag',
            'year': 'fa-solid fa-calendar',
            'truck_number': 'fa-solid fa-truck',
            'down_in_yard': 'fa-solid fa-parking',
            'name': 'fa-solid fa-id-card',
            'is_trainer': 'fa-solid fa-chalkboard-teacher',
            'assigned_trainer': 'fa-solid fa-user-graduate',
            'position': 'fa-solid fa-briefcase',
            'smyrna_id': 'fa-solid fa-hashtag',
            'phone': 'fa-solid fa-phone',
            'pending_start_date': 'fa-solid fa-calendar-plus',
            'rating': 'fa-solid fa-star',
            'automatic_restriction': 'fa-solid fa-car-side'
        }
        return iconMap[fieldName] || 'fa-solid fa-pen'
    }

    const handleToggle = () => {
        setIsOpen(!isOpen)
    }

    const toggleAssetExpanded = (assetKey) => {
        setExpandedAssets(prev => ({
            ...prev,
            [assetKey]: !prev[assetKey]
        }))
    }

    if (!plantCode && !isAllPlants) return null

    const displayTitle = isAllPlants ? 'All Plants Recap' : `Plant ${plantCode} Recap`
    const displaySubtitle = isAllPlants ? 'All Fleet Changes' : (plantName || 'Changes History')
    const totalChanges = mixerHistory.length + operatorHistory.length

    const tab = (
        <div 
            className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-3 py-2.5 bg-[#1e3a5f] text-white rounded-r-lg cursor-pointer shadow-lg transition-all duration-300 hover:pl-4 ${isTabVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
            onClick={handleToggle}
        >
            <i className="fa-solid fa-clock-rotate-left text-sm"></i>
            <span className="text-sm font-medium">Recap</span>
        </div>
    )

    const modal = isOpen ? (
        <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-start p-4"
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden ml-0 mt-16"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-[#1e3a5f] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-clock-rotate-left text-white text-lg"></i>
                        <div>
                            <h2 className="text-lg font-semibold text-white m-0">{displayTitle}</h2>
                            <span className="text-sm text-slate-300">{displaySubtitle}</span>
                        </div>
                    </div>
                    <button 
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
                    <div className="flex gap-1">
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${dateFilter === 'day' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                            onClick={() => setDateFilter('day')}
                        >
                            24h
                        </button>
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${dateFilter === 'week' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                            onClick={() => setDateFilter('week')}
                        >
                            7 Days
                        </button>
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${dateFilter === 'month' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                            onClick={() => setDateFilter('month')}
                        >
                            30 Days
                        </button>
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${dateFilter === 'all' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                            onClick={() => setDateFilter('all')}
                        >
                            All
                        </button>
                    </div>
                    <div className="text-sm text-slate-500 font-medium">
                        {totalChanges} change{totalChanges !== 1 ? 's' : ''}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-3 p-4 border-b border-slate-200">
                        <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                <i className="fa-solid fa-user text-blue-600 text-sm"></i>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-base font-bold ${changeMetrics.operatorsNet > 0 ? 'text-green-600' : changeMetrics.operatorsNet < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                    {changeMetrics.operatorsNet === 0 ? '0' : `${changeMetrics.operatorsNet > 0 ? '+' : ''}${changeMetrics.operatorsNet}`}
                                </span>
                                <span className="text-xs text-slate-500">Operators</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg">
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                                <i className="fa-solid fa-truck text-green-600 text-sm"></i>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-base font-bold ${changeMetrics.runnableNet > 0 ? 'text-green-600' : changeMetrics.runnableNet < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                    {changeMetrics.runnableNet === 0 ? '0' : `${changeMetrics.runnableNet > 0 ? '+' : ''}${changeMetrics.runnableNet}`}
                                </span>
                                <span className="text-xs text-slate-500">Runnable</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg">
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                                <i className="fa-solid fa-wrench text-amber-600 text-sm"></i>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-base font-bold ${changeMetrics.downNet > 0 ? 'text-red-600' : changeMetrics.downNet < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                    {changeMetrics.downNet === 0 ? '0' : `${changeMetrics.downNet > 0 ? '+' : ''}${changeMetrics.downNet}`}
                                </span>
                                <span className="text-xs text-slate-500">Down</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg">
                            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                                <i className="fa-solid fa-right-left text-purple-600 text-sm"></i>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-bold text-slate-600">
                                    {changeMetrics.transfersNet === 0 ? '0' : changeMetrics.transfersNet}
                                </span>
                                <span className="text-xs text-slate-500">Transfers</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <i className="fa-solid fa-spinner fa-spin text-2xl mb-3"></i>
                                <span className="text-sm">Loading history...</span>
                            </div>
                        ) : groupedHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <i className="fa-solid fa-inbox text-3xl mb-3"></i>
                                <p className="text-sm">No changes found for this time period</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {groupedHistory.map((group, groupIndex) => {
                                    const assetKey = `${group.type}_${group.id}`
                                    const isExpanded = expandedAssets[assetKey] || false
                                    const isMixer = group.type === 'mixer'
                                    const isTerminated = group.type === 'operator' && group.status === 'Terminated'
                                    const assetIcon = isMixer ? 'fa-solid fa-truck' : 'fa-solid fa-hard-hat'
                                    return (
                                        <div key={assetKey || groupIndex} className={`border rounded-lg overflow-hidden ${isMixer ? 'border-blue-200' : 'border-amber-200'}`}>
                                            <div
                                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isMixer ? 'bg-blue-50 hover:bg-blue-100' : 'bg-amber-50 hover:bg-amber-100'}`}
                                                onClick={() => toggleAssetExpanded(assetKey)}
                                            >
                                                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-xs text-slate-400`}></i>
                                                <i className={`${assetIcon} ${isMixer ? 'text-blue-600' : 'text-amber-600'}`}></i>
                                                {isTerminated ? (
                                                    <span className="flex items-center gap-2 flex-1 font-medium">
                                                        <span className="line-through text-slate-400">{group.name}</span>
                                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded">Terminated</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex-1 font-medium text-slate-800">{group.name}</span>
                                                )}
                                                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full">
                                                    {group.changes.length} change{group.changes.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {isExpanded && (
                                                <div className="bg-white divide-y divide-slate-100">
                                                    {group.changes.map((entry, index) => (
                                                        <div key={entry.id || index} className="flex gap-3 px-4 py-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                <i className={`${getChangeIcon(entry.field_name)} text-xs text-slate-500`}></i>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className="text-sm font-medium text-slate-700">{formatFieldName(entry.field_name)}</span>
                                                                    <span className="text-xs text-slate-400">{formatDate(entry.changed_at)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded truncate max-w-[120px]">
                                                                        {formatValue(entry.old_value, entry.field_name)}
                                                                    </span>
                                                                    <i className="fa-solid fa-arrow-right text-xs text-slate-300"></i>
                                                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded truncate max-w-[120px]">
                                                                        {formatValue(entry.new_value, entry.field_name)}
                                                                    </span>
                                                                </div>
                                                                {entry.changed_by && userNames[entry.changed_by] && (
                                                                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                                                                        <i className="fa-solid fa-user-pen"></i>
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
