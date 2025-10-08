import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import PropTypes from 'prop-types';
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
import {UserService} from '../../../services/UserService'
import AsyncUtility from '../../../utils/AsyncUtility'
import LookupUtility from '../../../utils/LookupUtility'
import FleetUtility from '../../../utils/FleetUtility'
import TopSection from '../../sections/TopSection'
import ListViewModeSection from '../../sections/ListViewModeSection'
import GridViewModeSection from '../../sections/GridViewModeSection'

function TractorsView({title = 'Tractor Fleet', onSelectTractor}) {
    const {preferences, updateTractorFilter, resetTractorFilters, saveLastViewedFilters} = usePreferences();
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
    const filterOptions = ['All Statuses', 'Active', 'Spare', 'In Shop', 'Retired', 'Past Due Service', 'Verified', 'Not Verified', 'Open Issues']

    const unassignedActiveOperatorsCount = useMemo(() => FleetUtility.countUnassignedActiveOperators(tractors, operators, searchText, {
        position: 'Tractor Operator',
        selectedPlant,
        operatorIdField: 'employeeId',
        assignedOperatorField: 'assignedOperator',
        assignedPlantField: 'assignedPlant'
    }), [operators, tractors, selectedPlant, searchText])

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true)
            try {
                await Promise.all([fetchTractors(), fetchOperators(), fetchPlants()])
            } catch (error) {
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()
        if (preferences?.tractorFilters) {
            setSearchText(preferences.tractorFilters.searchText || '')
            setSearchInput(preferences.tractorFilters.searchText || '')
            setSelectedPlant(preferences.tractorFilters.selectedPlant || '')
            setStatusFilter(preferences.tractorFilters.statusFilter || '')
            setViewMode(preferences.tractorFilters.viewMode !== undefined && preferences.tractorFilters.viewMode !== null ? preferences.tractorFilters.viewMode : preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null ? preferences.defaultViewMode : localStorage.getItem('tractors_last_view_mode') || 'grid')
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
            let regionCode = preferences.selectedRegion?.code || ''
            try {
                if (!regionCode) {
                    const user = await UserService.getCurrentUser()
                    const uid = user?.id || ''
                    if (uid) {
                        const profilePlant = await UserService.getUserPlant(uid)
                        const plantCode = typeof profilePlant === 'string' ? profilePlant : (profilePlant?.plant_code || profilePlant?.plantCode || '')
                        if (plantCode) {
                            const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? (r.regionCode || r.region_code || '') : ''
                        }
                    }
                }
                if (!regionCode) {
                    setRegionPlantCodes(null)
                    setIsRegionLoading(false)
                    return
                }
                const regionPlants = await RegionService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(regionPlants.map(p => String(p.plantCode || p.plant_code || '').trim().toUpperCase()).filter(Boolean))
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '').trim().toUpperCase()
                if (sel && !codes.has(sel)) {
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

    async function fetchTractors() {
        try {
            const data = await TractorService.fetchTractors();
            const processedData = data.map(tractor => {
                const t = {...tractor}
                t.vin = (t.vin || '').toUpperCase()
                t.isVerified = () => TractorUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy, t.latestHistoryDate)
                if (typeof t.openIssuesCount !== 'number') t.openIssuesCount = 0
                if (typeof t.commentsCount !== 'number') t.commentsCount = 0
                return t
            })
            setTractors(processedData)
            setTractorsLoaded(true)
            setTimeout(() => {
                fixActiveTractorsWithoutOperator(processedData).catch(() => {
                })
            }, 0)
            ;(async () => {
                const items = processedData.slice()
                let index = 0
                const concurrency = 6

                async function worker() {
                    while (index < items.length) {
                        const current = index++
                        const tr = items[current]
                        try {
                            const [comments, issues] = await Promise.all([
                                TractorService.fetchComments(tr.id).catch(() => []),
                                TractorService.fetchIssues(tr.id).catch(() => [])
                            ])
                            const openIssuesCount = Array.isArray(issues) ? issues.filter(i => !i.time_completed).length : 0
                            const commentsCount = Array.isArray(comments) ? comments.length : 0
                            setTractors(prev => {
                                const arr = prev.slice()
                                const idx = arr.findIndex(x => x.id === tr.id)
                                if (idx >= 0) arr[idx] = {...arr[idx], comments, issues, openIssuesCount, commentsCount}
                                return arr
                            })
                        } catch (e) {
                        }
                    }
                }

                await Promise.all(Array.from({length: concurrency}, () => worker()))
            })()
        } catch (error) {
        }
    }

    async function fixActiveTractorsWithoutOperator(list) {
        const updates = list.filter(t => t.status === 'Active' && (!t.assignedOperator || t.assignedOperator === '0' || t.assignedOperator === '' || t.assignedOperator === null))
        for (const tractor of updates) {
            try {
                await TractorService.updateTractor(tractor.id, {...tractor, status: 'Spare'}, undefined, tractor)
                tractor.status = 'Spare'
            } catch (e) {
            }
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

    async function fetchPlants() {
        try {
            const data = await PlantService.fetchPlants();
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
        const matchesSearch = !searchText.trim() || tractor.truckNumber?.toLowerCase().includes(searchText.toLowerCase()) || (tractor.assignedOperator && operators.find(op => op.employeeId === tractor.assignedOperator)?.name.toLowerCase().includes(searchText.toLowerCase()))
        const matchesPlant = !selectedPlant || tractor.assignedPlant === selectedPlant
        const matchesRegion = !regionPlantCodes || regionPlantCodes.size === 0 || regionPlantCodes.has(String(tractor.assignedPlant || '').trim().toUpperCase())
        let matchesStatus = true
        if (statusFilter && statusFilter !== 'All Statuses') {
            matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter) ? tractor.status === statusFilter : statusFilter === 'Past Due Service' ? TractorUtility.isServiceOverdue(tractor.lastServiceDate) : statusFilter === 'Verified' ? tractor.isVerified() : statusFilter === 'Not Verified' ? !tractor.isVerified() : statusFilter === 'Open Issues' ? (Number(tractor.openIssuesCount || 0) > 0) : false
        }
        return matchesSearch && matchesPlant && matchesRegion && matchesStatus
    }).sort((a, b) => FleetUtility.compareByStatusThenNumber(a, b, 'status', 'truckNumber')), [tractors, operators, selectedPlant, searchText, statusFilter, regionPlantCodes])

    const debouncedSetSearchText = useCallback(AsyncUtility.debounce(value => {
        setSearchText(value);
        updateTractorFilter('searchText', value)
    }, 300), [updateTractorFilter])

    const canShowUnassignedOverlay = tractorsLoaded && operatorsLoaded && !isLoading && unassignedActiveOperatorsCount > 0
    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses'))

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
    }, [viewMode, searchInput, selectedPlant, statusFilter])

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
                    <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') ? "No tractors match your search criteria." : "There are no tractors in the system yet."}</p>
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
                    onShowCommentModal={(id, number) => { setModalTractorId(id); setModalTractorNumber(number); setShowCommentModal(true); }}
                    onShowIssueModal={(id, number) => { setModalTractorId(id); setModalTractorNumber(number); setShowIssueModal(true); }}
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
                headerLabels={['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']}
                colWidths={['10%', '12%', '12%', '18%', '12%', '18%', '10%', '8%']}
                renderRow={(item, handleSelect, onComment, onIssue) => {
                    const operator = operators.find(op => op.employeeId === item.assignedOperator);
                    const plant = plants.find(p => p.code === item.assignedPlant);
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td>{plant?.name || item.assignedPlant}</td>
                            <td>{item.truckNumber}</td>
                            <td><span className="item-status-dot" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', backgroundColor: item.status === 'Active' ? 'var(--status-active)' : item.status === 'Spare' ? 'var(--status-spare)' : item.status === 'In Shop' ? 'var(--status-inshop)' : item.status === 'Retired' ? 'var(--status-retired)' : 'var(--accent)'}}></span>{item.status}</td>
                            <td>{operator?.name || 'Not Assigned'}</td>
                            <td>{(() => {
                                const rating = Math.round(item.cleanlinessRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star" style={{color: 'var(--accent)'}}></i>)
                            })()}</td>
                            <td>{item.vinNumber || item.vin}</td>
                            <td>{item.isVerified() ? 'Yes' : 'No'}</td>
                            <td>
                                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                                    <button type="button" onClick={e => { e.stopPropagation(); onComment(item.id, item.truckNumber); }} style={{background: 'transparent', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}} title="View comments"><i className="fas fa-comments" style={{color: 'var(--accent)', marginRight: 4}}></i><span>{item.commentsCount || 0}</span></button>
                                    <button type="button" onClick={e => { e.stopPropagation(); onIssue(item.id, item.truckNumber); }} style={{background: 'transparent', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}} title="View issues"><i className="fas fa-tools" style={{color: 'var(--accent)', marginRight: 4}}></i><span>{item.openIssuesCount || 0}</span></button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
                onShowCommentModal={(id, number) => { setModalTractorId(id); setModalTractorNumber(number); setShowCommentModal(true); }}
                onShowIssueModal={(id, number) => { setModalTractorId(id); setModalTractorNumber(number); setShowIssueModal(true); }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, isRegionLoading, filteredTractors, viewMode, searchText, selectedPlant, statusFilter, operators, plants, tractors])

    return (
        <div
            className={`global-dashboard-container dashboard-container global-flush-top flush-top tractors-view${selectedTractor ? ' detail-open' : ''}`}>
            {selectedTractor ? (
                <TractorDetailView tractorId={selectedTractor} onClose={() => setSelectedTractor(null)}/>
            ) : (
                <>
                    {canShowUnassignedOverlay && (
                        <div className="global-availability-overlay operators-availability-overlay">
                            {unassignedActiveOperatorsCount} active
                            operator{unassignedActiveOperatorsCount !== 1 ? 's' : ''} unassigned
                        </div>
                    )}
                    <TopSection
                        title={title}
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
                        showReset={showReset}
                        onReset={() => {
                            setSearchText('');
                            setSearchInput('');
                            setSelectedPlant('');
                            setStatusFilter('');
                            resetTractorFilters();
                            setViewMode(viewMode)
                        }}
                        forwardedRef={headerRef}
                    />
                    <div className="global-content-container global-view content-container">{content}</div>
                    {showAddSheet &&
                        <TractorAddView plants={plants} operators={operators} onClose={() => setShowAddSheet(false)}
                                        onTractorAdded={newTractor => setTractors([...tractors, newTractor])}/>}
                    {showCommentModal && <TractorCommentModal tractorId={modalTractorId} tractorNumber={modalTractorNumber}
                                                            onClose={() => setShowCommentModal(false)}/>}
                    {showIssueModal && <TractorIssueModal tractorId={modalTractorId} tractorNumber={modalTractorNumber}
                                                        onClose={() => setShowIssueModal(false)}/>}
                </>
            )}
        </div>
    )
}

TractorsView.propTypes = {
    title: PropTypes.string,
    onSelectTractor: PropTypes.func
}

export default TractorsView;
