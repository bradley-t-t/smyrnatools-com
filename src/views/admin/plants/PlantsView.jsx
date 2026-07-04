import React, { useEffect, useMemo, useRef, useState } from 'react'

import Badge from '../../../app/components/common/Badge'
import PlantManagersQuickEditModal from '../../../app/components/plants/PlantManagersQuickEditModal'
import PlantsEmptyState from '../../../app/components/plants/PlantsEmptyState'
import PlantsLoadingState from '../../../app/components/plants/PlantsLoadingState'
import TopSection from '../../../app/components/sections/TopSection'
import { PlantService } from '../../../services/PlantService'
import PlantsAddView from './PlantsAddView'
import PlantsDetailView from './PlantsDetailView'

/** Maps region types to human-readable plant type labels. */
const REGION_TYPE_TO_PLANT_TYPE = {
    Aggregate: 'Aggregate Location',
    Concrete: 'Concrete Plant',
    Office: 'Office Location'
}
const PLANT_TYPE_OPTIONS = ['Concrete Plant', 'Aggregate Location', 'Office Location']
const VIEW_MODE_STORAGE_KEY = 'plants_last_view_mode'

const getPlantCode = (plant) => plant?.plant_code || plant?.plantCode || ''
const getPlantName = (plant) => plant?.plant_name || plant?.plantName || ''
const getPlantManagerIds = (plant) => {
    const raw = plant?.manager_user_ids ?? plant?.managerUserIds
    return Array.isArray(raw) ? raw : []
}
const getPlantType = (region) => REGION_TYPE_TO_PLANT_TYPE[region?.type] || 'N/A'
const getPlantAliasCodes = (plant) => {
    const raw = plant?.colocated_alias_codes ?? plant?.colocatedAliasCodes
    return Array.isArray(raw) ? raw : []
}
const hasColocation = (plant) =>
    Boolean(plant?.location_group_id ?? plant?.locationGroupId) || getPlantAliasCodes(plant).length > 0

/** Badge tone + icon per plant type — feeds the shared <Badge /> primitive
 *  so chips stay theme-consistent across dark / light / gray. */
const PLANT_TYPE_META = {
    'Aggregate Location': { icon: 'mountain', tone: 'warning' },
    'Concrete Plant': { icon: 'industry', tone: 'accent' },
    'Office Location': { icon: 'building', tone: 'success' }
}
const DEFAULT_TYPE_META = { icon: 'map-marker-alt', tone: 'neutral' }

/** Slim filter select — matches the FilterSelect atom inside TopSection so admin
 *  views read with the same rhythm as Mixers / Operators / AssetView. The
 *  inline chevron is an SVG data URI so the trigger renders the same in
 *  dark / light / gray themes without depending on the browser's native
 *  select arrow. */
const FILTER_SELECT_CLS =
    'appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:0.65em_auto] text-[12px] cursor-pointer font-medium rounded py-1.5 pl-2 pr-7 bg-bg-secondary border border-border-light text-text-primary hover:border-border-medium focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50'
const FILTER_SELECT_STYLE = {
    backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><polyline points='2.5,4.5 6,8 9.5,4.5'/></svg>\")",
    minWidth: 130
}

