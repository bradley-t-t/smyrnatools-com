import React, { useRef, useState } from 'react'

import { PlanSkeleton, TimeInput } from '../../../app/components/common/PlanComponents'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
import { usePlanActions } from '../../../app/hooks/usePlanActions'
import { usePlanData } from '../../../app/hooks/usePlanData'
import { usePlanInsights } from '../../../app/hooks/usePlanInsights'
import {
    addMinutesToTime,
    createEmptyAssignment,
    getOffsetDate,
    getTomorrowDate,
    MAX_YPH,
    OVERTIME_THRESHOLD_HOURS,
    TARGET_YPH,
    timeToMinutes
} from '../../../utils/PlanUtility'
import PlanAssignmentCard from './PlanAssignmentCard'
import PlanMiniTimeline from './PlanMiniTimeline'
import PlanSettingsModal from './PlanSettingsModal'
import PlanTemplatesModal from './PlanTemplatesModal'
import TimelineView from './TimelineView'

/**
 * PlanView — plant-centric dispatch planner.
 *
 * Dispatchers create daily assignment plans: which plant sends operators to which plant,
 * with arrival times, stagger intervals, and custom per-operator
 * overrides. Generates a copyable text summary for dispatch and auto-saves
 * to the database with realtime sync across users.
 */
