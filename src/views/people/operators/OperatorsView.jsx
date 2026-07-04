import React, { useEffect, useMemo, useRef, useState } from 'react'

import TabFadeIn from '../../../app/components/common/TabFadeIn'
import PersonViewTabBar from '../../../app/components/people/PersonViewTabBar'
import PersonStatisticsView from '../../../app/components/people/statistics/PersonStatisticsView'
import CommentModalSection from '../../../app/components/sections/CommentModalSection'
import GridViewModeSection from '../../../app/components/sections/GridViewModeSection'
import HistoryViewSection from '../../../app/components/sections/HistoryViewSection'
import ListViewModeSection from '../../../app/components/sections/ListViewModeSection'
import TopSection from '../../../app/components/sections/TopSection'
import AssetListSkeleton from '../../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../../app/context/PreferencesContext'
import useIsWideViewport from '../../../app/hooks/useIsWideViewport'
import useOperatorsData from '../../../app/hooks/useOperatorsData'
import useOperatorsRealtime from '../../../app/hooks/useOperatorsRealtime'
import { OperatorService } from '../../../services/OperatorService'
import { PlantService } from '../../../services/PlantService'
import OperatorEmptyState from './list/OperatorEmptyState'
import OperatorListRow from './list/OperatorListRow'
import { buildAssignedOperatorsSet, deriveFilteredOperators } from './list/operatorSortAndFilter'
import OperatorAddView from './OperatorAddView'
import OperatorCard from './OperatorCard'
import OperatorDetailView from './OperatorDetailView'

const STATUS_FILTER_OPTIONS = [
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
const POSITION_FILTER_OPTIONS = ['All Positions', 'Mixer', 'Tractor']
const LIST_COLUMN_LABELS = ['Plant', 'Name', 'Phone', 'Status', 'Rating', 'Trainer', 'More']
const LIST_COLUMN_WIDTHS = ['10%', '24%', '14%', '14%', '12%', '14%', '12%']

const resolveInitialViewMode = ({ embedded, preferences }) => {
    if (embedded) return 'list'
    const opf = preferences.operatorFilters
    if (opf?.viewMode !== undefined && opf?.viewMode !== null) return opf.viewMode
    if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
        return preferences.defaultViewMode
    }
    return localStorage.getItem('operators_last_view_mode') || 'grid'
}

