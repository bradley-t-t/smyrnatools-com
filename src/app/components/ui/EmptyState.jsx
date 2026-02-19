import React from 'react'

export default function EmptyState({ icon = 'fa-inbox', title = 'No data available', subtitle }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center md:p-16">
            {icon && (
                <div className="mb-4 text-5xl text-gray-300">
                    <i className={`fas ${icon}`} />
                </div>
            )}
            <p className="m-0 mb-2 text-lg font-semibold text-gray-500">{title}</p>
            {subtitle && <span className="text-sm text-gray-400">{subtitle}</span>}
        </div>
    )
}
