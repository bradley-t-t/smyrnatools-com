import React from 'react'

/**
 * Empty-state panel rendered inside `AssetView` when no items match the
 * current search / filter combo. Calls back to open the add sheet unless
 * there's an active search (in which case adding is unlikely to be useful).
 */
export default function AssetEmptyState({ config, filters, onAdd }) {
    const hasActiveScope =
        filters.searchText || filters.selectedPlant || (filters.statusFilter && filters.statusFilter !== 'All Statuses')

    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-bg-hover ring-1 ring-border-light">
                <i className={`fas ${config.emptyState.icon} text-3xl text-text-tertiary`} />
            </div>
            <h3 className="mb-2 font-heading text-xl font-semibold text-text-primary">{config.emptyState.title}</h3>
            <p className="mb-6 max-w-md text-sm text-text-secondary">
                {hasActiveScope
                    ? 'No items match your search criteria.'
                    : `There are no ${config.pluralLabel.toLowerCase()} in the system yet.`}
            </p>
            {!filters.searchText && (
                <button type="button"
                    onClick={onAdd}
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                >
                    <i className="fas fa-plus text-[12px]" />
                    {config.emptyState.addLabel}
                </button>
            )}
        </div>
    )
}
