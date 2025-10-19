import React, {useEffect, useRef, useState} from 'react';
import './styles/Managers.css';
import {UserService} from '../../services/UserService';
import LoadingScreen from '../../components/common/LoadingScreen';
import ManagerDetailView from './ManagerDetailView';
import ManagerCard from './ManagerCard';
import {usePreferences} from '../../app/context/PreferencesContext';
import {RegionService} from '../../services/RegionService'
import TopSection from '../../components/sections/TopSection'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import {PlantService} from '../../services/PlantService'

function ManagersView({title = 'Managers', onSelectManager}) {
    const {preferences, updateManagerFilter, resetManagerFilters} = usePreferences()
    const [managers, setManagers] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState(preferences.managerFilters?.searchText || '')
    const [selectedPlant, setSelectedPlant] = useState(preferences.managerFilters?.selectedPlant || '')
    const [roleFilter, setRoleFilter] = useState(preferences.managerFilters?.roleFilter || '')
    const [showDetailView, setShowDetailView] = useState(false)
    const [selectedManager, setSelectedManager] = useState(null)
    const [, setCurrentUserId] = useState(null)
    const [availableRoles, setAvailableRoles] = useState([])
    const [viewMode, setViewMode] = useState(() => {
        if (preferences.managerFilters?.viewMode !== undefined && preferences.managerFilters?.viewMode !== null) return preferences.managerFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('managers_last_view_mode')
        return lastUsed || 'grid'
    })
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const sortMappings = {
        'Plant': 'plantCode',
        'Email': 'email',
        'First Name': 'firstName',
        'Last Name': 'lastName',
        'Role': 'roleName'
    }
    const headerRef = useRef(null)

    useEffect(() => {
        async function fetchCurrentUser() {
            const user = await UserService.getCurrentUser();
            if (user) setCurrentUserId(user.id);
        }

        fetchCurrentUser();
    }, []);
    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (preferences.managerFilters) {
            setSearchText(preferences.managerFilters.searchText || '')
            setSelectedPlant(preferences.managerFilters.selectedPlant || '')
            setRoleFilter(preferences.managerFilters.roleFilter || '')
            setViewMode(preferences.managerFilters.viewMode || preferences.defaultViewMode || 'grid')
        }
    }, [preferences.managerFilters, preferences.defaultViewMode])

    useEffect(() => {
        if (preferences.managerFilters?.viewMode !== undefined && preferences.managerFilters?.viewMode !== null) setViewMode(preferences.managerFilters.viewMode)
        else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) setViewMode(preferences.defaultViewMode)
        else {
            const lastUsed = localStorage.getItem('managers_last_view_mode');
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences.managerFilters?.viewMode, preferences.defaultViewMode])

    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false

        async function loadRegionPlants() {
            try {
                const codes = await RegionService.getAllowedPlantCodes(code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '').trim().toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('');
                    updateManagerFilter('selectedPlant', '')
                }
            } catch {
                setRegionPlantCodes(new Set())
            }
        }

        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null);
            updateManagerFilter('viewMode', null);
            localStorage.removeItem('managers_last_view_mode')
        } else {
            setViewMode(mode);
            updateManagerFilter('viewMode', mode);
            localStorage.setItem('managers_last_view_mode', mode)
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

    async function fetchAllData() {
        setIsLoading(true)
        try {
            await Promise.all([fetchManagers(), fetchPlants(), fetchRoles()])
        } catch {
        } finally {
            setIsLoading(false)
        }
    }

    async function fetchManagers() {
        try {
            const managersData = await UserService.getAllUsersWithProfilesAndRoles()
            setManagers(managersData)
            localStorage.setItem('cachedManagers', JSON.stringify(managersData))
            localStorage.setItem('cachedManagersDate', new Date().toISOString())
        } catch {
            const cachedData = localStorage.getItem('cachedManagers')
            const cacheDate = localStorage.getItem('cachedManagersDate')
            if (cachedData && cacheDate && new Date(cacheDate).getTime() > new Date().getTime() - 3600000) setManagers(JSON.parse(cachedData))
        }
    }

    async function fetchPlants() {
        try {
            const data = await PlantService.fetchPlants()
            setPlants(data)
        } catch {
        }
    }

    async function fetchRoles() {
        try {
            const data = await UserService.getAllRoles()
            setAvailableRoles(data)
        } catch {
            setAvailableRoles([])
        }
    }

    const filteredManagers = managers.filter(manager => {
        const matchesSearch = !searchText.trim() || `${manager.firstName} ${manager.lastName}`.toLowerCase().includes(searchText.toLowerCase()) || manager.email.toLowerCase().includes(searchText.toLowerCase())
        const matchesPlant = !selectedPlant || manager.plantCode === selectedPlant
        const matchesRole = !roleFilter || (manager.roleName && manager.roleName.toLowerCase() === roleFilter.toLowerCase())
        const regionType = preferences.selectedRegion?.type
        const matchesRegion = regionType === 'Office' || !regionPlantCodes || regionPlantCodes.size === 0 || regionPlantCodes.has(String(manager.plantCode || '').trim().toUpperCase())
        return matchesSearch && matchesPlant && matchesRole && matchesRegion
    }).sort((a, b) => {
        if (!sortKey) {
            return b.roleWeight - a.roleWeight || `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
        }
        const prop = sortMappings[sortKey]
        if (!prop) return 0;
        let aVal = a[prop]
        let bVal = b[prop]
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

    const getPlantName = plantCode => {
        const plant = plants.find(p => p.plantCode === plantCode);
        return plant ? plant.plantName : plantCode || 'No Plant'
    }
    const handleSelectManager = manager => {
        setSelectedManager(manager);
        onSelectManager ? onSelectManager(manager.id) : setShowDetailView(true)
    }

    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.dashboard-container.managers-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchText, selectedPlant, roleFilter])

    const statusOptions = ['All Roles', ...availableRoles.map(r => r.name)]
    const statusFilterValue = roleFilter ? roleFilter : 'All Roles'
    const showReset = (searchText || selectedPlant || roleFilter)

    const isOfficeRegion = preferences.selectedRegion?.type === 'Office'

    return (
        <div
            className={`global-dashboard-container dashboard-container global-flush-top flush-top managers-view${showDetailView && selectedManager ? ' detail-open' : ''}`}>
            {showDetailView && selectedManager ? (
                <ManagerDetailView managerId={selectedManager.id} onClose={() => {
                    setShowDetailView(false);
                    fetchManagers()
                }}/>
            ) : (
                <>
                    <TopSection
                        title={title}
                        addButtonLabel={null}
                        onAddClick={null}
                        searchInput={searchText}
                        onSearchInputChange={v => {
                            setSearchText(v);
                            updateManagerFilter('searchText', v)
                        }}
                        onClearSearch={() => {
                            setSearchText('');
                            updateManagerFilter('searchText', '')
                        }}
                        searchPlaceholder="Search by name or email..."
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        plants={plants.map(p => ({plantCode: p.plantCode, plantName: p.plantName}))}
                        regionPlantCodes={regionPlantCodes}
                        isOfficeRegion={isOfficeRegion}
                        selectedPlant={selectedPlant}
                        onSelectedPlantChange={v => {
                            setSelectedPlant(v);
                            updateManagerFilter('selectedPlant', v)
                        }}
                        statusFilter={statusFilterValue}
                        statusOptions={statusOptions}
                        onStatusFilterChange={v => {
                            const val = v === 'All Roles' ? '' : v;
                            setRoleFilter(val);
                            updateManagerFilter('roleFilter', val)
                        }}
                        showReset={showReset}
                        onReset={() => {
                            const currentViewMode = viewMode;
                            setSearchText('');
                            setSelectedPlant('');
                            setRoleFilter('');
                            resetManagerFilters?.({keepViewMode: true, currentViewMode})
                        }}
                        listLabels={['Plant', 'Email', 'First Name', 'Last Name', 'Role']}
                        colWidths={['12%', '28%', '18%', '18%', '24%']}
                        forwardedRef={headerRef}
                        sticky={true}
                        onHeaderClick={handleHeaderClick}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                    />
                    <div className="global-content-container content-container">
                        {isLoading ? (
                            <div className="global-loading-container loading-container"><LoadingScreen
                                message="Loading managers..." inline={true}/></div>
                        ) : filteredManagers.length === 0 ? (
                            <div className="global-no-results-container no-results-container">
                                <div className="no-results-icon"><i className="fas fa-user-tie"></i></div>
                                <h3>No Managers Found</h3>
                                <p>{searchText || selectedPlant || roleFilter ? "No managers match your search criteria." : "There are no managers in the system yet."}</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <GridViewModeSection
                                filteredItems={filteredManagers}
                                handleSelectItem={handleSelectManager}
                                cardComponent={ManagerCard}
                                itemPropName="manager"
                                gridClassName="grid"
                                getCardProps={(manager) => ({
                                    plantName: getPlantName(manager.plantCode)
                                })}
                            />
                        ) : (
                            <ListViewModeSection
                                filteredItems={filteredManagers}
                                handleSelectItem={handleSelectManager}
                                headerLabels={['Plant', 'Email', 'First Name', 'Last Name', 'Role']}
                                colWidths={['12%', '28%', '18%', '18%', '24%']}
                                renderRow={(manager, handleSelect) => (
                                    <tr key={manager.id} onClick={() => handleSelect(manager)}
                                        style={{cursor: 'pointer'}}>
                                        <td style={{width: '12%'}}>{manager.plantCode ? manager.plantCode : '---'}</td>
                                        <td style={{width: '28%'}}>{manager.email ? manager.email : '---'}</td>
                                        <td style={{width: '18%'}}>{manager.firstName ? manager.firstName : '---'}</td>
                                        <td style={{width: '18%'}}>{manager.lastName ? manager.lastName : '---'}</td>
                                        <td style={{width: '24%'}}>{manager.roleName ? manager.roleName : '---'}</td>
                                    </tr>
                                )}
                                containerClassName="list-table-container"
                                tableClassName="list-table"
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default ManagersView
