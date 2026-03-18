import React from 'react'

import { PlantSelect, TimeInput } from '../../../app/components/common/PlanComponents'
import { addMinutesToTime, DEFAULT_STAGGER_MINUTES } from '../../../utils/PlanUtility'

/**
 * Single assignment card in the dispatch planner.
 * Extracted from PlanView to reduce file size.
 */
export default function PlanAssignmentCard({
    accentColor,
    assignment: a,
    assignmentCount,
    calcClockIn,
    index: idx,
    isExpanded,
    moveAssignment,
    onDelete,
    plants,
    switchToCustom,
    toggleRowExpanded,
    travelTime,
    updateAssignment,
    updateCustomTime
}) {
    const clockIn = a.time && travelTime !== null ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
    const missingTravelTime = travelTime === null && a.fromPlant && a.toPlant
    const hasDetails = a.driverCount > 1

    return (
        <div
            className="rounded-lg border transition-opacity"
            style={{
                background: 'var(--bg-primary)',
                borderColor: isExpanded ? accentColor : 'var(--border-light)'
            }}
        >
            {/* Row 1: Route + Ops + Arrive + CLOCK IN hero */}
            <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                {/* Row number with reorder */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                    {idx > 0 && (
                        <button
                            onClick={() => moveAssignment(a.id, -1)}
                            className="border-none bg-transparent cursor-pointer p-0 opacity-40 hover:opacity-100 transition-opacity leading-none"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-caret-up text-[10px]" />
                        </button>
                    )}
                    <span
                        className="inline-flex items-center justify-center rounded-md text-white text-[11px] font-bold w-6 h-6"
                        style={{ background: accentColor }}
                    >
                        {idx + 1}
                    </span>
                    {idx < assignmentCount - 1 && (
                        <button
                            onClick={() => moveAssignment(a.id, 1)}
                            className="border-none bg-transparent cursor-pointer p-0 opacity-40 hover:opacity-100 transition-opacity leading-none"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-caret-down text-[10px]" />
                        </button>
                    )}
                </div>
                {/* Route group */}
                <div
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 shrink-0"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                >
                    <div className="flex flex-col gap-0.5">
                        <span
                            className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            From
                        </span>
                        <PlantSelect
                            value={a.fromPlant}
                            onChange={(e) => updateAssignment(a.id, 'fromPlant', e.target.value)}
                            plants={plants}
                            excludeValue={a.toPlant}
                            placeholder="—"
                            className="!w-[80px]"
                        />
                    </div>
                    <i
                        className="fas fa-arrow-right text-xs mt-3 shrink-0"
                        style={{ color: travelTime !== null ? accentColor : 'var(--border-medium)' }}
                    />
                    <div className="flex flex-col gap-0.5">
                        <span
                            className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            To
                        </span>
                        <PlantSelect
                            value={a.toPlant}
                            onChange={(e) => updateAssignment(a.id, 'toPlant', e.target.value)}
                            plants={plants}
                            excludeValue={a.fromPlant}
                            placeholder="—"
                            className="!w-[80px]"
                        />
                    </div>
                </div>
                {/* Ops group */}
                <div className="flex flex-col gap-0.5 shrink-0">
                    <span
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Ops
                    </span>
                    <input
                        type="number"
                        min="1"
                        value={a.driverCount || ''}
                        onChange={(e) =>
                            updateAssignment(
                                a.id,
                                'driverCount',
                                e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1)
                            )
                        }
                        className="border rounded-md text-sm outline-none font-mono text-center py-1.5 px-1.5 w-[48px]"
                        style={{
                            background: 'var(--bg-primary)',
                            borderColor: 'var(--border-medium)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>
                {/* Arrive group */}
                <div className="flex flex-col gap-0.5 shrink-0">
                    <span
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Arrive
                    </span>
                    <TimeInput
                        value={a.time}
                        onChange={(val) => updateAssignment(a.id, 'time', val)}
                        className="!w-[80px]"
                    />
                </div>
                {/* Leave group */}
                <div className="flex flex-col gap-0.5 shrink-0">
                    <span
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Leave
                    </span>
                    <TimeInput
                        value={a.leaveTime}
                        onChange={(val) => updateAssignment(a.id, 'leaveTime', val)}
                        className="!w-[80px]"
                    />
                </div>
                {/* CLOCK IN — hero element */}
                <div
                    className="ml-auto flex flex-col items-end gap-0.5 shrink-0 rounded-lg px-3 py-1.5"
                    style={{
                        background: clockIn ? '#16a34a10' : 'var(--bg-secondary)',
                        border: `1px solid ${clockIn ? '#16a34a30' : 'var(--border-light)'}`
                    }}
                >
                    <span
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: clockIn ? '#16a34a' : 'var(--text-secondary)' }}
                    >
                        Clock In
                    </span>
                    <span
                        className="font-mono font-bold text-lg leading-none"
                        style={{ color: clockIn ? '#16a34a' : 'var(--border-medium)' }}
                    >
                        {clockIn || '--:--'}
                    </span>
                </div>
            </div>

            {/* Row 2: Badges + actions */}
            <div className="flex items-center gap-1.5 px-3 pb-2.5 flex-wrap" style={{ marginLeft: 36 }}>
                {/* Stagger badge */}
                {a.driverCount > 1 && a.timeMode !== 'custom' && (
                    <span
                        className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                        style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)'
                        }}
                    >
                        <i className="fas fa-clock text-[8px] mr-1" style={{ opacity: 0.6 }} />
                        {a.staggerMinutes || DEFAULT_STAGGER_MINUTES}m stagger
                    </span>
                )}
                {a.driverCount > 1 && a.timeMode === 'custom' && (
                    <span
                        className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                        style={{
                            background: `${accentColor}10`,
                            color: accentColor,
                            border: `1px solid ${accentColor}25`
                        }}
                    >
                        <i className="fas fa-sliders-h text-[8px] mr-1" style={{ opacity: 0.7 }} />
                        custom times
                    </span>
                )}
                {/* Travel badge */}
                {travelTime !== null && (
                    <span
                        className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                        style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)'
                        }}
                    >
                        <i className="fas fa-route text-[8px] mr-1" style={{ opacity: 0.6 }} />
                        {travelTime}m travel
                    </span>
                )}
                {missingTravelTime && (
                    <span
                        className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                        style={{ background: '#fef3c715', color: '#d97706', border: '1px solid #d9770625' }}
                    >
                        <i className="fas fa-exclamation-triangle text-[8px] mr-1" />
                        no travel time
                    </span>
                )}
                {/* Load checkbox */}
                <label
                    className="flex items-center gap-1.5 cursor-pointer shrink-0 text-[10px] font-semibold rounded-full px-2.5 py-1"
                    style={{
                        background: a.loadFromPlant ? `${accentColor}10` : 'var(--bg-tertiary)',
                        color: a.loadFromPlant ? accentColor : 'var(--text-secondary)',
                        border: `1px solid ${a.loadFromPlant ? `${accentColor}25` : 'var(--border-light)'}`
                    }}
                >
                    <input
                        type="checkbox"
                        checked={a.loadFromPlant || false}
                        onChange={(e) => updateAssignment(a.id, 'loadFromPlant', e.target.checked)}
                        className="cursor-pointer h-3 w-3 rounded"
                        style={{ accentColor }}
                    />
                    Load from Plant
                </label>
                <div className="flex-1" />
                {/* Expand / Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {hasDetails && (
                        <button
                            onClick={() => toggleRowExpanded(a.id)}
                            className="border-none cursor-pointer p-1.5 rounded-md transition-colors"
                            style={{
                                background: isExpanded ? `${accentColor}15` : 'transparent',
                                color: isExpanded ? accentColor : 'var(--text-secondary)'
                            }}
                            title={isExpanded ? 'Collapse' : 'Expand operator details'}
                        >
                            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`} />
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 border-none rounded-md cursor-pointer px-2.5 py-1.5 text-[10px] font-semibold transition-colors"
                        style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444425' }}
                    >
                        <i className="fas fa-trash text-[9px]" />
                        Delete
                    </button>
                </div>
            </div>

            {/* Expanded operator detail */}
            {isExpanded && (
                <div
                    className="px-4 py-3 border-t"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
                >
                    {hasDetails && (
                        <>
                            {/* Mode toggle + stagger config */}
                            <div className="flex items-center gap-3 mb-2.5">
                                <div
                                    className="rounded-md flex overflow-hidden"
                                    style={{ border: '1px solid var(--border-medium)' }}
                                >
                                    {['stagger', 'custom'].map((mode) => {
                                        const isActive =
                                            mode === 'custom' ? a.timeMode === 'custom' : a.timeMode !== 'custom'
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() =>
                                                    mode === 'custom'
                                                        ? switchToCustom(a.id)
                                                        : updateAssignment(a.id, 'timeMode', 'stagger')
                                                }
                                                className="border-none cursor-pointer text-[11px] font-semibold px-3 py-1"
                                                style={{
                                                    background: isActive ? accentColor : 'transparent',
                                                    color: isActive ? '#fff' : 'var(--text-secondary)'
                                                }}
                                            >
                                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                            </button>
                                        )
                                    })}
                                </div>
                                {a.timeMode !== 'custom' && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                            Every
                                        </span>
                                        <input
                                            type="number"
                                            min="5"
                                            step="5"
                                            value={a.staggerMinutes || DEFAULT_STAGGER_MINUTES}
                                            onChange={(e) =>
                                                updateAssignment(
                                                    a.id,
                                                    'staggerMinutes',
                                                    parseInt(e.target.value) || DEFAULT_STAGGER_MINUTES
                                                )
                                            }
                                            className="border rounded-md text-xs outline-none py-1 px-1.5 text-center w-[40px]"
                                            style={{
                                                background: 'var(--bg-primary)',
                                                borderColor: 'var(--border-medium)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                            min
                                        </span>
                                    </div>
                                )}
                            </div>
                            {/* Operator grid */}
                            <div
                                className="grid gap-1"
                                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
                            >
                                {Array.from({ length: a.driverCount }, (_, i) => {
                                    const isCustom = a.timeMode === 'custom'
                                    const ct = a.customTimes?.[i] || {}
                                    const arr = isCustom
                                        ? ct.time
                                        : a.time
                                          ? addMinutesToTime(a.time, i * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES))
                                          : null
                                    const opClockIn = arr ? calcClockIn(arr, a.fromPlant, a.toPlant) : null
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                                            style={{
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-light)'
                                            }}
                                        >
                                            <span
                                                className="inline-flex items-center justify-center rounded text-white text-[9px] font-bold w-5 h-5 shrink-0"
                                                style={{ background: accentColor }}
                                            >
                                                {i + 1}
                                            </span>
                                            {isCustom ? (
                                                <>
                                                    <TimeInput
                                                        value={ct.time}
                                                        onChange={(val) => updateCustomTime(a.id, i, 'time', val)}
                                                        placeholder="Arrive"
                                                    />
                                                    <TimeInput
                                                        value={ct.leaveTime}
                                                        onChange={(val) => updateCustomTime(a.id, i, 'leaveTime', val)}
                                                        placeholder="Leave"
                                                    />
                                                </>
                                            ) : (
                                                <span
                                                    className="text-[11px] font-mono"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {arr || '--:--'}
                                                </span>
                                            )}
                                            <span
                                                className="ml-auto text-[11px] font-mono font-bold"
                                                style={{ color: opClockIn ? '#16a34a' : 'var(--text-secondary)' }}
                                            >
                                                {opClockIn || '--:--'}
                                            </span>
                                            <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                                                in
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
