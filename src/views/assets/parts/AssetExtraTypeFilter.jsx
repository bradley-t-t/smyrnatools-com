import React from 'react'

/**
 * Optional "extra type" select rendered into `TopSection`'s `customFilters`
 * slot — used by asset configs that need a third filter beyond plant +
 * status (e.g. equipment type). Persists via the same filter-persistence
 * keys as the rest of the toolbar.
 */
export default function AssetExtraTypeFilter({ config, filters, updateFilterRef }) {
    const { extraTypeFilter } = config
    if (!extraTypeFilter) return null

    const handleChange = (event) => {
        const nextValue = event.target.value
        filters.setExtraTypeFilter(nextValue)
        if (extraTypeFilter.persistKey) {
            updateFilterRef.current?.(extraTypeFilter.persistKey, nextValue)
        }
    }

    return (
        <select
            aria-label={extraTypeFilter.label}
            className="appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:0.875rem_0.875rem] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke=%22currentColor%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%222%22%20d=%22M19%209l-7%207-7-7%22/%3E%3C/svg%3E')] [color-scheme:light] dark:[color-scheme:dark] min-w-[130px] cursor-pointer rounded text-[12px] font-medium py-1.5 pl-2 pr-7 bg-bg-secondary border border-border-light text-text-primary hover:border-border-medium focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            onChange={handleChange}
            value={filters.extraTypeFilter}
        >
            <option value="">{extraTypeFilter.allLabel}</option>
            {extraTypeFilter.options.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    )
}
