import React from 'react'

import Badge from '../../../app/components/common/Badge'

/**
 * Banner + dimmed list shown beneath the main results when the search
 * matches items that fall outside the active filter chips. Rendered with a
 * different header copy depending on whether there are also exact filter
 * matches above it.
 */
export default function AssetPotentialMatches({ children, count, hasFiltered }) {
    return (
        <>
            <div className="mt-4 flex items-center gap-3 rounded-md bg-bg-hover px-4 py-3 animate-fade-in-fast">
                <i className="fas fa-filter text-xs text-text-tertiary" />
                <span className="text-sm font-semibold text-text-primary">
                    {hasFiltered ? 'Potential Matches' : 'Results Outside Current Filters'}
                </span>
                <span className="text-xs text-text-secondary">
                    {hasFiltered
                        ? '(hidden by active filters)'
                        : 'No exact filter matches — showing results that match your search'}
                </span>
                <Badge
                    tone="neutral"
                    size="lg"
                    shape="pill"
                    weight="bold"
                    uppercase={false}
                    className="ml-auto tabular-nums"
                >
                    {count}
                </Badge>
            </div>
            <div className={hasFiltered ? 'opacity-60 transition-opacity duration-200 hover:opacity-100' : ''}>
                {children}
            </div>
        </>
    )
}
