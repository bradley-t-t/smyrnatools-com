import React from 'react'

export default function DashboardHeader({
    accentColor,
    isMobile,
    refreshing,
    onRefresh,
    dashboardRegionCode,
    selectedRegion,
    dashboardPlant,
    regionPlants,
    setPlantModalOpen
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
        </div>
    )
}
