import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePreferences} from '../../../app/context/PreferencesContext';
import LoadingScreen from '../../common/LoadingScreen';
import TractorCard from './TractorCard';
import '../../../styles/FilterStyles.css';
import './styles/Tractors.css';
import {TractorService} from '../../../services/TractorService';
import {TractorUtility} from "../../../utils/TractorUtility";
import {OperatorService} from "../../../services/OperatorService";
import {PlantService} from "../../../services/PlantService";
import TractorAddView from "./TractorAddView";
import TractorDetailView from "./TractorDetailView";
import TractorIssueModal from './TractorIssueModal'
import TractorCommentModal from './TractorCommentModal'
import {RegionService} from '../../../services/RegionService'
import AsyncUtility from '../../../utils/AsyncUtility'
import FleetUtility from '../../../utils/FleetUtility'
import TopSection from '../../sections/TopSection'
import ListViewModeSection from '../../sections/ListViewModeSection'
import GridViewModeSection from '../../sections/GridViewModeSection'
import HistoryViewSection from '../../sections/HistoryViewSection'
import ThemeUtility from '../../../utils/ThemeUtility'

function TractorsView({title = 'Tractor Fleet', onSelectTractor, setSelectedView}) {
    const {
        preferences,
        updateTractorFilter,
        resetTractorFilters,
        saveLastViewedFilters,
        updateOperatorFilter
    } = usePreferences();
    const headerRef = useRef(null)
    const [tractors, setTractors] = useState([]);
    const [allTractors, setAllTractors] = useState([]);
    const [operators, setOperators] = useState([]);
    const [plants, setPlants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegionLoading, setIsRegionLoading] = useState(false)
    const [searchText, setSearchText] = useState(preferences.tractorFilters?.searchText || '');
    const [searchInput, setSearchInput] = useState(preferences.tractorFilters?.searchText || '');
    const [selectedPlant, setSelectedPlant] = useState(preferences.tractorFilters?.selectedPlant || '');
    const [statusFilter, setStatusFilter] = useState(preferences.tractorFilters?.statusFilter || '');
    const [freightFilter, setFreightFilter] = useState(preferences.tractorFilters?.freightFilter || '');
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [selectedTractor, setSelectedTractor] = useState(null);
    const [viewMode, setViewMode] = useState(() => {
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null) return preferences.tractorFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('tractors_last_view_mode')
        return lastUsed || 'grid'
    })
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalTractorId, setModalTractorId] = useState(null)
    const [modalTractorNumber, setModalTractorNumber] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [tractorsLoaded, setTractorsLoaded] = useState(false)
    const [operatorsLoaded, setOperatorsLoaded] = useState(false)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedTractorForHistory, setSelectedTractorForHistory] = useState(null)
    const filterOptions = ['All Statuses', 'Active', 'Spare', 'In Shop', 'Retired', 'Past Due Service', 'Verified', 'Not Verified', 'Open Issues']
    const sortMappings = {
        'Plant': 'assignedPlant',
        'Truck #': 'truckNumber',
        'Status': 'status',
        'Operator': 'assignedOperator',
        'Cleanliness': 'cleanlinessRating',
        'VIN': 'vinNumber',
        'Verified': null,
        'More': null
    }

    const unassignedActiveOperatorsCount = useMemo(() => FleetUtility.countUnassignedActiveOperators(tractors, operators, searchText, {
        position: 'Tractor Operator',
        selectedPlant,
        regionPlantCodes,
        operatorIdField: 'employeeId',
        assignedOperatorField: 'assignedOperator',
        assignedPlantField: 'assignedPlant'
    }), [operators, tractors, selectedPlant, searchText, regionPlantCodes])

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true);
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                await Promise.all([fetchTractors(codes), fetchOperators(), fetchPlants(codes)]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAllData();
        if (preferences?.tractorFilters) {
            setSearchText(preferences.tractorFilters.searchText || '');
            setSearchInput(preferences.tractorFilters.searchText || '');
            setSelectedPlant(preferences.tractorFilters.selectedPlant || '');
            setStatusFilter(preferences.tractorFilters.statusFilter || '');
            setFreightFilter(preferences.tractorFilters.freightFilter || '');
        }
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null) {
            setViewMode(preferences.tractorFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('tractors_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences])

    useEffect(() => {
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null) setViewMode(preferences.tractorFilters.viewMode)
        else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) setViewMode(preferences.defaultViewMode)
        else {
            const lastUsed = localStorage.getItem('tractors_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences.tractorFilters?.viewMode, preferences.defaultViewMode])

    useEffect(() => {
        let cancelled = false

        async function loadAllowedPlants() {
            setIsRegionLoading(!!preferences.selectedRegion?.code)
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '').trim().toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('')
                    updateTractorFilter('selectedPlant', '')
                }
            } catch {
                if (!cancelled) setRegionPlantCodes(null)
            } finally {
                if (!cancelled) setIsRegionLoading(false)
            }
        }

        loadAllowedPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateTractorFilter('viewMode', null)
            localStorage.removeItem('tractors_last_view_mode')
        } else {
            setViewMode(mode)
            updateTractorFilter('viewMode', mode)
            localStorage.setItem('tractors_last_view_mode', mode)
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

    async function fetchTractors(codes) {
        try {
            const processedBase = await TractorService.fetchTractorsWithDetails(codes)
            setTractors(processedBase)
            setAllTractors(processedBase)
            setTractorsLoaded(true)
            loadDetailsForTractors(processedBase)
            setTimeout(() => {
                TractorService.ensureSpareIfNoOperator(processedBase).catch(() => {
                })
            }, 0)
        } catch (error) {
        }
    }


    async function fetchOperators() {
        try {
            const data = await OperatorService.fetchOperators();
            setOperators(Array.isArray(data) ? data : []);
            setOperatorsLoaded(true)
        } catch (error) {
            setOperators([]);
        }
    }

    async function fetchPlants(codes) {
        try {
            const data = await PlantService.fetchPlants(codes);
            setPlants(data);
        } catch (error) {
        }
    }

    function handleSelectTractor(tractorId) {
        const tractor = tractors.find(m => m.id === tractorId);
        if (tractor) {
            saveLastViewedFilters();
            setSelectedTractor(tractorId);
            onSelectTractor?.(tractorId);
        }
    }

    const filteredTractors = useMemo(() => tractors.filter(tractor => {
        const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
        const truckMatch = (tractor.truckNumber || '').toLowerCase().includes(normalizedSearch)
        const operatorMatch = tractor.assignedOperator && operators.find(op => op.employeeId === tractor.assignedOperator)?.name.toLowerCase().includes(normalizedSearch)
        const vinRaw = (tractor.vinNumber || tractor.vin || '').toLowerCase()
        const vinNoSpaces = vinRaw.replace(/\s+/g, '')
        const vinMatch = vinRaw.includes(searchText.trim().toLowerCase()) || vinNoSpaces.includes(normalizedSearch)
        const matchesSearch = !normalizedSearch || truckMatch || operatorMatch || vinMatch
        const matchesPlant = !selectedPlant || tractor.assignedPlant === selectedPlant
        const matchesRegion = !regionPlantCodes || regionPlantCodes.size === 0 || regionPlantCodes.has(String(tractor.assignedPlant || '').trim().toUpperCase())
        let matchesStatus = true
        if (statusFilter && statusFilter !== 'All Statuses') {
            matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter) ? tractor.status === statusFilter : statusFilter === 'Past Due Service' ? TractorUtility.isServiceOverdue(tractor.lastServiceDate) : statusFilter === 'Verified' ? tractor.isVerified() : statusFilter === 'Not Verified' ? (!tractor.isVerified() && tractor.status !== 'Retired') : statusFilter === 'Open Issues' ? (Number(tractor.openIssuesCount || 0) > 0) : false
        }
        const matchesFreight = !freightFilter || tractor.freight === freightFilter
        return matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesFreight
    }).sort((a, b) => {
        if (!sortKey) {
            return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'truckNumber')
        }
        const prop = sortMappings[sortKey]
        if (!prop) return 0;
        let aVal, bVal;
        if (sortKey === 'Verified') {
            aVal = a.isVerified() ? 1 : 0
            bVal = b.isVerified() ? 1 : 0
        } else if (sortKey === 'Operator') {
            aVal = operators.find(op => op.employeeId === a.assignedOperator)?.name || ''
            bVal = operators.find(op => op.employeeId === b.assignedOperator)?.name || ''
        } else if (sortKey === 'Plant') {
            aVal = plants.find(p => p.code === a.assignedPlant)?.name || a.assignedPlant
            bVal = plants.find(p => p.code === b.assignedPlant)?.name || b.assignedPlant
        } else if (sortKey === 'Truck #') {
            aVal = parseFloat(a.truckNumber) || 0
            bVal = parseFloat(b.truckNumber) || 0
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
    }), [tractors, operators, selectedPlant, searchText, statusFilter, freightFilter, regionPlantCodes, sortKey, sortDirection, plants])

    const debouncedSetSearchText = useCallback(AsyncUtility.debounce(value => {
        setSearchText(value);
        updateTractorFilter('searchText', value)
    }, 300), [updateTractorFilter])

    const canShowUnassignedOverlay = tractorsLoaded && operatorsLoaded && !isLoading && unassignedActiveOperatorsCount > 0
    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || freightFilter)

    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.tractors-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchInput, selectedPlant, statusFilter, freightFilter])

    useEffect(() => {
        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true);
                try {
                    const vinTractors = await TractorService.searchTractorsByVinProcessed(normalizedSearch);
                    const filteredVinTractors = regionPlantCodes ? vinTractors.filter(t => regionPlantCodes.has(String(t.assignedPlant || '').trim().toUpperCase())) : vinTractors
                    setTractors(filteredVinTractors);
                    setTractorsLoaded(true)
                } catch {
                }
                setIsLoading(false);
            } else {
                setTractors(allTractors);
            }
        }

        if (searchText.trim().length >= 1) {
            searchByVin();
        } else {
            setTractors(allTractors);
        }
    }, [searchText, allTractors, regionPlantCodes]);

    const content = useMemo(() => {
        if (isLoading || isRegionLoading) {
            return (
                <div className="global-loading-container loading-container">
                    <LoadingScreen message="Loading tractors..." inline={true}/>
                </div>
            )
        }
        if (filteredTractors.length === 0) {
            return (
                <div className="global-no-results-container no-results-container">
                    <div className="no-results-icon">
                        <i className="fas fa-truck"></i>
                    </div>
                    <h3>No Tractors Found</h3>
                    <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || freightFilter ? "No tractors match your search criteria." : "There are no tractors in the system yet."}</p>
                    <button className="global-primary-button primary-button" onClick={() => setShowAddSheet(true)}>Add
                        Tractor
                    </button>
                </div>
            )
        }
        if (viewMode === 'grid') {
            return (
                <GridViewModeSection
                    filteredItems={filteredTractors}
                    operators={operators}
                    plants={plants}
                    handleSelectItem={handleSelectTractor}
                    cardComponent={TractorCard}
                    itemPropName="tractor"
                    onShowCommentModal={(id, number) => {
                        setModalTractorId(id);
                        setModalTractorNumber(number);
                        setShowCommentModal(true);
                    }}
                    onShowIssueModal={(id, number) => {
                        setModalTractorId(id);
                        setModalTractorNumber(number);
                        setShowIssueModal(true);
                    }}
                    gridClassName="grid"
                />
            )
        }
        return (
            <ListViewModeSection
                filteredItems={filteredTractors}
                operators={operators}
                plants={plants}
                handleSelectItem={handleSelectTractor}
                listLabels={['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']}
                colWidths={['10%', '12%', '12%', '18%', '12%', '16%', '10%', '10%']}
                renderRow={(item, handleSelect, onComment, onIssue) => {
                    const operator = operators.find(op => op.employeeId === item.assignedOperator);
                    const plant = plants.find(p => p.code === item.assignedPlant);
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td style={{width: '10%'}}>{plant?.name || item.assignedPlant}</td>
                            <td style={{width: '12%'}}>{item.truckNumber}</td>
                            <td style={{width: '12%'}}><span className="item-status-dot" style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                marginRight: '8px',
                                backgroundColor: item.status === 'Active' ? 'var(--status-active)' : item.status === 'Spare' ? 'var(--status-spare)' : item.status === 'In Shop' ? 'var(--status-inshop)' : item.status === 'Retired' ? 'var(--status-retired)' : 'var(--accent)'
                            }}></span>{item.status}</td>
                            <td style={{width: '18%'}}>{operator?.name || 'Not Assigned'}</td>
                            <td style={{width: '12%'}}>{(() => {
                                const rating = Math.round(item.cleanlinessRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star"
                                                                                    style={{color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))}}></i>)
                            })()}</td>
                            <td style={{width: '16%'}}>{item.vinNumber || item.vin}</td>
                            <td style={{width: '10%'}}>{item.status === 'Retired' ? 'Not Applicable' : (item.isVerified() ?
                                <span><i className="fas fa-check" style={{color: 'green', marginRight: '4px'}}></i>Verified</span> :
                                <span><i className="fas fa-flag" style={{color: 'red', marginRight: '4px'}}></i>Not Verified</span>)}</td>
                            <td style={{width: '10%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onComment(item.id, item.truckNumber);
                                    }} style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }} title="View comments"><i className="fas fa-comments" style={{
                                        color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                        marginRight: 4
                                    }}></i><span>{item.commentsCount || 0}</span></button>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onIssue(item.id, item.truckNumber);
                                    }} style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }} title="View issues"><i className="fas fa-tools" style={{
                                        color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                        marginRight: 4
                                    }}></i><span>{item.openIssuesCount || 0}</span></button>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        setSelectedTractorForHistory(item);
                                        setShowHistoryModal(true);
                                    }} style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }} title="View history"><i className="fas fa-history" style={{
                                        color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                        marginRight: 4
                                    }}></i></button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
                onShowCommentModal={(id, number) => {
                    setModalTractorId(id);
                    setModalTractorNumber(number);
                    setShowCommentModal(true);
                }}
                onShowIssueModal={(id, number) => {
                    setModalTractorId(id);
                    setModalTractorNumber(number);
                    setShowIssueModal(true);
                }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, isRegionLoading, filteredTractors, viewMode, searchText, selectedPlant, statusFilter, freightFilter, operators, plants, tractors])

    const loadDetailsForTractors = async (tractors) => {
        const items = tractors.slice()
        let index = 0
        const concurrency = 20

        async function worker() {
            while (index < items.length) {
                const current = index++
                const t = items[current]
                try {
                    const [comments, issues] = await Promise.all([
                        TractorService.fetchComments(t.id).catch(() => []),
                        TractorService.fetchIssues(t.id).catch(() => [])
                    ])
                    const openIssuesCount = Array.isArray(issues) ? issues.filter(i => !i.time_completed).length : 0
                    const commentsCount = Array.isArray(comments) ? comments.length : 0
                    t.comments = comments
                    t.issues = issues
                    t.openIssuesCount = openIssuesCount
                    t.commentsCount = commentsCount
                } catch (e) {
                    // ignore
                }
            }
        }

        await Promise.all(Array.from({length: concurrency}, () => worker()))
        // Trigger re-render
        setTractors([...tractors])
        setAllTractors([...tractors])
    }

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top tractors-view${selectedTractor ? ' detail-open' : ''}`}>
                {selectedTractor ? (
                    <TractorDetailView tractorId={selectedTractor} onClose={() => { setSelectedTractor(null); setIsLoading(true); RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code).then(codes => fetchTractors(codes).finally(() => setIsLoading(false))); }}/>
                ) : (
                    <>
                        <TopSection
                            title={title}
                            badge={canShowUnassignedOverlay ? `${unassignedActiveOperatorsCount} Unassigned Active Operator${unassignedActiveOperatorsCount !== 1 ? 's' : ''}` : null}
                            onBadgeClick={canShowUnassignedOverlay ? () => {
                                setSelectedView('Operators', 'Unassigned Active', selectedPlant, 'Tractor');
                                updateOperatorFilter('selectedPlant', selectedPlant);
                                updateOperatorFilter('positionFilter', 'Tractor');
                                updateOperatorFilter('statusFilter', 'Unassigned Active');
                            } : null}
                            addButtonLabel="Add Tractor"
                            onAddClick={() => setShowAddSheet(true)}
                            searchInput={searchInput}
                            onSearchInputChange={(v) => {
                                setSearchInput(v);
                                debouncedSetSearchText(v)
                            }}
                            onClearSearch={() => {
                                setSearchInput('');
                                debouncedSetSearchText('')
                            }}
                            searchPlaceholder="Search by truck or operator..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => {
                                setSelectedPlant(v);
                                updateTractorFilter('selectedPlant', v)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(v) => {
                                setStatusFilter(v);
                                updateTractorFilter('statusFilter', v)
                            }}
                            freightFilter={freightFilter}
                            freightOptions={['All Freight', 'Cement', 'Aggregate']}
                            onFreightFilterChange={(v) => {
                                setFreightFilter(v);
                                updateTractorFilter('freightFilter', v)
                            }}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('');
                                setSearchInput('');
                                setSelectedPlant('');
                                setStatusFilter('');
                                setFreightFilter('');
                                resetTractorFilters({keepViewMode: true, currentViewMode: viewMode})
                            }}
                            listLabels={['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']}
                            colWidths={['10%', '12%', '12%', '18%', '12%', '16%', '10%', '10%']}
                            forwardedRef={headerRef}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="global-content-container content-container">{content}</div>
                        {showAddSheet &&
                            <TractorAddView plants={plants} operators={operators} onClose={() => setShowAddSheet(false)}
                                            onTractorAdded={newTractor => setTractors([...tractors, newTractor])}/>}
                        {showCommentModal &&
                            <TractorCommentModal tractorId={modalTractorId} tractorNumber={modalTractorNumber}
                                                 onClose={() => setShowCommentModal(false)}/>}
                        {showIssueModal &&
                            <TractorIssueModal tractorId={modalTractorId} tractorNumber={modalTractorNumber}
                                               onClose={() => setShowIssueModal(false)}/>}
                        {showHistoryModal && selectedTractorForHistory && (
                            <HistoryViewSection
                                item={selectedTractorForHistory}
                                type="tractor"
                                onClose={() => setShowHistoryModal(false)}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default TractorsView;
