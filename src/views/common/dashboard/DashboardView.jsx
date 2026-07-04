import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import DashboardAlertsPanel from '../../../app/components/dashboard/DashboardAlertsPanel'
import { DashboardAtAGlance } from '../../../app/components/dashboard/DashboardAtAGlance'
import DashboardHeader from '../../../app/components/dashboard/DashboardHeader'
import DashboardPeopleSection from '../../../app/components/dashboard/DashboardPeopleSection'
import DashboardPodcastPanel from '../../../app/components/dashboard/DashboardPodcastPanel'
import DashboardSkeleton from '../../../app/components/dashboard/DashboardSkeleton'
import EmbeddedViewModal from '../../../app/components/dashboard/EmbeddedViewModal'
import FleetOverviewSection from '../../../app/components/dashboard/FleetOverviewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useDashboardAssets, useIssueCommentCounts, usePlantFilter } from '../../../app/hooks/useDashboardData'
import { useAnimatedStats, useDateFilter } from '../../../app/hooks/useDashboardEffects'
import { useDashboardInit } from '../../../app/hooks/useDashboardInit'
import { useDashboardManagers } from '../../../app/hooks/useDashboardManagers'
import { useDashboardStats } from '../../../app/hooks/useDashboardStats'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
import { usePlantNotifications } from '../../../app/hooks/usePlantNotifications'
import { useStatusHistory } from '../../../app/hooks/useStatusHistory'
import { PlantService } from '../../../services/PlantService'

/**
 * Primary dashboard view — Plan-tab-style 3-column layout.
 * Left: sticky scrollspy side nav with section anchors.
 * Center: KPI strip, fleet table, people table, alerts list.
 * Right: at-a-glance rail with vertical label/value snapshot.
 */
