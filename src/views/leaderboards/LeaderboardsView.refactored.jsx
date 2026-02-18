import React, { useState } from 'react'

import HelpDetailsModal from '../../app/components/HelpDetailsModal'
import LeaderboardItem, { LeaderboardSkeleton } from '../../app/components/LeaderboardItem'
import { LEADERBOARD_CATEGORIES } from '../../app/constants/leaderboardConstants'
import { usePreferences } from '../../app/context/PreferencesContext'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import { useLeaderboardData } from '../../app/hooks/useLeaderboardData'
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2024 }, (_, i) => 2025 + i)
const SKELETON_COUNT = 8

const FORMULA_PARTS = [
    'YPH Score',
    '×',
    'Load Efficiency',
    '×',
    'Cleanliness Score',
    '+',
    'Help Impact',
    '-',
    'Report Penalty',
    '-',
    'Safety Penalty'
]

function CategoryButton({ active, label, onClick }) {
    return (
        <button
            className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium outline-none transition-all md:px-5 md:py-2.5 md:text-sm ${
                active
                    ? 'border-2 border-accent bg-accent/10 font-semibold text-accent'
                    : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    )
}

function YearSelector({ selectedYear, onYearChange }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">YTD</span>
            <select
                value={selectedYear}
                onChange={(e) => onYearChange(parseInt(e.target.value))}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-[0.9375rem] font-semibold text-[#1e3a5f] outline-none transition-all focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
            >
                {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                        {year}
                    </option>
                ))}
            </select>
        </div>
    )
}

function EfficiencyInfoCard() {
    const isMobile = useIsMobile()

    return (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 md:mb-8 md:rounded-xl md:p-6">
            <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-[#1e3a5f] md:text-base">
                <i className="fas fa-info-circle" />
                <span>How Efficiency is Calculated</span>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 text-xs md:p-4 md:text-sm">
                {FORMULA_PARTS.map((part, idx) =>
                    ['×', '+', '-'].includes(part) ? (
                        <span key={idx} className="text-sm font-bold text-[#1e3a5f] md:text-base">
                            {part}
                        </span>
                    ) : (
                        <span
                            key={idx}
                            className="rounded-md bg-gray-50 px-2 py-1 font-medium text-gray-600 md:px-3 md:py-1.5"
                        >
                            {part}
                        </span>
                    )
                )}
            </div>
            {!isMobile && (
                <div className="flex gap-3 text-[0.8125rem] leading-relaxed text-gray-500">
                    <i className="fas fa-lightbulb" />
                    <span>
                        Higher efficiency indicates better plant performance across production, quality, fleet
                        cleanliness, and reporting compliance. Help Impact: Hours sent to help other plants are
                        subtracted from your total hours (benefiting your YPH), while hours received from other plants
                        are added to your total hours (reducing your YPH). This ensures fair comparison across plants
                        with different collaboration patterns.
                    </span>
                </div>
            )}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center md:p-16">
            <div className="mb-4 text-5xl text-gray-300">
                <i className="fas fa-inbox" />
            </div>
            <p className="m-0 mb-2 text-lg font-semibold text-gray-500">No data available</p>
            <span className="text-sm text-gray-400">Check back later as more reports are submitted</span>
        </div>
    )
}

export default function LeaderboardsView() {
    const { preferences } = usePreferences()
    const isMobile = useIsMobile()
    const [selectedCategory, setSelectedCategory] = useState('efficiency')
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
    const [helpModal, setHelpModal] = useState({ details: null, plant: null })

    const selectedRegionCode = preferences.selectedRegion?.code || null
    const { hoursAdjustmentsData, loading, plantMetrics } = useLeaderboardData(selectedRegionCode, selectedYear)
    const categoryData = LeaderboardsUtility.getCategoryData(plantMetrics, selectedCategory)

    const openHelpModal = (plant) => {
        const details = hoursAdjustmentsData[plant.plantCode]
        if (details && (details.hoursAdded > 0 || details.hoursSubtracted > 0)) {
            setHelpModal({ details, plant })
        }
    }

    const closeHelpModal = () => setHelpModal({ details: null, plant: null })

    return (
        <div className="h-full w-full overflow-y-auto bg-gray-50 p-4 md:p-8">
            <header className="mx-auto mb-4 max-w-[1400px] rounded-lg border border-gray-200 bg-white p-4 shadow-card md:mb-8 md:rounded-xl md:p-8">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-0">
                    <h1 className="m-0 text-xl font-bold text-gray-900 md:text-[1.75rem]">Performance Leaderboards</h1>
                    <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
                </div>
                <div className="flex flex-wrap gap-2">
                    {LEADERBOARD_CATEGORIES.map((cat) => (
                        <CategoryButton
                            key={cat.id}
                            active={selectedCategory === cat.id}
                            label={cat.label}
                            onClick={() => setSelectedCategory(cat.id)}
                        />
                    ))}
                </div>
            </header>

            <main className="mx-auto max-w-[1400px]">
                {selectedCategory === 'efficiency' && <EfficiencyInfoCard />}

                {loading ? (
                    <div className="flex flex-col gap-3 md:gap-4">
                        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                            <LeaderboardSkeleton key={i} />
                        ))}
                    </div>
                ) : categoryData.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="flex flex-col gap-3 md:gap-4">
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
