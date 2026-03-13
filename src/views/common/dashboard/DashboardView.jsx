import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import DashboardCharts from '../../../app/components/dashboard/DashboardCharts'
import DashboardHeader from '../../../app/components/dashboard/DashboardHeader'
import DashboardSidebar from '../../../app/components/dashboard/DashboardSidebar'
import DashboardSkeleton from '../../../app/components/dashboard/DashboardSkeleton'
import EmbeddedViewModal from '../../../app/components/dashboard/EmbeddedViewModal'
import FleetOverviewSection from '../../../app/components/dashboard/FleetOverviewSection'
import KeyMetricsStrip from '../../../app/components/dashboard/KeyMetricsStrip'
import MaintenanceQualitySection from '../../../app/components/dashboard/MaintenanceQualitySection'
import PeopleSection from '../../../app/components/dashboard/PeopleSection'
import { DashboardCard, SectionTitle } from '../../../app/components/ui/DashboardCards'
import { INITIAL_EXPANDED_SECTIONS } from '../../../app/constants/dashboardConstants'
import { usePreferences } from '../../../app/context/PreferencesContext'
import {
    buildFleetDomain,
    buildIssueDomain,
    buildOperatorDomain,
    buildPlantChatContext,
    buildRegionChatContext,
    useDashboardChat
} from '../../../app/hooks/useDashboardChat'
import { useDashboardAssets, useIssueCommentCounts, usePlantFilter } from '../../../app/hooks/useDashboardData'
import { useAITypingEffect, useAnimatedStats, useDateFilter } from '../../../app/hooks/useDashboardEffects'
import { useDashboardInit } from '../../../app/hooks/useDashboardInit'
import { useDashboardStats } from '../../../app/hooks/useDashboardStats'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
import {
    useAISummary,
    useLeaderboardMetrics,
    usePlantNotifications,
    useRegionalAISummary
} from '../../../app/hooks/usePlantNotifications'
import { useStatusHistory } from '../../../app/hooks/useStatusHistory'
import { PlantService } from '../../../services/PlantService'
import DateUtility from '../../../utils/DateUtility'
/**
 * Primary dashboard view with a sidebar + main content layout.
 * The sidebar houses alerts, people pipeline, AI insights, and plant rankings.
 * The main content displays key metrics, fleet overview, analytics, people, and maintenance.
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
    const isMultiPlantFilter = dashboardPlant === 'MY_PLANTS' || dashboardPlant?.startsWith('DISTRICT:')
    const isPlantMode = !!dashboardPlant && !isMultiPlantFilter
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
    const { handleRegenerateAISummary: handleRegeneratePlantAI } = useAISummary({
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

    // Select active AI state based on plant vs region mode
    const activeAiText = isPlantMode ? aiDisplayText : regionalDisplayText
    const activeAiPlan = isPlantMode ? aiActionPlan : regionalActionPlan
    const activeAiTypingComplete = isPlantMode ? isTypingComplete : regionalTypingComplete
    const activeShowActionPlan = isPlantMode ? showActionPlan : regionalShowActionPlan
    const activeVisibleItems = isPlantMode ? visibleActionItems : regionalVisibleActionItems
    const activeAiLoading = isPlantMode ? plantNotifications.aiSummaryLoading : regionalAI.aiSummaryLoading
    const activeAiFailed = isPlantMode ? plantNotifications.aiSummaryFailed : regionalAI.aiSummaryFailed
    const activeRegenerateAI = isPlantMode ? handleRegeneratePlantAI : handleRegenerateRegionalAI

    // Build chat context for whichever mode is active
    const plantChatContext = useMemo(
        () =>
            buildPlantChatContext({
                aiSummary: plantNotifications.aiSummary,
                dashboardPlant,
                isPlantManager,
                plantNotifications,
                userPlantCode,
                userRoleName
            }),
        [dashboardPlant, isPlantManager, plantNotifications, userPlantCode, userRoleName]
    )
    const regionChatContext = useMemo(
        () =>
            buildRegionChatContext({
                aiSummary: regionalAI.aiSummary,
                displayStats,
                plantNotifications,
                regionDisplayName: dashboardRegionName || 'Region',
                userRoleName
            }),
        [displayStats, dashboardRegionName, plantNotifications, regionalAI.aiSummary, userRoleName]
    )
    const chatContext = isPlantMode ? plantChatContext : regionChatContext

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

    // Scope operator status lists to the active plant set
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
            issues: buildIssueDomain(assetIssueDetails),
            operators: buildOperatorDomain(
                (allOperatorsRef.current || []).filter(inScope),
                filteredTrainingOperators,
                filteredPendingStartOperators,
                filteredLightDutyOperators
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataReady, dashboardPlant, dashboardRegionCode, stats.fleetTotal])

    const chat = useDashboardChat(chatContext, domainData)

    // Resolve display labels
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

    // Reveal animation state
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
    const REVEAL_DIRECTION_MAP = { left: 'animate-reveal-left', right: 'animate-reveal-right', up: 'animate-reveal-up' }
    const revealClass = (direction) => (revealContent ? REVEAL_DIRECTION_MAP[direction] || '' : '')
    const revealStyle = (delay) => (revealContent ? { animationDelay: `${delay}ms` } : undefined)

    return (
        <div className="dashboard-full-width min-h-screen bg-bg-secondary text-text-primary">
            <div className="flex min-h-screen">
                {/* Main content */}
                <main className="flex-1 min-w-0 flex flex-col">
                    <DashboardHeader
                        accentColor={accentColor}
                        isMobile={isMobile}
                        regionDisplayName={regionDisplayName}
                        heroRegionSub={heroRegionSub}
                        isLoading={showSkeleton}
                    />
                    <div className={`w-full flex-1 ${isMobile ? 'p-3' : 'p-6'}`}>
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
                            <>
                                <div className={revealClass('up')} style={revealStyle(0)}>
                                    <KeyMetricsStrip
                                        displayStats={displayStats}
                                        plantNotifications={plantNotifications}
                                        isPlantMode={isPlantMode}
                                        accentColor={accentColor}
                                        isMobile={isMobile}
                                    />
                                </div>
                                <div className={`grid ${isMobile ? 'gap-4' : 'gap-6'}`}>
                                    <div className={revealClass('left')} style={revealStyle(120)}>
                                        <FleetOverviewSection
                                            displayStats={displayStats}
                                            stats={stats}
                                            isAggregate={isAggregate}
                                            selectedRegion={selectedRegion}
                                            accentColor={accentColor}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                    <div className={revealClass('right')} style={revealStyle(200)}>
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
                                    <div className={revealClass('left')} style={revealStyle(280)}>
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
                                    <div className={revealClass('right')} style={revealStyle(360)}>
                                        <MaintenanceQualitySection
                                            displayStats={displayStats}
                                            isAggregate={isAggregate}
                                            statusHistoryData={statusHistoryData}
                                            handleQuickDateFilter={handleQuickDateFilter}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </main>

                {/* Sidebar */}
                {!isMobile && (
                    <DashboardSidebar
                        accentColor={accentColor}
                        aiActionPlan={activeAiPlan}
                        aiDisplayText={activeAiText}
                        aiSummaryFailed={activeAiFailed}
                        aiSummaryLoading={activeAiLoading}
                        chat={chat}
                        dashboardPlant={dashboardPlant}
                        dashboardRegionCode={dashboardRegionCode}
                        dataReady={dataReady}
                        expandedSections={expandedSections}
                        handleRegenerateAISummary={activeRegenerateAI}
                        isPlantManager={isPlantManager}
                        isPlantMode={isPlantMode}
                        isTypingComplete={activeAiTypingComplete}
                        onRefresh={onRefresh}
                        plantNotifications={plantNotifications}
                        refreshing={refreshing}
                        regionDisplayName={regionDisplayName}
                        regionPlants={regionPlants}
                        selectedRegion={selectedRegion}
                        setEmbeddedView={setEmbeddedView}
                        setEmbeddedViewSearch={setEmbeddedViewSearch}
                        setExpandedSections={setExpandedSections}
                        setPlantModalOpen={setPlantModalOpen}
                        showActionPlan={activeShowActionPlan}
                        userPlantCode={userPlantCode}
                        userRoleName={userRoleName}
                        visibleActionItems={activeVisibleItems}
                    />
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
