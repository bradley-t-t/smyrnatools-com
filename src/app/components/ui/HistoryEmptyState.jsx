import React from 'react'

/** Centered empty state — dashed card matching the redesigned reports' empty-state look. */
export default function HistoryEmptyState({ title, subtitle, icon = 'fa-clock-rotate-left' }) {
    return (
        <div className="rounded-card p-6 flex flex-col items-center text-center gap-2 bg-bg-secondary border border-dashed border-border-medium text-text-tertiary">
            <i className={`fas ${icon} text-xl text-text-tertiary`} aria-hidden="true" />
            <p className="m-0 text-sm font-semibold text-text-primary">{title}</p>
            {subtitle && <p className="m-0 text-xs leading-snug text-text-tertiary">{subtitle}</p>}
        </div>
    )
}
