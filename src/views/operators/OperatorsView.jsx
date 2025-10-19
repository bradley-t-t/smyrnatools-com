import React, {useEffect, useRef, useState} from 'react'
import './styles/Operators.css'
import '../../styles/FilterStyles.css'
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
import ThemeUtility from '../../utils/ThemeUtility'

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

    const filteredOperators = operators.filter(operator => {
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
    }).sort((a, b) => {
        if (!sortKey) {
            if (a.status === 'Active' && b.status !== 'Active') return -1
            if (a.status !== 'Active' && b.status === 'Active') return 1
            if (a.status === 'Training' && b.status !== 'Training') return -1
            if (a.status !== 'Training' && b.status === 'Training') return 1
            if (a.status === 'Pending Start' && b.status !== 'Pending Start') return -1
            if (a.status !== 'Pending Start' && b.status === 'Pending Start') return 1
            if (a.status === 'Terminated' && b.status !== 'Terminated') return 1
            if (a.status !== 'Terminated' && b.status === 'Terminated') return -1
            if (a.status === 'No Hire' && b.status !== 'No Hire') return 1
            if (a.status !== 'No Hire' && b.status === 'No Hire') return -1
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
    })

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
        const count = rating > 0 ? rating : 1
        return (
            <span>
                {Array.from({length: count}).map((_, i) => (
                    <i key={i} className="fas fa-star"
                       style={{color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))}}></i>
                ))}
            </span>
        )
    }

    const renderStarsOrNA = (operator) => {
        const allowedStatuses = ['Active', 'Light Duty', 'Training']
        if (!allowedStatuses.includes(operator.status)) return 'Not Applicable'
        return renderStars(operator.rating)
    }

    return (
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
                                    return (
                                        <tr key={operator.employeeId} onClick={() => handleSelect(operator)}
                                            style={{cursor: 'pointer'}}>
                                            <td style={{width: '10%'}}>{operator.plantCode || '\u2014'}</td>
                                            <td style={{width: '24%'}}><span
                                                className={`name-cell${duplicate ? ' duplicate' : ''}`}>{operator.name}</span>
                                            </td>
                                            <td style={{width: '14%'}}>{operator.phone ? GrammarUtility.formatPhone(operator.phone) : '\u2014'}</td>
                                            <td style={{width: '14%'}}>{operator.status || '\u2014'}</td>
                                            <td style={{width: '12%'}}>{renderStarsOrNA(operator)}</td>
                                            <td style={{width: '14%'}}>{trainerObj ? trainerObj.name : '\u2014'}</td>
                                            <td style={{width: '12%'}}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModalOperatorId(operator.employeeId);
                                                        setModalOperatorName(operator.name);
                                                        setShowCommentModal(true);
                                                    }} title="View comments" style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        padding: 0,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}>
                                                        <i className="fas fa-comments" style={{
                                                            color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                                            marginRight: 4
                                                        }}></i>
                                                        <span>{operator.commentsCount || 0}</span>
                                                    </button>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOperatorForHistory(operator);
                                                        setShowHistoryModal(true);
                                                    }} title="View history" style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        padding: 0,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}>
                                                        <i className="fas fa-history" style={{
                                                            color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                                            marginRight: 4
                                                        }}></i>
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
    )
}

export default OperatorsView
