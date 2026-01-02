import React, {useEffect, useMemo, useState} from 'react'
import ReactDOM from 'react-dom'
import {supabase} from '../../services/DatabaseService'
import {UserService} from '../../services/UserService'
import {OperatorService} from '../../services/OperatorService'
import './styles/RecapModalSection.css'

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
        <div className={`recap-tab ${isTabVisible ? 'visible' : 'hidden'}`} onClick={handleToggle}>
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Recap</span>
        </div>
    )

    const modal = isOpen ? (
        <div className="recap-modal-backdrop" onClick={() => setIsOpen(false)}>
            <div className="recap-modal" onClick={e => e.stopPropagation()}>
                <div className="recap-modal-header">
                    <div className="recap-modal-header-content">
                        <i className="fa-solid fa-clock-rotate-left"></i>
                        <div>
                            <h2>{displayTitle}</h2>
                            <span className="recap-modal-subtitle">{displaySubtitle}</span>
                        </div>
                    </div>
                    <button className="recap-modal-close-button" onClick={() => setIsOpen(false)}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="recap-modal-filters">
                    <div className="recap-filter-group">
                        <button
                            className={`recap-filter-btn ${dateFilter === 'day' ? 'active' : ''}`}
                            onClick={() => setDateFilter('day')}
                        >
                            24h
                        </button>
                        <button
                            className={`recap-filter-btn ${dateFilter === 'week' ? 'active' : ''}`}
                            onClick={() => setDateFilter('week')}
                        >
                            7 Days
                        </button>
                        <button
                            className={`recap-filter-btn ${dateFilter === 'month' ? 'active' : ''}`}
                            onClick={() => setDateFilter('month')}
                        >
                            30 Days
                        </button>
                        <button
                            className={`recap-filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setDateFilter('all')}
                        >
                            All
                        </button>
                    </div>
                    <div className="recap-count">
                        {totalChanges} change{totalChanges !== 1 ? 's' : ''}
                    </div>
                </div>

                <div className="recap-modal-content">
                    <div className="recap-metrics-section">
                        <div className="recap-metric">
                            <div className="recap-metric-icon operators">
                                <i className="fa-solid fa-user"></i>
                            </div>
                            <div className="recap-metric-data">
                                <span
                                    className={`recap-metric-value ${changeMetrics.operatorsNet > 0 ? 'positive' : changeMetrics.operatorsNet < 0 ? 'negative' : ''}`}>
                                    {changeMetrics.operatorsNet === 0 ? 'No Change' : `${changeMetrics.operatorsNet > 0 ? '+' : ''}${changeMetrics.operatorsNet}`}
                                </span>
                                <span className="recap-metric-label">Operators</span>
                            </div>
                        </div>
                        <div className="recap-metric">
                            <div className="recap-metric-icon trucks">
                                <i className="fa-solid fa-truck"></i>
                            </div>
                            <div className="recap-metric-data">
                                <span
                                    className={`recap-metric-value ${changeMetrics.runnableNet > 0 ? 'positive' : changeMetrics.runnableNet < 0 ? 'negative' : ''}`}>
                                    {changeMetrics.runnableNet === 0 ? 'No Change' : `${changeMetrics.runnableNet > 0 ? '+' : ''}${changeMetrics.runnableNet}`}
                                </span>
                                <span className="recap-metric-label">Runnable</span>
                            </div>
                        </div>
                        <div className="recap-metric">
                            <div className="recap-metric-icon down">
                                <i className="fa-solid fa-wrench"></i>
                            </div>
                            <div className="recap-metric-data">
                                <span
                                    className={`recap-metric-value ${changeMetrics.downNet > 0 ? 'negative' : changeMetrics.downNet < 0 ? 'positive' : ''}`}>
                                    {changeMetrics.downNet === 0 ? 'No Change' : `${changeMetrics.downNet > 0 ? '+' : ''}${changeMetrics.downNet}`}
                                </span>
                                <span className="recap-metric-label">Down</span>
                            </div>
                        </div>
                        <div className="recap-metric">
                            <div className="recap-metric-icon transfers">
                                <i className="fa-solid fa-right-left"></i>
                            </div>
                            <div className="recap-metric-data">
                                <span
                                    className="recap-metric-value">{changeMetrics.transfersNet === 0 ? 'No Change' : changeMetrics.transfersNet}</span>
                                <span className="recap-metric-label">Transfers</span>
                            </div>
                        </div>
                    </div>

                    <div className="recap-history-section">
                        {isLoading ? (
                            <div className="recap-loading">
                                <div className="recap-loading-spinner">
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                </div>
                                <span>Loading history...</span>
                            </div>
                        ) : groupedHistory.length === 0 ? (
                            <div className="recap-empty">
                                <i className="fa-solid fa-inbox"></i>
                                <p>No changes found for this time period</p>
                            </div>
                        ) : (
                            <div className="recap-timeline">
                                {groupedHistory.map((group, groupIndex) => {
                                    const assetKey = `${group.type}_${group.id}`
                                    const isExpanded = expandedAssets[assetKey] || false
                                    const isMixer = group.type === 'mixer'
                                    const isTerminated = group.type === 'operator' && group.status === 'Terminated'
                                    const assetIcon = isMixer ? 'fa-solid fa-truck' : 'fa-solid fa-hard-hat'
                                    return (
                                        <div key={assetKey || groupIndex} className={`recap-asset-group ${group.type}`}>
                                            <div
                                                className="recap-asset-header"
                                                onClick={() => toggleAssetExpanded(assetKey)}
                                            >
                                                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} recap-expand-icon`}></i>
                                                <i className={`${assetIcon} recap-asset-type-icon`}></i>
                                                {isTerminated ? (
                                                    <span className="recap-asset-title operator-terminated">
                                                        <span
                                                            className="operator-name-strikethrough">{group.name}</span>
                                                        <span className="terminated-badge">Terminated</span>
                                                    </span>
                                                ) : (
                                                    <span className="recap-asset-title">{group.name}</span>
                                                )}
                                                <span
                                                    className="recap-asset-count">{group.changes.length} change{group.changes.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            {isExpanded && (
                                                <div className="recap-asset-changes">
                                                    {group.changes.map((entry, index) => (
                                                        <div key={entry.id || index} className="recap-entry">
                                                            <div className="recap-entry-icon">
                                                                <i className={getChangeIcon(entry.field_name)}></i>
                                                            </div>
                                                            <div className="recap-entry-content">
                                                                <div className="recap-entry-header">
                                                                    <span
                                                                        className="recap-entry-field-inline">{formatFieldName(entry.field_name)}</span>
                                                                    <span
                                                                        className="recap-timestamp">{formatDate(entry.changed_at)}</span>
                                                                </div>
                                                                <div className="recap-entry-values">
                                                                    <span className="recap-old-value">
                                                                        {formatValue(entry.old_value, entry.field_name)}
                                                                    </span>
                                                                    <i className="fa-solid fa-arrow-right"></i>
                                                                    <span className="recap-new-value">
                                                                        {formatValue(entry.new_value, entry.field_name)}
                                                                    </span>
                                                                </div>
                                                                {entry.changed_by && userNames[entry.changed_by] && (
                                                                    <div className="recap-entry-user">
                                                                        <i className="fa-solid fa-user-pen"></i>
                                                                        {userNames[entry.changed_by]}
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
