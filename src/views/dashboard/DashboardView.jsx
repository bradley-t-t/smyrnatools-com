import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import PlantDropdownModal from '../../app/components/common/PlantDropdownModal'
import DashboardCharts from '../../app/components/dashboard/DashboardCharts'
import DashboardHeader from '../../app/components/dashboard/DashboardHeader'
import DashboardPlantSummary from '../../app/components/dashboard/DashboardPlantSummary'
import DashboardSkeleton from '../../app/components/dashboard/DashboardSkeleton'
import EmbeddedViewModal from '../../app/components/dashboard/EmbeddedViewModal'
import FleetOverviewSection from '../../app/components/dashboard/FleetOverviewSection'
import MaintenanceQualitySection from '../../app/components/dashboard/MaintenanceQualitySection'
import PeopleSection from '../../app/components/dashboard/PeopleSection'
import RegionOverviewCard from '../../app/components/dashboard/RegionOverviewCard'
import { DashboardCard, SectionTitle } from '../../app/components/ui/DashboardCards'
import { INITIAL_EXPANDED_SECTIONS } from '../../app/constants/dashboardConstants'
import { usePreferences } from '../../app/context/PreferencesContext'
import { useDashboardAssets, useIssueCommentCounts, usePlantFilter } from '../../app/hooks/useDashboardData'
import { useAITypingEffect, useAnimatedStats, useDateFilter } from '../../app/hooks/useDashboardEffects'
import { useDashboardInit } from '../../app/hooks/useDashboardInit'
import { useDashboardStats } from '../../app/hooks/useDashboardStats'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import { useAISummary, useLeaderboardMetrics, usePlantNotifications } from '../../app/hooks/usePlantNotifications'
import { useStatusHistory } from '../../app/hooks/useStatusHistory'
import { RegionService } from '../../services/RegionService'
import DateUtility from '../../utils/DateUtility'
/**
 * Primary dashboard view. Orchestrates region/plant-scoped fleet, operator,
 * maintenance, and analytics data through a network of specialized hooks.
 * Supports role-based visibility (plant managers see AI summaries and
 * notifications), region/plant filtering via a modal picker, and
 * status history charting with quick date-range filters.
 */
