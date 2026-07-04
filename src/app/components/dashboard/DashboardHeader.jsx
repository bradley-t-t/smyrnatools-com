import React from 'react'

import Badge from '../common/Badge'

const ACTION_BUTTON_CLASS =
    'inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold px-2.5 h-[30px] cursor-pointer ' +
    'bg-bg-secondary border border-border-light text-text-primary ' +
    'transition-all duration-150 hover:bg-bg-hover hover:border-border-medium ' +
    'active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-bg-primary'

/**
 * Slim sticky dashboard header — mirrors `PlanHeader`'s flat aesthetic so
 * both surfaces feel like part of the same product. One-line title, an
 * inline region/scope pill, and a row of action buttons (refresh / plant
 * filter). Skeleton state matches the live layout's height to avoid CLS.
 */
export default function DashboardHeader({
    accentColor: _accentColor,
    heroRegionSub,
    isLoading = false,
    isMobile,
    onPlantFilterClick,
    onRefresh,
    refreshing,
    regionDisplayName
}) {
    return (
        <div className="shrink-0 flex items-center flex-wrap gap-x-3 gap-y-2 border-b border-border-light bg-bg-primary px-3 sm:px-4 py-2.5 animate-fade-in-fast">
            <h1 className="font-heading text-lg font-semibold tracking-tight m-0 shrink-0 text-text-primary">
                Dashboard
            </h1>
            {isLoading ? (
                <div className="h-6 w-56 rounded-md animate-pulse bg-bg-tertiary" />
            ) : (
                <Badge
                    tone="neutral"
                    variant="custom"
                    size="lg"
                    shape="rounded-md"
                    weight="medium"
                    uppercase={false}
                    className="max-w-full bg-bg-secondary border border-border-light text-text-primary transition-colors duration-150"
                >
                    <i className="fas fa-location-dot text-[10px] text-text-tertiary" aria-hidden="true" />
                    <span className="truncate">{regionDisplayName || 'Region'}</span>
                    {heroRegionSub && (
                        <span className="hidden sm:inline truncate text-text-tertiary">· {heroRegionSub}</span>
                    )}
                </Badge>
            )}
            <div className="flex-1 min-w-[8px]" />
            <div className="flex items-center gap-1.5">
                {onPlantFilterClick && (
                    <button type="button"
                        onClick={onPlantFilterClick}
                        className={ACTION_BUTTON_CLASS}
                        aria-label="Filter dashboard by plant"
                    >
                        <i className="fas fa-filter text-[11px]" aria-hidden="true" />
                        {!isMobile && <span>Filter</span>}
                    </button>
                )}
                {onRefresh && (
                    <button type="button"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className={`${ACTION_BUTTON_CLASS} justify-center w-[30px] px-0`}
                        title="Refresh"
                        aria-label="Refresh dashboard data"
                    >
                        <i
                            className={`fas fa-arrows-rotate text-[11px] ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
                            aria-hidden="true"
                        />
                    </button>
                )}
            </div>
        </div>
    )
}
