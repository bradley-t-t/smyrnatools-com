import React, { useEffect, useMemo, useState } from 'react'

import { OperatorService } from '../../../../services/OperatorService'
import { PlantService } from '../../../../services/PlantService'
import { UserService } from '../../../../services/UserService'
import { usePreferences } from '../../../context/PreferencesContext'
import usePersonStatistics from '../../../hooks/usePersonStatistics'
import useStatisticsPeriod from '../../../hooks/useStatisticsPeriod'
import TabFadeIn from '../../common/TabFadeIn'
import AssetListSkeleton from '../../ui/AssetListSkeleton'
import { PersonStatisticsControls } from './PersonStatisticsControls'
import { PersonStatisticsKpiStrip } from './PersonStatisticsKpiStrip'
import {
    PersonActivityPage,
    PersonCoveragePage,
    PersonHiringTrainingPage,
    PersonOverviewPage,
    PersonPlantsPage,
    PersonRatingPage,
    PersonRolesPage,
    PersonStatusPage
} from './PersonStatisticsPages'
import { PersonStatisticsSectionTabs, PersonStatisticsSidebar, usePersonStatsSections } from './PersonStatisticsSidebar'

const TITLES = {
    managers: 'Manager Roster',
    operators: 'Operator Roster'
}

/**
 * Statistics dashboard for an operator or manager roster. Owns its own
 * fetch so the surface is fully decoupled from the list view's state —
 * tab switches keep both views responsive. The layout mirrors the asset
 * Statistics surface (KPI strip, sticky sidebar, mobile section tabs)
 * so the two products feel like one.
 */
function PersonStatisticsView({ kind, title }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [activeSection, setActiveSection] = useState('overview')
    const [selectedPlant, setSelectedPlant] = useState('')
    const periodState = useStatisticsPeriod('month')
    const [items, setItems] = useState([])
    const [plants, setPlants] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    /** Self-contained data load — runs once on mount and whenever the user
     *  swaps regions. The list view has its own loader; statistics
     *  intentionally re-fetches so it always reads a fresh roster snapshot
     *  on tab focus. */
    useEffect(() => {
        let cancelled = false
        async function load() {
            setIsLoading(true)
            try {
                const codes = await PlantService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const [people, plantList] = await Promise.all([
                    kind === 'operators'
                        ? OperatorService.fetchOperators()
                        : UserService.getAllUsersWithProfilesAndRoles(),
                    preferences.selectedRegion?.code
                        ? PlantService.fetchRegionPlants(preferences.selectedRegion.code)
                        : PlantService.fetchPlants()
                ])
                if (cancelled) return
                setItems(Array.isArray(people) ? people : [])
                setPlants(Array.isArray(plantList) ? plantList : [])
            } catch {
                if (!cancelled) {
                    setItems([])
                    setPlants([])
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [kind, preferences.selectedRegion?.code])

    const stats = usePersonStatistics({
        dateRange: periodState.range.current,
        items,
        kind,
        plants,
        regionPlantCodes,
        selectedPlant
    })

    const sections = usePersonStatsSections({ kind, summary: stats.summary })

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

    const commonProps = { accentColor, kind, stats }
    const renderActiveSection = () => {
        switch (safeActiveSection) {
            case 'status':
                return <PersonStatusPage {...commonProps} />
            case 'plants':
                return <PersonPlantsPage {...commonProps} />
            case 'roles':
                return <PersonRolesPage {...commonProps} />
            case 'hiringTraining':
                return <PersonHiringTrainingPage {...commonProps} />
            case 'rating':
                return <PersonRatingPage {...commonProps} />
            case 'activity':
                return <PersonActivityPage {...commonProps} />
            case 'coverage':
                return <PersonCoveragePage {...commonProps} />
            case 'overview':
            default:
                return <PersonOverviewPage {...commonProps} onSelectSection={setActiveSection} />
        }
    }

    return (
        <div className="flex-1 min-h-0 overflow-y-auto animate-fade-in-fast" data-content-scroll>
            <div className="px-3 sm:px-4 md:px-6 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-col">
                        <span className="text-[18px] font-bold text-text-primary leading-tight">
                            {title || TITLES[kind]}
                        </span>
                        <span className="text-[12px] text-text-secondary">Roster statistics &amp; health</span>
                    </div>
                    <PersonStatisticsControls
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

                <PersonStatisticsKpiStrip kind={kind} summary={stats.summary} />

                <PersonStatisticsSectionTabs
                    accentColor={accentColor}
                    activeSection={safeActiveSection}
                    onSelect={setActiveSection}
                    sections={sections}
                />

                <div className="flex gap-4 items-start">
                    <PersonStatisticsSidebar
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

export default PersonStatisticsView
