import React from 'react'

/** Responsive auto-fit grid container for StatCard components. */
export default function StatCardGrid({ children, className = '' }) {
    return <div className={`grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 ${className}`}>{children}</div>
}
