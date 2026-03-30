import React from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { ReportsListSkeleton } from '../ui/AssetListSkeleton'

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

/** Single lost load row in the card-style layout. */
const LostLoadRow = ({ report, getUserName, accentColor, canDelete, onDelete, onClick }) => {
    const lostDate = report.data?.lost_load_date
        ? new Date(report.data.lost_load_date + 'T12:00:00')
        : report.submitted_at
          ? new Date(report.submitted_at)
          : null
    const dateLabel = lostDate
        ? lostDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
    const submitterName = getUserName(report.userId) || 'Unknown'

    return (
        <div
            className="flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50"
            onClick={() => onClick?.(report)}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
                    <i className="fas fa-truck text-white text-[10px]" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">
                            {report.data?.truck_number ? `Truck ${report.data.truck_number}` : 'Lost Load'}
                            {report.data?.yardage != null && (
                                <span className="text-slate-400 font-normal ml-1.5">{report.data.yardage} yds</span>
                            )}
                        </span>
                        {report.data?.plant && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 shrink-0">
                                {report.data.plant}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{submitterName}</span>
                        {report.data?.customer_name && (
                            <>
                                <span className="text-slate-300 text-[8px]">●</span>
                                <span className="text-xs text-slate-400 truncate">{report.data.customer_name}</span>
                            </>
                        )}
                    </div>
                    {report.data?.reason && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{report.data.reason}</p>
                    )}
                </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0 ml-3 hidden sm:block">{dateLabel}</span>
            {canDelete && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('Delete this lost load report?')) onDelete(report.id)
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-2"
                    title="Delete"
                >
                    <i className="fas fa-trash-alt text-xs" />
                </button>
            )}
            <i className="fas fa-chevron-right text-slate-300 text-xs ml-3" />
        </div>
    )
}

/** Paginated list of lost load reports in the grouped card style. */
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
    onDelete,
    onRowClick
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    if (items.length === 0 && !isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
                    <i className="fas fa-truck text-4xl mb-3" />
                    <div className="text-sm">No lost load reports</div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center gap-3 mb-2 px-1">
                <span className="text-sm font-bold text-slate-700">Lost Load Reports</span>
                <span className="text-xs text-slate-400">{items.length} total</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <ReportsListSkeleton columnCount={6} />
                ) : (
                    items.map((report) => (
                        <LostLoadRow
                            key={report.id}
                            report={report}
                            getUserName={getUserName}
                            accentColor={accentColor}
                            canDelete={canDelete}
                            onDelete={onDelete}
                            onClick={onRowClick}
                        />
                    ))
                )}
            </div>
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
export default LostLoadsList
