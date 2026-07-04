import React from 'react'

/**
 * Compact stat tile — small label + prominent numeric value + optional sublabel.
 * `tabular-nums` keeps values vertically aligned in dense stat grids.
 */
export default function StatCard({ label, value, sublabel, className = '' }) {
    return (
        <div
            className={`rounded-card p-3 flex flex-col gap-1 bg-bg-secondary border border-border-light transition-shadow duration-200 hover:shadow-card ${className}`}
        >
            <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">{label}</div>
            <div className="font-heading text-base font-bold leading-tight tabular-nums truncate text-text-primary">
                {value}
            </div>
            {sublabel && <div className="text-[11px] text-text-tertiary">{sublabel}</div>}
        </div>
    )
}
