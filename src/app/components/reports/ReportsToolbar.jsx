import React from 'react'

import TopSection from '../../../app/components/sections/TopSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { reportTypes } from '../../../types/ReportTypes'

const TAB_LABELS = { all: 'My Reports', review: 'Review' }

const RefreshButton = ({ accentColor, isRefreshing, onClick }) => (
    <button
        className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 rounded-lg text-white text-xs sm:text-sm font-semibold transition-all"
        style={{ background: accentColor }}
        onClick={onClick}
        type="button"
    >
        <i className={`fas fa-sync ${isRefreshing ? 'fa-spin' : ''}`} />
        <span className="hidden sm:inline">Refresh</span>
    </button>
)

const ReportTypeFilter = ({ value, onChange, options }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-800 cursor-pointer min-w-[120px] sm:min-w-[140px] pr-8 sm:pr-9 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] sm:bg-[right_10px_center] bg-no-repeat transition-all focus:outline-none focus:border-[#1e3a5f]"
    >
        <option value="">All Types</option>
        {options.map((rt) => (
            <option key={rt.name} value={rt.name}>
                {rt.title}
            </option>
        ))}
    </select>
)

const TabButton = ({ isActive, accentColor, label, onClick }) => (
    <button
        className={`px-3 py-2 sm:px-3.5 rounded-md text-xs sm:text-sm font-medium transition-all ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
        style={isActive ? { background: accentColor } : {}}
        onClick={onClick}
        type="button"
    >
        {label}
    </button>
)

/** Toolbar with refresh, report type filter, plant selector, and My Reports / Review tabs. */
function ReportsToolbar({
    tab,
    onTabChange,
    filterReportType,
    onFilterReportTypeChange,
    plantDisplayText,
    onPlantModalOpen,
    isRefreshing,
    onRefresh,
    hasAssigned,
    hasReviewPermission,
    hasAnyReviewPermission,
    regionType,
    isLoading = false
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    const filteredReportTypes = reportTypes.filter(
        (rt) =>
            (tab === 'all' ? hasAssigned[rt.name] : hasReviewPermission[rt.name]) &&
            (regionType !== 'office' || rt.name === 'general_manager')
    )

    return (
        <TopSection
            isLoading={isLoading}
            title="Reports"
            hideViewModeToggle
            hidePlantFilter
            sticky
            listLabels={[]}
            searchPlaceholder="Search by name or report type"
            customFilters={
                <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                    <RefreshButton accentColor={accentColor} isRefreshing={isRefreshing} onClick={onRefresh} />
                    <ReportTypeFilter
                        value={filterReportType}
                        onChange={onFilterReportTypeChange}
                        options={filteredReportTypes}
                    />
                    <button
                        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-800 cursor-pointer max-w-[140px] sm:max-w-[200px] truncate pr-8 sm:pr-9 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] sm:bg-[right_10px_center] bg-no-repeat transition-all text-left"
                        onClick={onPlantModalOpen}
                        type="button"
                    >
                        {plantDisplayText}
                    </button>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <TabButton
                            isActive={tab === 'all'}
                            accentColor={accentColor}
                            label={TAB_LABELS.all}
                            onClick={() => onTabChange('all')}
                        />
                        {hasAnyReviewPermission && (
                            <TabButton
                                isActive={tab === 'review'}
                                accentColor={accentColor}
                                label={TAB_LABELS.review}
                                onClick={() => onTabChange('review')}
                            />
                        )}
                    </div>
                </div>
            }
        />
    )
}

export default ReportsToolbar
