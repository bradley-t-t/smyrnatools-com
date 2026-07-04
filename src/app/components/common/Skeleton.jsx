import React from 'react'

/**
 * Theme-aware skeleton placeholder. Pulses via Tailwind `animate-pulse-slow`
 * with the tertiary surface so it stays legible in light / dark / gray.
 * Reduced-motion users get a steady block.
 */
export default function Skeleton({ className = '', rounded = 'rounded-md' }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse-slow motion-reduce:animate-none bg-bg-tertiary ${rounded} ${className}`}
        />
    )
}

/** Convenience wrapper for repeated skeleton rows with consistent vertical spacing. */
export function SkeletonStack({ children, count = 3, gapClassName = 'gap-2' }) {
    return (
        <div role="status" aria-live="polite" aria-busy="true" className={`flex flex-col ${gapClassName}`}>
            <span className="sr-only">Loading…</span>
            {Array.from({ length: count }, (_, index) => (
                <React.Fragment key={index}>
                    {typeof children === 'function' ? children(index) : children}
                </React.Fragment>
            ))}
        </div>
    )
}
