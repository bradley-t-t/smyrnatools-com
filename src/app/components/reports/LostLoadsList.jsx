import React from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'

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

/** Single lost load row matching the ReviewRow pattern. */
const LostLoadRow = ({ report, getUserName, accentColor, canDelete, onDelete, onClick }) => {
    const lostDate = report.data?.lost_load_date
        ? new Date(report.data.lost_load_date + 'T12:00:00')
        : report.submitted_at
          ? new Date(report.submitted_at)
          : null
    const dateLabel = lostDate ? lostDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
    const submitterName = getUserName(report.userId) || 'Unknown'
    const initials = submitterName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    const title = report.data?.truck_number
        ? `Truck ${report.data.truck_number}${report.data?.yardage != null ? ` — ${report.data.yardage} yds` : ''}`
        : 'Lost Load'

    return (
        <div
            className="flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50"
            onClick={() => onClick?.(report)}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
                    <i className="fas fa-truck text-white text-[10px]" />
                </div>
                <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800 block truncate">{title}</span>
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
                        {dateLabel && (
                            <>
                                <span className="text-slate-300 text-[8px]">●</span>
                                <span className="text-xs text-slate-400">{dateLabel}</span>
                            </>
                        )}
                        {report.data?.plant && (
                            <>
                                <span className="text-slate-300 text-[8px]">●</span>
                                <span className="text-xs text-slate-400">{report.data.plant}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                <i className="fas fa-check text-[9px]" />
                Submitted
            </span>
            <button
                className="ml-3 px-3 py-1.5 rounded-md text-white text-xs font-semibold shrink-0 hidden sm:block"
                style={{ background: accentColor }}
                onClick={(e) => {
                    e.stopPropagation()
                    onClick?.(report)
                }}
            >
                View
            </button>
            {canDelete && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('Delete this lost load report?')) onDelete(report.id)
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-2 hidden sm:flex"
                    title="Delete"
                >
                    <i className="fas fa-trash-alt text-xs" />
                </button>
            )}
            <i className="fas fa-chevron-right text-slate-300 text-xs ml-3 sm:hidden" />
        </div>
    )
}

/** Paginated list of lost load reports matching the review grouped style. */
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
                    <div className="text-sm">No loss reports</div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-5">
                <div className="flex items-center gap-3 mb-2 px-1">
                    <span className="text-sm font-bold text-slate-700">Loss Reports</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-slate-600 bg-slate-100">
                        {items.length} submitted
                    </span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {isLoading
                        ? [1, 2, 3, 4, 5].map((i) => (
                              <div
                                  key={i}
                                  className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0"
                              >
                                  <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                                  <div className="flex-1 min-w-0">
                                      <div className="h-4 w-40 rounded bg-slate-200 animate-pulse mb-1.5" />
                                      <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
                                          <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                                          <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
                                      </div>
                                  </div>
                                  <div className="h-6 w-16 rounded bg-slate-200 animate-pulse shrink-0" />
                                  <div className="h-7 w-14 rounded bg-slate-200 animate-pulse shrink-0 hidden sm:block" />
                              </div>
                          ))
                        : items.map((report) => (
                              <LostLoadRow
                                  key={report.id}
                                  report={report}
                                  getUserName={getUserName}
                                  accentColor={accentColor}
                                  canDelete={canDelete}
                                  onDelete={onDelete}
                                  onClick={onRowClick}
                              />
                          ))}
                </div>
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