function PlanView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const isDark = preferences.themeMode === 'dark'
    const isMobile = useIsMobile()
    const productionFileRef = useRef(null)
    const [planDate, setPlanDate] = useState(getTomorrowDate)
    const [viewMode, setViewMode] = useState('table')
    const [selectedPlant, setSelectedPlant] = useState(null)
    const [productionPopoverPlant, setProductionPopoverPlant] = useState(null)
    const [notesExpanded, setNotesExpanded] = useState(false)
    const [miniTimelineExpanded, setMiniTimelineExpanded] = useState(true)
    const [insightsExpanded, setInsightsExpanded] = useState(false)

    const {
        adjacentPlans,
        adjacentProduction,
        assignments,
        canEdit,
        dirtyRef,
        getTravelTime,
        isLoading,
        mixerCountsByPlant,
        notes,
        plantProduction,
        plants,
        refreshTravelTimes,
        setAssignments,
        setNotes,
        setPlantProduction,
        travelTimes,
        userId
    } = usePlanData(planDate)

    const {
        activeRowId,
        addTravelTime,
        calcClockIn,
        copied,
        copyToClipboard,
        deleteTemplate,
        clearPlantProduction,
        importDailyOrderHtml,
        loadTemplate,
        loadTemplates,
        moveAssignment,
        newTravelTime,
        removeTravelTime,
        saveAsTemplate,
        setNewTravelTime,
        setShowSettings,
        setShowTemplateModal,
        setTemplateName,
        showSettings,
        showTemplateModal,
        switchToCustom,
        templateName,
        templates,
        toggleRowExpanded,
        updateAssignment,
        updateCustomTime,
        updatePlantProduction
    } = usePlanActions({
        assignments,
        getTravelTime,
        notes,
        planDate,
        refreshTravelTimes,
        setAssignments,
        setNotes,
        setPlantProduction,
        userId
    })

    const { earliestClockIn, planInsights, shiftSpanHours, stats, totalOps, validAssignmentCount } = usePlanInsights({
        assignments,
        calcClockIn,
        getTravelTime,
        mixerCountsByPlant,
        plants,
        travelTimes
    })

    return (
        <div
            className="global-dashboard-container dashboard-container global-flush-top flush-top plan-view"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
            {/* Header — slim sticky bar */}
            <div
                className="shrink-0 flex items-center gap-3 border-b px-4 py-2.5"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
            >
                <h1 className="text-lg font-bold tracking-tight m-0 shrink-0" style={{ color: 'var(--text-primary)' }}>
                    Plan
                </h1>
                {/* Date nav — always visible */}
                <div
                    className="inline-flex items-center gap-0.5 rounded-lg text-sm font-semibold px-1.5 py-1"
                    style={{ backgroundColor: `${accentColor}${isDark ? '30' : '15'}`, color: accentColor }}
                >
                    <button
                        onClick={() => setPlanDate(getOffsetDate(planDate, -1))}
                        className="border-none bg-transparent cursor-pointer p-1 rounded hover:opacity-80"
                        style={{ color: accentColor }}
                        title="Previous day"
                    >
                        <i className="fas fa-chevron-left text-xs" />
                    </button>
                    <button
                        className="relative border-none bg-transparent cursor-pointer px-2 py-0.5 rounded font-semibold text-sm"
                        style={{ color: accentColor }}
                        title="Click to pick date"
                    >
                        {new Date(planDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        })}
                        <input
                            type="date"
                            value={planDate}
                            onChange={(e) => e.target.value && setPlanDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            style={{ width: '100%', height: '100%' }}
                        />
                    </button>
                    <button
                        onClick={() => setPlanDate(getOffsetDate(planDate, 1))}
                        className="border-none bg-transparent cursor-pointer p-1 rounded hover:opacity-80"
                        style={{ color: accentColor }}
                        title="Next day"
                    >
                        <i className="fas fa-chevron-right text-xs" />
                    </button>
                </div>
                <button
                    onClick={() => setPlanDate(getTomorrowDate())}
                    className="border-none rounded-lg cursor-pointer text-xs font-semibold px-2.5 py-1.5"
                    style={{
                        background:
                            planDate === getTomorrowDate()
                                ? `${accentColor}${isDark ? '30' : '15'}`
                                : 'var(--bg-tertiary)',
                        color: planDate === getTomorrowDate() ? accentColor : 'var(--text-secondary)'
                    }}
                >
                    Tomorrow
                </button>
                <div className="flex-1" />
                {/* Action buttons — compact */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2"
                        style={{
                            backgroundColor: copied ? '#16a34a' : 'var(--bg-tertiary)',
                            color: copied ? '#fff' : 'var(--text-secondary)'
                        }}
                        title="Copy plan to clipboard"
                    >
                        <i className={`fas fa-${copied ? 'check' : 'copy'}`} />
                        {!isMobile && <span>{copied ? 'Copied' : 'Copy Plan'}</span>}
                    </button>
                    {canEdit && (
                        <>
                            <button
                                onClick={() => {
                                    setShowTemplateModal(true)
                                    loadTemplates()
                                }}
                                className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                title="Plan templates"
                            >
                                <i className="fas fa-bookmark" />
                                {!isMobile && <span>Templates</span>}
                            </button>
                            <button
                                onClick={() => productionFileRef.current?.click()}
                                className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                title="Import production from HTML"
                            >
                                <i className="fas fa-file-import" />
                                {!isMobile && <span>Import Production</span>}
                            </button>
                            <input
                                ref={productionFileRef}
                                type="file"
                                accept=".html,.htm"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) importDailyOrderHtml(e.target.files[0])
                                    e.target.value = ''
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (window.confirm('Clear all production data?')) clearPlantProduction()
                                }}
                                className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                title="Clear production data"
                            >
                                <i className="fas fa-eraser" />
                                {!isMobile && <span>Clear Production</span>}
                            </button>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="flex items-center gap-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold px-3 py-2"
                                style={{
                                    backgroundColor: showSettings ? accentColor : 'var(--bg-tertiary)',
                                    color: showSettings ? '#fff' : 'var(--text-secondary)'
                                }}
                                title="Travel time settings"
                            >
                                <i className="fas fa-cog" />
                            </button>
                        </>
                    )}
                </div>
                {/* View mode toggle */}
                <div
                    className="flex items-center rounded-lg p-0.5"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}
                >
                    {[
                        { mode: 'table', icon: 'fa-table', label: 'Planner' },
                        { mode: 'timeline', icon: 'fa-calendar-day', label: 'Timeline' }
                    ].map(({ mode, icon, label }) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className="flex items-center gap-1.5 rounded-md text-xs font-semibold border-none cursor-pointer px-2.5 py-1.5"
                            style={{
                                backgroundColor: viewMode === mode ? accentColor : 'transparent',
                                color: viewMode === mode ? '#fff' : 'var(--text-secondary)'
                            }}
                        >
                            <i className={`fas ${icon}`} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div
                className="global-content-container content-container"
                style={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            >
                {isLoading ? (
                    <PlanSkeleton />
                ) : (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        {/* Read-only banner for users without plan.edit */}
                        {!canEdit && (
                            <div
                                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-b shrink-0"
                                style={{
                                    background: `${accentColor}10`,
                                    borderColor: 'var(--border-light)',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <i className="fas fa-lock text-[10px]" />
                                <span>View only — you need permission to make changes</span>
                            </div>
                        )}

                        {showSettings && (
                            <PlanSettingsModal
                                accentColor={accentColor}
                                plants={plants}
                                travelTimes={travelTimes}
                                newTravelTime={newTravelTime}
                                setNewTravelTime={setNewTravelTime}
                                addTravelTime={addTravelTime}
                                removeTravelTime={removeTravelTime}
                                onClose={() => setShowSettings(false)}
                            />
                        )}

                        {showTemplateModal && (
                            <PlanTemplatesModal
                                accentColor={accentColor}
                                templates={templates}
                                templateName={templateName}
                                setTemplateName={setTemplateName}
                                saveAsTemplate={saveAsTemplate}
                                loadTemplate={loadTemplate}
                                deleteTemplate={deleteTemplate}
                                onClose={() => setShowTemplateModal(false)}
                            />
                        )}

                        {/* Plant Strip — horizontal cards, visible in all modes */}
                        <div
                            className="shrink-0 flex items-center gap-2 overflow-x-auto px-4 py-2 border-b"
                            style={{ borderColor: 'var(--border-light)', background: 'var(--bg-secondary)' }}
                        >
                            <span
                                className="text-[9px] font-semibold uppercase tracking-wider shrink-0 mr-1"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Plants
                            </span>
                            {stats.map((s) => {
                                const prod = plantProduction[s.code] || {}
                                const firstMins = timeToMinutes(prod.firstJobTime)
                                const lastMins = timeToMinutes(prod.lastJobTime)
                                const hours =
                                    firstMins !== null && lastMins !== null && lastMins > firstMins
                                        ? (lastMins - firstMins) / 60
                                        : null
                                const yardage = parseFloat(prod.totalYardage) || 0
                                const yph =
                                    hours && yardage && s.eff > 0
                                        ? Math.round((yardage / (hours * s.eff)) * 10) / 10
                                        : null
                                const minNeeded = hours && yardage ? Math.ceil(yardage / (hours * TARGET_YPH)) : null
                                const leaveOffCount =
                                    yph !== null && yph < TARGET_YPH && minNeeded !== null
                                        ? Math.max(0, s.eff - minNeeded)
                                        : 0
                                const isSelected = selectedPlant === s.code
                                const isPopoverOpen = productionPopoverPlant === s.code
                                return (
                                    <div key={s.code} className="relative shrink-0">
                                        <button
                                            onClick={() => {
                                                if (isSelected) {
                                                    setProductionPopoverPlant(isPopoverOpen ? null : s.code)
                                                } else {
                                                    setSelectedPlant(s.code)
                                                    setProductionPopoverPlant(null)
                                                }
                                            }}
                                            onDoubleClick={() => {
                                                setSelectedPlant(null)
                                                setProductionPopoverPlant(null)
                                            }}
                                            className="flex flex-col rounded-lg px-3 py-1.5 border-2 cursor-pointer text-left min-w-[120px]"
                                            style={{
                                                background: isSelected ? `${accentColor}10` : 'var(--bg-primary)',
                                                borderColor: isSelected ? accentColor : 'var(--border-light)'
                                            }}
                                        >
                                            {/* Plant code + effective count */}
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-xs font-extrabold"
                                                    style={{ color: isSelected ? accentColor : 'var(--text-primary)' }}
                                                >
                                                    {s.code}
                                                </span>
                                                <span
                                                    className="text-[10px] font-bold rounded-full px-1.5 py-px"
                                                    style={{ background: `${accentColor}15`, color: accentColor }}
                                                >
                                                    {s.eff} Operators
                                                </span>
                                            </div>
                                            {/* Yardage + time range */}
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {yardage > 0 && (
                                                    <span
                                                        className="text-[10px] font-medium"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {prod.totalYardage}yd
                                                    </span>
                                                )}
                                                {prod.firstJobTime && prod.lastJobTime && (
                                                    <span
                                                        className="text-[10px] font-mono"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {prod.firstJobTime}–{prod.lastJobTime}
                                                    </span>
                                                )}
                                            </div>
                                            {/* YPH + send/recv delta */}
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {yph !== null && (
                                                    <span
                                                        className="text-[10px] font-bold"
                                                        style={{
                                                            color:
                                                                yph > MAX_YPH
                                                                    ? '#ef4444'
                                                                    : leaveOffCount > 0
                                                                      ? '#d97706'
                                                                      : '#16a34a'
                                                        }}
                                                    >
                                                        {yph} yph
                                                    </span>
                                                )}
                                                {leaveOffCount > 0 && (
                                                    <span
                                                        className="text-[9px] font-bold flex items-center gap-0.5"
                                                        style={{ color: '#d97706' }}
                                                    >
                                                        <i className="fas fa-user-minus text-[7px]" />-{leaveOffCount}
                                                    </span>
                                                )}
                                                {s.send > 0 && (
                                                    <span className="text-[9px] text-[#dc2626]">-{s.send}</span>
                                                )}
                                                {s.recv > 0 && (
                                                    <span className="text-[9px] text-[#16a34a]">+{s.recv}</span>
                                                )}
                                            </div>
                                        </button>
                                        {/* Production popover — edit first/last job + yards */}
                                        {isPopoverOpen && (
                                            <div
                                                className="absolute top-full left-0 mt-1 z-30 rounded-lg shadow-lg p-3 w-[260px]"
                                                style={{
                                                    background: 'var(--bg-primary)',
                                                    border: '1px solid var(--border-medium)'
                                                }}
                                            >
                                                <div className="flex items-center mb-2">
                                                    <span
                                                        className="text-xs font-bold"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {s.code} Production
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <div
                                                            className="text-[9px] font-semibold uppercase mb-0.5"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            First Job
                                                        </div>
                                                        <TimeInput
                                                            value={(plantProduction[s.code] || {}).firstJobTime || ''}
                                                            onChange={(val) =>
                                                                updatePlantProduction(s.code, 'firstJobTime', val)
                                                            }
                                                            className="!w-full"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div
                                                            className="text-[9px] font-semibold uppercase mb-0.5"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            Last Job
                                                        </div>
                                                        <TimeInput
                                                            value={(plantProduction[s.code] || {}).lastJobTime || ''}
                                                            onChange={(val) =>
                                                                updatePlantProduction(s.code, 'lastJobTime', val)
                                                            }
                                                            className="!w-full"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div
                                                            className="text-[9px] font-semibold uppercase mb-0.5"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            Yards
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={(plantProduction[s.code] || {}).totalYardage || ''}
                                                            onChange={(e) =>
                                                                updatePlantProduction(
                                                                    s.code,
                                                                    'totalYardage',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="0"
                                                            className="border rounded-md text-xs outline-none font-mono text-center py-1 px-1 w-full"
                                                            style={{
                                                                backgroundColor: 'var(--bg-primary)',
                                                                borderColor: 'var(--border-medium)',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {yph !== null && (
                                                    <div
                                                        className="mt-2 pt-2 border-t flex items-center justify-between"
                                                        style={{ borderColor: 'var(--border-light)' }}
                                                    >
                                                        <span
                                                            className="text-[10px]"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            Yards/Hr/Op
                                                        </span>
                                                        <span
                                                            className="text-sm font-bold"
                                                            style={{ color: yph > MAX_YPH ? '#ef4444' : accentColor }}
                                                        >
                                                            {yph}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {selectedPlant && (
                                <button
                                    onClick={() => {
                                        setSelectedPlant(null)
                                        setProductionPopoverPlant(null)
                                    }}
                                    className="shrink-0 border-none rounded-md cursor-pointer text-[10px] font-semibold px-2 py-1"
                                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                >
                                    <i className="fas fa-times mr-1" />
                                    Clear
                                </button>
                            )}
                            <div className="flex-1" />
                            <span
                                className="shrink-0 text-[11px] font-medium whitespace-nowrap"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {validAssignmentCount} route{validAssignmentCount !== 1 ? 's' : ''}, {totalOps} op
                                {totalOps !== 1 ? 's' : ''}
                                {earliestClockIn && (
                                    <>
                                        {' '}
                                        · <span className="font-bold text-[#16a34a]">{earliestClockIn}</span> earliest
                                    </>
                                )}
                                {shiftSpanHours && (
                                    <>
                                        {' '}
                                        ·{' '}
                                        <span
                                            className={
                                                shiftSpanHours > OVERTIME_THRESHOLD_HOURS
                                                    ? 'font-bold text-[#ef4444]'
                                                    : ''
                                            }
                                        >
                                            {shiftSpanHours}h span
                                        </span>
                                    </>
                                )}
                            </span>
                        </div>

                        {viewMode === 'timeline' && (
                            <TimelineView
                                assignments={assignments}
                                adjacentPlans={adjacentPlans}
                                adjacentProduction={adjacentProduction}
                                plantProduction={plantProduction}
                                planDate={planDate}
                                plants={plants}
                                accentColor={accentColor}
                                getTravelTime={getTravelTime}
                                calcClockIn={calcClockIn}
                                addMinutesToTime={addMinutesToTime}
                                mixerCountsByPlant={mixerCountsByPlant}
                            />
                        )}

                        {/* Plant-centric dispatch view */}
                        {viewMode === 'table' && (
                            <div
                                className={`flex flex-col flex-1 min-h-0 overflow-hidden ${!canEdit ? 'pointer-events-none opacity-60' : ''}`}
                            >
                                {/* Scrollable card area */}
                                <div className="flex-1 overflow-y-auto">
                                    {!assignments.length ? (
                                        <div
                                            className="flex flex-col items-center justify-center py-20"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <i className="fas fa-truck text-3xl mb-3 opacity-50" />
                                            <span className="text-sm">No assignments yet</span>
                                            <button
                                                onClick={() =>
                                                    setAssignments((prev) => [...prev, createEmptyAssignment()])
                                                }
                                                className="border-none rounded-lg cursor-pointer text-sm font-semibold px-4 py-2.5 text-white mt-4"
                                                style={{ background: accentColor }}
                                            >
                                                <i className="fas fa-plus mr-1.5" />
                                                Add Assignment
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="px-4 py-3 flex flex-col gap-2">
                                            {assignments.map((a, idx) => {
                                                const travelTime =
                                                    a.fromPlant && a.toPlant
                                                        ? getTravelTime(a.fromPlant, a.toPlant)
                                                        : null
                                                const isFiltered =
                                                    selectedPlant &&
                                                    a.fromPlant !== selectedPlant &&
                                                    a.toPlant !== selectedPlant

                                                return (
                                                    <div
                                                        key={a.id}
                                                        style={{
                                                            opacity: isFiltered ? 0.3 : 1,
                                                            transition: 'opacity 0.15s'
                                                        }}
                                                    >
                                                        <PlanAssignmentCard
                                                            accentColor={accentColor}
                                                            assignment={a}
                                                            assignmentCount={assignments.length}
                                                            calcClockIn={calcClockIn}
                                                            index={idx}
                                                            isExpanded={activeRowId === a.id}
                                                            moveAssignment={moveAssignment}
                                                            onDelete={() =>
                                                                setAssignments((prev) =>
                                                                    prev.filter((x) => x.id !== a.id)
                                                                )
                                                            }
                                                            plants={plants}
                                                            switchToCustom={switchToCustom}
                                                            toggleRowExpanded={toggleRowExpanded}
                                                            travelTime={travelTime}
                                                            updateAssignment={updateAssignment}
                                                            updateCustomTime={updateCustomTime}
                                                        />
                                                    </div>
                                                )
                                            })}

                                            {/* Add Assignment */}
                                            <button
                                                onClick={() =>
                                                    setAssignments((prev) => [...prev, createEmptyAssignment()])
                                                }
                                                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer py-3 text-sm font-semibold"
                                                style={{
                                                    borderColor: 'var(--border-medium)',
                                                    background: 'transparent',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                <i className="fas fa-plus" />
                                                Add Assignment
                                            </button>

                                            {/* Notes — collapsible */}
                                            <div className="mt-4">
                                                <button
                                                    onClick={() => setNotesExpanded(!notesExpanded)}
                                                    className="flex items-center gap-2 border-none bg-transparent cursor-pointer p-0 mb-2"
                                                >
                                                    <i
                                                        className={`fas fa-chevron-${notesExpanded ? 'down' : 'right'} text-[9px]`}
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    />
                                                    <i
                                                        className="fas fa-sticky-note text-[10px]"
                                                        style={{ color: accentColor }}
                                                    />
                                                    <span
                                                        className="text-[11px] font-semibold uppercase tracking-wider"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        Notes
                                                    </span>
                                                    {notes && !notesExpanded && (
                                                        <span
                                                            className="text-[10px] font-medium ml-1"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            (has content)
                                                        </span>
                                                    )}
                                                </button>
                                                {notesExpanded && (
                                                    <textarea
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                        placeholder="Add notes..."
                                                        rows={3}
                                                        className="border rounded-md text-xs outline-none py-1.5 px-2.5 resize-none w-full"
                                                        style={{
                                                            background: 'var(--bg-secondary)',
                                                            borderColor: 'var(--border-light)',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* Mini-Timeline — collapsible */}
                                            <div className="mt-4 mb-4">
                                                <button
                                                    onClick={() => setMiniTimelineExpanded(!miniTimelineExpanded)}
                                                    className="flex items-center gap-2 border-none bg-transparent cursor-pointer p-0 mb-2"
                                                >
                                                    <i
                                                        className={`fas fa-chevron-${miniTimelineExpanded ? 'down' : 'right'} text-[9px]`}
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    />
                                                    <i
                                                        className="fas fa-chart-gantt text-[10px]"
                                                        style={{ color: accentColor }}
                                                    />
                                                    <span
                                                        className="text-[11px] font-semibold uppercase tracking-wider"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        Timeline Preview
                                                    </span>
                                                </button>
                                                {miniTimelineExpanded && (
                                                    <PlanMiniTimeline
                                                        accentColor={accentColor}
                                                        assignments={assignments}
                                                        getTravelTime={getTravelTime}
                                                        mixerCountsByPlant={mixerCountsByPlant}
                                                        plantProduction={plantProduction}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Insights Bar — bottom sticky */}
                                {(planInsights.warnings.length > 0 || planInsights.suggestions.length > 0) && (
                                    <div
                                        className="shrink-0 border-t"
                                        style={{
                                            borderColor: 'var(--border-light)',
                                            background: 'var(--bg-secondary)'
                                        }}
                                    >
                                        <button
                                            onClick={() => setInsightsExpanded(!insightsExpanded)}
                                            className="w-full flex items-center gap-2 px-4 py-2 border-none bg-transparent cursor-pointer text-left"
                                        >
                                            <i
                                                className="fas fa-triangle-exclamation text-[10px]"
                                                style={{ color: '#f59e0b' }}
                                            />
                                            <span
                                                className="text-xs font-semibold"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {planInsights.warnings.length + planInsights.suggestions.length} insight
                                                {planInsights.warnings.length + planInsights.suggestions.length !== 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                            <span
                                                className="text-xs truncate flex-1"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {(planInsights.warnings[0] || planInsights.suggestions[0])?.message}
                                            </span>
                                            <i
                                                className={`fas fa-chevron-${insightsExpanded ? 'down' : 'up'} text-[9px]`}
                                                style={{ color: 'var(--text-secondary)' }}
                                            />
                                        </button>
                                        {insightsExpanded && (
                                            <div className="px-4 pb-3 flex flex-col gap-1.5">
                                                {planInsights.warnings.map((w, i) => (
                                                    <div
                                                        key={`w-${i}`}
                                                        className="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px]"
                                                        style={{
                                                            background: '#fef3c720',
                                                            border: '1px solid #fbbf2440'
                                                        }}
                                                    >
                                                        <i
                                                            className={`fas ${w.icon} text-[9px] mt-0.5 shrink-0`}
                                                            style={{ color: '#f59e0b' }}
                                                        />
                                                        <span style={{ color: 'var(--text-primary)' }}>
                                                            {w.message}
                                                        </span>
                                                    </div>
                                                ))}
                                                {planInsights.suggestions.map((s, i) => (
                                                    <div
                                                        key={`s-${i}`}
                                                        className="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px]"
                                                        style={{ background: 'var(--bg-tertiary)' }}
                                                    >
                                                        <i
                                                            className={`fas ${s.icon} text-[9px] mt-0.5 shrink-0`}
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        />
                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                            {s.message}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Auto-save indicator */}
                                <div
                                    className="shrink-0 px-4 py-1 border-t"
                                    style={{ borderColor: 'var(--border-light)' }}
                                >
                                    <span className="text-[10px] font-semibold" style={{ color: accentColor }}>
                                        <i className="fas fa-check-circle mr-1" />
                                        Auto-saved
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PlanView
