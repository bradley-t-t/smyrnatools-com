import React, { useEffect, useMemo, useRef, useState } from 'react'

import Badge from '../../../app/components/common/Badge'
import Skeleton, { SkeletonStack } from '../../../app/components/common/Skeleton'
import RegionsAddView from '../../../app/components/regions/RegionsAddView'
import RegionsDetailView from '../../../app/components/regions/RegionsDetailView'
import TopSection from '../../../app/components/sections/TopSection'
import { PlantService } from '../../../services/PlantService'

const VIEW_MODE_STORAGE_KEY = 'regions_last_view_mode'

const getRegionCode = (region) => region?.region_code || region?.regionCode || ''
const getRegionName = (region) => region?.region_name || region?.regionName || ''
const getRegionType = (region) => region?.type || region?.region_type || ''

/** Icon + Badge tone per region type — used in pills and grid card headers.
 *  Tones map to the shared <Badge /> palette so chips render correctly across
 *  dark / light / gray themes without hand-rolled background classes. */
const REGION_TYPE_META = {
    Aggregate: { icon: 'mountain', tone: 'warning' },
    Concrete: { icon: 'industry', tone: 'accent' },
    Office: { icon: 'building', tone: 'success' }
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

/** Grid card matching the asset-card visual rhythm — header (icon + code + type pill) + name row. */
function RegionGridCard({ region, onSelect }) {
    const type = getRegionType(region)
    const meta = REGION_TYPE_META[type] || DEFAULT_TYPE_META
    const code = getRegionCode(region)
    const name = getRegionName(region)
    return (
        <button type="button"
            className="group flex flex-col overflow-hidden rounded-card border border-border-light bg-bg-primary text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-medium hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none"
            onClick={() => onSelect(code)}
            aria-label={`Open region ${code}${name ? ` — ${name}` : ''}`}
        >
            <div className="flex items-center gap-3 border-b border-border-light px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-base text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
                    <i className={`fas fa-${meta.icon}`} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate font-heading text-lg font-bold tracking-tight text-text-primary">
                        #{code}
                    </div>
                    <div className="truncate text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                        Region
                    </div>
                </div>
                <Badge tone={meta.tone} size="md" shape="pill" weight="semibold" icon={meta.icon} uppercase={false}>
                    {type || 'N/A'}
                </Badge>
            </div>

            <div className="px-5 py-3">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-text-tertiary">Name</span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold text-text-primary">{name || '—'}</span>
            </div>
        </button>
    )
}

/**
 * List view for all regions. Supports search by name/code/type, type filter
 * (Concrete/Aggregate/Office), grid/list toggle, and drill-down into
 * RegionsDetailView for editing region properties and managing assigned
 * plants.
 */
function RegionsView({ title = 'Regions' }) {
    const [regions, setRegions] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedRegion, setSelectedRegion] = useState(null)
    const [selectedType, setSelectedType] = useState('')
    const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_STORAGE_KEY) || 'grid')
    const headerRef = useRef(null)
    const handleViewModeChange = (next) => {
        setViewMode(next)
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, next)
    }
    useEffect(() => {
        async function fetchRegions() {
            setIsLoading(true)
            try {
                const data = await PlantService.fetchRegions()
                setRegions(data)
            } finally {
                setIsLoading(false)
            }
        }
        fetchRegions()
    }, [])
    function handleSelectRegion(regionCode) {
        const region = regions.find((r) => getRegionCode(r) === regionCode)
        setSelectedRegion(region)
    }
    function handleRegionAdded(newRegion) {
        setRegions((prev) => [...prev, newRegion])
    }
    async function handleRegionDeleted(regionCode) {
        setRegions((prev) => prev.filter((r) => getRegionCode(r) !== regionCode))
        setSelectedRegion(null)
    }
    async function handleRegionUpdated(regionCode) {
        const updatedRegions = await PlantService.fetchRegions()
        setRegions(updatedRegions)
        setSelectedRegion(updatedRegions.find((r) => getRegionCode(r) === regionCode) || null)
    }
    const filteredRegions = useMemo(
        () =>
            regions.filter((region) => {
                const normalizedSearch = searchText.trim().toLowerCase()
                const name = getRegionName(region).toLowerCase()
                const code = getRegionCode(region).toLowerCase()
                const type = getRegionType(region).toLowerCase()
                const searchMatch =
                    !normalizedSearch ||
                    name.includes(normalizedSearch) ||
                    code.includes(normalizedSearch) ||
                    type.includes(normalizedSearch)
                const typeMatch =
                    !selectedType || selectedType === 'All Types' || getRegionType(region) === selectedType
                return searchMatch && typeMatch
            }),
        [regions, searchText, selectedType]
    )

    /** Total + per-type pill row. */
    const badge = useMemo(() => {
        const counts = { Aggregate: 0, Concrete: 0, Office: 0 }
        regions.forEach((region) => {
            const type = getRegionType(region)
            if (counts[type] !== undefined) counts[type] += 1
        })
        return `${regions.length} Total · ${counts.Concrete} Concrete · ${counts.Aggregate} Aggregate · ${counts.Office} Office`
    }, [regions])

    const customFilters = (
        <select
            className={FILTER_SELECT_CLS}
            style={FILTER_SELECT_STYLE}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Region type filter"
        >
            <option value="">All Types</option>
            <option value="Concrete">Concrete</option>
            <option value="Aggregate">Aggregate</option>
            <option value="Office">Office</option>
        </select>
    )
    const showReset = !!(searchText || selectedType)
    const onReset = () => {
        setSearchText('')
        setSelectedType('')
    }
    if (selectedRegion) {
        return (
            <div className="min-h-screen bg-bg-secondary">
                <RegionsDetailView
                    region={selectedRegion}
                    onClose={() => setSelectedRegion(null)}
                    onDelete={handleRegionDeleted}
                    onUpdate={handleRegionUpdated}
                />
            </div>
        )
    }
    return (
        <div className="min-h-screen bg-bg-secondary">
            <TopSection
                title={title}
                badge={badge}
                addButtonLabel="Add Region"
                onAddClick={() => setShowAddSheet(true)}
                searchInput={searchText}
                onSearchInputChange={setSearchText}
                onClearSearch={() => setSearchText('')}
                searchPlaceholder="Search by region name, code, or type..."
                forwardedRef={headerRef}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                listLabels={['Region Code', 'Name', 'Type']}
                colWidths={['25%', '50%', '25%']}
                customFilters={customFilters}
                showReset={showReset}
                onReset={onReset}
                hidePlantFilter={true}
            />
            <div className="px-4 lg:px-6 py-4 lg:py-6">
                {isLoading ? (
                    <RegionsLoadingState viewMode={viewMode} />
                ) : filteredRegions.length === 0 ? (
                    <RegionsEmptyState hasSearch={!!searchText} onAddClick={() => setShowAddSheet(true)} />
                ) : viewMode === 'grid' ? (
                    <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                    >
                        {filteredRegions.map((region) => (
                            <RegionGridCard key={getRegionCode(region)} region={region} onSelect={handleSelectRegion} />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-card border border-border-light bg-bg-primary">
                        <table className="w-full">
                            <tbody className="divide-y divide-border-light">
                                {filteredRegions.map((region) => {
                                    const type = getRegionType(region)
                                    const meta = REGION_TYPE_META[type] || DEFAULT_TYPE_META
                                    const code = getRegionCode(region)
                                    return (
                                        <tr
                                            key={code}
                                            className="cursor-pointer bg-bg-primary transition-colors duration-150 hover:bg-bg-hover focus-within:bg-bg-hover"
                                            onClick={() => handleSelectRegion(code)}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    handleSelectRegion(code)
                                                }
                                            }}
                                        >
                                            <td className="px-5 py-4 text-sm font-bold text-accent">{code}</td>
                                            <td className="px-5 py-4 text-sm font-medium text-text-primary">
                                                {getRegionName(region)}
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
                                                    {type || 'N/A'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {showAddSheet && (
                <RegionsAddView onClose={() => setShowAddSheet(false)} onRegionAdded={handleRegionAdded} />
            )}
        </div>
    )
}

/** Skeleton placeholder matching either grid or list view. */
function RegionsLoadingState({ viewMode }) {
    if (viewMode === 'grid') {
        return (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                <SkeletonStack count={6} gapClassName="hidden">
                    {() => (
                        <div className="rounded-card border border-border-light bg-bg-primary p-5">
                            <div className="mb-4 flex items-center gap-3">
                                <Skeleton className="h-10 w-10" rounded="rounded-md" />
                                <div className="flex-1">
                                    <Skeleton className="mb-1.5 h-4 w-20" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <Skeleton className="h-6 w-20" rounded="rounded-full" />
                            </div>
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                    )}
                </SkeletonStack>
            </div>
        )
    }
    return (
        <div className="overflow-hidden rounded-card border border-border-light bg-bg-primary">
            <SkeletonStack count={6} gapClassName="gap-0">
                {() => (
                    <div className="flex items-center gap-4 border-b border-border-light px-5 py-4 last:border-b-0">
                        <Skeleton className="h-4 w-[25%]" />
                        <Skeleton className="h-4 w-[50%]" />
                        <Skeleton className="h-5 w-20" rounded="rounded-full" />
                    </div>
                )}
            </SkeletonStack>
        </div>
    )
}

/** Empty / no-results placeholder. */
function RegionsEmptyState({ hasSearch, onAddClick }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-card border border-border-light bg-bg-primary px-6 py-16 text-center animate-fade-in motion-reduce:animate-none">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
                <i className="fas fa-map-marker-alt text-3xl" aria-hidden="true" />
            </div>
            <h3 className="mb-2 font-heading text-xl font-semibold text-text-primary">No Regions Found</h3>
            <p className="mb-6 max-w-md text-sm text-text-secondary">
                {hasSearch ? 'No regions match your search criteria.' : 'There are no regions in the system yet.'}
            </p>
            <button type="button"
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-accent-hover hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
                onClick={onAddClick}
            >
                Add Region
            </button>
        </div>
    )
}

export default RegionsView
