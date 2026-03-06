import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import { ReportUtility } from '../../../utils/ReportUtility'

const SAFETY_INPUT =
    'w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800 box-border disabled:bg-slate-50 disabled:text-slate-500'
const SAFETY_TEXTAREA = `${SAFETY_INPUT} min-h-[120px] resize-y`

const TAG_OPTIONS = ['Accident', 'Injury', 'Non-DOT', 'DOT', 'Compliance', 'Environmental', 'Reprimand', 'Safety']

const TAG_COLORS = {
    Accident: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: 'fas fa-car-crash' },
    Compliance: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: 'fas fa-clipboard-check' },
    DOT: { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', icon: 'fas fa-truck' },
    Environmental: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: 'fas fa-leaf' },
    Injury: { bg: 'rgba(220, 38, 38, 0.15)', color: '#dc2626', icon: 'fas fa-user-injured' },
    'Non-DOT': { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', icon: 'fas fa-file-alt' },
    Reprimand: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', icon: 'fas fa-exclamation-triangle' },
    Safety: { bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', icon: 'fas fa-shield-alt' }
}

function TagPicker({ value, options, disabled, placeholder, onChange }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const btnRef = useRef(null)

    const lower = query.toLowerCase()
    const filtered = options.filter((o) => o.toLowerCase().includes(lower))

    function toggle(val) {
        if (disabled) return
        const has = value.includes(val)
        const next = has ? value.filter((v) => v !== val) : [...value, val]
        onChange(next)
    }

    function selectAll() {
        if (disabled) return
        onChange(options)
    }

    function clearAll() {
        if (disabled) return
        onChange([])
    }

    const modalContent = open ? (
        <div
            style={{
                alignItems: 'center',
                background: 'rgba(0,0,0,0.5)',
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                left: 0,
                padding: 16,
                position: 'fixed',
                right: 0,
                top: 0,
                zIndex: 10000
            }}
            onClick={() => setOpen(false)}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: 12,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '80vh',
                    maxWidth: 400,
                    overflow: 'hidden',
                    width: '100%'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        alignItems: 'center',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '16px 20px'
                    }}
                >
                    <h3 style={{ color: '#1e293b', fontSize: 18, fontWeight: 600, margin: 0 }}>Select Categories</h3>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: 8
                        }}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, padding: 12 }}>
                    <button
                        type="button"
                        onClick={selectAll}
                        style={{
                            alignItems: 'center',
                            background: '#f1f5f9',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            fontSize: 13,
                            fontWeight: 500,
                            gap: 6,
                            padding: '8px 12px'
                        }}
                    >
                        <i className="fas fa-check-double"></i> Select All
                    </button>
                    <button
                        type="button"
                        onClick={clearAll}
                        style={{
                            alignItems: 'center',
                            background: '#f1f5f9',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            fontSize: 13,
                            fontWeight: 500,
                            gap: 6,
                            padding: '8px 12px'
                        }}
                    >
                        <i className="fas fa-times"></i> Clear All
                    </button>
                </div>
                <div style={{ borderBottom: '1px solid #e5e7eb', padding: 12 }}>
                    <div
                        style={{
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            display: 'flex',
                            gap: 10,
                            padding: '10px 12px'
                        }}
                    >
                        <i className="fas fa-search" style={{ color: '#94a3b8', fontSize: 14 }}></i>
                        <input
                            type="text"
                            placeholder="Search tags..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#1e293b',
                                flex: 1,
                                fontSize: 14,
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                    {filtered.map((opt) => {
                        const tagStyle = TAG_COLORS[opt] || { bg: '#f1f5f9', color: '#64748b', icon: 'fas fa-tag' }
                        const isSelected = value.includes(opt)
                        return (
                            <div
                                key={opt}
                                onClick={() => toggle(opt)}
                                style={{
                                    alignItems: 'center',
                                    background: isSelected ? '#eff6ff' : 'transparent',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: 12,
                                    marginBottom: 4,
                                    padding: '12px 14px'
                                }}
                            >
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: isSelected ? 'var(--accent)' : 'white',
                                        border: isSelected ? 'none' : '2px solid #e5e7eb',
                                        borderRadius: 6,
                                        color: 'white',
                                        display: 'flex',
                                        fontSize: 11,
                                        height: 22,
                                        justifyContent: 'center',
                                        width: 22
                                    }}
                                >
                                    {isSelected && <i className="fas fa-check"></i>}
                                </div>
                                <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                                    <i className={tagStyle.icon} style={{ color: tagStyle.color, fontSize: 14 }}></i>
                                    <span
                                        style={{ color: '#1e293b', fontSize: 15, fontWeight: isSelected ? 600 : 400 }}
                                    >
                                        {opt}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>
                            <i
                                className="fas fa-search"
                                style={{ display: 'block', fontSize: 24, marginBottom: 8 }}
                            ></i>
                            <span>No matching tags</span>
                        </div>
                    )}
                </div>
                <div style={{ background: '#f8fafc', borderTop: '1px solid #e5e7eb', padding: 16 }}>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        style={{
                            background: 'var(--accent)',
                            border: 'none',
                            borderRadius: 8,
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            padding: '12px 20px',
                            width: '100%'
                        }}
                    >
                        Done ({value.length} selected)
                    </button>
                </div>
            </div>
        </div>
    ) : null

    return (
        <div className="relative w-full">
            <button
                type="button"
                className="flex items-center justify-between w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800 text-left cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                ref={btnRef}
                disabled={disabled}
                aria-expanded={open}
                onClick={() => setOpen(true)}
            >
                <span className="flex items-center">
                    <i className="fas fa-tags mr-2 opacity-60"></i>
                    {value.length
                        ? `${value.length} tag${value.length > 1 ? 's' : ''} selected`
                        : placeholder || 'Select tags'}
                </span>
                <i className="fas fa-chevron-down" style={{ fontSize: '0.75rem' }}></i>
            </button>
            {typeof document !== 'undefined' && ReactDOM.createPortal(modalContent, document.body)}
        </div>
    )
}

