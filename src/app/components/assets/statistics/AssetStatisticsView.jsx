import React, { useEffect, useMemo, useRef, useState } from 'react'

import { usePreferences } from '../../../context/PreferencesContext'
import useAssetData from '../../../hooks/useAssetData'
import useAssetStatistics from '../../../hooks/useAssetStatistics'
import useStatisticsPeriod from '../../../hooks/useStatisticsPeriod'
import TabFadeIn from '../../common/TabFadeIn'
import AssetListSkeleton from '../../ui/AssetListSkeleton'
import { AssetStatisticsControls } from './AssetStatisticsControls'
import { AssetStatisticsKpiStrip } from './AssetStatisticsKpiStrip'
import { AssetStatisticsSectionTabs, AssetStatisticsSidebar, useAssetStatsSections } from './AssetStatisticsSidebar'
import AssetStatisticsAgingPage from './pages/AssetStatisticsAgingPage'
import AssetStatisticsCleanlinessPage from './pages/AssetStatisticsCleanlinessPage'
import AssetStatisticsFleetStatusPage from './pages/AssetStatisticsFleetStatusPage'
import AssetStatisticsHoursPage from './pages/AssetStatisticsHoursPage'
import AssetStatisticsIssuesPage from './pages/AssetStatisticsIssuesPage'
import AssetStatisticsOperatorsPage from './pages/AssetStatisticsOperatorsPage'
import AssetStatisticsOverviewPage from './pages/AssetStatisticsOverviewPage'
import AssetStatisticsPlantDistributionPage from './pages/AssetStatisticsPlantDistributionPage'
import AssetStatisticsServicePage from './pages/AssetStatisticsServicePage'
import AssetStatisticsShopPerformancePage from './pages/AssetStatisticsShopPerformancePage'
import AssetStatisticsVerificationPage from './pages/AssetStatisticsVerificationPage'

/**
 * Statistics dashboard for any asset type. Mirrors the Operations >
 * Statistics layout: sticky left rail navigates between dedicated sub-pages,
 * KPI strip + plant filter stay above the split. Owns its own
 * `useAssetData` so the statistics view doesn't depend on the list view's
 * state — toggling tabs keeps both views responsive and the shared
 * realtime channel keeps both in sync.
 */
