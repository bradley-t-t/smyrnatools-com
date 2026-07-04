import React from 'react'

/** Empty / no-results placeholder. */
function PlantsEmptyState({ hasSearch, onAddClick }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-card border border-border-light bg-bg-primary px-6 py-16 text-center animate-fade-in motion-reduce:animate-none">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
                <i className="fas fa-industry text-3xl" aria-hidden="true" />
            </div>
            <h3 className="mb-2 font-heading text-xl font-semibold text-text-primary">No Plants Found</h3>
            <p className="mb-6 max-w-md text-sm text-text-secondary">
                {hasSearch ? 'No plants match your search criteria.' : 'There are no plants in the system yet.'}
            </p>
            <button type="button"
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-accent-hover hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
                onClick={onAddClick}
            >
                Add Plant
            </button>
        </div>
    )
}

export default PlantsEmptyState
