import React, { useState } from 'react'

import EfficiencyInfoCard from '../../app/components/leaderboards/EfficiencyInfoCard'
import HelpDetailsModal from '../../app/components/leaderboards/HelpDetailsModal'
import LeaderboardCategorySelector from '../../app/components/leaderboards/LeaderboardCategorySelector'
import LeaderboardItem, { LeaderboardSkeleton } from '../../app/components/leaderboards/LeaderboardItem'
import EmptyState from '../../app/components/ui/EmptyState'
import YearSelector from '../../app/components/ui/YearSelector'
import { usePreferences } from '../../app/context/PreferencesContext'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import { useLeaderboardData } from '../../app/hooks/useLeaderboardData'
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'

const CURRENT_YEAR = new Date().getFullYear()
const SKELETON_COUNT = 5

/** Subtle grid overlay for the header background, tinted to the user's accent color. */
const GRID_PATTERN_STYLE = (accentColor) => ({
    backgroundImage: `
        linear-gradient(${accentColor}10 1px, transparent 1px),
        linear-gradient(90deg, ${accentColor}10 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px'
})

/**
 * Region-scoped plant leaderboard view. Ranks plants by a selectable
 * performance category (efficiency, quality, safety, etc.) for a given year.
 * Provides a drill-down modal showing hours-adjustment details when
 * a plant has recorded time additions or subtractions.
 */
export default function LeaderboardsView() {
    const { preferences } = usePreferences()
    const isMobile = useIsMobile()
    const [selectedCategory, setSelectedCategory] = useState('efficiency')
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
    const [helpModal, setHelpModal] = useState({ details: null, plant: null })

    const selectedRegionCode = preferences.selectedRegion?.code ?? null
    const accentColor = preferences.accentColor || '#1e3a5f'
    const { hoursAdjustmentsData, loading, plantMetrics } = useLeaderboardData(selectedRegionCode, selectedYear)
    const categoryData = LeaderboardsUtility.getCategoryData(plantMetrics, selectedCategory)

    /** Opens the hours-adjustment detail modal only if the plant has non-zero adjustment data. */
    const openHelpModal = (plant) => {
        const details = hoursAdjustmentsData[plant.plantCode]
        if (details?.hoursAdded > 0 || details?.hoursSubtracted > 0) {
            setHelpModal({ details, plant })
        }
    }

    const closeHelpModal = () => setHelpModal({ details: null, plant: null })

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
            <header className="border-b border-slate-200 bg-white shadow-sm" style={GRID_PATTERN_STYLE(accentColor)}>
                <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Leaderboards</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Track and compare plant performance across your region
                            </p>
                        </div>
                        <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} startYear={2025} />
                    </div>

                    <LeaderboardCategorySelector
                        selectedId={selectedCategory}
                        onSelect={setSelectedCategory}
                        showGroups={!isMobile}
                        accentColor={accentColor}
                    />
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
                {selectedCategory === 'efficiency' && <EfficiencyInfoCard />}

                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                            <LeaderboardSkeleton key={i} />
                        ))}
                    </div>
                ) : categoryData.length === 0 ? (
                    <EmptyState
                        icon="fa-chart-bar"
                        title="No leaderboard data yet"
                        subtitle="Check back later as more reports are submitted"
                    />
                ) : (
                    <div className="space-y-3">
                        {categoryData.map((plant, index) => (
                            <LeaderboardItem
                                key={plant.plantCode}
                                plant={plant}
                                rank={index + 1}
                                selectedCategory={selectedCategory}
                                onHelpClick={() => openHelpModal(plant)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {helpModal.details && (
                <HelpDetailsModal details={helpModal.details} plant={helpModal.plant} onClose={closeHelpModal} />
            )}
        </div>
    )
}
