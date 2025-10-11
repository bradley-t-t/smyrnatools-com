import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePreferences} from '../../../app/context/PreferencesContext';
import LoadingScreen from '../../common/LoadingScreen';
import TrailerCard from './TrailerCard';
import '../../../styles/FilterStyles.css';
import './styles/Trailers.css';
import {TrailerService} from '../../../services/TrailerService';
import {TrailerUtility} from '../../../utils/TrailerUtility';
import {PlantService} from '../../../services/PlantService';
import {TractorService} from '../../../services/TractorService';
import TrailerAddView from './TrailerAddView';
import TrailerDetailView from './TrailerDetailView';
import TrailerIssueModal from './TrailerIssueModal'
import TrailerCommentModal from './TrailerCommentModal'
import {RegionService} from '../../../services/RegionService'
import AsyncUtility from '../../../utils/AsyncUtility'
import LookupUtility from '../../../utils/LookupUtility'
import FleetUtility from '../../../utils/FleetUtility'
import TopSection from '../../sections/TopSection'
import GridViewModeSection from '../../sections/GridViewModeSection'
import ListViewModeSection from '../../sections/ListViewModeSection'
import ThemeUtility from '../../../utils/ThemeUtility'

function TrailersView({title = 'Trailer Fleet', onSelectTrailer}) {
    const {preferences, saveLastViewedFilters, updateTrailerFilter, updatePreferences} = usePreferences()
    const [trailers, setTrailers] = useState([])
    const [tractors, setTractors] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState(preferences.trailerFilters?.searchText || '')
    const [searchInput, setSearchInput] = useState(preferences.trailerFilters?.searchText || '')
    const [selectedPlant, setSelectedPlant] = useState(preferences.trailerFilters?.selectedPlant || '')
    const [typeFilter, setTypeFilter] = useState(preferences.trailerFilters?.typeFilter || '')
    const [viewMode, setViewMode] = useState(() => {
        if (preferences.trailerFilters?.viewMode !== undefined && preferences.trailerFilters?.viewMode !== null) return preferences.trailerFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('trailers_last_view_mode')
        return lastUsed || 'grid'
    })
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedTrailer, setSelectedTrailer] = useState(null)
    const [reloadTrailers, setReloadTrailers] = useState(false)
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalTrailerId, setModalTrailerId] = useState(null)
    const [modalTrailerNumber, setModalTrailerNumber] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const filterOptions = ['All Types', 'Cement', 'End Dump', 'Past Due Service', 'Verified', 'Not Verified', 'Open Issues']
    const headerRef = useRef(null)

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true);
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                await Promise.all([fetchTrailers(codes), fetchTractors(), fetchPlants(codes)]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAllData();
        if (preferences?.trailerFilters) {
            setSearchText(preferences.trailerFilters.searchText || '');
            setSearchInput(preferences.trailerFilters.searchText || '');
            setSelectedPlant(preferences.trailerFilters.selectedPlant || '');
            setTypeFilter(preferences.trailerFilters.typeFilter || '');
        }
        if (preferences.trailerFilters?.viewMode !== undefined && preferences.trailerFilters?.viewMode !== null) {
            setViewMode(preferences.trailerFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('trailers_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences, reloadTrailers])

    useEffect(() => {
        if (preferences.trailerFilters?.viewMode !== undefined && preferences.trailerFilters?.viewMode !== null) {
            setViewMode(preferences.trailerFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('trailers_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences.trailerFilters?.viewMode, preferences.defaultViewMode])

    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false

        async function loadRegionPlants() {
            if (!code) {
                setRegionPlantCodes(null)
                return
            }
            try {
                const codes = await RegionService.getAllowedPlantCodes(code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                if (selectedPlant && codes && !codes.has(selectedPlant)) {
                    setSelectedPlant('')
                    updatePreferences('trailerFilters', {...preferences.trailerFilters, selectedPlant: ''})
                }
            } catch {
                setRegionPlantCodes(null)
            }
        }

        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.trailers-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchInput, selectedPlant, typeFilter])

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateTrailerFilter('viewMode', null)
            localStorage.removeItem('trailers_last_view_mode')
        } else {
            setViewMode(mode)
            updateTrailerFilter('viewMode', mode)
            localStorage.setItem('trailers_last_view_mode', mode)
        }
    }

    async function fetchTrailers(codes) {
        try {
            const processedBase = await TrailerService.fetchTrailersWithDetails(codes)
            setTrailers(processedBase)
            loadDetailsForTrailers(processedBase)
        } catch {
        }
    }

    async function fetchTractors() {
        try {
            const data = await TractorService.fetchTractors();
            setTractors(Array.isArray(data) ? data : []);
        } catch {
            setTractors([])
        }
    }

    async function fetchPlants(codes) {
        try {
            const data = await PlantService.fetchPlants(codes);
            setPlants(data);
        } catch {
        }
    }

    function handleSelectTrailer(trailerId) {
        saveLastViewedFilters();
        const trailerObj = trailers.find(t => t.id === trailerId);
        setSelectedTrailer(trailerObj);
        if (onSelectTrailer) onSelectTrailer(trailerId);
    }

    function handleBackFromDetail() {
        setSelectedTrailer(null)
        setReloadTrailers(r => !r)
    }

    const debouncedSetSearchText = useCallback(AsyncUtility.debounce(value => {
        setSearchText(value)
        updatePreferences(prev => ({...prev, trailerFilters: {...prev.trailerFilters, searchText: value}}))
    }, 300), [updatePreferences])

    const filteredTrailers = useMemo(() => trailers.filter(trailer => {
        const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
        const trailerMatch = (trailer.trailerNumber || '').toLowerCase().includes(normalizedSearch)
        const tractorMatch = trailer.assignedTractor && tractors.find(t => t.id === trailer.assignedTractor)?.truckNumber.toLowerCase().includes(normalizedSearch)
        const vinRaw = (trailer.vinNumber || trailer.vin || '').toLowerCase()
        const vinNoSpaces = vinRaw.replace(/\s+/g, '')
        const vinMatch = vinRaw.includes(searchText.trim().toLowerCase()) || vinNoSpaces.includes(normalizedSearch)
        const matchesSearch = !normalizedSearch || trailerMatch || tractorMatch || vinMatch
        const matchesPlant = !selectedPlant || trailer.assignedPlant === selectedPlant
        const matchesRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.size === 0 || regionPlantCodes.has(trailer.assignedPlant)
        let matchesType = true
        if (typeFilter && typeFilter !== 'All Types') {
            matchesType = ['Cement', 'End Dump'].includes(typeFilter) ? trailer.trailerType === typeFilter : typeFilter === 'Past Due Service' ? TrailerUtility.isServiceOverdue(trailer.lastServiceDate) : typeFilter === 'Verified' ? trailer.isVerified() : typeFilter === 'Not Verified' ? !trailer.isVerified() : typeFilter === 'Open Issues' ? (Number(trailer.openIssuesCount || 0) > 0) : false
        }
        return matchesSearch && matchesPlant && matchesRegion && matchesType
    }).sort((a, b) => FleetUtility.compareByStatusThenNumber(a, b, 'status', 'trailerNumber')), [trailers, tractors, selectedPlant, searchText, typeFilter, preferences.selectedRegion?.code, regionPlantCodes])

    const content = useMemo(() => {
        if (isLoading) return <div className="global-loading-container loading-container"><LoadingScreen
            message="Loading trailers..." inline={true}/></div>
        if (filteredTrailers.length === 0) return <div className="global-no-results-container no-results-container">
            <div className="no-results-icon"><i className="fas fa-trailer"></i></div>
            <h3>No Trailers Found</h3>
            <p>{searchText || selectedPlant || (typeFilter && typeFilter !== 'All Types') ? "No trailers match your search criteria." : "There are no trailers in the system yet."}</p>
            <button className="global-primary-button primary-button" onClick={() => setShowAddSheet(true)}>Add Trailer
            </button>
        </div>
        if (viewMode === 'grid') return (
            <GridViewModeSection
                filteredItems={filteredTrailers}
                getCardProps={(trailer) => ({
                    tractorName: LookupUtility.getTractorTruckNumber(tractors, trailer.assignedTractor),
                    plantName: LookupUtility.getPlantName(plants, trailer.assignedPlant),
                    showTractorWarning: LookupUtility.isIdAssignedToMultiple(trailers, 'assignedTractor', trailer.assignedTractor)
                })}
                handleSelectItem={handleSelectTrailer}
                cardComponent={TrailerCard}
                itemPropName="trailer"
                onShowCommentModal={(id, number) => {
                    setModalTrailerId(id);
                    setModalTrailerNumber(number);
                    setShowCommentModal(true);
                }}
                onShowIssueModal={(id, number) => {
                    setModalTrailerId(id);
                    setModalTrailerNumber(number);
                    setShowIssueModal(true);
                }}
                gridClassName="grid"
            />
        )
        return (
            <ListViewModeSection
                filteredItems={filteredTrailers}
                handleSelectItem={handleSelectTrailer}
                headerLabels={['Plant', 'Trailer #', 'Status', 'Type', 'Cleanliness', 'Tractor', 'VIN', 'More']}
                colWidths={['12%', '14%', '12%', '12%', '14%', '18%', '14%', '8%']}
                renderRow={(item, handleSelect, onComment, onIssue) => {
                    const commentsCount = Number(item.commentsCount || 0);
                    const issuesCount = Number(item.openIssuesCount || 0);
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td style={{width: '12%'}}>{item.assignedPlant ? item.assignedPlant : "---"}</td>
                            <td style={{width: '14%'}}>{item.trailerNumber ? item.trailerNumber : "---"}</td>
                            <td style={{width: '12%'}}><span className="item-status-dot" style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                marginRight: '8px',
                                backgroundColor: item.status === 'Active' ? 'var(--status-active)' : item.status === 'Spare' ? 'var(--status-spare)' : item.status === 'In Shop' ? 'var(--status-inshop)' : item.status === 'Retired' ? 'var(--status-retired)' : 'var(--accent)'
                            }}></span>{item.status ? item.status : "---"}</td>
                            <td style={{width: '12%'}}>{item.trailerType ? item.trailerType : "---"}</td>
                            <td style={{width: '14%'}}>{(() => {
                                const rating = Math.round(item.cleanlinessRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star"
                                                                                    style={{color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))}}></i>)
                            })()}</td>
                            <td style={{width: '18%'}}>{LookupUtility.getTractorTruckNumber(tractors, item.assignedTractor) ? LookupUtility.getTractorTruckNumber(tractors, item.assignedTractor) : "---"}{LookupUtility.isIdAssignedToMultiple(trailers, 'assignedTractor', item.assignedTractor) &&
                                <span className="warning-badge"><i
                                    className="fas fa-exclamation-triangle"></i></span>}</td>
                            <td style={{width: '14%'}}>{item.vinNumber || item.vin || "---"}</td>
                            <td style={{width: '8%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onComment(item.id, item.trailerNumber);
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
                                    }}></i><span>{commentsCount}</span></button>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onIssue(item.id, item.trailerNumber);
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
                                    }}></i><span>{issuesCount}</span></button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
                onShowCommentModal={(id, number) => {
                    setModalTrailerId(id);
                    setModalTrailerNumber(number);
                    setShowCommentModal(true);
                }}
                onShowIssueModal={(id, number) => {
                    setModalTrailerId(id);
                    setModalTrailerNumber(number);
                    setShowIssueModal(true);
                }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, filteredTrailers, viewMode, searchText, selectedPlant, typeFilter, tractors, plants, trailers])

    useEffect(() => {
        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true);
                try {
                    const vinTrailers = await TrailerService.searchTrailersByVinProcessed(normalizedSearch);
                    const filteredVinTrailers = regionPlantCodes ? vinTrailers.filter(t => regionPlantCodes.has(String(t.assignedPlant || '').trim().toUpperCase())) : vinTrailers
                    setTrailers(filteredVinTrailers);
                } catch {
                }
                setIsLoading(false);
            } else {
                setTrailers(trailers);
            }
        }

        if (searchText.trim().length >= 1) {
            searchByVin();
        } else {
            setTrailers(trailers);
        }
    }, [searchText, trailers, regionPlantCodes]);

    const loadDetailsForTrailers = async (trailers) => {
        const items = trailers.slice()
        let index = 0
        const concurrency = 20

        async function worker() {
            while (index < items.length) {
                const current = index++
                const t = items[current]
                try {
                    const [comments, issues] = await Promise.all([
                        TrailerService.fetchComments(t.id).catch(() => []),
                        TrailerService.fetchIssues(t.id).catch(() => [])
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
        setTrailers([...trailers])
    }

    const showReset = (searchText || selectedPlant || (typeFilter && typeFilter !== 'All Types'))

    return (
        <div className="global-dashboard-container dashboard-container global-flush-top flush-top trailers-view">
            {selectedTrailer ? (
                <TrailerDetailView trailer={selectedTrailer} onClose={handleBackFromDetail}/>
            ) : (
                <>
                    <TopSection
                        title={title}
                        addButtonLabel="Add Trailer"
                        onAddClick={() => setShowAddSheet(true)}
                        searchInput={searchInput}
                        onSearchInputChange={v => {
                            setSearchInput(v);
                            debouncedSetSearchText(v)
                        }}
                        onClearSearch={() => {
                            setSearchInput('');
                            debouncedSetSearchText('')
                        }}
                        searchPlaceholder="Search by trailer or tractor..."
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        plants={plants}
                        regionPlantCodes={regionPlantCodes}
                        selectedPlant={selectedPlant}
                        onSelectedPlantChange={v => {
                            setSelectedPlant(v);
                            updatePreferences('trailerFilters', {...preferences.trailerFilters, selectedPlant: v})
                        }}
                        statusFilter={typeFilter}
                        statusOptions={filterOptions}
                        onStatusFilterChange={v => {
                            setTypeFilter(v);
                            updatePreferences('trailerFilters', {...preferences.trailerFilters, typeFilter: v})
                        }}
                        showReset={showReset}
                        onReset={() => {
                            setSearchText('');
                            setSearchInput('');
                            setSelectedPlant('');
                            setTypeFilter('');
                            updatePreferences('trailerFilters', {
                                ...preferences.trailerFilters,
                                searchText: '',
                                selectedPlant: '',
                                typeFilter: ''
                            })
                        }}
                        listLabels={['Plant', 'Trailer #', 'Status', 'Type', 'Cleanliness', 'Tractor', 'VIN', 'More']}
                        colWidths={['12%', '14%', '12%', '12%', '14%', '18%', '14%', '8%']}
                        forwardedRef={headerRef}
                    />
                    <div className="global-content-container content-container">{content}</div>
                    {showAddSheet && <TrailerAddView plants={plants} onClose={() => setShowAddSheet(false)}
                                                     onTrailerAdded={newTrailer => setTrailers([...trailers, newTrailer])}/>}
                    {showCommentModal &&
                        <TrailerCommentModal trailerId={modalTrailerId} trailerNumber={modalTrailerNumber}
                                             onClose={() => setShowCommentModal(false)}/>}
                    {showIssueModal && <TrailerIssueModal trailerId={modalTrailerId} trailerNumber={modalTrailerNumber}
                                                          onClose={() => setShowIssueModal(false)}/>}
                </>
            )}
        </div>
    )
}

export default TrailersView