/**
 * Main list/grid view for the operator roster. Handles data fetching,
 * database realtime subscriptions for live INSERT/UPDATE/DELETE,
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
    const accentColor = preferences.accentColor || '#1e3a5f'
    const headerRef = useRef(null)
    /** Always open the list — tab choice is per-session so navigating away
     *  and back doesn't strand the user on a statistics tab they no longer
     *  want. */
    const [activeTab, setActiveTab] = useState('list')
    const {
        operators,
        plants,
        trainers,
        mixers,
        tractors,
        regionPlantCodes,
        isLoading,
        setOperators,
        setRegionPlantCodes,
        fetchOperators,
        fetchAllData
    } = useOperatorsData(preferences.selectedRegion?.code)
    const opf = preferences.operatorFilters
    const [searchText, setSearchText] = useState(initialSearch || (embedded ? '' : opf?.searchText || ''))
    const [selectedPlant, setSelectedPlant] = useState(embedded ? '' : opf?.selectedPlant || '')
    const [statusFilter, setStatusFilter] = useState(embedded ? '' : opf?.statusFilter || '')
    const [positionFilter, setPositionFilter] = useState(embedded ? '' : opf?.positionFilter || '')
    const [viewMode, setViewMode] = useState(() => resolveInitialViewMode({ embedded, preferences }))
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [showDetailView, setShowDetailView] = useState(false)
    const [selectedOperator, setSelectedOperator] = useState(null)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedOperatorForHistory, setSelectedOperatorForHistory] = useState(null)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalOperatorId, setModalOperatorId] = useState(null)
    const [modalOperatorName, setModalOperatorName] = useState('')
    // On wide viewports + list view, the comment surface renders as a right-side
    // panel next to the table rather than a centered modal. State is shared
    // across both render paths so the open thread survives viewport changes.
    const isWideViewport = useIsWideViewport()
    const useSidePanel = !embedded && viewMode === 'list' && isWideViewport

    useOperatorsRealtime(setOperators)

    useEffect(() => {
        if (initialSearch) {
            const timer = setTimeout(() => setSearchText(initialSearch), 100)
            return () => clearTimeout(timer)
        }
    }, [initialSearch])

    useEffect(() => {
        // Embedded mode (e.g. opened from a dashboard alert) intentionally
        // disables filter persistence — the alert supplies its own intent via
        // `initialStatusFilter` and friends. Restoring the saved plant/status/
        // position here would clobber that and surface the wrong subset, so
        // skip it. Mirrors the `embedded ? '' : …` guards on the initial state
        // and `useAssetFilters`, which never re-applies saved filters at all.
        if (embedded) return
        if (preferences.operatorFilters) {
            setSearchText(preferences.operatorFilters.searchText || '')
            setSelectedPlant(preferences.operatorFilters.selectedPlant || '')
            setStatusFilter(preferences.operatorFilters.statusFilter || '')
            setPositionFilter(preferences.operatorFilters.positionFilter || '')
            setViewMode(preferences.operatorFilters.viewMode || preferences.defaultViewMode || 'grid')
        }
    }, [embedded, preferences.operatorFilters, preferences.defaultViewMode])

    useEffect(() => {
        if (initialStatusFilter !== undefined) setStatusFilter(initialStatusFilter)
    }, [initialStatusFilter])

    useEffect(() => {
        if (initialSelectedPlant !== undefined) {
            const timeout = setTimeout(() => setSelectedPlant(initialSelectedPlant), 1000)
            return () => clearTimeout(timeout)
        }
    }, [initialSelectedPlant])

    useEffect(() => {
        if (initialPositionFilter !== undefined) {
            const timeout = setTimeout(() => setPositionFilter(initialPositionFilter), 1000)
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
    }, [preferences.selectedRegion?.code, selectedPlant, updateOperatorFilter, setRegionPlantCodes])

    useEffect(() => {
        if (selectedPlant && plants.length > 0 && !plants.some((p) => p.plantCode === selectedPlant)) {
            setSelectedPlant('')
            updateOperatorFilter('selectedPlant', '')
        }
    }, [plants, selectedPlant, updateOperatorFilter])

    const reloadAll = async () => {
        await fetchAllData()
    }

    const duplicateNamesSet = useMemo(() => OperatorService.getDuplicateNames(operators), [operators])
    const assignedOperatorsSet = useMemo(
        () => buildAssignedOperatorsSet({ mixers, positionFilter, selectedPlant, tractors }),
        [mixers, tractors, selectedPlant, positionFilter]
    )
    const filteredOperators = useMemo(
        () =>
            deriveFilteredOperators({
                assignedOperatorsSet,
                exactMatch,
                operators,
                positionFilter,
                regionPlantCodes,
                searchText,
                selectedPlant,
                sortDirection,
                sortKey,
                statusFilter,
                trainers
            }),
        [
            operators,
            searchText,
            exactMatch,
            selectedPlant,
            regionPlantCodes,
            statusFilter,
            positionFilter,
            assignedOperatorsSet,
            sortKey,
            sortDirection,
            trainers
        ]
    )

    const handleSelectOperator = (operator) => {
        setSelectedOperator(operator)
        if (onSelectOperator) onSelectOperator(operator.employeeId)
        else setShowDetailView(true)
    }

    const handleViewModeChange = (mode) => {
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

    const handleHeaderClick = (label) => {
        if (sortKey === label) setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    const handleResetFilters = () => {
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

    const hasActiveFilters = Boolean(
        searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || positionFilter
    )

    const openCommentModalFor = (operator) => {
        setModalOperatorId(operator.employeeId)
        setModalOperatorName(operator.name)
        setShowCommentModal(true)
    }
    const openHistoryModalFor = (operator) => {
        setSelectedOperatorForHistory(operator)
        setShowHistoryModal(true)
    }

    /** Embedded mode (dashboard modal popup) skips the tab UI entirely so
     *  the modal stays a pure roster picker. The tab bar lives just below
     *  the global header for non-embedded mounts. */
    const renderTabHeader = () =>
        embedded ? null : (
            <div className="flex items-center justify-between flex-wrap gap-2 px-3 sm:px-4 md:px-6 pt-3 pb-2 border-b border-border-light bg-bg-primary">
                <div className="flex items-center gap-3">
                    <i className="fas fa-id-badge text-[14px] text-text-primary" />
                    <span className="text-[14px] font-bold text-text-primary">{title}</span>
                </div>
                <PersonViewTabBar accentColor={accentColor} activeTab={activeTab} onChange={setActiveTab} />
            </div>
        )

    if (!embedded && activeTab === 'statistics') {
        return (
            <div className="flex flex-col h-full operators-view">
                {renderTabHeader()}
                <TabFadeIn animationKey="operators-statistics" className="flex-1 min-h-0 flex flex-col">
                    <PersonStatisticsView kind="operators" title={title} />
                </TabFadeIn>
            </div>
        )
    }

    return (
        <div
            className={`global-dashboard-container dashboard-container global-flush-top flush-top operators-view animate-fade-in-fast${showDetailView && selectedOperator ? ' detail-open' : ''}`}
        >
            {renderTabHeader()}
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
                    <div className="flex w-full max-w-full">
                        <div className="flex-1 min-w-0">
                            <TopSection
                                isLoading={isLoading}
                                title={title}
                                flushTop={true}
                                showCoverOverlay={true}
                                forwardedRef={headerRef}
                                addButtonLabel="Add Operator"
                                onAddClick={() => setShowAddSheet(true)}
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
                                statusOptions={STATUS_FILTER_OPTIONS}
                                onStatusFilterChange={(value) => {
                                    setStatusFilter(value)
                                    updateOperatorFilter('statusFilter', value)
                                }}
                                positionFilter={positionFilter}
                                positionOptions={POSITION_FILTER_OPTIONS}
                                onPositionFilterChange={(value) => {
                                    setPositionFilter(value)
                                    updateOperatorFilter('positionFilter', value)
                                }}
                                showReset={hasActiveFilters}
                                onReset={handleResetFilters}
                                listLabels={LIST_COLUMN_LABELS}
                                colWidths={LIST_COLUMN_WIDTHS}
                                sticky={true}
                                hidePlantFilter={plants.length === 0}
                                onHeaderClick={handleHeaderClick}
                                sortKey={sortKey}
                                sortDirection={sortDirection}
                            />
                            <div className="w-full max-w-full overflow-x-hidden">
                                {isLoading ? (
                                    <AssetListSkeleton viewMode={viewMode} />
                                ) : filteredOperators.length === 0 ? (
                                    <OperatorEmptyState
                                        hasActiveFilters={hasActiveFilters}
                                        onAddOperator={() => setShowAddSheet(true)}
                                    />
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
                                            return {
                                                isDuplicateName: duplicateNamesSet.has(
                                                    (operator.name || '').trim().toLowerCase()
                                                ),
                                                trainerName: trainerObj ? trainerObj.name : ''
                                            }
                                        }}
                                    />
                                ) : (
                                    <ListViewModeSection
                                        filteredItems={filteredOperators}
                                        handleSelectItem={handleSelectOperator}
                                        headerLabels={LIST_COLUMN_LABELS}
                                        colWidths={LIST_COLUMN_WIDTHS}
                                        renderRow={(operator, handleSelect) => {
                                            const trainerObj = trainers.find(
                                                (t) => t.employeeId === operator.assignedTrainer
                                            )
                                            return (
                                                <OperatorListRow
                                                    key={operator.employeeId}
                                                    operator={operator}
                                                    onSelect={handleSelect}
                                                    onOpenComments={openCommentModalFor}
                                                    onOpenHistory={openHistoryModalFor}
                                                    duplicate={duplicateNamesSet.has(
                                                        (operator.name || '').trim().toLowerCase()
                                                    )}
                                                    trainerName={trainerObj ? trainerObj.name : ''}
                                                />
                                            )
                                        }}
                                        containerClassName="list-table-container"
                                        tableClassName="list-table"
                                    />
                                )}
                            </div>
                        </div>
                        {useSidePanel && showCommentModal && modalOperatorId && (
                            <aside className="hidden lg:flex w-[440px] shrink-0 self-start sticky top-[var(--sticky-cover-height,0px)] flex-col h-[calc(100vh-var(--sticky-cover-height,0px)-12px)]">
                                <CommentModalSection
                                    displayMode="panel"
                                    itemId={modalOperatorId}
                                    itemNumber={modalOperatorName}
                                    itemType="Operator"
                                    onClose={() => {
                                        setShowCommentModal(false)
                                        fetchOperators(regionPlantCodes)
                                    }}
                                    service={OperatorService}
                                />
                            </aside>
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
                    {!useSidePanel && showCommentModal && modalOperatorId && (
                        <CommentModalSection
                            itemId={modalOperatorId}
                            itemNumber={modalOperatorName}
                            itemType="Operator"
                            onClose={() => {
                                setShowCommentModal(false)
                                fetchOperators(regionPlantCodes)
                            }}
                            service={OperatorService}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default OperatorsView
