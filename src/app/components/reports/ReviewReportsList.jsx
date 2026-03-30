import React, { useMemo } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { ReportsListSkeleton } from '../ui/AssetListSkeleton'

const REPORT_ICONS = {
    district_manager: { icon: 'fa-map-marker-alt', bg: 'bg-purple-600' },
    plant_manager: { icon: 'fa-building', bg: 'bg-blue-700' },
    plant_production: { icon: 'fa-chart-bar', bg: 'bg-teal-600' },
    aggregate_production: { icon: 'fa-cubes', bg: 'bg-cyan-600' },
    safety_manager: { icon: 'fa-hard-hat', bg: 'bg-orange-500' },
    safety_environmental_rep: { icon: 'fa-leaf', bg: 'bg-green-600' },
    general_manager: { icon: 'fa-user-tie', bg: 'bg-slate-700' },
    ready_mix_instructor: { icon: 'fa-chalkboard-teacher', bg: 'bg-indigo-600' },
    test: { icon: 'fa-flask', bg: 'bg-gray-500' }
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 9999]

const BADGE_COLORS = {
    'This Week': 'text-blue-700 bg-blue-100',
    'Last Week': 'text-amber-700 bg-amber-100',
    Older: 'text-slate-600 bg-slate-100'
}

const PageSizeSelect = ({ value, onChange }) => (
    <div className="flex items-center gap-2 text-sm text-slate-500">
        <label className="hidden sm:inline">Show:</label>
        <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm cursor-pointer"
        >
            {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                    {opt === 9999 ? 'All' : opt}
                </option>
            ))}
        </select>
    </div>
)

const Pagination = ({ currentPage, totalPages, pageSize, onPageSizeChange, onPageChange }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 mt-4">
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
        <div className="flex items-center gap-2">
            <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${currentPage === 1 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50'}`}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
            >
                Prev
            </button>
            <span className="text-sm text-slate-500">
                {currentPage} / {totalPages}
            </span>
            <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50'}`}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
            >
                Next
            </button>
        </div>
    </div>
)

/** Single review report row inside a week group. */
const ReviewRow = ({ report, isReviewed, getUserName, accentColor, onReview }) => {
    const iconConfig = REPORT_ICONS[report.name] || { icon: 'fa-file-alt', bg: 'bg-slate-500' }
    const submittedDate = report.completedDate ? new Date(report.completedDate) : null
    const submittedLabel = submittedDate
        ? submittedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : ''
    const submitterName = getUserName(report.userId) || 'Unknown'
    const initials = submitterName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    return (
        <div
            className={`flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50`}
            onClick={() => onReview(report)}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-7 h-7 rounded-lg ${iconConfig.bg} flex items-center justify-center shrink-0`}>
                    <i className={`fas ${iconConfig.icon} text-white text-[10px]`} />
                </div>
                <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800 block truncate">{report.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: `${accentColor}20`, color: accentColor }}
                            >
                                <span className="text-[8px] font-bold">{initials}</span>
                            </div>
                            <span className="text-xs text-slate-500 truncate">{submitterName}</span>
                        </div>
                        {submittedLabel && (
                            <>
                                <span className="text-slate-300 text-[8px]">●</span>
                                <span className="text-xs text-slate-400">{submittedLabel}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {isReviewed ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                    <i className="fas fa-check text-[9px]" />
                    Reviewed
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
                    <i className="fas fa-flag text-[9px]" />
                    Pending
                </span>
            )}
            <button
                className="ml-3 px-3 py-1.5 rounded-md text-white text-xs font-semibold shrink-0 hidden sm:block"
                style={{ background: accentColor }}
                onClick={(e) => {
                    e.stopPropagation()
                    onReview(report)
                }}
            >
                Review
            </button>
            <i className="fas fa-chevron-right text-slate-300 text-xs ml-3 sm:hidden" />
        </div>
    )
}

/** A group of review reports for a single week. */
const ReviewWeekGroup = ({ weekIso, items, accentColor, reviewedByCurrentUser, getUserName, onReview }) => {
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const weekRange = ReportService.getWeekRangeString(monday, saturday)
    const badge = ReportUtility.getWeekBadge(weekIso)
    const reviewedCount = items.filter((r) => reviewedByCurrentUser.has(r.id)).length
    const totalCount = items.length
    const allReviewed = reviewedCount === totalCount
    const progressPercent = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0

    return (
        <div className="mb-5">
            <div className="flex items-center gap-3 mb-2 px-1">
                <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${BADGE_COLORS[badge] || BADGE_COLORS.Older}`}
                >
                    {badge}
                </span>
                <span className="text-xs text-slate-400">{weekRange}</span>
                <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        allReviewed ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'
                    }`}
                >
                    {reviewedCount}/{totalCount} reviewed
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 max-w-[120px]">
                    <div
                        className={`h-full rounded-full transition-all ${allReviewed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {items.map((report) => (
                    <ReviewRow
                        key={report.id}
                        report={report}
                        isReviewed={reviewedByCurrentUser.has(report.id)}
                        getUserName={getUserName}
                        accentColor={accentColor}
                        onReview={onReview}
                    />
                ))}
            </div>
        </div>
    )
}

/** Paginated list of review reports grouped by week. */
function ReviewReportsList({
    isLoading,
    items,
    reviewedByCurrentUser,
    pageSize,
    currentPage,
    totalPages,
    onPageSizeChange,
    onPageChange,
    onReview,
    getUserName
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    const groupedByWeek = useMemo(() => {
        const groups = {}
        for (const report of items) {
            const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : 'unknown'
            if (!groups[weekIso]) groups[weekIso] = []
            groups[weekIso].push(report)
        }
        return Object.keys(groups)
            .sort((a, b) => (a > b ? -1 : 1))
            .map((key) => ({ weekIso: key, items: groups[key] }))
    }, [items])

    if (items.length === 0 && !isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
                    <i className="fas fa-user-check text-4xl mb-3" />
                    <div className="text-sm">No reports to review</div>
                </div>
            </div>
        )
    }

    return (
        <div>
            {isLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <ReportsListSkeleton columnCount={6} />
                </div>
            ) : (
                groupedByWeek.map(({ weekIso, items: weekItems }) => (
                    <ReviewWeekGroup
                        key={weekIso}
                        weekIso={weekIso}
                        items={weekItems}
                        accentColor={accentColor}
                        reviewedByCurrentUser={reviewedByCurrentUser}
                        getUserName={getUserName}
                        onReview={onReview}
                    />
                ))
            )}
            {items.length > 0 && totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageSizeChange={onPageSizeChange}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    )
}
export default ReviewReportsList
