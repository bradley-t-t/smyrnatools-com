import React from 'react'
/**
 * Sticky dashboard top bar with refresh button and optional plant filter.
 * The plant selector is hidden for Office-type regions.
 * @param {Object} props
 * @param {string} props.accentColor - Theme accent color for the refresh button.
 * @param {boolean} props.isMobile - Applies compact spacing when true.
 * @param {boolean} props.refreshing - Disables the refresh button and shows a spinner.
 * @param {Function} props.onRefresh - Callback triggered by the refresh button.
 * @param {string} props.dashboardRegionCode - Currently selected region code.
 * @param {Object} props.selectedRegion - Region object with `type` used to hide plant filter for Office.
 * @param {string|null} props.dashboardPlant - Currently selected plant code, or null for "All Plants".
 * @param {Array} props.regionPlants - Plants available in the current region for label lookup.
 * @param {Function} props.setPlantModalOpen - Opens the plant selection modal.
 */
export default function DashboardHeader({
    accentColor,
    isMobile,
    refreshing,
    onRefresh,
    dashboardRegionCode,
    selectedRegion,
    dashboardPlant,
    regionPlants,
    setPlantModalOpen,
    isLoading = false
}) {
    return (
        <div
            className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm"
            style={{
                backgroundImage:
                    'linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                padding: isMobile ? '10px 12px' : '12px 16px'
            }}
        >
            {isLoading ? (
                <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mx-auto max-w-full">
                    <div className={`${isMobile ? 'h-6 w-28' : 'h-7 w-32'} rounded-lg bg-slate-200 animate-pulse`} />
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={`${isMobile ? 'h-9 w-9' : 'h-9 w-24'} rounded-lg bg-slate-200 animate-pulse`} />
                        <div className="h-9 w-24 rounded-lg bg-slate-200 animate-pulse" />
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mx-auto max-w-full">
                    <h1 className={`font-bold text-slate-900 m-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>Dashboard</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={refreshing}
                            className="flex items-center justify-center gap-1.5 rounded-lg text-white text-sm font-medium px-3 py-2 min-w-9"
                            style={{
                                backgroundColor: accentColor,
                                cursor: refreshing ? 'not-allowed' : 'pointer',
                                opacity: refreshing ? 0.7 : 1
                            }}
                        >
                            <i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                        {dashboardRegionCode && selectedRegion?.type !== 'Office' && (
                            <button
                                type="button"
                                onClick={() => setPlantModalOpen(true)}
                                disabled={refreshing}
                                className="bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium px-3 py-2 max-w-36 truncate cursor-pointer"
                            >
                                {dashboardPlant
                                    ? regionPlants.find((p) => (p.plantCode || p.plant_code) === dashboardPlant)
                                          ?.plantName || dashboardPlant
                                    : 'All Plants'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