/** Grid card — matches AssetGridCard visual rhythm (header / body grid / footer). */
function PlantGridCard({ plant, region, plantType, managerCount, onSelect, onManageManagers }) {
    const meta = PLANT_TYPE_META[plantType] || DEFAULT_TYPE_META
    const code = getPlantCode(plant)
    const name = getPlantName(plant)
    const aliasCodes = getPlantAliasCodes(plant)
    const isColocated = hasColocation(plant)
    return (
        <button type="button"
            className="group relative flex flex-col overflow-hidden rounded-card border border-border-light bg-bg-primary text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-medium hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none"
            onClick={() => onSelect(code)}
            aria-label={`Open plant ${code}${name ? ` — ${name}` : ''}`}
        >
            {isColocated && (
                <span
                    className="absolute top-0 left-0 h-1 w-full bg-accent/70"
                    aria-hidden="true"
                    title="Co-located plant"
                />
            )}
            <div className="flex items-center gap-3 border-b border-border-light px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-base text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
                    <i className={`fas fa-${meta.icon}`} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="truncate font-heading text-lg font-bold tracking-tight text-text-primary">
                            #{code}
                        </span>
                        {isColocated && (
                            <i
                                className="fas fa-link text-[10px] text-accent/70"
                                title={
                                    aliasCodes.length
                                        ? `Co-located with ${aliasCodes.join(', ')}`
                                        : 'Co-located with other plants'
                                }
                                aria-hidden="true"
                            />
                        )}
                    </div>
                    <div className="truncate text-[11px] font-medium text-text-secondary">{name || '—'}</div>
                </div>
                <Badge
                    tone={meta.tone}
                    size="md"
                    shape="pill"
                    weight="semibold"
                    icon={meta.icon}
                    uppercase={false}
                    className="shrink-0"
                >
                    {plantType}
                </Badge>
            </div>

            <div className="grid grid-cols-2">
                <div className="flex flex-col gap-0.5 border-r border-border-light px-5 py-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">Region</span>
                    <span className="truncate text-[13px] font-semibold text-text-primary">
                        {region?.regionName || 'N/A'}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5 px-5 py-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                        Region Code
                    </span>
                    <span className="truncate text-[13px] font-semibold text-text-primary">
                        {region?.regionCode || '—'}
                    </span>
                </div>
            </div>

            {aliasCodes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 border-t border-border-light px-5 py-2.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                        Shares site with
                    </span>
                    {aliasCodes.map((alias) => (
                        <Badge key={alias} tone="accent" size="md" shape="pill" weight="semibold" uppercase={false}>
                            {alias}
                        </Badge>
                    ))}
                </div>
            )}

            <div
                className="flex border-t border-border-light"
                onClick={(event) => event.stopPropagation()}
                role="presentation"
            >
                <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                        event.stopPropagation()
                        onManageManagers(plant)
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            onManageManagers(plant)
                        }
                    }}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-text-secondary transition-colors duration-150 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    title="Attach or remove managers for this plant"
                    aria-label="Manage plant managers"
                >
                    <i className="fas fa-user-tie" aria-hidden="true" />
                    {managerCount === 0 ? 'No managers' : `${managerCount} manager${managerCount === 1 ? '' : 's'}`}
                    <i className="fas fa-pen ml-1 text-[9px] text-text-tertiary" aria-hidden="true" />
                </span>
            </div>
        </button>
    )
}

/**
 * List view for all plants. Builds a plant-to-region map on load to display
 * each plant's type (Concrete/Aggregate/Office). Supports grid/list toggle,
 * search by code/name, region filter, plant type filter, an inline
 * manager-edit modal triggered from each row/card, and drill-down into
 * PlantsDetailView for full edit.
 */
