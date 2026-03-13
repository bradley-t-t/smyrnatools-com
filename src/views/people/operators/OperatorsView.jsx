import React, { useCallback, useEffect, useRef, useState } from 'react'

import StatusHistoryBar from '../../../app/components/common/StatusHistoryBar'
import { exportOperatorRatingsSheet } from '../../../app/components/modules/export/operators/OperatorRatingsExport'
import GridViewModeSection from '../../../app/components/sections/GridViewModeSection'
import HistoryViewSection from '../../../app/components/sections/HistoryViewSection'
import ListViewModeSection from '../../../app/components/sections/ListViewModeSection'
import TopSection from '../../../app/components/sections/TopSection'
import AssetListSkeleton from '../../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { supabase } from '../../../services/DatabaseService'
import { MixerService } from '../../../services/MixerService'
import { OperatorService } from '../../../services/OperatorService'
import { PlantService } from '../../../services/PlantService'
import { TractorService } from '../../../services/TractorService'
import GrammarUtility from '../../../utils/GrammarUtility'
import OperatorAddView from './OperatorAddView'
import OperatorCard from './OperatorCard'
import OperatorCommentModal from './OperatorCommentModal'
import OperatorDetailView from './OperatorDetailView'
/**
 * Main list/grid view for the operator roster. Handles data fetching,
 * Supabase realtime subscriptions for live INSERT/UPDATE/DELETE,
 * region-scoped plant filtering, name/ID search, status and position
 * filtering, sortable columns, operator ratings export, and drill-down
 * into OperatorDetailView. Falls back to a 1-hour localStorage cache
 * on API failure.
 *
 * @param {string} [title] - Page heading (defaults to "Operator Roster").
 * @param {Function} [onSelectOperator] - Optional external callback when an operator is selected.
 * @param {string} [initialStatusFilter] - Pre-set status filter on mount.
 * @param {string} [initialSelectedPlant] - Pre-set plant filter on mount (applied with 1s delay).
 * @param {string} [initialPositionFilter] - Pre-set position filter on mount (applied with 1s delay).
 * @param {boolean} [embedded] - When true, disables filter persistence and forces list mode.
 * @param {string} [initialSearch] - Pre-populates the search field on mount.
 * @param {boolean} [exactMatch] - When true, search matches name exactly.
 */
