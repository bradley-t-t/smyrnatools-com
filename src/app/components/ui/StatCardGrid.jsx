import React from 'react'

/** Responsive auto-fit grid container for StatCard components. */
export default function StatCardGrid({ children }) {
    return <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mb-3">{children}</div>
}
