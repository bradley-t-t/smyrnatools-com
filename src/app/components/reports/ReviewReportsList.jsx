import React from 'react'

import LoadingScreen from '../../../app/components/common/LoadingScreen'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 9999]

const BADGE_COLORS = {
    'Last Week': 'bg-amber-100 text-amber-800',
    Older: 'bg-slate-100 text-slate-600',
    'This Week': 'bg-blue-100 text-blue-800'
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-slate-50">
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

/** Reviewed/Pending status indicator badge. */
const ReviewStatus = ({ isReviewed }) =>
    isReviewed ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs sm:text-sm">
            <i className="fas fa-check-circle" />
            Reviewed
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-amber-500 font-medium text-xs sm:text-sm">
            <i className="fas fa-flag" />
            Pending
        </span>
    )

/** Mobile card layout for a single report in the review list. */
const MobileReviewCard = ({ report, isReviewed, getUserName, accentColor, onReview }) => {
    const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : ''
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const badge = ReportUtility.getWeekBadge(weekIso)

    return (
        <div className="p-4 border-b border-slate-100 last:border-b-0">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${BADGE_COLORS[badge] || BADGE_COLORS.Older}`}
                        >
                            {badge}
                        </span>
                        <ReviewStatus isReviewed={isReviewed} />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">{report.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {ReportService.getWeekRangeString(monday, saturday)}
                    </p>
                </div>
                <button
                    className="shrink-0 px-3 py-2 rounded-lg text-white text-xs font-semibold"
                    style={{ background: accentColor }}
                    onClick={() => onReview(report)}
                >
                    Review
                </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                    <i className="fas fa-user text-[10px]" />
                    {getUserName(report.userId)}
                </span>
                <span>{new Date(report.completedDate).toLocaleDateString()}</span>
            </div>
        </div>
    )
}

/** Desktop table row for a single report in the review list. */
const DesktopReviewRow = ({ report, isReviewed, getUserName, accentColor, onReview }) => {
    const weekIso = report.week ? new Date(report.week).toISOString().slice(0, 10) : ''
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const badge = ReportUtility.getWeekBadge(weekIso)

    return (
        <div className="flex items-center py-3 px-4 lg:px-7 border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0 pr-3">
                <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide mr-2 ${BADGE_COLORS[badge] || BADGE_COLORS.Older}`}
                >
                    {badge}
                </span>
                <span className="text-sm text-slate-800">{ReportService.getWeekRangeString(monday, saturday)}</span>
            </div>
            <div className="flex-1 min-w-0 pr-3">
                <span className="text-sm font-medium text-slate-800">{report.title}</span>
            </div>
            <div className="flex-1 min-w-0 pr-3">
                <span className="text-sm text-slate-600">{getUserName(report.userId)}</span>
            </div>
            <div className="w-28 shrink-0 pr-3 text-sm text-slate-500">
                {new Date(report.completedDate).toLocaleDateString()}
            </div>
            <div className="w-28 shrink-0 pr-3">
                <ReviewStatus isReviewed={isReviewed} />
            </div>
            <div className="w-24 shrink-0 text-right">
                <button
                    className="px-3 py-1.5 rounded-md text-white text-xs font-semibold"
                    style={{ background: accentColor }}
                    onClick={() => onReview(report)}
                >
                    Review
                </button>
            </div>
        </div>
    )
}

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
        <i className="fas fa-user-check text-4xl mb-3" />
        <div className="text-sm">No reports to review</div>
    </div>
)

/** Paginated list of submitted reports awaiting review, with responsive mobile/desktop layouts. */
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

    if (items.length === 0 && !isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <EmptyState />
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <LoadingScreen message="Loading reports to review..." inline />
                </div>
            ) : (
                <>
                    <div className="hidden md:block">
                        <div className="grid grid-cols-[1fr_1fr_1fr_112px_112px_96px] gap-4 px-4 lg:px-7 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <div>Week</div>
                            <div>Report Type</div>
                            <div>Submitted By</div>
                            <div>Submitted</div>
                            <div>Status</div>
                            <div className="text-right">Actions</div>
                        </div>
                        {items.map((report) => (
                            <DesktopReviewRow
                                key={report.id}
                                report={report}
                                isReviewed={reviewedByCurrentUser.has(report.id)}
                                getUserName={getUserName}
                                accentColor={accentColor}
                                onReview={onReview}
                            />
                        ))}
                    </div>
                    <div className="md:hidden">
                        {items.map((report) => (
                            <MobileReviewCard
                                key={report.id}
                                report={report}
                                isReviewed={reviewedByCurrentUser.has(report.id)}
                                getUserName={getUserName}
                                accentColor={accentColor}
                                onReview={onReview}
                            />
                        ))}
                    </div>
                </>
            )}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                onPageChange={onPageChange}
            />
        </div>
    )
}

export default ReviewReportsList
