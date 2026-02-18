import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import { ReportUtility } from '../../../utils/ReportUtility'

const safetyReportStyles = `
.safety-report-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
.safety-section-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem; }
.safety-section-title { display: flex; align-items: flex-start; gap: 0.75rem; }
.safety-section-title h3 { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.safety-section-title p { font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0 0; }
.safety-section-icon { width: 40px; height: 40px; border-radius: 10px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
.safety-section-icon-success { background: #d1fae5; color: #059669; }
.safety-add-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
.safety-add-btn:hover { background: #15304f; }
.safety-issues-grid { display: flex; flex-direction: column; gap: 1rem; }
.safety-issue-card { background: #f8fafc; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.safety-issue-card-review { }
.safety-issue-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; background: #f1f5f9; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
.safety-issue-number { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #1e3a5f; color: white; border-radius: 50%; font-size: 0.8125rem; font-weight: 600; }
.safety-issue-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; flex: 1; }
.safety-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.625rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
.safety-badge-plant { background: #eff6ff; color: #1e40af; }
.safety-badge-date { background: #f0fdf4; color: #166534; }
.safety-remove-btn { padding: 0.5rem; background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.safety-remove-btn:hover { background: #fecaca; }
.safety-issue-content { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.safety-form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.safety-field { display: flex; flex-direction: column; gap: 0.5rem; }
.safety-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #374151; }
.safety-label i { color: #64748b; font-size: 0.8125rem; }
.safety-required { color: #ef4444; margin-left: 0.25rem; }
.safety-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; box-sizing: border-box; }
.safety-input:disabled { background: #f8fafc; color: #64748b; }
.safety-textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; box-sizing: border-box; min-height: 120px; resize: vertical; }
.safety-textarea:disabled { background: #f8fafc; color: #64748b; }
.safety-select-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; cursor: pointer; text-align: left; }
.safety-select-btn:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }
.safety-select-btn i { color: #64748b; font-size: 0.75rem; }
.safety-tag-picker { position: relative; width: 100%; }
.safety-tag-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; cursor: pointer; text-align: left; }
.safety-tag-btn:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }
.safety-tag-placeholder { display: flex; align-items: center; }
.safety-tags-display { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
.safety-tag-chip { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.625rem; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; }
.safety-chip-remove { background: none; border: none; padding: 0; margin-left: 0.25rem; cursor: pointer; opacity: 0.7; font-size: 0.6875rem; }
.safety-chip-remove:hover { opacity: 1; }
.safety-empty-state { text-align: center; padding: 3rem 2rem; color: #64748b; }
.safety-empty-state h4 { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0 0 0.5rem 0; }
.safety-empty-state p { font-size: 0.875rem; color: #94a3b8; margin: 0; }
.safety-empty-state-success { background: #f0fdf4; border-radius: 8px; }
.safety-empty-state-success h4 { color: #166534; }
.safety-empty-icon { font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; display: block; }
.safety-empty-state-success .safety-empty-icon { color: #22c55e; }
.safety-summary-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #fee2e2; color: #dc2626; border-radius: 8px; font-size: 0.875rem; font-weight: 600; }
.safety-description-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; }
.safety-description-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; }
.safety-description-text { font-size: 0.9375rem; color: #1e293b; line-height: 1.6; }
.down-in-yard-toggle { margin-top: 0.5rem; }
.toggle-label { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.toggle-label.disabled { opacity: 0.5; cursor: not-allowed; }
.toggle-checkbox { display: none; }
.toggle-switch { width: 44px; height: 24px; background: #e5e7eb; border-radius: 12px; position: relative; transition: background 0.2s; }
.toggle-switch.active { background: #1e3a5f; }
.toggle-switch.disabled { opacity: 0.5; }
.toggle-slider { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.toggle-switch.active .toggle-slider { transform: translateX(20px); }
.toggle-text { font-size: 0.875rem; color: #374151; }
`

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
                                        background: isSelected ? '#1e3a5f' : 'white',
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
                            background: '#1e3a5f',
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
        <div className="safety-tag-picker">
            <button
                type="button"
                className="safety-tag-btn"
                ref={btnRef}
                disabled={disabled}
                aria-expanded={open}
                onClick={() => setOpen(true)}
            >
                <span className="safety-tag-placeholder">
                    <i className="fas fa-tags" style={{ marginRight: '8px', opacity: 0.6 }}></i>
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
            <style>{safetyReportStyles}</style>
            <div className="safety-report-section">
                <div className="safety-section-header">
                    <div className="safety-section-title">
                        <div className="safety-section-icon">
                            <i className="fas fa-exclamation-circle"></i>
                        </div>
                        <div>
                            <h3>Safety Issues & Incidents</h3>
                            <p>Document any safety-related issues that occurred during this reporting period</p>
                        </div>
                    </div>
                    {!readOnly && (
                        <button type="button" onClick={addIssue} className="safety-add-btn">
                            <i className="fas fa-plus"></i>
                            <span>Add Issue</span>
                        </button>
                    )}
                </div>

                {issues.length === 0 ? (
                    <div className="safety-empty-state">
                        <div className="safety-empty-icon">
                            <i className="fas fa-shield-alt"></i>
                        </div>
                        <h4>No Issues Reported</h4>
                        <p>Click Add Issue to document any safety incidents</p>
                    </div>
                ) : (
                    <div className="safety-issues-grid">
                        {issues.map((issue, idx) => {
                            const tagColors = (issue.tags || []).map((t) => TAG_COLORS[t]).filter(Boolean)
                            const primaryColor = tagColors[0]?.color || 'var(--accent)'

                            return (
                                <div
                                    key={issue.id}
                                    className="safety-issue-card"
                                    style={{ '--issue-accent': primaryColor }}
                                >
                                    <div className="safety-issue-header">
                                        <div className="safety-issue-number">
                                            <span>{idx + 1}</span>
                                        </div>
                                        <div className="safety-issue-badges">
                                            {issue.plant && (
                                                <span className="safety-badge safety-badge-plant">
                                                    <i className="fas fa-industry"></i>
                                                    {issue.plant === 'All' ? 'All Plants' : `Plant ${issue.plant}`}
                                                </span>
                                            )}
                                            {issue.date && (
                                                <span className="safety-badge safety-badge-date">
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
                                                className="safety-remove-btn"
                                                title="Remove Issue"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        )}
                                    </div>

                                    <div className="safety-issue-content">
                                        <div className="safety-form-row">
                                            <div className="safety-field">
                                                <label className="safety-label">
                                                    <i className="fas fa-industry"></i>
                                                    Plant Location<span className="safety-required">*</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => {
                                                        setSelectedIssueIdForPlant(issue.id)
                                                        setShowPlantModal(true)
                                                    }}
                                                    className="safety-select-btn"
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
                                            <div className="safety-field">
                                                <label className="safety-label">
                                                    <i className="fas fa-calendar-alt"></i>
                                                    Date of Incident
                                                </label>
                                                <input
                                                    type="date"
                                                    disabled={readOnly}
                                                    value={issue.date || ''}
                                                    onChange={(e) => updateIssue(issue.id, { date: e.target.value })}
                                                    className="safety-input"
                                                />
                                            </div>
                                        </div>

                                        <div className="safety-field">
                                            <label className="safety-label">
                                                <i className="fas fa-tags"></i>
                                                Issue Categories<span className="safety-required">*</span>
                                            </label>
                                            <TagPicker
                                                value={issue.tags || []}
                                                options={TAG_OPTIONS}
                                                disabled={readOnly}
                                                placeholder="Select categories"
                                                onChange={(vals) => updateIssueTagsArray(issue.id, vals)}
                                            />
                                            {issue.tags && issue.tags.length > 0 && (
                                                <div className="safety-tags-display">
                                                    {issue.tags.map((t) => {
                                                        const tagStyle = TAG_COLORS[t] || {
                                                            bg: 'var(--background)',
                                                            color: 'var(--text-primary)',
                                                            icon: 'fas fa-tag'
                                                        }
                                                        return (
                                                            <span
                                                                key={t}
                                                                className="safety-tag-chip"
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
                                                                        className="safety-chip-remove"
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

                                        <div className="safety-field">
                                            <label className="safety-label">
                                                <i className="fas fa-align-left"></i>
                                                Issue Description<span className="safety-required">*</span>
                                            </label>
                                            <textarea
                                                disabled={readOnly}
                                                value={issue.description}
                                                onChange={(e) => updateIssue(issue.id, { description: e.target.value })}
                                                className="safety-textarea"
                                                placeholder="Describe the incident in detail including what happened, who was involved, and any actions taken..."
                                            />
                                        </div>

                                        <div className="down-in-yard-toggle">
                                            <label
                                                className={`toggle-label ${readOnly || !issue.plant || issue.plant === 'All' ? 'disabled' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="toggle-checkbox"
                                                    checked={issue.affectsEfficiency || false}
                                                    disabled={readOnly || !issue.plant || issue.plant === 'All'}
                                                    onChange={(e) =>
                                                        updateIssue(issue.id, { affectsEfficiency: e.target.checked })
                                                    }
                                                />
                                                <span
                                                    className={`toggle-switch ${issue.affectsEfficiency ? 'active' : ''} ${readOnly || !issue.plant || issue.plant === 'All' ? 'disabled' : ''}`}
                                                >
                                                    <span className="toggle-slider"></span>
                                                </span>
                                                <span className="toggle-text">
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
        <div className="safety-issue-header">
            <div className="safety-issue-number">
                <span>{idx + 1}</span>
            </div>
            <div className="safety-issue-badges">
                {issue.plant && (
                    <span className="safety-badge safety-badge-plant">
                        <i className="fas fa-industry"></i>
                        {issue.plant === 'All' ? 'All Plants' : `Plant ${issue.plant}`}
                    </span>
                )}
                {issue.date && (
                    <span className="safety-badge safety-badge-date">
                        <i className="fas fa-calendar"></i>
                        {new Date(issue.date + 'T00:00:00').toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            weekday: readOnly ? 'short' : undefined
                        })}
                    </span>
                )}
                {readOnly && issue.affectsEfficiency && (
                    <span className="safety-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        <i className="fas fa-chart-line"></i>Affects Efficiency
                    </span>
                )}
            </div>
            {!readOnly && onRemove && (
                <button type="button" onClick={onRemove} className="safety-remove-btn" title="Remove Issue">
                    <i className="fas fa-trash-alt"></i>
                </button>
            )}
        </div>
    )
}

function TagsDisplay({ tags, onRemoveTag, readOnly }) {
    if (!tags?.length) return null
    return (
        <div className="safety-tags-display">
            {tags.map((t) => {
                const tagStyle = TAG_COLORS[t] || {
                    bg: 'var(--background)',
                    color: 'var(--text-primary)',
                    icon: 'fas fa-tag'
                }
                return (
                    <span
                        key={t}
                        className="safety-tag-chip"
                        style={{ background: tagStyle.bg, color: tagStyle.color }}
                    >
                        <i className={tagStyle.icon}></i>
                        {t}
                        {!readOnly && onRemoveTag && (
                            <button type="button" className="safety-chip-remove" onClick={() => onRemoveTag(t)}>
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
        <div className={`safety-empty-state ${success ? 'safety-empty-state-success' : ''}`}>
            <div className="safety-empty-icon">
                <i className={`fas ${success ? 'fa-check-circle' : 'fa-shield-alt'}`}></i>
            </div>
            <h4>{success ? 'All Clear' : 'No Issues Reported'}</h4>
            <p>
                {success
                    ? 'No safety issues were reported during this reporting period'
                    : 'Click Add Issue to document any safety incidents'}
            </p>
        </div>
    )
}

export function SafetyManagerReviewPlugin({ form }) {
    const issues = normalizeIssues(form.issues)

    if (issues.length === 0) {
        return (
            <>
                <style>{safetyReportStyles}</style>
                <div className="safety-report-section">
                    <div className="safety-section-header">
                        <div className="safety-section-title">
                            <div className="safety-section-icon safety-section-icon-success">
                                <i className="fas fa-shield-alt"></i>
                            </div>
                            <div>
                                <h3>Safety Issues & Incidents</h3>
                                <p>No safety incidents reported for this period</p>
                            </div>
                        </div>
                    </div>
                    <SafetyEmptyState success />
                </div>
            </>
        )
    }

    return (
        <>
            <style>{safetyReportStyles}</style>
            <div className="safety-report-section">
                <div className="safety-section-header">
                    <div className="safety-section-title">
                        <div className="safety-section-icon">
                            <i className="fas fa-exclamation-circle"></i>
                        </div>
                        <div>
                            <h3>Safety Issues & Incidents</h3>
                            <p>
                                {issues.length} issue{issues.length > 1 ? 's' : ''} reported for this period
                            </p>
                        </div>
                    </div>
                    <div className="safety-summary-badge">
                        <i className="fas fa-clipboard-list"></i>
                        {issues.length} Incident{issues.length > 1 ? 's' : ''}
                    </div>
                </div>

                <div className="safety-issues-grid">
                    {issues.map((issue, idx) => {
                        const tags = getIssueTags(issue)
                        const tagColors = tags.map((t) => TAG_COLORS[t]).filter(Boolean)
                        const primaryColor = tagColors[0]?.color || 'var(--accent)'

                        return (
                            <div
                                key={issue.id || idx}
                                className="safety-issue-card safety-issue-card-review"
                                style={{ '--issue-accent': primaryColor }}
                            >
                                <IssueCardHeader issue={issue} idx={idx} readOnly />
                                <div className="safety-issue-content">
                                    <TagsDisplay tags={tags} readOnly />
                                    <div className="safety-description-box">
                                        <div className="safety-description-label">
                                            <i className="fas fa-file-alt"></i>Description
                                        </div>
                                        <div className="safety-description-text">
                                            {issue.description || 'No description provided'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    )
}
