import React from 'react'

import { DROPDOWN_ARROW_SVG, formatTimeInput } from '../../../utils/PlanUtility'

export const PlantSelect = ({ value, onChange, plants, excludeValue, placeholder, className }) => (
    <select
        value={value}
        onChange={onChange}
        className={`border rounded-md text-xs outline-none py-1 pl-1.5 pr-4 appearance-none bg-no-repeat cursor-pointer w-[56px] bg-bg-primary border-border-medium text-text-primary ${className || ''}`}
        style={{
            backgroundImage: DROPDOWN_ARROW_SVG,
            backgroundPosition: 'right 3px center'
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
        className={`border rounded-md text-xs outline-none font-mono text-center py-1 px-1 w-[56px] bg-bg-primary border-border-medium text-text-primary ${className}`}
    />
)

const SkeletonBar = ({ className }) => <div className={`rounded animate-pulse bg-border-light ${className}`} />

export function PlanSkeleton() {
    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 flex items-center gap-2 overflow-x-auto px-4 py-2 border-b border-border-light bg-bg-secondary">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="shrink-0 rounded-lg px-3 py-2 w-[120px] bg-bg-primary border border-border-light"
                    >
                        <SkeletonBar className="h-3 w-1/2 mb-1.5" />
                        <SkeletonBar className="h-2.5 w-3/4" />
                    </div>
                ))}
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border mb-2 px-3 py-3 border-border-light bg-bg-primary">
                        <div className="flex items-center gap-3 mb-2">
                            <SkeletonBar className="w-6 h-6 rounded-md" />
                            <SkeletonBar className="h-3 w-16" />
                            <SkeletonBar className="h-3 w-4" />
                            <SkeletonBar className="h-3 w-16" />
                            <div className="flex-1" />
                            <SkeletonBar className="h-5 w-14" />
                        </div>
                        <div className="flex items-center gap-2 ml-9">
                            <SkeletonBar className="h-2.5 rounded-full w-20" />
                            <SkeletonBar className="h-2.5 rounded-full w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