function AssetStatisticsView({ config, onSelectAsset, title }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [activeSection, setActiveSection] = useState('overview')
    const [selectedPlant, setSelectedPlant] = useState('')
    const periodState = useStatisticsPeriod('month')

    /** `useAssetData` expects a `searchText` + `selectedPlant` for the list
     *  view's filtering pass; statistics doesn't reuse those, so pass
     *  blank values and let the hook fetch everything in the region. The
     *  ref placeholder satisfies the contract without writing back to any
     *  persisted filter store. */
    const updateFilterRef = useRef(() => {})
    const { isLoading, items, operators, plants, regionPlantCodes } = useAssetData({
        config,
        onResetSelectedPlant: () => {},
        preferences,
        searchText: '',
        selectedPlant: '',
        updateFilterRef
    })

    const stats = useAssetStatistics({
        config,
        dateRange: periodState.range.current,
        items,
        operators,
        plants,
        regionPlantCodes,
        selectedPlant
    })

    const sections = useAssetStatsSections({ config, summary: stats.summary })

    /** Guard against deep links / config drift selecting a section that
     *  doesn't apply to this asset type (e.g. cleanliness on pickup trucks)
     *  — quietly snap back to the first available section. */
    const safeActiveSection = useMemo(() => {
        if (sections.some((section) => section.id === activeSection)) return activeSection
        return sections[0]?.id || 'overview'
    }, [activeSection, sections])

    const sectionMeta = useMemo(
        () => sections.find((section) => section.id === safeActiveSection) || sections[0],
        [safeActiveSection, sections]
    )

    /* Reset scroll on every section change. The actual scroll surface lives
     * on the Navigation chrome (`<main data-content-scroll>` in TopBar /
     * TwoLevel / Mobile variants), not inside this view, so we use the same
     * `[data-content-scroll]` selector App.jsx uses for view-level resets.
     * Hits every marked scroll container (Navigation wrapper + this view's
     * own inner container) so the user lands at the top of the new page
     * regardless of which layout is active. */
    useEffect(() => {
        if (typeof document === 'undefined') return
        document.querySelectorAll('[data-content-scroll]').forEach((el) => {
            if (typeof el?.scrollTo === 'function') el.scrollTo({ top: 0 })
            else if (el) el.scrollTop = 0
        })
    }, [safeActiveSection])

    if (isLoading && items.length === 0) {
        return (
            <div className="flex-1 min-h-0 overflow-y-auto animate-fade-in-fast">
                <AssetListSkeleton viewMode="list" />
            </div>
        )
    }

    const commonPageProps = {
        accentColor,
        config,
        onSelectAsset,
        stats
    }

    const renderActiveSection = () => {
        switch (safeActiveSection) {
            case 'fleetStatus':
                return <AssetStatisticsFleetStatusPage {...commonPageProps} />
            case 'plants':
                return <AssetStatisticsPlantDistributionPage {...commonPageProps} />
            case 'service':
                return <AssetStatisticsServicePage {...commonPageProps} />
            case 'hours':
                return <AssetStatisticsHoursPage {...commonPageProps} />
            case 'shopPerformance':
                return <AssetStatisticsShopPerformancePage {...commonPageProps} />
            case 'verification':
                return <AssetStatisticsVerificationPage {...commonPageProps} />
            case 'cleanliness':
                return <AssetStatisticsCleanlinessPage {...commonPageProps} />
            case 'operators':
                return <AssetStatisticsOperatorsPage {...commonPageProps} />
            case 'issues':
                return <AssetStatisticsIssuesPage {...commonPageProps} />
            case 'aging':
                return <AssetStatisticsAgingPage {...commonPageProps} />
            case 'overview':
            default:
                return <AssetStatisticsOverviewPage {...commonPageProps} onSelectSection={setActiveSection} />
        }
    }

    return (
        <div className="flex-1 min-h-0 overflow-y-auto animate-fade-in-fast" data-content-scroll>
            <div className="px-3 sm:px-4 md:px-6 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-col">
                        <span className="text-[18px] font-bold text-text-primary leading-tight">{title}</span>
                        <span className="text-[12px] text-text-secondary">Fleet statistics &amp; health</span>
                    </div>
                    <AssetStatisticsControls
                        accentColor={accentColor}
                        anchor={periodState.anchor}
                        availablePlantCodes={stats.availablePlantCodes}
                        customEnd={periodState.customEnd}
                        customStart={periodState.customStart}
                        period={periodState.period}
                        plantNames={stats.plantNames}
                        range={periodState.range}
                        selectedPlant={selectedPlant}
                        setAnchor={periodState.setAnchor}
                        setCustomEnd={periodState.setCustomEnd}
                        setCustomStart={periodState.setCustomStart}
                        setPeriod={periodState.setPeriod}
                        setSelectedPlant={setSelectedPlant}
                    />
                </div>

                <AssetStatisticsKpiStrip config={config} summary={stats.summary} />

                <AssetStatisticsSectionTabs
                    accentColor={accentColor}
                    activeSection={safeActiveSection}
                    onSelect={setActiveSection}
                    sections={sections}
                />

                <div className="flex gap-4 items-start">
                    <AssetStatisticsSidebar
                        accentColor={accentColor}
                        activeSection={safeActiveSection}
                        onSelect={setActiveSection}
                        sections={sections}
                    />
                    <TabFadeIn animationKey={safeActiveSection} className="flex-1 min-w-0 flex flex-col gap-3">
                        {sectionMeta && (
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-[15px] font-bold m-0 text-text-primary">{sectionMeta.label}</h2>
                                <span className="text-[11.5px] text-text-tertiary">{sectionMeta.description}</span>
                            </div>
                        )}

                        {renderActiveSection()}
                    </TabFadeIn>
                </div>
            </div>
        </div>
    )
}

export default AssetStatisticsView
