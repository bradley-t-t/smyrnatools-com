import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

import PlantDropdownModal from '../../app/components/common/PlantDropdownModal'
import DashboardCharts from '../../app/components/dashboard/DashboardCharts'
import DashboardHeader from '../../app/components/dashboard/DashboardHeader'
import DashboardPlantSummary from '../../app/components/dashboard/DashboardPlantSummary'
import DashboardRegionSummary from '../../app/components/dashboard/DashboardRegionSummary'
import DashboardSkeleton from '../../app/components/dashboard/DashboardSkeleton'
import EmbeddedViewModal from '../../app/components/dashboard/EmbeddedViewModal'
import FleetOverviewSection from '../../app/components/dashboard/FleetOverviewSection'
import MaintenanceQualitySection from '../../app/components/dashboard/MaintenanceQualitySection'
import PeopleSection from '../../app/components/dashboard/PeopleSection'
import { DashboardCard, SectionTitle } from '../../app/components/ui/DashboardCards'
import { INITIAL_EXPANDED_SECTIONS } from '../../app/constants/dashboardConstants'
import { usePreferences } from '../../app/context/PreferencesContext'
import { buildFleetDomain, buildIssueDomain, buildOperatorDomain } from '../../app/hooks/useDashboardChat'
import { useDashboardAssets, useIssueCommentCounts, usePlantFilter } from '../../app/hooks/useDashboardData'
import { useAITypingEffect, useAnimatedStats, useDateFilter } from '../../app/hooks/useDashboardEffects'
import { useDashboardInit } from '../../app/hooks/useDashboardInit'
import { useDashboardStats } from '../../app/hooks/useDashboardStats'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import {
    useAISummary,
    useLeaderboardMetrics,
    usePlantNotifications,
    useRegionalAISummary
} from '../../app/hooks/usePlantNotifications'
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
        userAdditionalPlants,
        userPlantCode,
        userRoleName,
        userRoleWeight
    } = useDashboardInit({ plantSetRef, preferences })
    const myPlantCodesSet = useMemo(() => {
        if (!userPlantCode && !userAdditionalPlants.length) return null
        const codes = new Set()
        if (userPlantCode) codes.add(userPlantCode)
        userAdditionalPlants.forEach((code) => codes.add(code))
        return codes
    }, [userPlantCode, userAdditionalPlants])
    const hasMyPlants = userAdditionalPlants.length > 0
    const isMultiPlantFilter = dashboardPlant === 'MY_PLANTS' || dashboardPlant?.startsWith('DISTRICT:')
    const plantFilter = usePlantFilter(dashboardRegionCode, dashboardPlant, regionPlants, allPlants, myPlantCodesSet)
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
    const { aiActionPlan, aiDisplayText, isTypingComplete, showActionPlan, visibleActionItems } = useAITypingEffect(
        plantNotifications.aiSummary,
        dashboardPlant
    )
    const [regionalAI, setRegionalAI] = useState({ aiSummary: null, aiSummaryFailed: false, aiSummaryLoading: false })
    const { handleRegenerateRegionalAI } = useRegionalAISummary({
        dashboardPlant,
        dataReady,
        displayStats,
        plantNotifications,
        regionDisplayName: dashboardRegionName || 'Region',
        regionPlants,
        setRegionalAI,
        userRoleName,
        userRoleWeight
    })
    const {
        aiActionPlan: regionalActionPlan,
        aiDisplayText: regionalDisplayText,
        isTypingComplete: regionalTypingComplete,
        showActionPlan: regionalShowActionPlan,
        visibleActionItems: regionalVisibleActionItems
    } = useAITypingEffect(regionalAI.aiSummary, dashboardPlant)
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
    const wasLoadingRef = useRef(true)
    const hasRevealedRef = useRef(false)
    const [revealContent, setRevealContent] = useState(false)
    useEffect(() => {
        if (wasLoadingRef.current && !showSkeleton && !hasRevealedRef.current) {
            hasRevealedRef.current = true
            setRevealContent(true)
            const timer = setTimeout(() => setRevealContent(false), 1500)
            return () => clearTimeout(timer)
        }
        wasLoadingRef.current = showSkeleton
    }, [showSkeleton])
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
        if (dashboardPlant === 'MY_PLANTS') return 'My Plants'
        if (dashboardPlant?.startsWith('DISTRICT:')) return dashboardPlant.slice(9)
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
    const domainData = useMemo(() => {
        if (!dataReady) return null
        const plantSet = activePlantSetRef.current
        const inScope = (a) => !plantSet || plantSet.size === 0 || plantSet.has(a.plantCode)
        return {
            fleet: buildFleetDomain(
                (allMixersRef.current || []).filter(inScope),
                (allTractorsRef.current || []).filter(inScope),
                (allTrailersRef.current || []).filter(inScope),
                (allEquipmentRef.current || []).filter(inScope)
            ),
            operators: buildOperatorDomain(
                (allOperatorsRef.current || []).filter(inScope),
                filteredTrainingOperators,
                filteredPendingStartOperators,
                filteredLightDutyOperators
            ),
            issues: buildIssueDomain(assetIssueDetails)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataReady, dashboardPlant, dashboardRegionCode, stats.fleetTotal])
    const revealClass = (direction, delay) => (revealContent ? `dash-reveal-${direction}` : '')
    const revealStyle = (delay) => (revealContent ? { animationDelay: `${delay}ms` } : undefined)
    return (
        <div className="dashboard-full-width min-h-screen bg-bg-secondary text-text-primary">
            <style>{`
                @keyframes dashRevealLeft {
                    from { opacity: 0; transform: translateX(-18px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes dashRevealRight {
                    from { opacity: 0; transform: translateX(18px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes dashRevealUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .dash-reveal-left {
                    animation: dashRevealLeft 0.5s ease-out both;
                }
                .dash-reveal-right {
                    animation: dashRevealRight 0.5s ease-out both;
                }
                .dash-reveal-up {
                    animation: dashRevealUp 0.5s ease-out both;
                }
            `}</style>
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
                isLoading={showSkeleton}
            />
            <div className={`mx-auto max-w-full ${isMobile ? 'p-3' : 'p-6'}`}>
                {!showSkeleton && dashboardPlant && !isMultiPlantFilter && (
                    <div className={revealClass('left', 0)} style={revealStyle(0)}>
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
                            visibleActionItems={visibleActionItems}
                            handleRegenerateAISummary={handleRegenerateAISummary}
                            userRoleName={userRoleName}
                            userPlantCode={userPlantCode}
                            isPlantManager={isPlantManager}
                            isMobile={isMobile}
                            domainData={domainData}
                        />
                    </div>
                )}
                {!showSkeleton && (!dashboardPlant || isMultiPlantFilter) && (
                    <div className={revealClass('left', 0)} style={revealStyle(0)}>
                        <DashboardRegionSummary
                            regionDisplayName={regionDisplayName}
                            regionSubtitle={heroRegionSub}
                            plantNotifications={plantNotifications}
                            displayStats={displayStats}
                            expandedSections={expandedSections}
                            setExpandedSections={setExpandedSections}
                            setEmbeddedView={setEmbeddedView}
                            setEmbeddedViewSearch={setEmbeddedViewSearch}
                            isMobile={isMobile}
                            dataReady={dataReady}
                            aiDisplayText={regionalDisplayText}
                            aiActionPlan={regionalActionPlan}
                            isTypingComplete={regionalTypingComplete}
                            showActionPlan={regionalShowActionPlan}
                            visibleActionItems={regionalVisibleActionItems}
                            aiSummaryLoading={regionalAI.aiSummaryLoading}
                            aiSummaryFailed={regionalAI.aiSummaryFailed}
                            aiSummary={regionalAI.aiSummary}
                            handleRegenerateAISummary={handleRegenerateRegionalAI}
                            userRoleName={userRoleName}
                            domainData={domainData}
                        />
                    </div>
                )}
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
                        <div className={revealClass('left', 120)} style={revealStyle(120)}>
                            <FleetOverviewSection
                                displayStats={displayStats}
                                stats={stats}
                                isAggregate={isAggregate}
                                selectedRegion={selectedRegion}
                                accentColor={accentColor}
                                isMobile={isMobile}
                            />
                        </div>
                        <div className={revealClass('right', 200)} style={revealStyle(200)}>
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
                                    isMobile={isMobile}
                                />
                            </DashboardCard>
                        </div>
                        <div className={revealClass('left', 280)} style={revealStyle(280)}>
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
                        </div>
                        <div className={revealClass('right', 360)} style={revealStyle(360)}>
                            <MaintenanceQualitySection
                                displayStats={displayStats}
                                isAggregate={isAggregate}
                                statusHistoryData={statusHistoryData}
                                handleQuickDateFilter={handleQuickDateFilter}
                                isMobile={isMobile}
                            />
                        </div>
                    </div>
                )}
            </div>
            <PlantDropdownModal
                isOpen={plantModalOpen}
                onClose={() => setPlantModalOpen(false)}
                plants={regionPlants}
                onSelect={(plantCode) => setDashboardPlant(plantCode === 'All' ? '' : plantCode)}
                showAllPlants={true}
                showMyPlants={false}
                userPlantCode={userPlantCode}
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