export default function DashboardView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const isMobile = useIsMobile()
    const [embeddedView, setEmbeddedView] = useState(null)
    const [embeddedViewSearch, setEmbeddedViewSearch] = useState('')
    /* Forwarded as-is onto the embedded ViewComponent via spread, so any
     * alert that opens a list view can pre-apply a filter (e.g. the
     * Operators alerts hand off `initialStatusFilter: 'Training'`).
     * Without this, the popup ignored the alert's intent and opened on
     * the full unfiltered list. */
    const [embeddedViewProps, setEmbeddedViewProps] = useState(null)
    const [, startTransition] = useTransition()
    const filterTimeoutRef = useRef(null)
    const scrollContainerRef = useRef(null)
    const { plantSetRef } = usePlantFilter('', '', [], [])
    const {
        allPlants,
        allPlantsCount,
        dashboardPlant,
        dashboardRegionCode,
        dashboardRegionName,
        hasAllRegionsPermission,
        onRefresh,
        permittedRegions,
        plantModalOpen,
        refreshing,
        regionGroups,
        regionPlants,
        regionPlantsLoaded,
        setDashboardPlant,
        setPlantModalOpen,
        setRefreshKey,
        totalAggregateLocations,
        totalPlantsExcludingAggregate,
        totalRegionsExcludingOffice,
        userAdditionalPlants,
        userPlantCode,
        refreshKey
    } = useDashboardInit({ plantSetRef, preferences })
    const myPlantCodesSet = useMemo(() => {
        if (!userPlantCode && !userAdditionalPlants.length) return null
        const codes = new Set()
        if (userPlantCode) codes.add(userPlantCode)
        userAdditionalPlants.forEach((code) => codes.add(code))
        return codes
    }, [userPlantCode, userAdditionalPlants])
    const plantFilter = usePlantFilter(
        dashboardRegionCode,
        dashboardPlant,
        regionPlants,
        allPlants,
        myPlantCodesSet,
        regionGroups
    )
    const {
        createFilterFn: activeCreateFilterFn,
        plantSetRef: activePlantSetRef,
        updatePlantSet: activeUpdatePlantSet
    } = plantFilter
    const {
        allEquipmentRef,
        allMixersRef,
        allOperatorsRef,
        allPickupsRef,
        allTractorsRef,
        allTrailersRef,
        computeStats,
        countsRef,
        stats
    } = useDashboardStats({
        createFilterFn: activeCreateFilterFn,
        dashboardRegionCode,
        updatePlantSet: activeUpdatePlantSet
    })
    const {
        allOperatorsFullRef,
        dataReady,
        error,
        loading,
        pendingStartOperators,
        trainingOperators
    } = useDashboardAssets({
        allEquipmentRef,
        allMixersRef,
        allOperatorsRef,
        allPickupsRef,
        allTractorsRef,
        allTrailersRef,
        computeStats,
        refreshKey
    })
    const { assetIssueDetails, fetchIssueCommentCounts } = useIssueCommentCounts({
        allEquipmentRef,
        allMixersRef,
        allTractorsRef,
        allTrailersRef,
        computeStats,
        countsRef
    })
    const { historyEndDate, historyStartDate, setHistoryEndDate, setHistoryStartDate, setOldestHistoryDate } =
        useDateFilter()
    const { historyLoaded, historyRecordsRef } = useStatusHistory({
        allEquipmentRef,
        allMixersRef,
        allPickupsRef,
        allTractorsRef,
        allTrailersRef,
        createFilterFn: activeCreateFilterFn,
        dashboardRegionCode,
        dataReady,
        historyEndDate,
        historyStartDate,
        loading,
        refreshKey,
        setHistoryEndDate,
        setHistoryStartDate,
        setOldestHistoryDate,
        updatePlantSet: activeUpdatePlantSet
    })
    const { plantNotifications } = usePlantNotifications({
        allEquipmentRef,
        allMixersRef,
        allOperatorsFullRef,
        allTractorsRef,
        allTrailersRef,
        assetIssueDetails,
        createFilterFn: activeCreateFilterFn,
        dataReady,
        historyLoaded,
        historyRecordsRef,
        pendingStartOperators,
        plantSetRef: activePlantSetRef,
        trainingOperators
    })
    const displayStats = useAnimatedStats(stats, regionPlantsLoaded, dashboardRegionCode)

    // Debounce stat recomputation (30ms) to batch rapid plant/region filter changes.
    const applyFilters = useCallback(() => {
        if (loading) {
            computeStats()
            return
        }
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current)
        filterTimeoutRef.current = setTimeout(() => startTransition(() => computeStats()), 30)
    }, [computeStats, loading])
    useEffect(
        () => () => {
            if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current)
        },
        []
    )
    useEffect(() => {
        applyFilters()
    }, [dashboardPlant, regionPlants, applyFilters])
    useEffect(() => {
        if (!loading) fetchIssueCommentCounts()
    }, [stats.fleetTotal, loading, fetchIssueCommentCounts])
    const selectedRegion = PlantService.getRegionByCode(dashboardRegionCode)
    const isAggregate = selectedRegion?.type === 'Aggregate'
    const showSkeleton = !dataReady

    const activePlantSet = useMemo(() => {
        const set = activePlantSetRef.current
        if (!set || set.size === 0) return null
        return new Set(set)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboardPlant, dashboardRegionCode, stats.fleetTotal])
    const managerStats = useDashboardManagers({ plantSet: activePlantSet })

    const regionDisplayName = (() => {
        if (selectedRegion?.type === 'Office') return 'Home Office'
        return dashboardRegionCode
            ? dashboardRegionName || dashboardRegionCode
            : hasAllRegionsPermission
              ? 'All Regions'
              : permittedRegions[0]?.regionName || 'Region'
    })()
    const heroRegionSub = (() => {
        const isOffice = selectedRegion?.type === 'Office'
        // Office-mode REGION/DISTRICT/plant drill-downs share a label
        // shape with the regular regions so the header reads identically
        // regardless of which scope the user picked.
        if (dashboardPlant?.startsWith('REGION:')) {
            const code = dashboardPlant.slice(7)
            const group = (regionGroups || []).find((g) => g.code === code)
            const count = group?.plantCodes?.length || 0
            const label = group?.type === 'Aggregate' ? 'Aggregate Location' : 'Concrete Plant'
            return `${group?.name || code} · ${count} ${label}${count !== 1 ? 's' : ''}`
        }
        if (isOffice && !dashboardPlant) {
            return `${totalRegionsExcludingOffice} Region${totalRegionsExcludingOffice !== 1 ? 's' : ''}, ${totalPlantsExcludingAggregate} Concrete Plant${totalPlantsExcludingAggregate !== 1 ? 's' : ''}, ${totalAggregateLocations} Aggregate Location${totalAggregateLocations !== 1 ? 's' : ''}`
        }
        const plantLabel = isAggregate ? 'Aggregate Location' : 'Concrete Plant'
        if (dashboardPlant === 'MY_PLANTS') return 'My Plants'
        if (dashboardPlant?.startsWith('DISTRICT:')) return dashboardPlant.slice(9)
        return dashboardPlant
            ? `${plantLabel} ${dashboardPlant}`
            : dashboardRegionCode
              ? `${regionPlants.length} ${plantLabel}${regionPlants.length !== 1 ? 's' : ''}`
              : `${allPlantsCount} ${plantLabel}${allPlantsCount !== 1 ? 's' : ''}`
    })()

    const alertCount =
        (plantNotifications.longTermShopAssets?.length || 0) +
        (plantNotifications.shopIssue ? 1 : 0) +
        (plantNotifications.unassignedOperators?.length > 0 ? 1 : 0) +
        (plantNotifications.pendingOperators?.length > 0 ? 1 : 0) +
        (plantNotifications.trainingOperators?.length > 0 ? 1 : 0)
    const openIssues =
        (stats.mixers?.issues || 0) +
        (stats.tractors?.issues || 0) +
        (stats.trailers?.issues || 0) +
        (stats.equipment?.issues || 0)

    return (
        <div className="dashboard-full-width global-flush-top flush-top text-text-primary bg-bg-secondary flex flex-col overflow-hidden absolute inset-0">
            <DashboardHeader
                accentColor={accentColor}
                heroRegionSub={heroRegionSub}
                isLoading={showSkeleton}
                isMobile={isMobile}
                onPlantFilterClick={() => setPlantModalOpen(true)}
                onRefresh={onRefresh}
                refreshing={refreshing}
                regionDisplayName={regionDisplayName}
            />
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
                <div className="w-full px-3 sm:px-4 lg:px-6 flex flex-col lg:flex-row gap-3 lg:gap-4">
                    {/* Podcast panel is desktop-only — the embedded player
                        consumes vertical real estate that phones can't
                        afford, and the show notes don't shorten cleanly
                        for a narrow column. */}
                    {!isMobile && <DashboardPodcastPanel />}

                    <main className="flex-1 min-w-0 py-3 sm:py-5 flex flex-col gap-3 sm:gap-5">
                        {error && (
                            <div
                                role="alert"
                                className="flex items-center justify-between rounded-md text-text-primary px-4 py-3 bg-status-danger/5 border border-status-danger/30 animate-fade-in-fast"
                            >
                                <span className="text-[13px] font-semibold">{error}</span>
                                <button type="button"
                                    onClick={() => setRefreshKey((v) => v + 1)}
                                    className="bg-transparent border-none text-text-primary cursor-pointer font-semibold text-[12px] px-2 py-1 rounded-md transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                        {showSkeleton ? (
                            <DashboardSkeleton isMobile={isMobile} />
                        ) : (
                            <>
                                <DashboardAlertsPanel
                                    plantNotifications={plantNotifications}
                                    setEmbeddedView={setEmbeddedView}
                                    setEmbeddedViewProps={setEmbeddedViewProps}
                                    setEmbeddedViewSearch={setEmbeddedViewSearch}
                                />
                                <FleetOverviewSection
                                    accentColor={accentColor}
                                    displayStats={displayStats}
                                    isAggregate={isAggregate}
                                    selectedRegion={selectedRegion}
                                    stats={stats}
                                />
                                <DashboardPeopleSection
                                    accentColor={accentColor}
                                    displayStats={displayStats}
                                    isAggregate={isAggregate}
                                    managerStats={managerStats}
                                />
                                <div className="h-8" aria-hidden="true" />
                            </>
                        )}
                    </main>

                    <DashboardAtAGlance
                        alertCount={alertCount}
                        displayStats={displayStats}
                        loading={showSkeleton}
                        openIssues={openIssues}
                    />
                </div>
            </div>

            <PlantDropdownModal
                isOpen={plantModalOpen}
                onClose={() => setPlantModalOpen(false)}
                onSelect={(plantCode) => setDashboardPlant(plantCode === 'All' ? '' : plantCode)}
                // Home Office can't filter by its own plants (there are none) —
                // surface every plant in the org plus a regions section so the
                // dispatcher can scope by region → district → plant from a
                // single modal. Regular regions keep showing just their own
                // plants and districts.
                plants={selectedRegion?.type === 'Office' ? allPlants : regionPlants}
                regionGroups={selectedRegion?.type === 'Office' ? regionGroups : []}
                showAllPlants={true}
                showMyPlants={false}
                userPlantCode={userPlantCode}
            />
            {embeddedView && (
                <EmbeddedViewModal
                    accentColor={accentColor}
                    embeddedView={embeddedView}
                    embeddedViewProps={embeddedViewProps}
                    embeddedViewSearch={embeddedViewSearch}
                    onClose={() => {
                        setEmbeddedView(null)
                        setEmbeddedViewSearch('')
                        setEmbeddedViewProps(null)
                    }}
                />
            )}
        </div>
    )
}
