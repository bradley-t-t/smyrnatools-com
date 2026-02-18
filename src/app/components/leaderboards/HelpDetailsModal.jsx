import React from 'react'

import Modal, { ModalBody, ModalSummary, ModalSummaryItem } from '../common/Modal'

function HelpEntry({ entry }) {
    const isSent = entry.type === 'sent'
    const bgClass = isSent ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
    const indicatorClass = isSent ? 'bg-green-600' : 'bg-red-500'
    const plantLabel = isSent ? `To Plant ${entry.to}` : `From Plant ${entry.from}`

    return (
        <div className={`mb-2 flex flex-col gap-2 rounded-lg border p-3 md:mb-3 md:gap-3 md:p-4 ${bgClass}`}>
            <div className="flex items-center gap-2 md:gap-4">
                <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:h-8 md:w-8 md:text-lg ${indicatorClass}`}
                >
                    {isSent ? '+' : '-'}
                </span>
                <span className="flex-1 text-[0.8125rem] font-semibold text-gray-900 md:text-[0.9375rem]">
                    {plantLabel}
                </span>
                <span className="text-sm font-bold text-[#1e3a5f] md:text-base">{Math.round(entry.hours)} hours</span>
            </div>
            <div className="flex flex-wrap gap-3 pl-8 text-[0.6875rem] text-gray-500 md:gap-6 md:pl-12 md:text-[0.8125rem]">
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
    )
}

export default function HelpDetailsModal({ details, plant, onClose }) {
    if (!details || !plant) return null

    const { hoursAdded = 0, hoursSubtracted = 0, details: entries = [] } = details
    const netBalance = hoursSubtracted - hoursAdded
    const netColorClass = netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-500' : 'text-[#1e3a5f]'

    const filteredEntries = entries
        .filter((e) => e.hours > 0 && e.operatorCount > 0)
        .sort((a, b) => new Date(b.week) - new Date(a.week))

    return (
        <Modal title={`Help Details - Plant ${plant.plantCode}`} titleIcon="fas fa-exchange-alt" onClose={onClose}>
            <ModalSummary>
                <ModalSummaryItem label="Total Help Given" value={`${Math.round(hoursSubtracted)} hours`} />
                <ModalSummaryItem label="Total Help Received" value={`${Math.round(hoursAdded)} hours`} />
                <ModalSummaryItem
                    label="Net Balance"
                    value={`${netBalance > 0 ? '+' : ''}${Math.round(netBalance)} hours`}
                    valueClassName={netColorClass}
                />
            </ModalSummary>

            <ModalBody>
                {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry, idx) => <HelpEntry key={idx} entry={entry} />)
                ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                        <div className="mb-4 text-2xl text-gray-300">
                            <i className="fas fa-info-circle" />
                        </div>
                        <p className="m-0 text-base font-semibold text-gray-500">No detailed help records available</p>
                    </div>
                )}
            </ModalBody>
        </Modal>
    )
}
