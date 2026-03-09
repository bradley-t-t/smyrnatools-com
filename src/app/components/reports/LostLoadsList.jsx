import React from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { ReportsListSkeleton } from '../ui/AssetListSkeleton'
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
const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
        <i className="fas fa-exclamation-triangle text-4xl mb-3" />
        <div className="text-sm">No lost load reports found</div>
    </div>
)
/** Mobile card for a single lost load report. */
const MobileLostLoadCard = ({ report, getUserName, index = 0, canDelete, onDeleteClick }) => {
    const altBg = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
    const submittedDate = report.submitted_at
        ? new Date(report.submitted_at).toLocaleDateString()
        : report.week
          ? new Date(report.week).toLocaleDateString()
          : '—'
    return (
        <div
            className="reports-row-animated p-4 last:border-b-0"
            style={{
                animationDelay: `${getRowDelay(index)}ms`,
                backgroundColor: altBg,
                borderBottom: '1px solid var(--border-light)'
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-slate-500">{submittedDate}</span>
                        {report.data?.plant && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                {report.data.plant}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700 mb-1">
                        {report.data?.truck_number && (
                            <span className="flex items-center gap-1">
                                <i className="fas fa-truck text-[10px] text-slate-400" />
                                {report.data.truck_number}
                            </span>
                        )}
                        {report.data?.yardage != null && (
                            <span className="flex items-center gap-1">
                                <i className="fas fa-box text-[10px] text-slate-400" />
                                {report.data.yardage} yds
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700 mb-1">
                        {report.data?.customer_name && (
                            <span className="flex items-center gap-1">
                                <i className="fas fa-user-tie text-[10px] text-slate-400" />
                                {report.data.customer_name}
                            </span>
                        )}
                        {report.data?.ticket_number && (
                            <span className="flex items-center gap-1">
                                <i className="fas fa-ticket-alt text-[10px] text-slate-400" />#
                                {report.data.ticket_number}
                            </span>
                        )}
                    </div>
                    {report.data?.reason && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{report.data.reason}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                    <i className="fas fa-user text-[10px]" />
                    {getUserName(report.userId)}
                </span>
                {canDelete && (
                    <button
                        type="button"
                        onClick={() => onDeleteClick(report)}
                        className="flex items-center gap-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                        <i className="fas fa-trash-alt text-[10px]" />
                        Delete
                    </button>
                )}
            </div>
        </div>
    )
}
/** Desktop row for a single lost load report. */
const DesktopLostLoadRow = ({ report, getUserName, index = 0, canDelete, onDeleteClick }) => {
    const altBg = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
    const submittedDate = report.submitted_at
        ? new Date(report.submitted_at).toLocaleDateString()
        : report.week
          ? new Date(report.week).toLocaleDateString()
          : '—'
    return (
        <div
            className="reports-row-animated flex items-center py-3 px-4 lg:px-7"
            style={{
                animationDelay: `${getRowDelay(index)}ms`,
                backgroundColor: altBg,
                borderBottom: '1px solid var(--border-light)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = altBg)}
        >
            <div className="w-36 shrink-0 pr-3 text-sm text-slate-600">{submittedDate}</div>
            <div className="w-24 shrink-0 pr-3">
                {report.data?.plant ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        {report.data.plant}
                    </span>
                ) : (
                    <span className="text-slate-400 text-sm">—</span>
                )}
            </div>
            <div className="w-24 shrink-0 pr-3 text-sm font-medium text-slate-800">
                {report.data?.yardage != null ? `${report.data.yardage}` : '—'}
            </div>
            <div className="w-28 shrink-0 pr-3 text-sm text-slate-600">{report.data?.truck_number || '—'}</div>
            <div className="w-36 shrink-0 pr-3 text-sm text-slate-600 truncate">
                {report.data?.customer_name || '—'}
            </div>
            <div className="w-28 shrink-0 pr-3 text-sm text-slate-600">{report.data?.ticket_number || '—'}</div>
            <div className="flex-1 min-w-0 pr-3 text-sm text-slate-600 truncate">{report.data?.reason || '—'}</div>
            <div className="flex-1 min-w-0 pr-3 text-sm text-slate-600 truncate">{getUserName(report.userId)}</div>
            {canDelete && (
                <button
                    type="button"
                    onClick={() => onDeleteClick(report)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Delete report"
                >
                    <i className="fas fa-trash-alt text-xs" />
                </button>
            )}
        </div>
    )
}
/** Paginated list of all lost load reports with responsive mobile/desktop layouts. */
function LostLoadsList({
    isLoading,
    items,
    pageSize,
    currentPage,
    totalPages,
    onPageSizeChange,
    onPageChange,
    getUserName,
    canDelete,
    onDelete
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const handleDelete = async (report) => {
        if (!window.confirm('Are you sure you want to delete this lost load report?')) return
        try {
            await onDelete(report.id)
        } catch {}
    }
    if (items.length === 0 && !isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <EmptyState />
            </div>
        )
    }
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
                <ReportsListSkeleton columnCount={8} />
            ) : (
                <>
                    <div className="hidden md:block">
                        {items.map((report, index) => (
                            <DesktopLostLoadRow
                                key={report.id}
                                report={report}
                                index={index}
                                getUserName={getUserName}
                                canDelete={canDelete}
                                onDeleteClick={handleDelete}
                            />
                        ))}
                    </div>
                    <div className="md:hidden">
                        {items.map((report, index) => (
                            <MobileLostLoadCard
                                key={report.id}
                                report={report}
                                index={index}
                                getUserName={getUserName}
                                canDelete={canDelete}
                                onDeleteClick={handleDelete}
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
export default LostLoadsList
