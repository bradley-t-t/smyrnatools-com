 import React, {useEffect, useState, useMemo} from 'react'
import ReactDOM from 'react-dom'
import {supabase} from '../../services/DatabaseService'
import {UserService} from '../../services/UserService'
import {OperatorService} from '../../services/OperatorService'
import './styles/RecapModalSection.css'

function RecapModalSection({plantCode, plantName, mixers}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState([])
    const [userNames, setUserNames] = useState({})
    const [operatorNames, setOperatorNames] = useState({})
    const [dateFilter, setDateFilter] = useState('week')
    const [expandedAssets, setExpandedAssets] = useState({})

    const mixerIds = useMemo(() => {
        if (!mixers || !Array.isArray(mixers)) return []
        return mixers.map(m => m.id).filter(Boolean)
    }, [mixers])

    const changeMetrics = useMemo(() => {
        if (!history || history.length === 0) {
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
        
        history.forEach(h => {
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
        })
        
        return {
            operatorsNet,
            runnableNet,
            downNet,
            transfersNet
        }
    }, [history, plantCode])

    const mixerLookup = useMemo(() => {
        const lookup = {}
        if (mixers && Array.isArray(mixers)) {
            mixers.forEach(m => {
                if (m.id) lookup[m.id] = m
            })
        }
        return lookup
    }, [mixers])

    const groupedHistory = useMemo(() => {
        if (!history || history.length === 0) return []
        const groups = {}
        history.forEach(entry => {
            const mixerId = entry.mixer_id
            if (!groups[mixerId]) {
                groups[mixerId] = {
                    mixerId,
                    truckNumber: null,
                    changes: []
                }
            }
            groups[mixerId].changes.push(entry)
        })
        Object.values(groups).forEach(group => {
            const mixer = mixerLookup[group.mixerId]
            if (mixer) {
                group.truckNumber = mixer.truckNumber || mixer.truck_number || 'Unknown'
            } else {
                const truckNumberChange = group.changes.find(c => c.field_name === 'truck_number')
                if (truckNumberChange) {
                    group.truckNumber = truckNumberChange.new_value || truckNumberChange.old_value || 'Unknown'
                } else {
                    group.truckNumber = 'Unknown'
                }
            }
            group.changes.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
        })
        return Object.values(groups).sort((a, b) => {
            const aLatest = a.changes[0]?.changed_at || ''
            const bLatest = b.changes[0]?.changed_at || ''
            return new Date(bLatest) - new Date(aLatest)
        })
    }, [history, mixerLookup])

    const fetchHistory = async () => {
        if (mixerIds.length === 0) return

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

            const {data, error} = await supabase
                .from('mixers_history')
                .select('*')
                .in('mixer_id', mixerIds)
                .gte('changed_at', startDate.toISOString())
                .order('changed_at', {ascending: false})
                .limit(500)

            if (error) throw error

            const filtered = (data || []).filter(entry => {
                const oldVal = entry.old_value
                const newVal = entry.new_value
                if (oldVal === newVal) return false
                if (!oldVal && !newVal) return false
                if (oldVal === 'null' && !newVal) return false
                if (!oldVal && newVal === 'null') return false
                return true
            })

            setHistory(filtered)

            const userIds = new Set()
            const operatorIds = new Set()
            filtered.forEach(entry => {
                if (entry.changed_by) userIds.add(entry.changed_by)
                if (entry.field_name === 'assigned_operator') {
                    if (entry.old_value && entry.old_value !== 'null' && entry.old_value !== '' && entry.old_value !== '0') {
                        operatorIds.add(entry.old_value)
                    }
                    if (entry.new_value && entry.new_value !== 'null' && entry.new_value !== '' && entry.new_value !== '0') {
                        operatorIds.add(entry.new_value)
                    }
                }
            })

            const names = {...userNames}
            for (const userId of userIds) {
                if (!names[userId]) {
                    try {
                        const displayName = await UserService.getUserDisplayName(userId)
                        names[userId] = displayName || 'Unknown'
                    } catch {
                        names[userId] = 'Unknown'
                    }
                }
            }
            setUserNames(names)

            const opNames = {...operatorNames}
            for (const opId of operatorIds) {
                if (!opNames[opId]) {
                    try {
                        const operator = await OperatorService.getOperatorById(opId)
                        opNames[opId] = operator?.name || 'Unknown Operator'
                    } catch {
                        opNames[opId] = 'Unknown Operator'
                    }
                }
            }
            setOperatorNames(opNames)
        } catch (err) {
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && mixerIds.length > 0) {
            fetchHistory()
        }
    }, [isOpen, mixerIds, dateFilter])

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
            'down_in_yard': 'Down In Yard'
        }
        return mappings[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }

    const formatValue = (value, fieldName) => {
        if (value === null || value === undefined || value === '' || value === 'null') return 'None'
        if (fieldName === 'assigned_operator') {
            if (value === '0') return 'None'
            return operatorNames[value] || value
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
        if (fieldName === 'down_in_yard') {
            return value === 'true' || value === true ? 'Yes' : 'No'
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
            'cleanliness_rating': 'fa-solid fa-sparkles',
            'last_service_date': 'fa-solid fa-wrench',
            'last_chip_date': 'fa-solid fa-hammer',
            'vin': 'fa-solid fa-barcode',
            'make': 'fa-solid fa-car',
            'model': 'fa-solid fa-tag',
            'year': 'fa-solid fa-calendar',
            'truck_number': 'fa-solid fa-truck',
            'down_in_yard': 'fa-solid fa-parking'
        }
        return iconMap[fieldName] || 'fa-solid fa-pen'
    }

    const handleToggle = () => {
        setIsOpen(!isOpen)
    }

    const toggleAssetExpanded = (mixerId) => {
        setExpandedAssets(prev => ({
            ...prev,
            [mixerId]: !prev[mixerId]
        }))
    }

    if (!plantCode) return null

    const tab = (
        <div className="recap-tab" onClick={handleToggle}>
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
                            <h2>Plant {plantCode} Recap</h2>
                            <span className="recap-modal-subtitle">{plantName || 'Changes History'}</span>
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
                        {history.length} change{history.length !== 1 ? 's' : ''}
                    </div>
                </div>

                <div className="recap-modal-content">
                    <div className="recap-metrics-section">
                        <div className="recap-metric">
                            <div className="recap-metric-icon operators">
                                <i className="fa-solid fa-user"></i>
                            </div>
                            <div className="recap-metric-data">
                                <span className={`recap-metric-value ${changeMetrics.operatorsNet > 0 ? 'positive' : changeMetrics.operatorsNet < 0 ? 'negative' : ''}`}>
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
                                <span className={`recap-metric-value ${changeMetrics.runnableNet > 0 ? 'positive' : changeMetrics.runnableNet < 0 ? 'negative' : ''}`}>
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
                                <span className={`recap-metric-value ${changeMetrics.downNet > 0 ? 'negative' : changeMetrics.downNet < 0 ? 'positive' : ''}`}>
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
                                <span className="recap-metric-value">{changeMetrics.transfersNet === 0 ? 'No Change' : changeMetrics.transfersNet}</span>
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
                                    const isExpanded = expandedAssets[group.mixerId] || false
                                    return (
                                        <div key={group.mixerId || groupIndex} className="recap-asset-group">
                                            <div 
                                                className="recap-asset-header" 
                                                onClick={() => toggleAssetExpanded(group.mixerId)}
                                            >
                                                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} recap-expand-icon`}></i>
                                                <i className="fa-solid fa-truck"></i>
                                                <span className="recap-asset-title">Truck #{group.truckNumber}</span>
                                                <span className="recap-asset-count">{group.changes.length} change{group.changes.length !== 1 ? 's' : ''}</span>
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
                                                                    <span className="recap-entry-field-inline">{formatFieldName(entry.field_name)}</span>
                                                                    <span className="recap-timestamp">{formatDate(entry.changed_at)}</span>
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
            {tab}
            {modal && ReactDOM.createPortal(modal, document.body)}
        </>
    )
}

export default RecapModalSection
