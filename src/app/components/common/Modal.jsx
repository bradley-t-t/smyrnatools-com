import React from 'react'

export default function Modal({ children, onClose, title, titleIcon }) {
    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-8 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-8 py-6">
                    <h3 className="m-0 flex items-center gap-3 text-xl font-bold text-gray-900">
                        {titleIcon && <i className={titleIcon} />}
                        {title}
                    </h3>
                    <button
                        className="rounded-md bg-transparent p-2 text-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-900"
                        onClick={onClose}
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

export function ModalSummary({ children }) {
    return <div className="grid grid-cols-3 gap-4 border-b border-gray-200 bg-gray-50 px-8 py-6">{children}</div>
}

export function ModalSummaryItem({ label, value, valueClassName = '' }) {
    return (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
            <span className={`text-2xl font-bold text-[#1e3a5f] ${valueClassName}`}>{value}</span>
        </div>
    )
}

export function ModalBody({ children }) {
    return <div className="flex-1 overflow-y-auto p-6 md:px-8">{children}</div>
}