export default function DashboardView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const isMobile = useIsMobile()
    const [expandedSections, setExpandedSections] = useState(INITIAL_EXPANDED_SECTIONS)
    const [embeddedView, setEmbeddedView] = useState(null)
    const [embeddedViewSearch, setEmbeddedViewSearch] = useState('')
    const [trainingCollapsed, setTrainingCollapsed] = useState(true)
    const [pendingCollapsed, setPendingCollapsed] = useState(true)
    const [lightDutyCollapsed, setLightDutyCollapsed] = useState(true)
    const [, startTransition] = useTransition()
    const filterTimeoutRef = useRef(null)
    const { plantSetRef } = usePlantFilter('', '', [], [])
    const {
        allPlants,
        allPlantsCount,
        dashboardPlant,
        dashboardRegionCode,
        dashboardRegionName,
        hasAllRegionsPermission,
        isPlantManager,
        onRefresh,
        permittedRegions,
        plantModalOpen,
        refreshKey,
        refreshing,
        regionPlants,
        regionPlantsLoaded,
        setDashboardPlant,
        setPlantModalOpen,
        setRefreshKey,
        totalAggregateLocations,
        totalPlantsExcludingAggregate,
        totalRegionsExcludingOffice,
        userPlantCode,
        userRoleName,
        userRoleWeight
    } = useDashboardInit({ plantSetRef, preferences })
    const plantFilter = usePlantFilter(dashboardRegionCode, dashboardPlant, regionPlants, allPlants)
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
        lightDutyOperators,
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
    const {
        handleQuickDateFilter,
        historyEndDate,
        historyStartDate,
        setHistoryEndDate,
        setHistoryStartDate,
        setOldestHistoryDate
    } = useDateFilter()
    const { historyLoaded, historyRecordsRef, statusHistoryData } = useStatusHistory({
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
    const { filterByPlantSet, plantNotifications, setPlantNotifications } = usePlantNotifications({
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
    useLeaderboardMetrics({
        allEquipmentRef,
        allMixersRef,
        allOperatorsFullRef,
        allTractorsRef,
        allTrailersRef,
        dashboardPlant,
        dashboardRegionCode,
        dataReady,
        setPlantNotifications
    })
    const { handleRegenerateAISummary } = useAISummary({
        allMixersRef,
        createFilterFn: activeCreateFilterFn,
        dashboardPlant,
        plantNotifications,
        plantSetRef: activePlantSetRef,
        setPlantNotifications,
        userPlantCode,
        userRoleName,
        userRoleWeight
    })
    const displayStats = useAnimatedStats(stats, regionPlantsLoaded, dashboardRegionCode)
    const { aiActionPlan, aiDisplayText, isTypingComplete, showActionPlan } = useAITypingEffect(
        plantNotifications.aiSummary,
        dashboardPlant
    )
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
    const selectedRegion = RegionService.getRegionByCode(dashboardRegionCode)
    const isAggregate = selectedRegion?.type === 'Aggregate'
    const showSkeleton = !dataReady
    // Resolve the display label: specific plant > specific region > "All Regions" (admins) > first permitted region.
    const regionDisplayName = (() => {
        if (selectedRegion?.type === 'Office') return 'Home Office'
        return dashboardRegionCode
            ? dashboardRegionName || dashboardRegionCode
            : hasAllRegionsPermission
              ? 'All Regions'
              : permittedRegions[0]?.regionName || 'Region'
    })()
    // Build the hero subtitle: office shows combined region/plant/aggregate counts;
    // otherwise shows the selected plant code or a count of plants in the active scope.
    const heroRegionSub = (() => {
        const isOffice = selectedRegion?.type === 'Office'
        if (isOffice) {
            return `${totalRegionsExcludingOffice} Region${totalRegionsExcludingOffice !== 1 ? 's' : ''}, ${totalPlantsExcludingAggregate} Concrete Plant${totalPlantsExcludingAggregate !== 1 ? 's' : ''}, ${totalAggregateLocations} Aggregate Location${totalAggregateLocations !== 1 ? 's' : ''}`
        }
        const plantLabel = isAggregate ? 'Aggregate Location' : 'Concrete Plant'
        return dashboardPlant
            ? `${plantLabel} ${dashboardPlant}`
            : dashboardRegionCode
              ? `${regionPlants.length} ${plantLabel}${regionPlants.length !== 1 ? 's' : ''}`
              : `${allPlantsCount} ${plantLabel}${allPlantsCount !== 1 ? 's' : ''}`
    })()
    // Scope operator status lists to the active plant set, checking both operator and trainer plant assignments.
    const filteredTrainingOperators = filterByPlantSet(
        trainingOperators,
        activePlantSetRef.current,
        'operatorPlant',
        'trainerPlant'
    )
    const filteredPendingStartOperators = filterByPlantSet(
        pendingStartOperators,
        activePlantSetRef.current,
        'operatorPlant',
        'trainerPlant'
    )
    const filteredLightDutyOperators = filterByPlantSet(lightDutyOperators, activePlantSetRef.current, 'plant')
    return (
        <div className="dashboard-full-width min-h-screen bg-slate-50 text-slate-900">
            <DashboardHeader
                accentColor={accentColor}
                isMobile={isMobile}
                refreshing={refreshing}
                onRefresh={onRefresh}
                dashboardRegionCode={dashboardRegionCode}
                selectedRegion={selectedRegion}
                dashboardPlant={dashboardPlant}
                regionPlants={regionPlants}
                setPlantModalOpen={setPlantModalOpen}
            />
            <div className={`mx-auto max-w-full ${isMobile ? 'p-3' : 'p-6'}`}>
                {!showSkeleton && (isPlantManager || dashboardPlant) && (
                    <DashboardPlantSummary
                        dashboardPlant={dashboardPlant}
                        plantNotifications={plantNotifications}
                        expandedSections={expandedSections}
                        setExpandedSections={setExpandedSections}
                        setEmbeddedView={setEmbeddedView}
                        setEmbeddedViewSearch={setEmbeddedViewSearch}
                        aiDisplayText={aiDisplayText}
                        aiActionPlan={aiActionPlan}
                        isTypingComplete={isTypingComplete}
                        showActionPlan={showActionPlan}
                        handleRegenerateAISummary={handleRegenerateAISummary}
                        userRoleName={userRoleName}
                        userPlantCode={userPlantCode}
                        isPlantManager={isPlantManager}
                        isMobile={isMobile}
                    />
                )}
                <RegionOverviewCard
                    showSkeleton={showSkeleton}
                    regionDisplayName={regionDisplayName}
                    heroRegionSub={heroRegionSub}
                    displayStats={displayStats}
                    isMobile={isMobile}
                />
                {error && (
                    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6 px-5 py-4">
                        <span>{error}</span>
                        <button
                            onClick={() => setRefreshKey((v) => v + 1)}
                            className="bg-transparent border-none text-red-600 cursor-pointer font-semibold"
                        >
                            Retry
                        </button>
                    </div>
                )}
                {showSkeleton ? (
                    <DashboardSkeleton isMobile={isMobile} />
                ) : (
                    <div className={`grid ${isMobile ? 'gap-4' : 'gap-6'}`}>
                        <FleetOverviewSection
                            displayStats={displayStats}
                            stats={stats}
                            isAggregate={isAggregate}
                            selectedRegion={selectedRegion}
                            accentColor={accentColor}
                            isMobile={isMobile}
                        />
                        <DashboardCard>
                            <SectionTitle>Fleet Analytics</SectionTitle>
                            <DashboardCharts
                                dashboardPlant={dashboardPlant}
                                dashboardRegionCode={dashboardRegionCode}
                                regionPlants={regionPlants}
                                allPlants={allPlants}
                                statusHistoryData={statusHistoryData}
                                isAggregate={isAggregate}
                                stats={stats}
                            />
                        </DashboardCard>
                        <PeopleSection
                            displayStats={displayStats}
                            isAggregate={isAggregate}
                            filteredTrainingOperators={filteredTrainingOperators}
                            filteredPendingStartOperators={filteredPendingStartOperators}
                            filteredLightDutyOperators={filteredLightDutyOperators}
                            trainingCollapsed={trainingCollapsed}
                            setTrainingCollapsed={setTrainingCollapsed}
                            pendingCollapsed={pendingCollapsed}
                            setPendingCollapsed={setPendingCollapsed}
                            lightDutyCollapsed={lightDutyCollapsed}
                            setLightDutyCollapsed={setLightDutyCollapsed}
                            formatPendingDate={DateUtility.formatPendingDate}
                            accentColor={accentColor}
                        />
                        <MaintenanceQualitySection
                            displayStats={displayStats}
                            isAggregate={isAggregate}
                            statusHistoryData={statusHistoryData}
                            handleQuickDateFilter={handleQuickDateFilter}
                            isMobile={isMobile}
                        />
                    </div>
                )}
            </div>
            <PlantDropdownModal
                isOpen={plantModalOpen}
                onClose={() => setPlantModalOpen(false)}
                plants={regionPlants}
                onSelect={(plantCode) => setDashboardPlant(plantCode === 'All' ? '' : plantCode)}
                showAllPlants={true}
            />
            {embeddedView && (
                <EmbeddedViewModal
                    embeddedView={embeddedView}
                    embeddedViewSearch={embeddedViewSearch}
                    accentColor={accentColor}
                    onClose={() => {
                        setEmbeddedView(null)
                        setEmbeddedViewSearch('')
                    }}
                />
            )}
        </div>
    )
}
