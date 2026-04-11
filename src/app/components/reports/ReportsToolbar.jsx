import React from 'react'

import TopSection from '../../../app/components/sections/TopSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { reportTypes } from '../../types/ReportTypes'

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

const QC_TYPE_OPTIONS = [
    { value: 'all', label: 'All Types' },
    { value: 'qc_strength', label: 'QC Strength' },
    { value: 'third_party_lab', label: 'Third Party Lab' }
]

const QC_STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'reviewed', label: 'Reviewed' }
]

const PillToggle = ({ options, value, onChange }) => (
    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 gap-0.5">
        {options.map((opt) => (
            <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    value === opt.value
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
)

/** Toolbar with TopSection, filters, and optional stats content. */
function ReportsToolbar({
    tab,
    filterReportType,
    onFilterReportTypeChange,
    plantDisplayText,
    onPlantModalOpen,
    isRefreshing,
    onRefresh,
    hasAssigned,
    hasReviewPermission,
    regionType,
    isLoading = false,
    statsContent = null,
    searchInput,
    onSearchInputChange,
    onClearSearch,
    qcTypeFilter,
    onQcTypeFilterChange,
    qcStatusFilter,
    onQcStatusFilterChange,
    qcSort,
    onQcSortChange,
    qcDateFrom,
    onQcDateFromChange,
    qcDateTo,
    onQcDateToChange,
    qcHasActiveFilters,
    onClearQcFilters
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const filteredReportTypes = reportTypes.filter(
        (rt) =>
            (hasAssigned[rt.name] || hasReviewPermission[rt.name]) &&
            (regionType !== 'office' || rt.name === 'general_manager')
    )

    const qcFilterBar =
        tab === 'quality' ? (
            <div className="flex items-center flex-wrap gap-2 w-full">
                <PillToggle options={QC_TYPE_OPTIONS} value={qcTypeFilter} onChange={onQcTypeFilterChange} />
                <PillToggle options={QC_STATUS_OPTIONS} value={qcStatusFilter} onChange={onQcStatusFilterChange} />
                {qcHasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClearQcFilters}
                        className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <i className="fas fa-times text-[10px]" />
                        Clear
                    </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                    <select
                        value={qcSort}
                        onChange={(e) => onQcSortChange(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer pr-7 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_6px_center] bg-no-repeat focus:outline-none"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="cast_desc">Cast Date ↓</option>
                        <option value="cast_asc">Cast Date ↑</option>
                    </select>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-2">
                        <i className="fas fa-calendar-alt text-slate-400 text-[10px]" />
                        <input
                            type="date"
                            value={qcDateFrom}
                            onChange={(e) => onQcDateFromChange(e.target.value)}
                            className="text-xs text-slate-600 bg-transparent focus:outline-none w-[6.5rem]"
                        />
                        <span className="text-slate-300 text-[10px] select-none mx-0.5">–</span>
                        <input
                            type="date"
                            value={qcDateTo}
                            onChange={(e) => onQcDateToChange(e.target.value)}
                            className="text-xs text-slate-600 bg-transparent focus:outline-none w-[6.5rem]"
                        />
                    </div>
                </div>
            </div>
        ) : null

    const bottomContent = (
        <>
            {qcFilterBar}
            {statsContent}
        </>
    )

    const qcBottomSkeleton =
        tab === 'quality' ? (
            <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-56 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-8 w-44 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-8 w-48 rounded-lg bg-slate-100 animate-pulse" />
            </div>
        ) : null

    return (
        <TopSection
            isLoading={isLoading}
            title="Reports"
            hideViewModeToggle
            hidePlantFilter
            sticky
            searchPlaceholder="Search by name or report type"
            searchInput={searchInput}
            onSearchInputChange={onSearchInputChange}
            onClearSearch={onClearSearch}
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
                </div>
            }
            customBottomContent={bottomContent}
            customBottomSkeleton={qcBottomSkeleton}
        />
    )
}
export default ReportsToolbar