function OperatorsView({
    title = 'Operator Roster',
    onSelectOperator,
    initialStatusFilter,
    initialSelectedPlant,
    initialPositionFilter,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    const { preferences, updateOperatorFilter, resetOperatorFilters } = usePreferences()
    const headerRef = useRef(null)
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.operatorFilters?.searchText || ''
    )
    const [selectedPlant, setSelectedPlant] = useState(embedded ? '' : preferences.operatorFilters?.selectedPlant || '')
    const [statusFilter, setStatusFilter] = useState(embedded ? '' : preferences.operatorFilters?.statusFilter || '')
    const [positionFilter, setPositionFilter] = useState(
        embedded ? '' : preferences.operatorFilters?.positionFilter || ''
    )
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [showDetailView, setShowDetailView] = useState(false)
    const [selectedOperator, setSelectedOperator] = useState(null)
    const [trainers, setTrainers] = useState([])
    const [mixers, setMixers] = useState([])
    const [tractors, setTractors] = useState([])
    const [viewMode, setViewMode] = useState(() => {
        if (embedded) return 'list'
        if (preferences.operatorFilters?.viewMode !== undefined && preferences.operatorFilters?.viewMode !== null)
            return preferences.operatorFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('operators_last_view_mode')
        return lastUsed || 'grid'
    })
    const statuses = ['Active', 'Light Duty', 'Pending Start', 'Training', 'Terminated', 'No Hire']
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const filterOptions = [
        'All Statuses',
        'Active',
        'Light Duty',
        'Pending Start',
        'Training',
        'Terminated',
        'No Hire',
        'Trainer',
        'Not Trainer',
        'Unassigned Active'
    ]
    const positionOptions = ['All Positions', 'Mixer', 'Tractor']
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const sortMappings = {
        Name: 'name',
        Phone: 'phone',
        Plant: 'plantCode',
        Rating: 'rating',
        Status: 'status',
        Trainer: null
    }
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedOperatorForHistory, setSelectedOperatorForHistory] = useState(null)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalOperatorId, setModalOperatorId] = useState(null)
    const [modalOperatorName, setModalOperatorName] = useState('')
    const [isExporting, setIsExporting] = useState(false)
    const handleExportRatings = async () => {
        setIsExporting(true)
        try {
            await exportOperatorRatingsSheet({ operators, plants })
        } catch (err) {
            console.error('Export ratings failed:', err)
        } finally {
            setIsExporting(false)
        }
    }
    useEffect(() => {
        if (initialSearch) {
            const timer = setTimeout(() => {
                setSearchText(initialSearch)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [initialSearch])
    // Subscribe to Supabase realtime changes on the operators table to keep the list in sync without refetching.
    useEffect(() => {
        const channel = supabase
            .channel('operators-realtime-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'operators' }, (payload) => {
                const newData = payload.new
                setOperators((prev) => {
                    if (prev.some((o) => o.employeeId === newData.employee_id)) return prev
                    return [
                        ...prev,
                        {
                            assignedTrainer: newData.assigned_trainer ?? null,
                            automaticRestriction: newData.automatic_restriction ?? false,
                            createdAt: newData.created_at ?? new Date().toISOString(),
                            employeeId: newData.employee_id,
                            isTrainer: newData.is_trainer ?? false,
                            name: newData.name ?? '',
                            pendingStartDate: newData.pending_start_date ?? null,
                            phone: newData.phone ?? null,
                            plantCode: newData.plant_code ?? null,
                            position: newData.position ?? null,
                            rating: newData.rating ?? 0,
                            smyrnaId: newData.smyrna_id ?? null,
                            status: newData.status ?? 'Active',
                            updatedAt: newData.updated_at ?? new Date().toISOString()
                        }
                    ]
                })
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'operators' }, (payload) => {
                const updatedData = payload.new
                setOperators((prev) =>
                    prev.map((operator) => {
                        if (operator.employeeId === updatedData.employee_id) {
                            return {
                                ...operator,
                                assignedTrainer: updatedData.assigned_trainer ?? operator.assignedTrainer,
                                automaticRestriction:
                                    updatedData.automatic_restriction ?? operator.automaticRestriction,
                                employeeId: updatedData.employee_id ?? operator.employeeId,
                                isTrainer: updatedData.is_trainer ?? operator.isTrainer,
                                name: updatedData.name ?? operator.name,
                                pendingStartDate: updatedData.pending_start_date ?? operator.pendingStartDate,
                                phone: updatedData.phone ?? operator.phone,
                                plantCode: updatedData.plant_code ?? operator.plantCode,
                                position: updatedData.position ?? operator.position,
                                rating: updatedData.rating ?? operator.rating,
                                smyrnaId: updatedData.smyrna_id ?? operator.smyrnaId,
                                status: updatedData.status ?? operator.status,
                                updatedAt: updatedData.updated_at ?? operator.updatedAt
                            }
                        }
                        return operator
                    })
                )
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'operators' }, (payload) => {
                setOperators((prev) => prev.filter((operator) => operator.employeeId !== payload.old.employee_id))
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [])
    /** Fetches operators scoped to the given plant codes; falls back to a 1-hour localStorage cache on failure. */
    const fetchCommentCounts = useCallback(async (operatorsList) => {
        if (!operatorsList || operatorsList.length === 0) return
        const operatorIds = operatorsList.map((op) => op.employeeId).filter(Boolean)
        if (operatorIds.length === 0) return
        try {
            const commentsCounts = await OperatorService.fetchAllCommentsCounts(operatorIds)
            setOperators((prevOperators) => {
                return prevOperators.map((op) => ({
                    ...op,
                    commentsCount: commentsCounts[op.employeeId] || 0
                }))
            })
        } catch (e) {
            console.error('Error loading operator comment counts:', e)
        }
    }, [])
    const fetchOperators = useCallback(
        async (codes) => {
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
        },
        [fetchCommentCounts]
    )
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
    const fetchAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            const codes = await PlantService.getAllowedPlantCodes(preferences.selectedRegion?.code)
            setRegionPlantCodes(codes)
            await Promise.all([
                fetchOperators(codes),
                fetchPlants(codes),
                fetchTrainers(),
                fetchMixers(codes),
                fetchTractors(codes)
            ])
        } catch {
        } finally {
            setIsLoading(false)
        }
    }, [preferences.selectedRegion?.code, fetchOperators])
    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])
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
                const codes = await PlantService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '')
                    .trim()
                    .toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('')
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
    }, [preferences.selectedRegion?.code, selectedPlant, updateOperatorFilter])
    useEffect(() => {
        if (selectedPlant && plants.length > 0 && !plants.some((p) => p.plantCode === selectedPlant)) {
            setSelectedPlant('')
            updateOperatorFilter('selectedPlant', '')
        }
    }, [plants, selectedPlant, updateOperatorFilter])
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
        eqs.filter(
            (eq) =>
                eq.status === 'Active' &&
                (!selectedPlant || selectedPlant === 'All' || eq.assignedPlant === selectedPlant)
        ).forEach((eq) => {
            if (eq.assignedOperator) assigned.add(eq.assignedOperator)
        })
        return assigned
    }, [mixers, tractors, selectedPlant, positionFilter])
    const filteredOperators = (() => {
        const filtered = operators.filter((operator) => {
            let matchesSearch = true
            if (searchText.trim() !== '') {
                if (exactMatch) {
                    matchesSearch =
                        operator.name.toLowerCase() === searchText.trim().toLowerCase() ||
                        operator.employeeId.toLowerCase() === searchText.trim().toLowerCase()
                } else {
                    matchesSearch =
                        operator.name.toLowerCase().includes(searchText.toLowerCase()) ||
                        operator.employeeId.toLowerCase().includes(searchText.toLowerCase())
                }
            }
            const matchesPlant = selectedPlant === '' || selectedPlant === 'All' || operator.plantCode === selectedPlant
            const matchesRegion =
                !regionPlantCodes ||
                regionPlantCodes.size === 0 ||
                regionPlantCodes.has(
                    String(operator.plantCode || '')
                        .trim()
                        .toUpperCase()
                )
            let matchesStatus = true
            if (statusFilter && statusFilter !== 'All Statuses') {
                if (statuses.includes(statusFilter)) matchesStatus = operator.status === statusFilter
                else if (statusFilter === 'Trainer')
                    matchesStatus = operator.isTrainer === true || String(operator.isTrainer).toLowerCase() === 'true'
                else if (statusFilter === 'Not Trainer')
                    matchesStatus = operator.isTrainer !== true && String(operator.isTrainer).toLowerCase() !== 'true'
                else if (statusFilter === 'Unassigned Active')
                    matchesStatus = operator.status === 'Active' && !assignedOperatorsSet.has(operator.employeeId)
            }
            let matchesPosition = true
            if (positionFilter) {
                const pos = String(operator.position || '')
                    .trim()
                    .toLowerCase()
                if (positionFilter === 'Mixer') matchesPosition = pos === 'mixer operator' || pos === 'mixer'
                else if (positionFilter === 'Tractor') matchesPosition = pos === 'tractor operator' || pos === 'tractor'
            }
            return matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesPosition
        })
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
            if (!prop) return 0
            let aVal, bVal
            if (sortKey === 'Trainer') {
                aVal = trainers.find((t) => t.employeeId === a.assignedTrainer)?.name || ''
                bVal = trainers.find((t) => t.employeeId === b.assignedTrainer)?.name || ''
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
        }
        const terminatedStatuses = ['Terminated', 'No Hire']
        const nonTerminated = []
        const terminated = []
        filtered.forEach((op) => {
            if (terminatedStatuses.includes(op.status)) {
                terminated.push(op)
            } else {
                nonTerminated.push(op)
            }
        })
        return [...nonTerminated.sort(sortFn), ...terminated.sort(sortFn)]
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
            setViewMode(null)
            updateOperatorFilter('viewMode', null)
            localStorage.removeItem('operators_last_view_mode')
        } else {
            setViewMode(mode)
            updateOperatorFilter('viewMode', mode)
            localStorage.setItem('operators_last_view_mode', mode)
        }
    }
    function handleHeaderClick(label) {
        if (sortKey === label) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
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
        resetOperatorFilters({ currentViewMode, keepViewMode: true })
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
    const showReset = searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || positionFilter
    const renderStars = (val) => {
        const rating = Math.round(Number(val) || 0)
        if (!rating || rating <= 0) {
            return <span className="text-text-secondary text-sm italic">Not Rated</span>
        }
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i
                    key={i}
                    className={`fas fa-star text-base ${i <= rating ? 'text-amber-400' : 'text-border-light'} ${i < 5 ? 'mr-0.5' : ''}`}
                ></i>
            )
        }
        return <div className="flex items-center gap-0.5">{stars}</div>
    }
    const renderStarsOrNA = (operator) => {
        const allowedStatuses = ['Active', 'Light Duty', 'Training']
        if (!allowedStatuses.includes(operator.status)) {
            return <span className="text-text-secondary text-sm italic">N/A</span>
        }
        return renderStars(operator.rating)
    }
    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top operators-view${showDetailView && selectedOperator ? ' detail-open' : ''}`}
            >
                {showDetailView && selectedOperator && (
                    <OperatorDetailView
                        operatorId={selectedOperator.employeeId}
                        onClose={() => {
                            setShowDetailView(false)
                            fetchOperators()
                        }}
                        onScheduledOffSaved={reloadAll}
                        allowedPlantCodes={regionPlantCodes}
                    />
                )}
                {!showDetailView && (
                    <>
                        <TopSection
                            isLoading={isLoading}
                            title={title}
                            flushTop={true}
                            showCoverOverlay={true}
                            forwardedRef={headerRef}
                            addButtonLabel="Add Operator"
                            onAddClick={() => setShowAddSheet(true)}
                            customActions={
                                <button
                                    className="flex items-center gap-2 rounded-xl border-none bg-gray-500 px-4 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-150 disabled:opacity-50"
                                    onClick={handleExportRatings}
                                    disabled={isExporting || operators.length === 0}
                                    type="button"
                                    aria-label="Export Ratings Sheet"
                                >
                                    <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-export'}`} />
                                    <span>{isExporting ? 'Exporting...' : 'Export Ratings'}</span>
                                </button>
                            }
                            searchInput={searchText}
                            onSearchInputChange={(value) => {
                                setSearchText(value)
                                updateOperatorFilter('searchText', value)
                            }}
                            onClearSearch={() => {
                                setSearchText('')
                                updateOperatorFilter('searchText', '')
                            }}
                            searchPlaceholder="Search by name or ID..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants.map((p) => ({ plantCode: p.plantCode, plantName: p.plantName }))}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(value) => {
                                setSelectedPlant(value)
                                updateOperatorFilter('selectedPlant', value)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(value) => {
                                setStatusFilter(value)
                                updateOperatorFilter('statusFilter', value)
                            }}
                            positionFilter={positionFilter}
                            positionOptions={positionOptions}
                            onPositionFilterChange={(value) => {
                                setPositionFilter(value)
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
                                <AssetListSkeleton viewMode={viewMode} />
                            ) : filteredOperators.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                        <i className="fas fa-users text-3xl text-slate-400"></i>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Operators Found</h3>
                                    <p className="text-slate-500 mb-6 max-w-md">
                                        {searchText ||
                                        selectedPlant ||
                                        (statusFilter && statusFilter !== 'All Statuses') ||
                                        positionFilter
                                            ? 'No operators match your search criteria.'
                                            : 'There are no operators in the system yet.'}
                                    </p>
                                    <button
                                        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
                                        onClick={() => setShowAddSheet(true)}
                                    >
                                        Add Operator
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
                                        const trainerObj = trainers.find(
                                            (t) => t.employeeId === operator.assignedTrainer
                                        )
                                        const duplicate = duplicateNamesSet.has(
                                            (operator.name || '').trim().toLowerCase()
                                        )
                                        return {
                                            isDuplicateName: duplicate,
                                            trainerName: trainerObj ? trainerObj.name : ''
                                        }
                                    }}
                                />
                            ) : (
                                <ListViewModeSection
                                    filteredItems={filteredOperators}
                                    handleSelectItem={handleSelectOperator}
                                    headerLabels={['Plant', 'Name', 'Phone', 'Status', 'Rating', 'Trainer', 'More']}
                                    colWidths={['10%', '24%', '14%', '14%', '12%', '14%', '12%']}
                                    renderRow={(
                                        operator,
                                        handleSelect,
                                        _onComment,
                                        _onIssue,
                                        _onVerify,
                                        _onHistory,
                                        _index,
                                        _alternatingBg
                                    ) => {
                                        const duplicate = duplicateNamesSet.has(
                                            (operator.name || '').trim().toLowerCase()
                                        )
                                        const trainerObj = trainers.find(
                                            (t) => t.employeeId === operator.assignedTrainer
                                        )
                                        const cellCls =
                                            'text-text-primary text-[15px] font-medium py-5 px-6 text-left align-middle'
                                        const cellSecondaryCls =
                                            'text-text-secondary text-sm py-5 px-6 text-left align-middle'
                                        const cellHighlightCls =
                                            'text-text-secondary text-base font-bold py-5 px-6 text-left align-middle'
                                        const statusBadgeStyle = (status) => {
                                            const colorMap = {
                                                Active: 'bg-[#dcfce7] text-[#166534]',
                                                'Light Duty': 'bg-[#fef3c7] text-[#92400e]',
                                                'No Hire': 'bg-[#fee2e2] text-[#b91c1c]',
                                                'Pending Start': 'bg-[#dbeafe] text-[#1e40af]',
                                                Terminated: 'bg-[#fecaca] text-[#991b1b]',
                                                Training: 'bg-[#e0e7ff] text-[#4338ca]'
                                            }
                                            const colors = colorMap[status] || 'bg-[#f1f5f9] text-[#475569]'
                                            return `inline-block rounded-3xl text-[13px] font-semibold px-4 py-2 ${colors}`
                                        }
                                        const actionBtnCls =
                                            'inline-flex items-center justify-center w-[42px] h-[42px] mr-2 rounded-xl border border-border-light bg-bg-primary text-text-secondary text-base cursor-pointer hover:bg-accent hover:text-white hover:border-accent transition-colors'
                                        return (
                                            <tr
                                                key={operator.employeeId}
                                                onClick={() => handleSelect(operator)}
                                                className="border-b border-border-light cursor-pointer group"
                                            >
                                                <td className={`${cellCls} w-[10%] group-hover:bg-bg-tertiary`}>
                                                    {operator.plantCode || '\u2014'}
                                                </td>
                                                <td
                                                    className={`${cellHighlightCls} w-[24%] group-hover:bg-bg-tertiary`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={duplicate ? 'duplicate' : ''}>
                                                            {operator.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                navigator.clipboard.writeText(operator.name)
                                                                const icon = e.currentTarget.querySelector('i')
                                                                icon.className = 'fas fa-check'
                                                                icon.style.color = '#22c55e'
                                                                setTimeout(() => {
                                                                    icon.className = 'fas fa-copy'
                                                                    icon.style.color = ''
                                                                }, 1500)
                                                            }}
                                                            title="Copy name"
                                                            className="inline-flex items-center bg-transparent border-none text-text-secondary cursor-pointer text-xs p-0.5"
                                                        >
                                                            <i className="fas fa-copy"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td
                                                    className={`${cellSecondaryCls} w-[14%] group-hover:bg-bg-tertiary`}
                                                >
                                                    {operator.phone
                                                        ? GrammarUtility.formatPhone(operator.phone)
                                                        : '\u2014'}
                                                </td>
                                                <td
                                                    className={`${cellSecondaryCls} w-[14%] group-hover:bg-bg-tertiary`}
                                                >
                                                    <div>
                                                        <span className={statusBadgeStyle(operator.status)}>
                                                            {operator.status || '\u2014'}
                                                            {operator.status &&
                                                                operator.status !== 'Terminated' &&
                                                                (() => {
                                                                    const dateToUse =
                                                                        operator.statusChangedAt || operator.createdAt
                                                                    const days = dateToUse
                                                                        ? Math.max(
                                                                              1,
                                                                              Math.floor(
                                                                                  (Date.now() -
                                                                                      new Date(dateToUse).getTime()) /
                                                                                      86400000
                                                                              )
                                                                          )
                                                                        : 1
                                                                    return ` (${days} day${days !== 1 ? 's' : ''})`
                                                                })()}
                                                        </span>
                                                        <StatusHistoryBar
                                                            itemId={operator.employeeId}
                                                            itemType="operator"
                                                            currentStatus={operator.status}
                                                            createdAt={operator.createdAt}
                                                        />
                                                    </div>
                                                </td>
                                                <td
                                                    className={`${cellSecondaryCls} w-[12%] group-hover:bg-bg-tertiary`}
                                                >
                                                    {renderStarsOrNA(operator)}
                                                </td>
                                                <td
                                                    className={`${cellSecondaryCls} w-[14%] group-hover:bg-bg-tertiary`}
                                                >
                                                    {trainerObj ? trainerObj.name : '\u2014'}
                                                </td>
                                                <td
                                                    className={`${cellSecondaryCls} w-[12%] group-hover:bg-bg-tertiary`}
                                                >
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setModalOperatorId(operator.employeeId)
                                                                setModalOperatorName(operator.name)
                                                                setShowCommentModal(true)
                                                            }}
                                                            type="button"
                                                            title="View comments"
                                                            className={`${actionBtnCls} relative`}
                                                        >
                                                            <i className="fas fa-comments"></i>
                                                            {operator.commentsCount > 0 && (
                                                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full shadow-[0_2px_8px_rgba(59,130,246,0.4)]">
                                                                    {operator.commentsCount > 9
                                                                        ? '9+'
                                                                        : operator.commentsCount}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedOperatorForHistory(operator)
                                                                setShowHistoryModal(true)
                                                            }}
                                                            type="button"
                                                            title="View history"
                                                            className={actionBtnCls}
                                                        >
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
                                    setShowCommentModal(false)
                                    fetchOperators(regionPlantCodes)
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
