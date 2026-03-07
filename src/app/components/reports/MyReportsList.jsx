import React from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { ReportsListSkeleton } from '../ui/AssetListSkeleton'
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24
const PAGE_SIZE_OPTIONS = [10, 25, 50, 9999]
const BASE_ROW_DELAY_MS = 160
const MIN_ROW_DELAY_MS = 12
const DECAY_FACTOR = 0.9
function getRowDelay(index) {
    let total = 0
    for (let i = 0; i < index; i++) {
        total += Math.max(MIN_ROW_DELAY_MS, BASE_ROW_DELAY_MS * Math.pow(DECAY_FACTOR, i))
    }
    return Math.round(total)
}
/** Computes urgency label and color based on days until the Saturday deadline. */
const getDueDateStatus = (saturday) => {
    const diffDays = Math.ceil((saturday - new Date()) / MILLISECONDS_PER_DAY)
    if (diffDays < 0) return { color: '#dc2626', label: 'Overdue', urgent: true }
    if (diffDays === 0) return { color: '#dc2626', label: 'Due Today', urgent: true }
    if (diffDays === 1) return { color: '#f59e0b', label: 'Due Tomorrow', urgent: true }
    if (diffDays <= 3) return { color: '#f59e0b', label: `${diffDays} days left`, urgent: false }
    return { color: '#64748b', label: saturday.toLocaleDateString(), urgent: false }
}
const BADGE_COLORS = {
    'Last Week': 'bg-amber-100 text-amber-800',
    Older: 'bg-slate-100 text-slate-600',
    'This Week': 'bg-blue-100 text-blue-800'
}
const STATUS_COLORS = {
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700'
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
/** Compact card layout for a single report item on mobile viewports. */
const MobileReportCard = ({ item, accentColor, onShowForm, index = 0 }) => {
    const { completed, report, title, weekIso } = item
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const weekRange = ReportService.getWeekRangeString(monday, saturday)
    const hasSavedData = !!report?.data
    const { statusText, statusClass, buttonLabel } = ReportUtility.computeMyReportStatus({
        completed,
        hasSavedData,
        today: new Date(),
        weekIso
    })
    const badge = ReportUtility.getWeekBadge(weekIso)
    const dueDateInfo = completed ? null : getDueDateStatus(saturday)
    const altBg = index % 2 === 0 ? 'white' : '#f8fafc'
    return (
        <div
            className={`reports-row-animated p-4 last:border-b-0`}
            style={{
                animationDelay: `${getRowDelay(index)}ms`,
                backgroundColor: altBg,
                borderBottom: '1px solid #e2e8f0',
                ...(dueDateInfo?.urgent ? { borderLeftColor: dueDateInfo.color, borderLeftWidth: '3px' } : {})
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${BADGE_COLORS[badge] || BADGE_COLORS.Older}`}
                        >
                            {badge}
                        </span>
                        <span
                            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${STATUS_COLORS[statusClass] || STATUS_COLORS.info}`}
                        >
                            {statusClass === 'success' && <i className="fas fa-check text-[9px]" />}
                            {statusText}
                        </span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{weekRange}</p>
                </div>
                <button
                    className="shrink-0 px-3 py-2 rounded-lg text-white text-xs font-semibold"
                    style={{ background: accentColor }}
                    onClick={() => onShowForm(item)}
                >
                    {buttonLabel}
                </button>
            </div>
            {!completed && dueDateInfo && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: dueDateInfo.color }}>
                    {dueDateInfo.urgent && <i className="fas fa-clock text-[10px]" />}
                    <span className={dueDateInfo.urgent ? 'font-semibold' : ''}>{dueDateInfo.label}</span>
                </div>
            )}
        </div>
    )
}
/** Table row layout for a single report item on desktop viewports. */
const DesktopReportRow = ({ item, accentColor, onShowForm, index = 0 }) => {
    const { weekIso, completed, report, title } = item
    const { monday, saturday } = ReportUtility.getWeekDatesFromIso(weekIso)
    const weekRange = ReportService.getWeekRangeString(monday, saturday)
    const hasSavedData = !!report?.data
    const { statusText, statusClass, buttonLabel } = ReportUtility.computeMyReportStatus({
        completed,
        hasSavedData,
        today: new Date(),
        weekIso
    })
    const badge = ReportUtility.getWeekBadge(weekIso)
    const dueDateInfo = completed ? null : getDueDateStatus(saturday)
    const altBg = index % 2 === 0 ? 'white' : '#f8fafc'
    return (
        <div
            className={`reports-row-animated flex items-center py-3 px-4 lg:px-7 ${dueDateInfo?.urgent ? '' : ''}`}
            style={{
                animationDelay: `${getRowDelay(index)}ms`,
                backgroundColor: altBg,
                borderBottom: '1px solid #e2e8f0',
                cursor: 'default',
                ...(dueDateInfo?.urgent ? { borderLeftColor: dueDateInfo.color, borderLeftWidth: '3px' } : {})
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0f2fe')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = altBg)}
        >
            <div className="flex-1 min-w-0 pr-3">
                <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide mr-2 ${BADGE_COLORS[badge] || BADGE_COLORS.Older}`}
                >
                    {badge}
                </span>
                <span className="text-sm text-slate-800">{weekRange}</span>
            </div>
            <div className="flex-1 min-w-0 pr-3">
                <span className="text-sm font-medium text-slate-800">{title}</span>
            </div>
            <div className="w-28 shrink-0 pr-3">
                <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[statusClass] || STATUS_COLORS.info}`}
                >
                    {statusClass === 'success' && <i className="fas fa-check text-[9px]" />}
                    {statusText}
                </span>
            </div>
            <div className="w-28 shrink-0 pr-3 text-sm">
                {completed ? (
                    <span className="text-slate-500">{saturday.toLocaleDateString()}</span>
                ) : (
                    <span style={{ color: dueDateInfo?.color }} className={dueDateInfo?.urgent ? 'font-semibold' : ''}>
                        {dueDateInfo?.urgent && <i className="fas fa-clock text-[10px] mr-1" />}
                        {dueDateInfo?.label}
                    </span>
                )}
            </div>
            <div className="w-24 shrink-0 text-right">
                <button
                    className="px-3 py-1.5 rounded-md text-white text-xs font-semibold"
                    style={{ background: accentColor }}
                    onClick={() => onShowForm(item)}
                >
                    {buttonLabel}
                </button>
            </div>
        </div>
    )
}
/** Paginated list of the current user's assigned reports with responsive mobile/desktop layouts. */
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
    if (weeksToShow.length === 0 && !isLoading) return null
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <style>{`
                @keyframes slideInRow {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .reports-row-animated {
                    animation: slideInRow 0.4s ease-out both;
                }
            `}</style>
            {isLoading ? (
                <ReportsListSkeleton columnCount={5} />
            ) : (
                <>
                    <div className="hidden md:block">
                        {items.map((item, index) => (
                            <DesktopReportRow
                                key={item.name + item.weekIso}
                                item={item}
                                index={index}
                                accentColor={accentColor}
                                onShowForm={onShowForm}
                            />
                        ))}
                    </div>
                    <div className="md:hidden">
                        {items.map((item, index) => (
                            <MobileReportCard
                                key={item.name + item.weekIso}
                                item={item}
                                index={index}
                                accentColor={accentColor}
                                onShowForm={onShowForm}
                            />
                        ))}
                    </div>
                </>
            )}
            {items.length > 0 && (
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
