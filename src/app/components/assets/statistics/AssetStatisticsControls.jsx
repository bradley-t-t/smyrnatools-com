/* eslint-disable react/forbid-dom-props */
import React, { useMemo, useState } from 'react'

import { StatisticsTimeRange } from '../../common/StatisticsTimeRange'

/**
 * Plant filter for the Statistics page. The asset list view has its own
 * persisted plant filter inside `useAssetFilters`; this one is intentionally
 * separate so the user can hold both views in different states. Defaults to
 * "All plants" on first mount because the most-asked Statistics question is
 * a region-wide health read.
 */
function PlantFilterMenu({ accentColor, availablePlants, plantNames, selectedPlant, setSelectedPlant }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative">
            <button type="button"
                onClick={() => setOpen((s) => !s)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Filter every chart and table to a single plant"
                className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2 active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                style={{
                    backgroundColor: selectedPlant ? `${accentColor}20` : 'var(--bg-tertiary)',
                    color: selectedPlant ? accentColor : 'var(--text-secondary)'
                }}
            >
                <i className="fas fa-industry text-[11px]" />
                <span>
                    {selectedPlant
                        ? `Plant · ${plantNames?.get(selectedPlant) ? selectedPlant : selectedPlant}`
                        : 'All plants'}
                </span>
                <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[9px]`} />
            </button>
            {open && (
                <div
                    role="listbox"
                    className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-lg z-10 min-w-[220px] max-h-[320px] overflow-y-auto bg-bg-primary border border-border-light"
                >
                    <button type="button"
                        role="option"
                        aria-selected={!selectedPlant}
                        onClick={() => {
                            setSelectedPlant('')
                            setOpen(false)
                        }}
                        className="w-full text-left text-xs font-semibold border-none cursor-pointer px-3 py-2 flex items-center justify-between active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:bg-bg-hover"
                        style={{
                            backgroundColor: !selectedPlant ? `${accentColor}15` : 'transparent',
                            color: !selectedPlant ? accentColor : 'var(--text-primary)'
                        }}
                    >
                        <span>All plants</span>
                        {!selectedPlant && <i className="fas fa-check text-[10px]" />}
                    </button>
                    {availablePlants.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-text-tertiary">No plants with assets in scope</div>
                    ) : (
                        availablePlants.map(({ code, label }) => {
                            const isActive = selectedPlant === code
                            return (
                                <button type="button"
                                    key={code}
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => {
                                        setSelectedPlant(code)
                                        setOpen(false)
                                    }}
                                    className="w-full text-left text-xs font-semibold border-none cursor-pointer px-3 py-2 flex items-center justify-between active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:bg-bg-hover"
                                    style={{
                                        backgroundColor: isActive ? `${accentColor}15` : 'transparent',
                                        color: isActive ? accentColor : 'var(--text-primary)'
                                    }}
                                >
                                    <span className="truncate">{label}</span>
                                    {isActive && <i className="fas fa-check text-[10px]" />}
                                </button>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * Top-bar controls for the asset Statistics page. Pairs the plant filter
 * with the shared time-range selector so users can scope every chart and
 * table to a date window (defaults to "All-time" since asset data is
 * inventory-style, not time-series). The time range filters items by
 * `updatedAt` inside `useAssetStatistics`.
 */
export function AssetStatisticsControls({
    accentColor,
    availablePlantCodes,
    period,
    plantNames,
    selectedPlant,
    setSelectedPlant,
    ...periodProps
}) {
    const availablePlants = useMemo(
        () =>
            availablePlantCodes.map((code) => ({
                code,
                label: plantNames?.get(code) ? `${code} · ${plantNames.get(code)}` : code
            })),
        [availablePlantCodes, plantNames]
    )

    return (
        <div className="flex flex-wrap items-center gap-2">
            <StatisticsTimeRange accentColor={accentColor} period={period} {...periodProps} />
            <span className="hidden md:inline-block w-px h-5 bg-border-light mx-1" aria-hidden="true" />
            <PlantFilterMenu
                accentColor={accentColor}
                availablePlants={availablePlants}
                plantNames={plantNames}
                selectedPlant={selectedPlant}
                setSelectedPlant={setSelectedPlant}
            />
            {selectedPlant && (
                <button type="button"
                    onClick={() => setSelectedPlant('')}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer text-text-secondary hover:text-text-primary active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded px-1"
                >
                    Clear plant
                </button>
            )}
        </div>
    )
}

export default AssetStatisticsControls
