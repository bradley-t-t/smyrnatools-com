/* eslint-disable react/forbid-dom-props */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import Badge from '../../../app/components/common/Badge'
import TabFadeIn from '../../../app/components/common/TabFadeIn'
import PersonViewTabBar from '../../../app/components/people/PersonViewTabBar'
import PersonStatisticsView from '../../../app/components/people/statistics/PersonStatisticsView'
import GridViewModeSection from '../../../app/components/sections/GridViewModeSection'
import ListViewModeSection from '../../../app/components/sections/ListViewModeSection'
import TopSection from '../../../app/components/sections/TopSection'
import AssetListSkeleton from '../../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import { getRoleColor } from '../../../utils/RoleColorUtility'
import ManagerCard from './ManagerCard'
import ManagerDetailView from './ManagerDetailView'

/**
 * List/grid view for all managers (users with profiles and roles).
 * Supports region-scoped plant filtering, role filtering, name/email
 * search, sortable columns, and drill-down into ManagerDetailView.
 * Falls back to a 1-hour localStorage cache if the API fetch fails.
 *
 * @param {string} [title] - Page heading (defaults to "Managers").
 * @param {Function} [onSelectManager] - Optional external callback; if omitted, opens inline detail view.
 */
function ManagersView({ title = 'Managers', onSelectManager }) {
    const { preferences, updateManagerFilter, resetManagerFilters } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    /** Always open the list — tab choice is per-session so navigating away
     *  and back doesn't strand the user on a statistics tab they no longer
     *  want. */
    const [activeTab, setActiveTab] = useState('list')
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
        if (preferences.managerFilters?.viewMode !== undefined && preferences.managerFilters?.viewMode !== null)
            return preferences.managerFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('managers_last_view_mode')
        return lastUsed || 'grid'
    })
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const sortMappings = {
        Email: 'email',
        'First Name': 'firstName',
        'Last Login': 'lastLoginAt',
        'Last Name': 'lastName',
        Plant: 'plantCode',
        Role: 'roleName'
    }
    const headerRef = useRef(null)
    useEffect(() => {
        async function fetchCurrentUser() {
            const user = await UserService.getCurrentUser()
            if (user) setCurrentUserId(user.id)
        }
        fetchCurrentUser()
    }, [])
    const fetchAllData = useCallback(async function fetchAllData() {
        setIsLoading(true)
        try {
            await Promise.all([fetchManagers(), fetchPlants(), fetchRoles()])
        } catch (e) {
            console.error('Failed to fetch managers data:', e)
        } finally {
            setIsLoading(false)
        }
    }, [])
    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])
    useEffect(() => {
        if (preferences.managerFilters) {
            setSearchText(preferences.managerFilters.searchText || '')
            setSelectedPlant(preferences.managerFilters.selectedPlant || '')
            setRoleFilter(preferences.managerFilters.roleFilter || '')
            setViewMode(preferences.managerFilters.viewMode || preferences.defaultViewMode || 'grid')
        }
    }, [preferences.managerFilters, preferences.defaultViewMode])
    useEffect(() => {
        if (preferences.managerFilters?.viewMode !== undefined && preferences.managerFilters?.viewMode !== null)
            setViewMode(preferences.managerFilters.viewMode)
        else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            setViewMode(preferences.defaultViewMode)
        else {
            const lastUsed = localStorage.getItem('managers_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences.managerFilters?.viewMode, preferences.defaultViewMode])
    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false
        async function loadRegionPlants() {
            try {
                const codes = await PlantService.getAllowedPlantCodes(code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '')
                    .trim()
                    .toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('')
                    updateManagerFilter('selectedPlant', '')
                }
            } catch (e) {
                console.error('Failed to load region plant codes:', e)
                setRegionPlantCodes(new Set())
            }
        }
        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, selectedPlant, updateManagerFilter])
    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateManagerFilter('viewMode', null)
            localStorage.removeItem('managers_last_view_mode')
        } else {
            setViewMode(mode)
            updateManagerFilter('viewMode', mode)
            localStorage.setItem('managers_last_view_mode', mode)
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
    /** Fetches all users with profiles/roles; falls back to a 1-hour localStorage cache on failure. */
    async function fetchManagers() {
        try {
            const managersData = await UserService.getAllUsersWithProfilesAndRoles()
            setManagers(managersData)
            localStorage.setItem('cachedManagers', JSON.stringify(managersData))
            localStorage.setItem('cachedManagersDate', new Date().toISOString())
        } catch (e) {
            console.error('Failed to fetch managers, falling back to cache:', e)
            const cachedData = localStorage.getItem('cachedManagers')
            const cacheDate = localStorage.getItem('cachedManagersDate')
            if (cachedData && cacheDate && new Date(cacheDate).getTime() > new Date().getTime() - 3600000)
                setManagers(JSON.parse(cachedData))
        }
    }
    async function fetchPlants() {
        try {
            const data = await PlantService.fetchPlants()
            setPlants(data)
        } catch (e) {
            console.error('Failed to fetch plants for managers view:', e)
        }
    }
    async function fetchRoles() {
        try {
            const data = await UserService.getAllRoles()
            setAvailableRoles(data)
        } catch (e) {
            console.error('Failed to fetch roles:', e)
            setAvailableRoles([])
        }
    }
    // Default sort: highest role weight first, then alphabetically by last/first name.
    const filteredManagers = managers
        .filter((manager) => {
            const matchesSearch =
                !searchText.trim() ||
                `${manager.firstName} ${manager.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
                manager.email.toLowerCase().includes(searchText.toLowerCase())
            const matchesPlant = !selectedPlant || selectedPlant === 'All' || manager.plantCode === selectedPlant
            const matchesRole =
                !roleFilter || (manager.roleName && manager.roleName.toLowerCase() === roleFilter.toLowerCase())
            const regionType = preferences.selectedRegion?.type
            const matchesRegion =
                regionType === 'Office' ||
                !regionPlantCodes ||
                regionPlantCodes.size === 0 ||
                regionPlantCodes.has(
                    String(manager.plantCode || '')
                        .trim()
                        .toUpperCase()
                )
            return matchesSearch && matchesPlant && matchesRole && matchesRegion
        })
        .sort((a, b) => {
            if (!sortKey) {
                return (
                    b.roleWeight - a.roleWeight ||
                    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
                )
            }
            const prop = sortMappings[sortKey]
            if (!prop) return 0
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
    const getPlantName = (plantCode) => {
        const plant = plants.find((p) => p.plantCode === plantCode)
        return plant ? plant.plantName : plantCode || 'No Plant'
    }
    const handleSelectManager = (manager) => {
        setSelectedManager(manager)
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
    const statusOptions = ['All Roles', ...availableRoles.map((r) => r.name)]
    const statusFilterValue = roleFilter ? roleFilter : 'All Roles'
    const showReset = searchText || selectedPlant || roleFilter
    const isOfficeRegion = preferences.selectedRegion?.type === 'Office'

    const renderTabHeader = () => (
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 sm:px-4 md:px-6 pt-3 pb-2 border-b border-border-light bg-bg-primary">
            <div className="flex items-center gap-3">
                <i className="fas fa-user-tie text-[14px]" style={{ color: accentColor }} />
                <span className="text-[14px] font-bold text-text-primary">{title}</span>
            </div>
            <PersonViewTabBar accentColor={accentColor} activeTab={activeTab} onChange={setActiveTab} />
        </div>
    )

    if (activeTab === 'statistics') {
        return (
            <div className="flex flex-col h-full managers-view">
                {renderTabHeader()}
                <TabFadeIn animationKey="managers-statistics" className="flex-1 min-h-0 flex flex-col">
                    <PersonStatisticsView kind="managers" title={title} />
                </TabFadeIn>
            </div>
        )
    }

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top managers-view animate-fade-in-fast${showDetailView && selectedManager ? ' detail-open' : ''}`}
            >
                {renderTabHeader()}
                {showDetailView && selectedManager ? (
                    <ManagerDetailView
                        managerId={selectedManager.id}
                        onClose={() => {
                            setShowDetailView(false)
                            fetchManagers()
                        }}
                    />
                ) : (
                    <>
                        <TopSection
                            isLoading={isLoading}
                            title={title}
                            addButtonLabel={null}
                            onAddClick={null}
                            searchInput={searchText}
                            onSearchInputChange={(v) => {
                                setSearchText(v)
                                updateManagerFilter('searchText', v)
                            }}
                            onClearSearch={() => {
                                setSearchText('')
                                updateManagerFilter('searchText', '')
                            }}
                            searchPlaceholder="Search by name or email..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants.map((p) => ({ plantCode: p.plantCode, plantName: p.plantName }))}
                            regionPlantCodes={regionPlantCodes}
                            isOfficeRegion={isOfficeRegion}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => {
                                setSelectedPlant(v)
                                updateManagerFilter('selectedPlant', v)
                            }}
                            statusFilter={statusFilterValue}
                            statusOptions={statusOptions}
                            onStatusFilterChange={(v) => {
                                const val = v === 'All Roles' ? '' : v
                                setRoleFilter(val)
                                updateManagerFilter('roleFilter', val)
                            }}
                            showReset={showReset}
                            onReset={() => {
                                const currentViewMode = viewMode
                                setSearchText('')
                                setSelectedPlant('')
                                setRoleFilter('')
                                resetManagerFilters?.({ currentViewMode, keepViewMode: true })
                            }}
                            listLabels={['Plant', 'Email', 'First Name', 'Last Name', 'Role', 'Last Login']}
                            colWidths={['10%', '23%', '14%', '14%', '17%', '22%']}
                            forwardedRef={headerRef}
                            sticky={true}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="w-full max-w-full overflow-x-hidden">
                            {isLoading ? (
                                <AssetListSkeleton viewMode={viewMode} columnCount={5} />
                            ) : filteredManagers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mb-6">
                                        <i className="fas fa-user-tie text-3xl text-text-tertiary"></i>
                                    </div>
                                    <h3 className="text-xl font-bold text-text-primary mb-2">No Managers Found</h3>
                                    <p className="text-text-secondary mb-6 max-w-md">
                                        {searchText || selectedPlant || roleFilter
                                            ? 'No managers match your search criteria.'
                                            : 'There are no managers in the system yet.'}
                                    </p>
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
                                    headerLabels={['Plant', 'Email', 'First Name', 'Last Name', 'Role', 'Last Login']}
                                    colWidths={['10%', '23%', '14%', '14%', '17%', '22%']}
                                    renderRow={(manager, handleSelect) => {
                                        const cellCls =
                                            'text-text-primary text-[12px] font-medium py-1.5 px-2.5 text-left align-middle'
                                        const cellSecondaryCls =
                                            'text-text-secondary text-[11.5px] py-1.5 px-2.5 text-left align-middle'
                                        const cellHighlightCls =
                                            'text-text-primary text-[12.5px] font-bold py-1.5 px-2.5 text-left align-middle'
                                        return (
                                            <tr
                                                key={manager.id}
                                                onClick={() => handleSelect(manager)}
                                                className="border-b border-border-light cursor-pointer group"
                                            >
                                                <td className={`${cellCls} w-[10%] group-hover:bg-bg-hover`}>
                                                    {manager.plantCode || '\u2014'}
                                                </td>
                                                <td className={`${cellHighlightCls} w-[23%] group-hover:bg-bg-hover`}>
                                                    {manager.email || '\u2014'}
                                                </td>
                                                <td className={`${cellSecondaryCls} w-[14%] group-hover:bg-bg-hover`}>
                                                    {manager.firstName || '\u2014'}
                                                </td>
                                                <td className={`${cellSecondaryCls} w-[14%] group-hover:bg-bg-hover`}>
                                                    {manager.lastName || '\u2014'}
                                                </td>
                                                <td className={`${cellSecondaryCls} w-[17%] group-hover:bg-bg-hover`}>
                                                    {manager.roleName ? (
                                                        <Badge
                                                            variant="custom"
                                                            bg={getRoleColor(manager)}
                                                            fg="var(--text-primary)"
                                                            size="sm"
                                                        >
                                                            {manager.roleName}
                                                        </Badge>
                                                    ) : (
                                                        '\u2014'
                                                    )}
                                                </td>
                                                <td className={`${cellSecondaryCls} w-[22%] group-hover:bg-bg-hover`}>
                                                    {manager.lastLoginAt
                                                        ? new Date(
                                                              manager.lastLoginAt + 'T00:00:00'
                                                          ).toLocaleDateString(undefined, {
                                                              day: 'numeric',
                                                              month: 'short',
                                                              year: 'numeric'
                                                          })
                                                        : 'Never'}
                                                </td>
                                            </tr>
                                        )
                                    }}
                                    containerClassName="list-table-container"
                                    tableClassName="list-table"
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
export default ManagersView
