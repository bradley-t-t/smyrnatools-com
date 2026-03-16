import React from 'react'
/**
 * Sticky dashboard top bar. Displays the dashboard title and region/plant breadcrumb.
 * Plant filter and refresh controls live in the sidebar.
 */
export default function DashboardHeader({
    accentColor,
    isMobile,
    regionDisplayName,
    heroRegionSub,
    isLoading = false,
    onPlantFilterClick
}) {
    return (
        <div
            className={`sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3'}`}
            style={{
                backgroundImage: `
                    linear-gradient(${accentColor}10 1px, transparent 1px),
                    linear-gradient(90deg, ${accentColor}10 1px, transparent 1px),
                    radial-gradient(circle at center, ${accentColor}08 0%, transparent 50%)
                `,
                backgroundPosition: '0 0, 0 0, 0 0',
                backgroundSize: '20px 20px, 20px 20px, 40px 40px'
            }}
        >
            {isLoading ? (
                <div className="flex flex-wrap items-center gap-2 mx-auto max-w-full">
                    <div className={`${isMobile ? 'h-6 w-28' : 'h-7 w-32'} rounded-lg bg-slate-200 animate-pulse`} />
                    <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                </div>
            ) : (
                <div className="flex items-center justify-between mx-auto max-w-full">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className={`font-bold text-slate-900 m-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                            Dashboard
                        </h1>
                        {regionDisplayName && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                <i className="fas fa-chevron-right text-[8px] text-slate-300" />
                                <span>{regionDisplayName}</span>
                                {heroRegionSub && (
                                    <>
                                        <i className="fas fa-chevron-right text-[8px] text-slate-300" />
                                        <span className="text-slate-400">{heroRegionSub}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {isMobile && onPlantFilterClick && (
                        <button
                            className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-sm cursor-pointer"
                            onClick={onPlantFilterClick}
                            type="button"
                            aria-label="Filter by plant"
                        >
                            <i className="fas fa-filter" />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
