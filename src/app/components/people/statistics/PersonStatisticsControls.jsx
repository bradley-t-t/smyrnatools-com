/* eslint-disable react/forbid-dom-props */
import React, { useMemo, useState } from 'react'

import { StatisticsTimeRange } from '../../common/StatisticsTimeRange'

/** Plant filter for the person Statistics page — identical chrome to the
 *  asset version so the surfaces feel like one product. Defaults to "All
 *  plants" because the most-asked question is roster-wide health. */
function PlantFilterMenu({ accentColor, availablePlants, selectedPlant, setSelectedPlant }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative">
            <button type="button"
                onClick={() => setOpen((s) => !s)}
                className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2 active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
                style={{
                    backgroundColor: selectedPlant ? `${accentColor}20` : 'var(--bg-tertiary)',
                    color: selectedPlant ? accentColor : 'var(--text-secondary)'
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Filter every chart and table to a single plant"
            >
                <i className="fas fa-industry text-[11px]" aria-hidden="true" />
                <span>{selectedPlant ? `Plant · ${selectedPlant}` : 'All plants'}</span>
                <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[9px]`} aria-hidden="true" />
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-lg z-10 min-w-[220px] max-h-[320px] overflow-y-auto bg-bg-primary border border-border-light"
                    role="listbox"
                >
                    <button type="button"
                        onClick={() => {
                            setSelectedPlant('')
                            setOpen(false)
                        }}
                        className="w-full text-left text-xs font-semibold border-none cursor-pointer px-3 py-2 flex items-center justify-between active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:outline-none focus-visible:bg-bg-hover"
                        style={{
                            backgroundColor: !selectedPlant ? `${accentColor}15` : 'transparent',
                            color: !selectedPlant ? accentColor : 'var(--text-primary)'
                        }}
                        role="option"
                        aria-selected={!selectedPlant}
                    >
                        <span>All plants</span>
                        {!selectedPlant && <i className="fas fa-check text-[10px]" aria-hidden="true" />}
                    </button>
                    {availablePlants.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-text-tertiary">No plants in scope</div>
                    ) : (
                        availablePlants.map(({ code, label }) => (
                            <button type="button"
                                key={code}
                                onClick={() => {
                                    setSelectedPlant(code)
                                    setOpen(false)
                                }}
                                className="w-full text-left text-xs font-semibold border-none cursor-pointer px-3 py-2 flex items-center justify-between active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:outline-none focus-visible:bg-bg-hover"
                                style={{
                                    backgroundColor: selectedPlant === code ? `${accentColor}15` : 'transparent',
                                    color: selectedPlant === code ? accentColor : 'var(--text-primary)'
                                }}
                                role="option"
                                aria-selected={selectedPlant === code}
                            >
                                <span className="truncate">{label}</span>
                                {selectedPlant === code && (
                                    <i className="fas fa-check text-[10px]" aria-hidden="true" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export function PersonStatisticsControls({
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
                selectedPlant={selectedPlant}
                setSelectedPlant={setSelectedPlant}
            />
            {selectedPlant && (
                <button type="button"
                    onClick={() => setSelectedPlant('')}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer text-text-secondary rounded px-2 py-1 active:scale-[0.97] transition-[transform,background-color,color] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    Clear plant
                </button>
            )}
        </div>
    )
}

export default PersonStatisticsControls
