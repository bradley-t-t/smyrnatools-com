import React from 'react'

/**
 * Pill tab button used across Plan, Reports, and dashboard toolbars. Active
 * state surfaces with the primary surface + light border; inactive sits on
 * transparent. Focus-ring + active scale tap keeps it tactile.
 */
export default function TabButton({ label, isActive, onClick, className = '' }) {
    const stateClasses = isActive
        ? 'bg-bg-primary border-border-light text-text-primary shadow-sm'
        : 'bg-transparent border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
    return (
        <button type="button"
            onClick={onClick}
            aria-pressed={isActive}
            className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 border border-solid transition-colors duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary motion-reduce:transition-none ${stateClasses} ${className}`}
        >
            {label}
        </button>
    )
}