/** Submit-mode plugin for the Safety Manager report — manages safety issues with plant/tag/severity tagging and photo uploads. */
export function SafetyManagerSubmitPlugin({ form, setForm, plants, readOnly }) {
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [selectedIssueIdForPlant, setSelectedIssueIdForPlant] = useState(null)

    useEffect(() => {
        if (typeof form.issues === 'string') {
            const today = ReportUtility.getTodayISODate()
            setForm((f) => ({
                ...f,
                issues: f.issues
                    ? [
                          {
                              affectsEfficiency: false,
                              date: today,
                              description: f.issues,
                              id: Date.now(),
                              plant: '',
                              tag: '',
                              tags: []
                          }
                      ]
                    : [
                          {
                              affectsEfficiency: false,
                              date: today,
                              description: '',
                              id: Date.now(),
                              plant: '',
                              tag: '',
                              tags: []
                          }
                      ]
            }))
        } else if (!form.issues || (Array.isArray(form.issues) && form.issues.length === 0)) {
            const today = ReportUtility.getTodayISODate()
            setForm((f) => ({
                ...f,
                issues: [
                    {
                        affectsEfficiency: false,
                        date: today,
                        description: '',
                        id: Date.now(),
                        plant: '',
                        tag: '',
                        tags: []
                    }
                ]
            }))
        }
    }, [form.issues, setForm])

    useEffect(() => {
        if (!Array.isArray(form.issues)) return
        let needsUpdate = false
        const migrated = form.issues.map((i) => {
            const next = { ...i }
            if (!Array.isArray(next.tags)) {
                next.tags = next.tag ? [next.tag] : []
                needsUpdate = true
            }
            if (next.date === undefined) {
                next.date = ''
                needsUpdate = true
            }
            if (next.affectsEfficiency === undefined) {
                next.affectsEfficiency = false
                needsUpdate = true
            }
            return next
        })
        if (needsUpdate) setForm((f) => ({ ...f, issues: migrated }))
    }, [form.issues, setForm])

    const issues = Array.isArray(form.issues) ? form.issues : []

    function updateIssue(id, patch) {
        const updated = issues.map((i) => {
            if (i.id === id) {
                const newIssue = { ...i, ...patch }
                if (patch.plant !== undefined && (!patch.plant || patch.plant === 'All')) {
                    newIssue.affectsEfficiency = false
                }
                return newIssue
            }
            return i
        })
        setForm((f) => ({ ...f, issues: updated }))
    }

    function updateIssueTagsArray(id, nextArray) {
        updateIssue(id, { tag: nextArray[0] || '', tags: nextArray })
    }

    function removeIssueTag(id, tagToRemove) {
        const issue = issues.find((i) => i.id === id)
        if (!issue) return
        const next = (issue.tags || []).filter((t) => t !== tagToRemove)
        updateIssue(id, { tag: next[0] || '', tags: next })
    }

    function removeIssue(id) {
        const updated = issues.filter((i) => i.id !== id)
        setForm((f) => ({ ...f, issues: updated }))
    }

    function addIssue() {
        const today = ReportUtility.getTodayISODate()
        const newIssue = {
            affectsEfficiency: false,
            date: today,
            description: '',
            id: Date.now(),
            plant: '',
            tag: '',
            tags: []
        }
        setForm((f) => ({ ...f, issues: [...(f.issues || []), newIssue] }))
    }

    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
                <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-red-100 text-red-600 text-base">
                            <i className="fas fa-exclamation-circle"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 m-0">Safety Issues & Incidents</h3>
                            <p className="text-sm text-slate-500 mt-1 mb-0">
                                Document any safety-related issues that occurred during this reporting period
                            </p>
                        </div>
                    </div>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={addIssue}
                            className="flex items-center gap-2 rounded-lg border-none bg-accent px-4 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-accent-hover"
                        >
                            <i className="fas fa-plus"></i>
                            <span>Add Issue</span>
                        </button>
                    )}
                </div>

                {issues.length === 0 ? (
                    <div className="text-center py-12 px-8 text-slate-500">
                        <div className="text-5xl text-slate-300 mb-4 block">
                            <i className="fas fa-shield-alt"></i>
                        </div>
                        <h4 className="text-lg font-semibold text-slate-800 mb-2 mt-0">No Issues Reported</h4>
                        <p className="text-sm text-slate-400 m-0">Click Add Issue to document any safety incidents</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {issues.map((issue, idx) => {
                            return (
                                <div
                                    key={issue.id}
                                    className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-100 border-b border-gray-200 flex-wrap">
                                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-accent text-white text-[0.8125rem] font-semibold">
                                            <span>{idx + 1}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 flex-1">
                                            {issue.plant && (
                                                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800">
                                                    <i className="fas fa-industry"></i>
                                                    {issue.plant === 'All' ? 'All Plants' : `Plant ${issue.plant}`}
                                                </span>
                                            )}
                                            {issue.date && (
                                                <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800">
                                                    <i className="fas fa-calendar"></i>
                                                    {new Date(issue.date + 'T00:00:00').toLocaleDateString('en-US', {
                                                        day: 'numeric',
                                                        month: 'short'
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => removeIssue(issue.id)}
                                                className="flex items-center justify-center rounded-md border-none bg-red-100 p-2 text-red-600 cursor-pointer hover:bg-red-200"
                                                title="Remove Issue"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-4 p-5">
                                        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                    <i className="text-slate-500 text-[0.8125rem] fas fa-industry"></i>
                                                    Plant Location<span className="text-red-500 ml-1">*</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => {
                                                        setSelectedIssueIdForPlant(issue.id)
                                                        setShowPlantModal(true)
                                                    }}
                                                    className="flex items-center justify-between w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800 text-left cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                                >
                                                    <span>
                                                        {issue.plant
                                                            ? issue.plant === 'All'
                                                                ? 'All Plants'
                                                                : `Plant ${issue.plant}`
                                                            : 'Select Plant...'}
                                                    </span>
                                                    <i className="fas fa-chevron-down"></i>
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                    <i className="text-slate-500 text-[0.8125rem] fas fa-calendar-alt"></i>
                                                    Date of Incident
                                                </label>
                                                <input
                                                    type="date"
                                                    disabled={readOnly}
                                                    value={issue.date || ''}
                                                    onChange={(e) => updateIssue(issue.id, { date: e.target.value })}
                                                    className={SAFETY_INPUT}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                <i className="text-slate-500 text-[0.8125rem] fas fa-tags"></i>
                                                Issue Categories<span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <TagPicker
                                                value={issue.tags || []}
                                                options={TAG_OPTIONS}
                                                disabled={readOnly}
                                                placeholder="Select categories"
                                                onChange={(vals) => updateIssueTagsArray(issue.id, vals)}
                                            />
                                            {issue.tags && issue.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {issue.tags.map((t) => {
                                                        const tagStyle = TAG_COLORS[t] || {
                                                            bg: 'var(--background)',
                                                            color: 'var(--text-primary)',
                                                            icon: 'fas fa-tag'
                                                        }
                                                        return (
                                                            <span
                                                                key={t}
                                                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium"
                                                                style={{
                                                                    background: tagStyle.bg,
                                                                    color: tagStyle.color
                                                                }}
                                                            >
                                                                <i className={tagStyle.icon}></i>
                                                                {t}
                                                                {!readOnly && (
                                                                    <button
                                                                        type="button"
                                                                        className="ml-1 border-none bg-transparent p-0 cursor-pointer opacity-70 text-[0.6875rem] hover:opacity-100"
                                                                        onClick={() => removeIssueTag(issue.id, t)}
                                                                    >
                                                                        <i className="fas fa-times"></i>
                                                                    </button>
                                                                )}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                <i className="text-slate-500 text-[0.8125rem] fas fa-align-left"></i>
                                                Issue Description<span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <textarea
                                                disabled={readOnly}
                                                value={issue.description}
                                                onChange={(e) => updateIssue(issue.id, { description: e.target.value })}
                                                className={SAFETY_TEXTAREA}
                                                placeholder="Describe the incident in detail including what happened, who was involved, and any actions taken..."
                                            />
                                        </div>

                                        <div className="mt-2">
                                            <label
                                                className={`flex items-center gap-3 cursor-pointer ${readOnly || !issue.plant || issue.plant === 'All' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={issue.affectsEfficiency || false}
                                                    disabled={readOnly || !issue.plant || issue.plant === 'All'}
                                                    onChange={(e) =>
                                                        updateIssue(issue.id, { affectsEfficiency: e.target.checked })
                                                    }
                                                />
                                                <span
                                                    className={`relative w-11 h-6 rounded-full transition-colors ${issue.affectsEfficiency ? 'bg-accent' : 'bg-gray-200'} ${readOnly || !issue.plant || issue.plant === 'All' ? 'opacity-50' : ''}`}
                                                >
                                                    <span
                                                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${issue.affectsEfficiency ? 'translate-x-5' : ''}`}
                                                    ></span>
                                                </span>
                                                <span className="text-sm text-gray-700">
                                                    Should Affect Plant&apos;s Efficiency
                                                    {(!issue.plant || issue.plant === 'All') &&
                                                        ' (Select specific plant first)'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => {
                        setShowPlantModal(false)
                        setSelectedIssueIdForPlant(null)
                    }}
                    plants={plants}
                    showAllPlants={true}
                    onSelect={(plantCode) => {
                        if (selectedIssueIdForPlant !== null) {
                            updateIssue(selectedIssueIdForPlant, { plant: plantCode })
                        }
                        setShowPlantModal(false)
                        setSelectedIssueIdForPlant(null)
                    }}
                />
            </div>
        </>
    )
}

function normalizeIssues(formIssues) {
    if (Array.isArray(formIssues)) return formIssues
    if (typeof formIssues === 'string' && formIssues) {
        return [{ affectsEfficiency: false, date: '', description: formIssues, id: 0, plant: '', tag: '', tags: [] }]
    }
    return []
}

function getIssueTags(issue) {
    return Array.isArray(issue.tags) ? issue.tags : issue.tag ? [issue.tag] : []
}

function IssueCardHeader({ issue, idx, onRemove, readOnly }) {
    return (
        <div className="flex items-center justify-between gap-4 p-4 bg-slate-100 border-b border-gray-200 flex-wrap">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-accent text-white text-[0.8125rem] font-semibold">
                <span>{idx + 1}</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
                {issue.plant && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800">
                        <i className="fas fa-industry"></i>
                        {issue.plant === 'All' ? 'All Plants' : `Plant ${issue.plant}`}
                    </span>
                )}
                {issue.date && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800">
                        <i className="fas fa-calendar"></i>
                        {new Date(issue.date + 'T00:00:00').toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            weekday: readOnly ? 'short' : undefined
                        })}
                    </span>
                )}
                {readOnly && issue.affectsEfficiency && (
                    <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium"
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                    >
                        <i className="fas fa-chart-line"></i>Affects Efficiency
                    </span>
                )}
            </div>
            {!readOnly && onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="flex items-center justify-center rounded-md border-none bg-red-100 p-2 text-red-600 cursor-pointer hover:bg-red-200"
                    title="Remove Issue"
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            )}
        </div>
    )
}

function TagsDisplay({ tags, onRemoveTag, readOnly }) {
    if (!tags?.length) return null
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((t) => {
                const tagStyle = TAG_COLORS[t] || {
                    bg: 'var(--background)',
                    color: 'var(--text-primary)',
                    icon: 'fas fa-tag'
                }
                return (
                    <span
                        key={t}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium"
                        style={{ background: tagStyle.bg, color: tagStyle.color }}
                    >
                        <i className={tagStyle.icon}></i>
                        {t}
                        {!readOnly && onRemoveTag && (
                            <button
                                type="button"
                                className="ml-1 border-none bg-transparent p-0 cursor-pointer opacity-70 text-[0.6875rem] hover:opacity-100"
                                onClick={() => onRemoveTag(t)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </span>
                )
            })}
        </div>
    )
}

function SafetyEmptyState({ success }) {
    return (
        <div className={`text-center py-12 px-8 text-slate-500 ${success ? 'bg-green-50 rounded-lg' : ''}`}>
            <div className={`text-5xl mb-4 block ${success ? 'text-green-500' : 'text-slate-300'}`}>
                <i className={`fas ${success ? 'fa-check-circle' : 'fa-shield-alt'}`}></i>
            </div>
            <h4 className={`text-lg font-semibold mb-2 mt-0 ${success ? 'text-green-800' : 'text-slate-800'}`}>
                {success ? 'All Clear' : 'No Issues Reported'}
            </h4>
            <p className="text-sm text-slate-400 m-0">
                {success
                    ? 'No safety issues were reported during this reporting period'
                    : 'Click Add Issue to document any safety incidents'}
            </p>
        </div>
    )
}

/** Review-mode plugin for the Safety Manager report — read-only view of submitted safety issues with photos. */
export function SafetyManagerReviewPlugin({ form }) {
    const issues = normalizeIssues(form.issues)

    if (issues.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
                <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-emerald-100 text-emerald-600 text-base">
                            <i className="fas fa-shield-alt"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 m-0">Safety Issues & Incidents</h3>
                            <p className="text-sm text-slate-500 mt-1 mb-0">
                                No safety incidents reported for this period
                            </p>
                        </div>
                    </div>
                </div>
                <SafetyEmptyState success />
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-red-100 text-red-600 text-base">
                        <i className="fas fa-exclamation-circle"></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 m-0">Safety Issues & Incidents</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-0">
                            {issues.length} issue{issues.length > 1 ? 's' : ''} reported for this period
                        </p>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-600">
                    <i className="fas fa-clipboard-list"></i>
                    {issues.length} Incident{issues.length > 1 ? 's' : ''}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {issues.map((issue, idx) => {
                    const tags = getIssueTags(issue)

                    return (
                        <div
                            key={issue.id || idx}
                            className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden"
                        >
                            <IssueCardHeader issue={issue} idx={idx} readOnly />
                            <div className="flex flex-col gap-4 p-5">
                                <TagsDisplay tags={tags} readOnly />
                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                        <i className="fas fa-file-alt"></i>Description
                                    </div>
                                    <div className="text-[0.9375rem] text-slate-800 leading-relaxed">
                                        {issue.description || 'No description provided'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