function PlantsView({ title = 'Plants' }) {
    const [plants, setPlants] = useState([])
    const [regions, setRegions] = useState([])
    const [plantRegionMap, setPlantRegionMap] = useState({})
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedPlant, setSelectedPlant] = useState(null)
    const [managersEditPlant, setManagersEditPlant] = useState(null)
    const [selectedRegion, setSelectedRegion] = useState('')
    const [selectedPlantType, setSelectedPlantType] = useState('')
    const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_STORAGE_KEY) || 'grid')
    const headerRef = useRef(null)
    const handleViewModeChange = (next) => {
        setViewMode(next)
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, next)
    }
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [plantsData, regionsData] = await Promise.all([
                    PlantService.fetchPlants(),
                    PlantService.fetchRegions()
                ])
                setPlants(plantsData)
                setRegions(regionsData)
                const regionPlantsResults = await Promise.all(
                    regionsData.map((r) => PlantService.fetchRegionPlants(r.regionCode).catch(() => []))
                )
                const map = {}
                regionsData.forEach((region, index) => {
                    const plantsForRegion = regionPlantsResults[index] || []
                    plantsForRegion.forEach((p) => {
                        map[p.plantCode] = region
                    })
                })
                setPlantRegionMap(map)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])
    const handleSelectPlant = (plantCode) => setSelectedPlant(plants.find((p) => getPlantCode(p) === plantCode))
    const handlePlantAdded = (newPlant) => setPlants((prev) => [...prev, newPlant])
    const handlePlantDeleted = (plantCode) => {
        setPlants((prev) => prev.filter((p) => getPlantCode(p) !== plantCode))
        setSelectedPlant(null)
    }
    const handlePlantUpdated = async (plantCode) => {
        const updatedPlants = await PlantService.fetchPlants()
        setPlants(updatedPlants)
        setSelectedPlant(updatedPlants.find((p) => getPlantCode(p) === plantCode) || null)
    }
    /** Patches the local plants array with a new manager list for one plant
     *  so the row's count badge flips immediately when the modal saves. */
    const handleManagersSaved = (plantCode, managerIds) => {
        setPlants((prev) =>
            prev.map((p) => {
                if (getPlantCode(p) !== plantCode) return p
                return { ...p, managerUserIds: managerIds, manager_user_ids: managerIds }
            })
        )
    }
    const filteredPlants = useMemo(
        () =>
            plants.filter((plant) => {
                const normalizedSearch = searchText.trim().toLowerCase()
                const code = getPlantCode(plant)
                const name = getPlantName(plant)
                const searchMatch =
                    !normalizedSearch ||
                    name.toLowerCase().includes(normalizedSearch) ||
                    code.toLowerCase().includes(normalizedSearch)
                const region = plantRegionMap[code]
                const regionMatch =
                    !selectedRegion || selectedRegion === 'All Regions' || region?.regionCode === selectedRegion
                const plantType = getPlantType(region)
                const plantTypeMatch =
                    !selectedPlantType || selectedPlantType === 'All Types' || plantType === selectedPlantType
                return searchMatch && regionMatch && plantTypeMatch
            }),
        [plants, plantRegionMap, searchText, selectedRegion, selectedPlantType]
    )

    /** Pill row in TopSection — total + per-type breakdown, only counts plants with a known type. */
    const badge = useMemo(() => {
        const counts = { Aggregate: 0, Concrete: 0, Office: 0 }
        plants.forEach((plant) => {
            const region = plantRegionMap[getPlantCode(plant)]
            const type = region?.type
            if (type && counts[type] !== undefined) counts[type] += 1
        })
        return `${plants.length} Total · ${counts.Concrete} Concrete · ${counts.Aggregate} Aggregate · ${counts.Office} Office`
    }, [plants, plantRegionMap])

    const resetFilters = () => {
        setSearchText('')
        setSelectedRegion('')
        setSelectedPlantType('')
    }
    const customFilters = (
        <>
            <select
                className={FILTER_SELECT_CLS}
                style={FILTER_SELECT_STYLE}
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                aria-label="Region filter"
            >
                <option value="">All Regions</option>
                {regions.map((r) => (
                    <option key={r.regionCode} value={r.regionCode}>
                        {r.regionName}
                    </option>
                ))}
            </select>
            <select
                className={FILTER_SELECT_CLS}
                style={FILTER_SELECT_STYLE}
                value={selectedPlantType}
                onChange={(e) => setSelectedPlantType(e.target.value)}
                aria-label="Location type filter"
            >
                <option value="">All Location Types</option>
                {PLANT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))}
            </select>
        </>
    )
    if (selectedPlant) {
        return (
            <div className="min-h-screen bg-bg-secondary">
                <PlantsDetailView
                    plant={selectedPlant}
                    onClose={() => setSelectedPlant(null)}
                    onDelete={handlePlantDeleted}
                    onUpdate={handlePlantUpdated}
                />
            </div>
        )
    }
    return (
        <div className="min-h-screen bg-bg-secondary">
            <TopSection
                title={title}
                badge={badge}
                addButtonLabel="Add Plant"
                onAddClick={() => setShowAddSheet(true)}
                searchInput={searchText}
                onSearchInputChange={setSearchText}
                onClearSearch={() => setSearchText('')}
                searchPlaceholder="Search by plant name or code..."
                forwardedRef={headerRef}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                listLabels={['Plant Code', 'Name', 'Region', 'Type', 'Managers']}
                colWidths={['16%', '26%', '20%', '20%', '18%']}
                customFilters={customFilters}
                showReset={!!(searchText || selectedRegion || selectedPlantType)}
                onReset={resetFilters}
                hidePlantFilter={true}
            />
            <div className="px-4 lg:px-6 py-4 lg:py-6">
                {isLoading ? (
                    <PlantsLoadingState viewMode={viewMode} />
                ) : !filteredPlants.length ? (
                    <PlantsEmptyState hasSearch={!!searchText} onAddClick={() => setShowAddSheet(true)} />
                ) : viewMode === 'grid' ? (
                    <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
                    >
                        {filteredPlants.map((plant) => {
                            const code = getPlantCode(plant)
                            const region = plantRegionMap[code]
                            return (
                                <PlantGridCard
                                    key={code}
                                    plant={plant}
                                    region={region}
                                    plantType={getPlantType(region)}
                                    managerCount={getPlantManagerIds(plant).length}
                                    onSelect={handleSelectPlant}
                                    onManageManagers={setManagersEditPlant}
                                />
                            )
                        })}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-card border border-border-light bg-bg-primary">
                        <table className="w-full">
                            <tbody className="divide-y divide-border-light">
                                {filteredPlants.map((plant) => {
                                    const code = getPlantCode(plant)
                                    const region = plantRegionMap[code]
                                    const plantType = getPlantType(region)
                                    const meta = PLANT_TYPE_META[plantType] || DEFAULT_TYPE_META
                                    const managerCount = getPlantManagerIds(plant).length
                                    const aliasCodes = getPlantAliasCodes(plant)
                                    const isColocated = hasColocation(plant)
                                    return (
                                        <tr
                                            key={code}
                                            className="cursor-pointer bg-bg-primary transition-colors duration-150 hover:bg-bg-hover focus-within:bg-bg-hover"
                                            onClick={() => handleSelectPlant(code)}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    handleSelectPlant(code)
                                                }
                                            }}
                                        >
                                            <td className="px-5 py-4 text-sm font-bold text-accent">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {code}
                                                    {isColocated && (
                                                        <i
                                                            className="fas fa-link text-[10px] text-accent/60"
                                                            title={
                                                                aliasCodes.length
                                                                    ? `Co-located with ${aliasCodes.join(', ')}`
                                                                    : 'Co-located with other plants'
                                                            }
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-sm font-medium text-text-primary">
                                                {getPlantName(plant)}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-text-secondary">
                                                {region?.regionName || 'N/A'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge
                                                    tone={meta.tone}
                                                    size="md"
                                                    shape="pill"
                                                    weight="semibold"
                                                    icon={meta.icon}
                                                    uppercase={false}
                                                >
                                                    {plantType}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            setManagersEditPlant(plant)
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-full border border-border-light bg-bg-primary px-3 py-1 text-xs font-semibold text-text-secondary transition-all duration-150 hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97]"
                                                        title="Attach or remove managers for this plant"
                                                        aria-label="Manage plant managers"
                                                    >
                                                        <i
                                                            className="fas fa-user-tie text-[10px] text-accent"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {managerCount === 0
                                                                ? 'No managers'
                                                                : `${managerCount} manager${managerCount === 1 ? '' : 's'}`}
                                                        </span>
                                                        <i
                                                            className="fas fa-pen text-[9px] text-text-tertiary"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {showAddSheet && <PlantsAddView onClose={() => setShowAddSheet(false)} onPlantAdded={handlePlantAdded} />}
            {managersEditPlant && (
                <PlantManagersQuickEditModal
                    plant={managersEditPlant}
                    onClose={() => setManagersEditPlant(null)}
                    onSaved={(persistedIds) => handleManagersSaved(getPlantCode(managersEditPlant), persistedIds)}
                />
            )}
        </div>
    )
}

export default PlantsView
