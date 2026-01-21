import React, {useEffect, useRef, useState} from 'react'
import {UserService} from '../../services/UserService'
import LoadingScreen from '../../components/common/LoadingScreen'
import OperatorDetailView from './OperatorDetailView'
import OperatorCard from './OperatorCard'
import OperatorAddView from './OperatorAddView'
import OperatorCommentModal from './OperatorCommentModal'
import {usePreferences} from '../../app/context/PreferencesContext'
import {RegionService} from '../../services/RegionService'
import {OperatorService} from '../../services/OperatorService'
import {PlantService} from '../../services/PlantService'
import {MixerService} from '../../services/MixerService'
import {TractorService} from '../../services/TractorService'
import TopSection from '../../components/sections/TopSection'
import GrammarUtility from '../../utils/GrammarUtility'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import {supabase} from '../../services/DatabaseService'

function OperatorsView({
                           title = 'Operator Roster',
                           onSelectOperator,
                           initialStatusFilter,
                           initialSelectedPlant,
                           initialPositionFilter
                       }) {
    const {preferences, updateOperatorFilter, resetOperatorFilters} = usePreferences()
    const headerRef = useRef(null)
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState(preferences.operatorFilters?.searchText || '')
    const [selectedPlant, setSelectedPlant] = useState(preferences.operatorFilters?.selectedPlant || '')
    const [statusFilter, setStatusFilter] = useState(preferences.operatorFilters?.statusFilter || '')
    const [positionFilter, setPositionFilter] = useState(preferences.operatorFilters?.positionFilter || '')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [showDetailView, setShowDetailView] = useState(false)
    const [selectedOperator, setSelectedOperator] = useState(null)
    const [, setCurrentUserId] = useState(null)
    const [trainers, setTrainers] = useState([])
    const [reloadFlag] = useState(false)
    const [mixers, setMixers] = useState([])
    const [tractors, setTractors] = useState([])
    const [viewMode, setViewMode] = useState(() => {
        if (preferences.operatorFilters?.viewMode !== undefined && preferences.operatorFilters?.viewMode !== null) return preferences.operatorFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('operators_last_view_mode')
        return lastUsed || 'grid'
    })
    const statuses = ['Active', 'Light Duty', 'Pending Start', 'Training', 'Terminated', 'No Hire']
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const filterOptions = [
        'All Statuses', 'Active', 'Light Duty', 'Pending Start', 'Training', 'Terminated', 'No Hire',
        'Trainer', 'Not Trainer', 'Unassigned Active'
    ]
    const positionOptions = ['All Positions', 'Mixer', 'Tractor']
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const sortMappings = {
        'Plant': 'plantCode',
        'Name': 'name',
        'Phone': 'phone',
        'Status': 'status',
        'Rating': 'rating',
        'Trainer': null
    }
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedOperatorForHistory, setSelectedOperatorForHistory] = useState(null)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalOperatorId, setModalOperatorId] = useState(null)
    const [modalOperatorName, setModalOperatorName] = useState('')

    useEffect(() => {
        const channel = supabase
            .channel('operators-realtime-changes')
            .on(
                'postgres_changes',
                {event: 'INSERT', schema: 'public', table: 'operators'},
                (payload) => {
                    const newData = payload.new
                    setOperators(prev => {
                        if (prev.some(o => o.employeeId === newData.employee_id)) return prev
                        return [...prev, {
                            employeeId: newData.employee_id,
                            smyrnaId: newData.smyrna_id ?? null,
                            name: newData.name ?? '',
                            plantCode: newData.plant_code ?? null,
                            status: newData.status ?? 'Active',
                            isTrainer: newData.is_trainer ?? false,
                            assignedTrainer: newData.assigned_trainer ?? null,
                            position: newData.position ?? null,
                            phone: newData.phone ?? null,
                            pendingStartDate: newData.pending_start_date ?? null,
                            rating: newData.rating ?? 0,
                            automaticRestriction: newData.automatic_restriction ?? false,
                            createdAt: newData.created_at ?? new Date().toISOString(),
                            updatedAt: newData.updated_at ?? new Date().toISOString()
                        }]
                    })
                }
            )
            .on(
                'postgres_changes',
                {event: 'UPDATE', schema: 'public', table: 'operators'},
                (payload) => {
                    const updatedData = payload.new
                    setOperators(prev => prev.map(operator => {
                        if (operator.employeeId === updatedData.employee_id) {
                            return {
                                ...operator,
                                employeeId: updatedData.employee_id ?? operator.employeeId,
                                smyrnaId: updatedData.smyrna_id ?? operator.smyrnaId,
                                name: updatedData.name ?? operator.name,
                                plantCode: updatedData.plant_code ?? operator.plantCode,
                                status: updatedData.status ?? operator.status,
                                isTrainer: updatedData.is_trainer ?? operator.isTrainer,
                                assignedTrainer: updatedData.assigned_trainer ?? operator.assignedTrainer,
                                position: updatedData.position ?? operator.position,
                                phone: updatedData.phone ?? operator.phone,
                                pendingStartDate: updatedData.pending_start_date ?? operator.pendingStartDate,
                                rating: updatedData.rating ?? operator.rating,
                                automaticRestriction: updatedData.automatic_restriction ?? operator.automaticRestriction,
                                updatedAt: updatedData.updated_at ?? operator.updatedAt
                            }
                        }
                        return operator
                    }))
                }
            )
            .on(
                'postgres_changes',
                {event: 'DELETE', schema: 'public', table: 'operators'},
                (payload) => {
                    setOperators(prev => prev.filter(operator => operator.employeeId !== payload.old.employee_id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const user = await UserService.getCurrentUser()
            if (user) setCurrentUserId(user.id)
        }
        fetchCurrentUser()
    }, [])

    useEffect(() => {
        fetchAllData()
    }, [reloadFlag])

    useEffect(() => {
        if (preferences.operatorFilters) {
            setSearchText(preferences.operatorFilters.searchText || '')
            setSelectedPlant(preferences.operatorFilters.selectedPlant || '')
            setStatusFilter(preferences.operatorFilters.statusFilter || '')
            setPositionFilter(preferences.operatorFilters.positionFilter || '')
            setViewMode(preferences.operatorFilters.viewMode || preferences.defaultViewMode || 'grid')
        }
    }, [preferences.operatorFilters, preferences.defaultViewMode])

    useEffect(() => {
        if (initialStatusFilter !== undefined) setStatusFilter(initialStatusFilter)
    }, [initialStatusFilter])

    useEffect(() => {
        if (initialSelectedPlant !== undefined) {
            const timeout = setTimeout(() => {
                setSelectedPlant(initialSelectedPlant)
            }, 1000)
            return () => clearTimeout(timeout)
        }
    }, [initialSelectedPlant])

    useEffect(() => {
        if (initialPositionFilter !== undefined) {
            const timeout = setTimeout(() => {
                setPositionFilter(initialPositionFilter)
            }, 1000)
            return () => clearTimeout(timeout)
        }
    }, [initialPositionFilter])

    useEffect(() => {
        let cancelled = false

        async function loadRegionPlants() {
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '').trim().toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('');
                    updateOperatorFilter('selectedPlant', '')
                }
            } catch {
                if (!cancelled) setRegionPlantCodes(null)
            }
        }

        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, selectedPlant])

    useEffect(() => {
        if (selectedPlant && plants.length > 0 && !plants.some(p => p.plantCode === selectedPlant)) {
            setSelectedPlant('')
            updateOperatorFilter('selectedPlant', '')
        }
    }, [plants, selectedPlant])

    const fetchAllData = async () => {
        setIsLoading(true)
        try {
            const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
            setRegionPlantCodes(codes)
            await Promise.all([fetchOperators(codes), fetchPlants(codes), fetchTrainers(), fetchMixers(codes), fetchTractors(codes)])
        } catch {
        } finally {
            setIsLoading(false)
        }
    }

    const fetchOperators = async (codes) => {
        try {
            const data = await OperatorService.fetchOperators(codes)
            setOperators(data)
            localStorage.setItem('cachedOperators', JSON.stringify(data))
            localStorage.setItem('cachedOperatorsDate', new Date().toISOString())

            fetchCommentCounts(data)
        } catch {
            const cachedData = localStorage.getItem('cachedOperators')
            const cacheDate = localStorage.getItem('cachedOperatorsDate')
            if (cachedData && cacheDate) {
                const cachedTime = new Date(cacheDate).getTime()
                const hourAgo = new Date().getTime() - 3600000
                if (cachedTime > hourAgo) {
                    const parsedData = JSON.parse(cachedData)
                    setOperators(parsedData)
                    fetchCommentCounts(parsedData)
                }
            }
        }
    }

    const fetchCommentCounts = async (operatorsList) => {
        const commentPromises = operatorsList.map(async (operator) => {
            try {
                const comments = await OperatorService.fetchComments(operator.employeeId).catch(() => [])
                return {
                    employeeId: operator.employeeId,
                    commentsCount: Array.isArray(comments) ? comments.length : 0
                }
            } catch {
                return {
                    employeeId: operator.employeeId,
                    commentsCount: 0
                }
            }
        })

        const results = await Promise.all(commentPromises)

        setOperators(prevOperators => {
            return prevOperators.map(op => {
                const result = results.find(r => r.employeeId === op.employeeId)
                return result ? {...op, commentsCount: result.commentsCount} : op
            })
        })
    }

    const fetchPlants = async (codes) => {
        try {
            const data = await PlantService.fetchPlants(codes)
            setPlants(data)
        } catch {
            setPlants([])
        }
    }

    const fetchTrainers = async () => {
        try {
            const data = await OperatorService.fetchTrainers()
            setTrainers(data)
        } catch {
            setTrainers([])
        }
    }

    const fetchMixers = async (codes) => {
        try {
            const data = await MixerService.fetchMixers(codes)
            setMixers(data)
        } catch {
            setMixers([])
        }
    }

    const fetchTractors = async (codes) => {
        try {
            const data = await TractorService.fetchTractors(codes)
            setTractors(data)
        } catch {
            setTractors([])
        }
    }

    const reloadAll = async () => {
        await fetchAllData()
    }

    const duplicateNamesSet = React.useMemo(() => {
        return OperatorService.getDuplicateNames(operators)
    }, [operators])

    const assignedOperatorsSet = React.useMemo(() => {
        const assigned = new Set()
        let eqs = []
        if (positionFilter === 'Mixer') eqs = mixers
        else if (positionFilter === 'Tractor') eqs = tractors
        else eqs = mixers.concat(tractors)
        eqs.filter(eq => eq.status === 'Active' && (!selectedPlant || eq.assignedPlant === selectedPlant)).forEach(eq => {
            if (eq.assignedOperator) assigned.add(eq.assignedOperator)
        })
        return assigned
    }, [mixers, tractors, selectedPlant, positionFilter])

    const filteredOperators = (() => {
        const filtered = operators.filter(operator => {
            const matchesSearch = searchText.trim() === '' || operator.name.toLowerCase().includes(searchText.toLowerCase()) || operator.employeeId.toLowerCase().includes(searchText.toLowerCase())
            const matchesPlant = selectedPlant === '' || operator.plantCode === selectedPlant
            const matchesRegion = !regionPlantCodes || regionPlantCodes.size === 0 || regionPlantCodes.has(String(operator.plantCode || '').trim().toUpperCase())
            let matchesStatus = true
            if (statusFilter && statusFilter !== 'All Statuses') {
                if (statuses.includes(statusFilter)) matchesStatus = operator.status === statusFilter
                else if (statusFilter === 'Trainer') matchesStatus = operator.isTrainer === true || String(operator.isTrainer).toLowerCase() === 'true'
                else if (statusFilter === 'Not Trainer') matchesStatus = operator.isTrainer !== true && String(operator.isTrainer).toLowerCase() !== 'true'
                else if (statusFilter === 'Unassigned Active') matchesStatus = operator.status === 'Active' && !assignedOperatorsSet.has(operator.employeeId)
            }
            let matchesPosition = true
            if (positionFilter) {
                const pos = String(operator.position || '').trim().toLowerCase()
                if (positionFilter === 'Mixer') matchesPosition = pos === 'mixer operator' || pos === 'mixer'
                else if (positionFilter === 'Tractor') matchesPosition = pos === 'tractor operator' || pos === 'tractor'
            }
            return matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesPosition
        });

        const sortFn = (a, b) => {
            if (!sortKey) {
                if (a.status === 'Active' && b.status !== 'Active') return -1
                if (a.status !== 'Active' && b.status === 'Active') return 1
                if (a.status === 'Training' && b.status !== 'Training') return -1
                if (a.status !== 'Training' && b.status === 'Training') return 1
                if (a.status === 'Pending Start' && b.status !== 'Pending Start') return -1
                if (a.status !== 'Pending Start' && b.status === 'Pending Start') return 1
                if (a.status !== b.status) return a.status.localeCompare(b.status)
                const nameA = a.name.split(' ').pop().toLowerCase()
                const nameB = b.name.split(' ').pop().toLowerCase()
                return nameA.localeCompare(nameB)
            }
            const prop = sortMappings[sortKey]
            if (!prop) return 0;
            let aVal, bVal;
            if (sortKey === 'Trainer') {
                aVal = trainers.find(t => t.employeeId === a.assignedTrainer)?.name || ''
                bVal = trainers.find(t => t.employeeId === b.assignedTrainer)?.name || ''
            } else {
                aVal = a[prop]
                bVal = b[prop]
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
            } else {
                aVal = String(aVal || '').toLowerCase()
                bVal = String(bVal || '').toLowerCase()
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
                return 0
            }
        };

        const terminatedStatuses = ['Terminated', 'No Hire'];
        const nonTerminated = [];
        const terminated = [];

        filtered.forEach(op => {
            if (terminatedStatuses.includes(op.status)) {
                terminated.push(op);
            } else {
                nonTerminated.push(op);
            }
        });

        return [...nonTerminated.sort(sortFn), ...terminated.sort(sortFn)];
    })()

    const handleSelectOperator = (operator) => {
        setSelectedOperator(operator)
        if (onSelectOperator) {
            onSelectOperator(operator.employeeId)
        } else {
            setShowDetailView(true)
        }
    }

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null);
            updateOperatorFilter('viewMode', null);
            localStorage.removeItem('operators_last_view_mode')
        } else {
            setViewMode(mode);
            updateOperatorFilter('viewMode', mode);
            localStorage.setItem('operators_last_view_mode', mode)
        }
    }

    function handleHeaderClick(label) {
        if (sortKey === label) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    function handleResetFilters() {
        const currentViewMode = viewMode
        setSearchText('')
        setSelectedPlant('')
        setStatusFilter('')
        setPositionFilter('')
        resetOperatorFilters({keepViewMode: true, currentViewMode})
    }

    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.operators-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchText, selectedPlant, statusFilter, positionFilter])

    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || positionFilter)

    const renderStars = (val) => {
        const rating = Math.round(Number(val) || 0)
        if (!rating || rating <= 0) {
            return <span style={{color: '#94a3b8', fontSize: '14px', fontStyle: 'italic'}}>Not Rated</span>
        }
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i 
                    key={i} 
                    className="fas fa-star" 
                    style={{
                        color: i <= rating ? '#f59e0b' : '#e2e8f0',
                        fontSize: '16px',
                        marginRight: i < 5 ? '2px' : '0'
                    }}
                ></i>
            )
        }
        return <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}>{stars}</div>
    }

    const renderStarsOrNA = (operator) => {
        const allowedStatuses = ['Active', 'Light Duty', 'Training']
        if (!allowedStatuses.includes(operator.status)) {
            return <span style={{color: '#94a3b8', fontSize: '14px', fontStyle: 'italic'}}>N/A</span>
        }
        return renderStars(operator.rating)
    }

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top operators-view${showDetailView && selectedOperator ? ' detail-open' : ''}`}>
                {showDetailView && selectedOperator && (
                    <OperatorDetailView
                        operatorId={selectedOperator.employeeId}
                        onClose={() => {
                            setShowDetailView(false);
                            fetchOperators()
                        }}
                        onScheduledOffSaved={reloadAll}
                        allowedPlantCodes={regionPlantCodes}
                    />
                )}
                {!showDetailView && (
                    <>
                        <TopSection
                            title={title}
                            flushTop={true}
                            showCoverOverlay={true}
                            forwardedRef={headerRef}
                            addButtonLabel="Add Operator"
                            onAddClick={() => setShowAddSheet(true)}
                            searchInput={searchText}
                            onSearchInputChange={value => {
                                setSearchText(value);
                                updateOperatorFilter('searchText', value)
                            }}
                            onClearSearch={() => {
                                setSearchText('');
                                updateOperatorFilter('searchText', '')
                            }}
                            searchPlaceholder="Search by name or ID..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants.map(p => ({plantCode: p.plantCode, plantName: p.plantName}))}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={value => {
                                setSelectedPlant(value);
                                updateOperatorFilter('selectedPlant', value)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={value => {
                                setStatusFilter(value);
                                updateOperatorFilter('statusFilter', value)
                            }}
                            positionFilter={positionFilter}
                            positionOptions={positionOptions}
                            onPositionFilterChange={value => {
                                setPositionFilter(value);
                                updateOperatorFilter('positionFilter', value)
                            }}
                            showReset={showReset}
                            onReset={handleResetFilters}
                            listLabels={['Plant', 'Name', 'Phone', 'Status', 'Rating', 'Trainer', 'More']}
                            colWidths={['10%', '24%', '14%', '14%', '12%', '14%', '12%']}
                            sticky={true}
                            hidePlantFilter={plants.length === 0}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="global-content-container content-container">
                            {isLoading ? (
                                <div className="global-loading-container loading-container"><LoadingScreen
                                    message="Loading operators..." inline={true}/></div>
                            ) : filteredOperators.length === 0 ? (
                                <div className="global-no-results-container no-results-container">
                                    <div className="no-results-icon"><i className="fas fa-user-hard-hat"></i></div>
                                    <h3>No Operators Found</h3>
                                    <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || positionFilter ? 'No operators match your search criteria.' : 'There are no operators in the system yet.'}</p>
                                    <button className="global-primary-button primary-button"
                                            onClick={() => setShowAddSheet(true)}>Add Operator
                                    </button>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <GridViewModeSection
                                    filteredItems={filteredOperators}
                                    handleSelectItem={handleSelectOperator}
                                    cardComponent={OperatorCard}
                                    itemPropName="operator"
                                    gridClassName="grid"
                                    getCardProps={(operator) => {
                                        const trainerObj = trainers.find(t => t.employeeId === operator.assignedTrainer)
                                        const duplicate = duplicateNamesSet.has((operator.name || '').trim().toLowerCase())
                                        return {
                                            trainerName: trainerObj ? trainerObj.name : '',
                                            isDuplicateName: duplicate
                                        }
                                    }}
                                />
                            ) : (
                                <ListViewModeSection
                                    filteredItems={filteredOperators}
                                    handleSelectItem={handleSelectOperator}
                                    headerLabels={['Plant', 'Name', 'Phone', 'Status', 'Rating', 'Trainer', 'More']}
                                    colWidths={['10%', '24%', '14%', '14%', '12%', '14%', '12%']}
                                    renderRow={(operator, handleSelect) => {
                                        const duplicate = duplicateNamesSet.has((operator.name || '').trim().toLowerCase())
                                        const trainerObj = trainers.find(t => t.employeeId === operator.assignedTrainer)
                                        const cellStyle = {
                                            padding: '20px 24px',
                                            fontSize: '15px',
                                            color: '#1e293b',
                                            fontWeight: 500,
                                            textAlign: 'left',
                                            verticalAlign: 'middle',
                                            backgroundColor: 'white'
                                        }
                                        const cellSecondaryStyle = {
                                            padding: '20px 24px',
                                            fontSize: '14px',
                                            color: '#475569',
                                            textAlign: 'left',
                                            verticalAlign: 'middle',
                                            backgroundColor: 'white'
                                        }
                                        const cellHighlightStyle = {
                                            padding: '20px 24px',
                                            fontSize: '16px',
                                            color: '#1e3a5f',
                                            fontWeight: 700,
                                            textAlign: 'left',
                                            verticalAlign: 'middle',
                                            backgroundColor: 'white'
                                        }
                                        const statusBadgeStyle = (status) => {
                                            let bg = '#f1f5f9'
                                            let textColor = '#475569'
                                            if (status === 'Active') { bg = '#dcfce7'; textColor = '#166534' }
                                            else if (status === 'Light Duty') { bg = '#fef3c7'; textColor = '#92400e' }
                                            else if (status === 'Pending Start') { bg = '#dbeafe'; textColor = '#1e40af' }
                                            else if (status === 'Training') { bg = '#e0e7ff'; textColor = '#4338ca' }
                                            else if (status === 'Terminated') { bg = '#fecaca'; textColor = '#991b1b' }
                                            else if (status === 'No Hire') { bg = '#fee2e2'; textColor = '#b91c1c' }
                                            return {
                                                display: 'inline-block',
                                                padding: '8px 16px',
                                                borderRadius: '24px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                backgroundColor: bg,
                                                color: textColor
                                            }
                                        }
                                        const actionBtnStyle = {
                                            width: '42px',
                                            height: '42px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            backgroundColor: 'white',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px',
                                            marginRight: '8px'
                                        }
                                        return (
                                            <tr key={operator.employeeId} onClick={() => handleSelect(operator)}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #e2e8f0'
                                                }}
                                                onMouseEnter={(e) => {
                                                    const cells = e.currentTarget.querySelectorAll('td')
                                                    cells.forEach(cell => cell.style.backgroundColor = '#e0f2fe')
                                                }}
                                                onMouseLeave={(e) => {
                                                    const cells = e.currentTarget.querySelectorAll('td')
                                                    cells.forEach(cell => cell.style.backgroundColor = '')
                                                }}>
                                                <td style={{...cellStyle, width: '10%'}}>{operator.plantCode || '\u2014'}</td>
                                                <td style={{...cellHighlightStyle, width: '24%'}}>
                                                    <span className={duplicate ? 'duplicate' : ''}>{operator.name}</span>
                                                </td>
                                                <td style={{...cellSecondaryStyle, width: '14%'}}>{operator.phone ? GrammarUtility.formatPhone(operator.phone) : '\u2014'}</td>
                                                <td style={{...cellSecondaryStyle, width: '14%'}}>
                                                    <span style={statusBadgeStyle(operator.status)}>{operator.status || '\u2014'}</span>
                                                </td>
                                                <td style={{...cellSecondaryStyle, width: '12%'}}>{renderStarsOrNA(operator)}</td>
                                                <td style={{...cellSecondaryStyle, width: '14%'}}>{trainerObj ? trainerObj.name : '\u2014'}</td>
                                                <td style={{...cellSecondaryStyle, width: '12%'}}>
                                                    <div style={{display: 'flex', alignItems: 'center'}}>
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            setModalOperatorId(operator.employeeId);
                                                            setModalOperatorName(operator.name);
                                                            setShowCommentModal(true);
                                                        }} type="button" title="View comments" style={actionBtnStyle}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#1e3a5f'
                                                            e.currentTarget.style.color = 'white'
                                                            e.currentTarget.style.borderColor = '#1e3a5f'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'white'
                                                            e.currentTarget.style.color = '#64748b'
                                                            e.currentTarget.style.borderColor = '#e2e8f0'
                                                        }}>
                                                            <i className="fas fa-comments"></i>
                                                        </button>
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOperatorForHistory(operator);
                                                            setShowHistoryModal(true);
                                                        }} type="button" title="View history" style={actionBtnStyle}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#1e3a5f'
                                                            e.currentTarget.style.color = 'white'
                                                            e.currentTarget.style.borderColor = '#1e3a5f'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'white'
                                                            e.currentTarget.style.color = '#64748b'
                                                            e.currentTarget.style.borderColor = '#e2e8f0'
                                                        }}>
                                                            <i className="fas fa-history"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }}
                                    containerClassName="list-table-container"
                                    tableClassName="list-table"
                                />
                            )}
                        </div>
                        {showAddSheet && (
                            <OperatorAddView
                                onClose={() => setShowAddSheet(false)}
                                onOperatorAdded={() => fetchOperators()}
                                trainers={trainers}
                                plants={plants}
                                operators={operators}
                                allowedPlantCodes={regionPlantCodes}
                            />
                        )}
                        {showHistoryModal && selectedOperatorForHistory && (
                            <HistoryViewSection
                                item={selectedOperatorForHistory}
                                type="operator"
                                onClose={() => setShowHistoryModal(false)}
                            />
                        )}
                        {showCommentModal && modalOperatorId && (
                            <OperatorCommentModal
                                operatorId={modalOperatorId}
                                operatorName={modalOperatorName}
                                onClose={() => {
                                    setShowCommentModal(false);
                                    fetchOperators(regionPlantCodes);
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default OperatorsView
