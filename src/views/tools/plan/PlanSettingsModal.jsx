import React from 'react'

import { PlantSelect } from '../../../app/components/common/PlanComponents'

/**
 * Modal for configuring plant-to-plant travel times.
 * Extracted from PlanView to reduce file size.
 */
export default function PlanSettingsModal({
    accentColor,
    plants,
    travelTimes,
    newTravelTime,
    setNewTravelTime,
    addTravelTime,
    removeTravelTime,
    onClose
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4 border-b"
                    style={{ borderColor: 'var(--border-light)' }}
                >
                    <div className="flex items-center gap-2">
                        <i className="fas fa-route text-sm" style={{ color: accentColor }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            Travel Times
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="border-none bg-transparent cursor-pointer p-1 rounded-md"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
                {/* Add new route */}
                <div className="px-5 py-4" style={{ background: 'var(--bg-secondary)' }}>
                    <div
                        className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Add Route
                    </div>
                    <div className="flex items-center gap-2">
                        <PlantSelect
                            value={newTravelTime.from}
                            onChange={(e) => setNewTravelTime({ ...newTravelTime, from: e.target.value })}
                            plants={plants}
                            placeholder="From"
                            className="min-w-[80px]"
                        />
                        <i className="fas fa-arrow-right text-[10px]" style={{ color: 'var(--text-secondary)' }} />
                        <PlantSelect
                            value={newTravelTime.to}
                            onChange={(e) => setNewTravelTime({ ...newTravelTime, to: e.target.value })}
                            plants={plants}
                            placeholder="To"
                            className="min-w-[80px]"
                        />
                        <input
                            type="number"
                            placeholder="min"
                            value={newTravelTime.minutes}
                            onChange={(e) => setNewTravelTime({ ...newTravelTime, minutes: e.target.value })}
                            className="border rounded-lg text-sm outline-none py-1.5 px-2 text-center w-[60px]"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-medium)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <button
                            onClick={addTravelTime}
                            className="border-none rounded-lg cursor-pointer text-sm font-semibold px-3 py-1.5 text-white"
                            style={{ background: accentColor }}
                        >
                            Add
                        </button>
                    </div>
                </div>
                {/* Saved routes */}
                <div className="px-5 py-4 max-h-[300px] overflow-y-auto">
                    <div
                        className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Saved Routes
                    </div>
                    {Object.entries(travelTimes).filter(([k]) => {
                        const [f, t] = k.split('->')
                        return f < t
                    }).length === 0 ? (
                        <div className="text-xs py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                            No travel times configured yet
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {Object.entries(travelTimes)
                                .filter(([k]) => {
                                    const [f, t] = k.split('->')
                                    return f < t
                                })
                                .map(([k, v]) => {
                                    const [f, t] = k.split('->')
                                    return (
                                        <div
                                            key={k}
                                            className="flex items-center justify-between rounded-lg px-3 py-2"
                                            style={{ background: 'var(--bg-tertiary)' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-xs font-semibold"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {f}
                                                </span>
                                                <i
                                                    className="fas fa-arrows-left-right text-[9px]"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                />
                                                <span
                                                    className="text-xs font-semibold"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {t}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold" style={{ color: accentColor }}>
                                                    {v} min
                                                </span>
                                                <button
                                                    onClick={() => removeTravelTime(k)}
                                                    className="bg-transparent border-none cursor-pointer p-1 rounded"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    <i className="fas fa-trash text-[10px]" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
