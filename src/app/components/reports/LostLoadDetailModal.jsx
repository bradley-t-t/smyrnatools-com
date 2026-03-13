import React from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' })
}
const formatTimestamp = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
        minute: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}
const DetailRow = ({ icon, label, value }) => {
    if (!value && value !== 0) return null
    return (
        <div className="flex items-start gap-3 py-3 border-b border-border-light">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary">
                <i className={`fas fa-${icon} text-xs text-text-secondary`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-0.5 text-text-secondary">
                    {label}
                </div>
                <div className="text-sm font-medium text-text-primary">{value}</div>
            </div>
        </div>
    )
}
function LostLoadDetailModal({ report, getUserName, onClose }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    if (!report) return null
    const data = report.data || {}
    const reasonParts = data.reason?.split(': ') || []
    const reasonCategory = reasonParts[0] || '—'
    const reasonExplanation = reasonParts.length > 1 ? reasonParts.slice(1).join(': ') : null
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="rounded-2xl shadow-2xl w-full max-w-md flex flex-col bg-bg-primary max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-border-light">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center w-9 h-9 rounded-lg"
                            style={{ backgroundColor: `${accentColor}15` }}
                        >
                            <i className="fas fa-file-alt text-sm" style={{ color: accentColor }} />
                        </div>
                        <h2 className="text-base font-semibold m-0 text-text-primary">Lost Load Details</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-text-secondary"
                        type="button"
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
                <div className="px-6 py-2 overflow-y-auto flex-1">
                    <DetailRow
                        icon="calendar-alt"
                        label="Date"
                        value={formatDate(report.submitted_at || report.week)}
                    />
                    <DetailRow
                        icon="industry"
                        label="Plant"
                        value={
                            data.plant ? (
                                <span
                                    className="inline-block px-2.5 py-1 rounded-md text-xs font-bold text-white"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    {data.plant}
                                </span>
                            ) : null
                        }
                    />
                    <DetailRow
                        icon="cubes"
                        label="Yardage"
                        value={data.yardage != null ? `${data.yardage} yds` : null}
                    />
                    <DetailRow
                        icon="truck"
                        label="Truck Number"
                        value={data.truck_number ? `#${data.truck_number}` : null}
                    />
                    <DetailRow icon="user-tie" label="Customer" value={data.customer_name} />
                    <DetailRow
                        icon="ticket-alt"
                        label="Ticket Number"
                        value={data.ticket_number ? `#${data.ticket_number}` : null}
                    />
                    <DetailRow icon="tag" label="Reason" value={reasonCategory} />
                    {reasonExplanation && (
                        <div className="py-3 border-b border-border-light">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary">
                                    <i className="fas fa-comment-alt text-xs text-text-secondary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide mb-1 text-text-secondary">
                                        Explanation
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-text-primary">
                                        {reasonExplanation}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DetailRow icon="user" label="Submitted By" value={getUserName(report.userId)} />
                    <DetailRow icon="clock" label="Submitted At" value={formatTimestamp(report.submitted_at)} />
                </div>
                <div className="px-6 py-4 flex items-center justify-end flex-shrink-0 border-t border-border-light">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium bg-bg-secondary text-text-secondary"
                        type="button"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
export default LostLoadDetailModal
