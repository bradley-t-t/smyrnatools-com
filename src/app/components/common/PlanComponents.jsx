import React from 'react'

import { DROPDOWN_ARROW_SVG, formatTimeInput } from '../../../utils/PlanUtility'

export const PlantSelect = ({ value, onChange, plants, excludeValue, placeholder, className }) => (
    <select
        value={value}
        onChange={onChange}
        className={`border rounded-md text-xs outline-none py-1 pl-1.5 pr-4 appearance-none bg-no-repeat cursor-pointer w-[56px] ${className || ''}`}
        style={{
            backgroundColor: 'var(--bg-primary)',
            backgroundImage: DROPDOWN_ARROW_SVG,
            backgroundPosition: 'right 3px center',
            borderColor: 'var(--border-medium)',
            color: 'var(--text-primary)'
        }}
    >
        <option value="">{placeholder}</option>
        {plants
            .filter((p) => p.plant_code !== excludeValue)
            .map((p) => (
                <option key={p.plant_code} value={p.plant_code}>
                    {p.plant_code}
                </option>
            ))}
    </select>
)

export const TimeInput = ({ value, onChange, placeholder = 'HH:MM', className = '' }) => (
    <input
        type="text"
        placeholder={placeholder}
        maxLength={5}
        value={value || ''}
        onChange={(e) => onChange(formatTimeInput(e.target.value))}
        className={`border rounded-md text-xs outline-none font-mono text-center py-1 px-1 w-[56px] ${className}`}
        style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-medium)',
            color: 'var(--text-primary)'
        }}
    />
)

export function PlanSkeleton() {
    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Plant strip skeleton */}
            <div
                className="shrink-0 flex items-center gap-2 overflow-x-auto px-4 py-2 border-b"
                style={{ borderColor: 'var(--border-light)', background: 'var(--bg-secondary)' }}
            >
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="shrink-0 rounded-lg px-3 py-2 w-[120px]"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                    >
                        <div
                            className="h-3 rounded w-1/2 mb-1.5 animate-pulse"
                            style={{ background: 'var(--border-light)' }}
                        />
                        <div
                            className="h-2.5 rounded w-3/4 animate-pulse"
                            style={{ background: 'var(--border-light)' }}
                        />
                    </div>
                ))}
            </div>
            {/* Card skeletons */}
            <div className="flex-1 overflow-hidden px-4 py-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="rounded-lg border mb-2 px-3 py-3"
                        style={{ borderColor: 'var(--border-light)', background: 'var(--bg-primary)' }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div
                                className="w-6 h-6 rounded-md animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                            <div
                                className="h-3 rounded w-16 animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                            <div
                                className="h-3 rounded w-4 animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                            <div
                                className="h-3 rounded w-16 animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                            <div className="flex-1" />
                            <div
                                className="h-5 rounded w-14 animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                        </div>
                        <div className="flex items-center gap-2 ml-9">
                            <div
                                className="h-2.5 rounded-full w-20 animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                            <div
                                className="h-2.5 rounded-full w-16 animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
