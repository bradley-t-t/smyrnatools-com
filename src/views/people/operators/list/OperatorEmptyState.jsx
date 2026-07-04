import React from 'react'

/**
 * Empty-state block shown when no operators match the active filters, or when
 * the roster is empty. Mirrors the original inline markup verbatim.
 */
function OperatorEmptyState({ hasActiveFilters, onAddOperator }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-users text-3xl text-text-tertiary"></i>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">No Operators Found</h3>
            <p className="text-text-secondary mb-6 max-w-md">
                {hasActiveFilters
                    ? 'No operators match your search criteria.'
                    : 'There are no operators in the system yet.'}
            </p>
            <button type="button"
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                onClick={onAddOperator}
            >
                Add Operator
            </button>
        </div>
    )
}

export default OperatorEmptyState
