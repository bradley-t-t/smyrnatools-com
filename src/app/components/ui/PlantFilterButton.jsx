/* eslint-disable react/forbid-dom-props */
import React from 'react'

/**
 * Flat plant-filter trigger button — single source of truth for the
 * "All Plants ▾" / "Plant 70 · Smyrna ▾" chip used across TopSection,
 * ReportsToolbar, PlanRealtimeView, and PlanDemandView. Pair with
 * `PlantDropdownModal` for selection. Goes accent-tinted when a plant is
 * actively selected so the filter state is visible at a glance.
 */
function PlantFilterButton({
    accentColor,
    active = false,
    displayText,
    isOpen = false,
    onClick,
    title = 'Filter by plant'
}) {
    const tinted = active && accentColor
    return (
        <button type="button"
            onClick={onClick}
            aria-label={title}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-pressed={!!active}
            title={title}
            className="text-xs font-medium cursor-pointer rounded-md py-1.5 px-2 inline-flex items-center gap-1.5 transition-colors duration-150 hover:bg-bg-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary motion-reduce:transition-none"
            style={{
                background: tinted ? `${accentColor}14` : 'var(--bg-secondary)',
                border: `1px solid ${tinted ? accentColor : 'var(--border-light)'}`,
                color: tinted ? accentColor : 'var(--text-primary)'
            }}
        >
            <span className="truncate max-w-[200px]">{displayText}</span>
            <i
                className="fas fa-chevron-down text-[9px]"
                style={{ color: tinted ? accentColor : 'var(--text-tertiary)' }}
                aria-hidden="true"
            />
        </button>
    )
}

export default PlantFilterButton
