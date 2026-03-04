import React from 'react'

/** Centered empty state message used inside history view tabs. */
export default function HistoryEmptyState({ title, subtitle }) {
    return (
        <div className="text-center py-12 px-6 text-slate-500">
            <p className="m-0 text-[15px] font-medium text-gray-700">{title}</p>
            {subtitle && <p className="text-[13px] text-slate-400 mt-2">{subtitle}</p>}
        </div>
    )
}
