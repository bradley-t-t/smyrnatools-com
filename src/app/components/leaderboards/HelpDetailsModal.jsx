import React from 'react'

import Modal, { ModalBody, ModalSummary, ModalSummaryItem } from '../common/Modal'

/**
 * Single help transaction row showing direction (sent/received), plant,
 * date, operator count, and hours.
 * @param {Object} props
 * @param {Object} props.entry - Help record with type, to/from, week, operatorCount, hours.
 */
function HelpEntry({ entry }) {
    const isSent = entry.type === 'sent'
    const bgClass = isSent ? 'bg-emerald-50' : 'bg-rose-50'
    const borderClass = isSent ? 'border-emerald-200' : 'border-rose-200'
    const indicatorClass = isSent ? 'bg-emerald-500' : 'bg-rose-500'
    const plantLabel = isSent ? `To Plant ${entry.to}` : `From Plant ${entry.from}`

    return (
        <div className={`mb-3 overflow-hidden rounded-xl border ${borderClass} ${bgClass}`}>
            <div className="flex items-center gap-3 p-4">
                <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${indicatorClass}`}
                >
                    <i className={`fas ${isSent ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{plantLabel}</div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <i className="fas fa-calendar" />
                            {new Date(entry.week).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <i className="fas fa-users" />
                            {entry.operatorCount} operator{entry.operatorCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xl font-bold text-slate-900">{Math.round(entry.hours)}</span>
                    <span className="text-xs font-medium uppercase text-slate-400">hours</span>
                </div>
            </div>
        </div>
    )
}

/**
 * Modal displaying the full breakdown of help hours exchanged by a plant.
 * Shows a summary bar with given/received/net totals and a chronological
 * list of individual help transactions.
 * @param {Object} props
 * @param {Object} props.details - Help details with hoursAdded, hoursSubtracted, and details array.
 * @param {Object} props.plant - Plant object with plantCode for the title.
 * @param {Function} props.onClose - Callback to close the modal.
 */
export default function HelpDetailsModal({ details, plant, onClose }) {
    if (!details || !plant) return null

    const { hoursAdded = 0, hoursSubtracted = 0, details: entries = [] } = details
    const netBalance = hoursSubtracted - hoursAdded
    const netColorClass = netBalance > 0 ? 'text-emerald-600' : netBalance < 0 ? 'text-rose-500' : 'text-slate-700'

    const filteredEntries = entries
        .filter((e) => e.hours > 0 && e.operatorCount > 0)
        .sort((a, b) => new Date(b.week) - new Date(a.week))

    return (
        <Modal title={`Help Details - Plant ${plant.plantCode}`} titleIcon="fas fa-exchange-alt" onClose={onClose}>
            <ModalSummary>
                <ModalSummaryItem label="Help Given" value={`${Math.round(hoursSubtracted)}h`} />
                <ModalSummaryItem label="Help Received" value={`${Math.round(hoursAdded)}h`} />
                <ModalSummaryItem
                    label="Net Balance"
                    value={`${netBalance > 0 ? '+' : ''}${Math.round(netBalance)}h`}
                    valueClassName={netColorClass}
                />
            </ModalSummary>

            <ModalBody>
                {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry, idx) => <HelpEntry key={idx} entry={entry} />)
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                        <div className="mb-3 text-4xl text-slate-300">
                            <i className="fas fa-info-circle" />
                        </div>
                        <p className="m-0 font-medium text-slate-500">No detailed help records available</p>
                    </div>
                )}
            </ModalBody>
        </Modal>
    )
}
