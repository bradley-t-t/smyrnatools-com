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

const STATUS_STYLES = {
    error: { badge: 'bg-red-100 text-red-700', label: 'Overdue' },
    info: { badge: 'bg-blue-100 text-blue-700', label: 'Not Started' },
    success: { badge: 'bg-emerald-100 text-emerald-700', label: 'Submitted' },
    warning: { badge: 'bg-amber-100 text-amber-700', label: 'Draft' }
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 9999]

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
                <i className="fas fa-chevron-left text-[10px] mr-1" />
                <span className="hidden xs:inline">Prev</span>
            </button>
            <span className="text-sm text-slate-500">
                {currentPage} / {totalPages}
            </span>
            <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50'}`}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
            >
                <span className="hidden xs:inline">Next</span>
                <i className="fas fa-chevron-right text-[10px] ml-1" />
            </button>
        </div>
    </div>
)

/** Single report row inside a week group. */
const ReportRow = ({ item, accentColor, onShowForm }) => {
    const { completed, report, title, name, weekIso } = item
    const hasSavedData = !!report?.data
    const { statusText, statusClass, buttonLabel } = ReportUtility.computeMyReportStatus({
        completed,
        hasSavedData,
        today: new Date(),
        weekIso
    })
    const iconConfig = REPORT_ICONS[name] || { icon: 'fa-file-alt', bg: 'bg-slate-500' }
    const statusStyle = STATUS_STYLES[statusClass] || STATUS_STYLES.info
    const { saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const isOverdue = statusClass === 'error'

    return (
        <div
            className={`flex items-center px-4 sm:px-5 py-3 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50 ${isOverdue ? 'bg-red-50/40' : ''}`}
            onClick={() => onShowForm(item)}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-7 h-7 rounded-lg ${iconConfig.bg} flex items-center justify-center shrink-0`}>
                    <i className={`fas ${iconConfig.icon} text-white text-[10px]`} />
                </div>
                <span className="text-sm font-medium text-slate-800 truncate">{title}</span>
            </div>
            <span
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 shrink-0 ${statusStyle.badge}`}
            >
                {statusClass === 'success' && <i className="fas fa-check text-[9px]" />}
                {statusText}
            </span>
            <span className="text-xs text-slate-400 ml-4 w-20 shrink-0 hidden sm:block text-right">
                {completed
                    ? saturday?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : isOverdue
                      ? 'Overdue'
                      : 'Due Sat'}
            </span>
            <button
                className="ml-3 px-3 py-1.5 rounded-md text-white text-xs font-semibold shrink-0 hidden sm:block"
                style={{ background: accentColor }}
                onClick={(e) => {
                    e.stopPropagation()
                    onShowForm(item)
                }}
            >
                {buttonLabel}
            </button>
            <i className="fas fa-chevron-right text-slate-300 text-xs ml-3 sm:hidden" />
        </div>
    )
}

/** A group of reports for a single week with header and progress bar. */
const WeekGroup = ({ weekIso, items, accentColor, onShowForm }) => {
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const weekRange = ReportService.getWeekRangeString(monday, saturday)
    const badge = ReportUtility.getWeekBadge(weekIso)
    const completedCount = items.filter((i) => i.completed).length
    const totalCount = items.length
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const allDone = completedCount === totalCount
    const hasOverdue = items.some((i) => {
        const { statusClass } = ReportUtility.computeMyReportStatus({
            completed: i.completed,
            hasSavedData: !!i.report?.data,
            today: new Date(),
            weekIso: i.weekIso
        })
        return statusClass === 'error'
    })

    const badgeColors = {
        'This Week': 'text-blue-700 bg-blue-100',
        'Last Week': 'text-amber-700 bg-amber-100',
        Older: 'text-slate-600 bg-slate-100'
    }

    return (
        <div className="mb-5">
            <div className="flex items-center gap-3 mb-2 px-1">
                <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badgeColors[badge] || badgeColors.Older}`}
                >
                    {badge}
                </span>
                <span className="text-xs text-slate-400">{weekRange}</span>
                <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        allDone
                            ? 'text-emerald-700 bg-emerald-50'
                            : hasOverdue
                              ? 'text-red-600 bg-red-50'
                              : 'text-slate-600 bg-slate-100'
                    }`}
                >
                    {completedCount}/{totalCount} complete
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 max-w-[120px]">
                    <div
                        className={`h-full rounded-full transition-all ${
                            allDone ? 'bg-emerald-500' : hasOverdue ? 'bg-red-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {items.map((item) => (
                    <ReportRow
                        key={item.name + item.weekIso}
                        item={item}
                        accentColor={accentColor}
                        onShowForm={onShowForm}
                    />
                ))}
            </div>
        </div>
    )
}

/** Paginated list of reports grouped by week. */
function MyReportsList({
    isLoading,
    items,
    weeksToShow,
    pageSize,
    currentPage,
    totalPages,
    onPageSizeChange,
    onPageChange,
    onShowForm
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    /** Group items by weekIso, maintaining week order. */
    const groupedByWeek = useMemo(() => {
        const groups = {}
        for (const item of items) {
            const key = item.weekIso || 'unknown'
            if (!groups[key]) groups[key] = []
            groups[key].push(item)
        }
        // Sort weeks descending (most recent first)
        const sortedKeys = Object.keys(groups).sort((a, b) => (a > b ? -1 : 1))
        return sortedKeys.map((key) => ({ weekIso: key, items: groups[key] }))
    }, [items])

    if (weeksToShow.length === 0 && !isLoading) return null

    return (
        <div>
            {isLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <ReportsListSkeleton columnCount={5} />
                </div>
            ) : (
                groupedByWeek.map(({ weekIso, items: weekItems }) => (
                    <WeekGroup
                        key={weekIso}
                        weekIso={weekIso}
                        items={weekItems}
                        accentColor={accentColor}
                        onShowForm={onShowForm}
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
export default MyReportsList
