import React, {useEffect, useRef, useState} from 'react'
import '../styles/Reports.css'
import '../../../components/sections/styles/DetailView.css'
import {ReportUtility} from '../../../utils/ReportUtility'
import PlantDropdownModal from '../../../components/common/PlantDropdownModal'

const TAG_OPTIONS = ['Accident', 'Injury', 'Non-DOT', 'DOT', 'Compliance', 'Environmental', 'Reprimand', 'Safety']

const TAG_COLORS = {
    'Accident': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: 'fas fa-car-crash' },
    'Injury': { bg: 'rgba(220, 38, 38, 0.15)', color: '#dc2626', icon: 'fas fa-user-injured' },
    'Non-DOT': { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', icon: 'fas fa-file-alt' },
    'DOT': { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', icon: 'fas fa-truck' },
    'Compliance': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: 'fas fa-clipboard-check' },
    'Environmental': { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: 'fas fa-leaf' },
    'Reprimand': { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', icon: 'fas fa-exclamation-triangle' },
    'Safety': { bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', icon: 'fas fa-shield-alt' }
}

function TagPicker({value, options, disabled, placeholder, onChange}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const ref = useRef(null)
    useEffect(() => {
        function onDocClick(e) {
            if (!ref.current) return
            if (!ref.current.contains(e.target)) setOpen(false)
        }

        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])
    const lower = query.toLowerCase()
    const filtered = options.filter(o => o.toLowerCase().includes(lower))

    function toggle(val) {
        if (disabled) return
        const has = value.includes(val)
        const next = has ? value.filter(v => v !== val) : [...value, val]
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

    return (
        <div className="safety-tag-picker" ref={ref}>
            <button type="button" className="safety-tag-btn" disabled={disabled} aria-expanded={open}
                    onClick={() => setOpen(o => !o)}>
                <span className="safety-tag-placeholder">
                    <i className="fas fa-tags" style={{marginRight: '8px', opacity: 0.6}}></i>
                    {value.length ? `${value.length} tag${value.length > 1 ? 's' : ''} selected` : (placeholder || 'Select tags')}
                </span>
                <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{fontSize: '0.75rem'}}></i>
            </button>
            {open && (
                <div className="safety-tag-menu" role="listbox">
                    <div className="safety-tag-menu-header">
                        <button type="button" className="safety-tag-action" onClick={selectAll}>
                            <i className="fas fa-check-double"></i> All
                        </button>
                        <button type="button" className="safety-tag-action" onClick={clearAll}>
                            <i className="fas fa-times"></i> Clear
                        </button>
                    </div>
                    <div className="safety-tag-search-wrap">
                        <i className="fas fa-search"></i>
                        <input className="safety-tag-search" placeholder="Search tags..." value={query}
                               onChange={e => setQuery(e.target.value)}/>
                    </div>
                    <div className="safety-tag-options">
                        {filtered.map(opt => {
                            const tagStyle = TAG_COLORS[opt] || { bg: 'var(--background)', color: 'var(--text-primary)', icon: 'fas fa-tag' }
                            return (
                                <div key={opt} 
                                     className={`safety-tag-option ${value.includes(opt) ? 'selected' : ''}`} 
                                     role="option" 
                                     aria-selected={value.includes(opt)}
                                     onClick={() => toggle(opt)}>
                                    <div className="safety-tag-option-checkbox">
                                        {value.includes(opt) && <i className="fas fa-check"></i>}
                                    </div>
                                    <div className="safety-tag-option-content">
                                        <i className={tagStyle.icon} style={{color: tagStyle.color}}></i>
                                        <span>{opt}</span>
                                    </div>
                                </div>
                            )
                        })}
                        {filtered.length === 0 && (
                            <div className="safety-tag-empty">
                                <i className="fas fa-search"></i>
                                <span>No matching tags</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export function SafetyManagerSubmitPlugin({form, setForm, plants, readOnly}) {
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [selectedIssueIdForPlant, setSelectedIssueIdForPlant] = useState(null)
    
    useEffect(() => {
        if (typeof form.issues === 'string') {
            const today = ReportUtility.getTodayISODate()
            setForm(f => ({
                ...f,
                issues: f.issues ? [{
                    id: Date.now(),
                    description: f.issues,
                    plant: '',
                    tag: '',
                    tags: [],
                    date: today,
                    affectsEfficiency: false
                }] : [{
                    id: Date.now(),
                    description: '',
                    plant: '',
                    tag: '',
                    tags: [],
                    date: today,
                    affectsEfficiency: false
                }]
            }))
        } else if (!form.issues || (Array.isArray(form.issues) && form.issues.length === 0)) {
            const today = ReportUtility.getTodayISODate()
            setForm(f => ({
                ...f,
                issues: [{
                    id: Date.now(),
                    description: '',
                    plant: '',
                    tag: '',
                    tags: [],
                    date: today,
                    affectsEfficiency: false
                }]
            }))
        }
    }, [form.issues, setForm])

    useEffect(() => {
        if (!Array.isArray(form.issues)) return
        let needsUpdate = false
        const migrated = form.issues.map(i => {
            const next = {...i}
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
        if (needsUpdate) setForm(f => ({...f, issues: migrated}))
    }, [form.issues, setForm])

    const issues = Array.isArray(form.issues) ? form.issues : []

    function updateIssue(id, patch) {
        const updated = issues.map(i => {
            if (i.id === id) {
                const newIssue = {...i, ...patch}
                if (patch.plant !== undefined && (!patch.plant || patch.plant === 'All')) {
                    newIssue.affectsEfficiency = false
                }
                return newIssue
            }
            return i
        })
        setForm(f => ({...f, issues: updated}))
    }

    function updateIssueTagsArray(id, nextArray) {
        updateIssue(id, {tags: nextArray, tag: nextArray[0] || ''})
    }

    function removeIssueTag(id, tagToRemove) {
        const issue = issues.find(i => i.id === id)
        if (!issue) return
        const next = (issue.tags || []).filter(t => t !== tagToRemove)
        updateIssue(id, {tags: next, tag: next[0] || ''})
    }

    function removeIssue(id) {
        const updated = issues.filter(i => i.id !== id)
        setForm(f => ({...f, issues: updated}))
    }

    function addIssue() {
        const today = ReportUtility.getTodayISODate()
        const newIssue = {id: Date.now(), description: '', plant: '', tag: '', tags: [], date: today, affectsEfficiency: false}
        setForm(f => ({...f, issues: [...(f.issues || []), newIssue]}))
    }

    return (
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
                        const tagColors = (issue.tags || []).map(t => TAG_COLORS[t]).filter(Boolean)
                        const primaryColor = tagColors[0]?.color || 'var(--accent)'
                        
                        return (
                            <div key={issue.id} className="safety-issue-card" style={{'--issue-accent': primaryColor}}>
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
                                                {new Date(issue.date + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                                            </span>
                                        )}
                                    </div>
                                    {!readOnly && (
                                        <button type="button" onClick={() => removeIssue(issue.id)} className="safety-remove-btn" title="Remove Issue">
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
                                                <span>{issue.plant ? (issue.plant === 'All' ? 'All Plants' : `Plant ${issue.plant}`) : 'Select Plant...'}</span>
                                                <i className="fas fa-chevron-down"></i>
                                            </button>
                                        </div>
                                        <div className="safety-field">
                                            <label className="safety-label">
                                                <i className="fas fa-calendar-alt"></i>
                                                Date of Incident
                                            </label>
                                            <input type="date" disabled={readOnly} value={issue.date || ''}
                                                   onChange={e => updateIssue(issue.id, {date: e.target.value})}
                                                   className="safety-input"/>
                                        </div>
                                    </div>
                                    
                                    <div className="safety-field">
                                        <label className="safety-label">
                                            <i className="fas fa-tags"></i>
                                            Issue Categories<span className="safety-required">*</span>
                                        </label>
                                        <TagPicker value={issue.tags || []} options={TAG_OPTIONS} disabled={readOnly}
                                                   placeholder="Select categories"
                                                   onChange={vals => updateIssueTagsArray(issue.id, vals)}/>
                                        {(issue.tags && issue.tags.length > 0) && (
                                            <div className="safety-tags-display">
                                                {issue.tags.map(t => {
                                                    const tagStyle = TAG_COLORS[t] || { bg: 'var(--background)', color: 'var(--text-primary)', icon: 'fas fa-tag' }
                                                    return (
                                                        <span key={t} className="safety-tag-chip" style={{background: tagStyle.bg, color: tagStyle.color}}>
                                                            <i className={tagStyle.icon}></i>
                                                            {t}
                                                            {!readOnly && (
                                                                <button type="button" className="safety-chip-remove"
                                                                        onClick={() => removeIssueTag(issue.id, t)}>
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
                                        <textarea disabled={readOnly} value={issue.description}
                                                  onChange={e => updateIssue(issue.id, {description: e.target.value})}
                                                  className="safety-textarea"
                                                  placeholder="Describe the incident in detail including what happened, who was involved, and any actions taken..."/>
                                    </div>
                                    
                                    <div className="down-in-yard-toggle">
                                        <label className={`toggle-label ${readOnly || !issue.plant || issue.plant === 'All' ? 'disabled' : ''}`}>
                                            <input
                                                type="checkbox"
                                                className="toggle-checkbox"
                                                checked={issue.affectsEfficiency || false}
                                                disabled={readOnly || !issue.plant || issue.plant === 'All'}
                                                onChange={e => updateIssue(issue.id, {affectsEfficiency: e.target.checked})}
                                            />
                                            <span className={`toggle-switch ${issue.affectsEfficiency ? 'active' : ''} ${readOnly || !issue.plant || issue.plant === 'All' ? 'disabled' : ''}`}>
                                                <span className="toggle-slider"></span>
                                            </span>
                                            <span className="toggle-text">Should Affect Plant&apos;s Efficiency{(!issue.plant || issue.plant === 'All') && ' (Select specific plant first)'}</span>
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
                        updateIssue(selectedIssueIdForPlant, {plant: plantCode})
                    }
                    setShowPlantModal(false)
                    setSelectedIssueIdForPlant(null)
                }}
            />
        </div>
    )
}

export function SafetyManagerReviewPlugin({form}) {
    const issues = Array.isArray(form.issues) ? form.issues : (typeof form.issues === 'string' && form.issues ? [{
        id: 0,
        description: form.issues,
        plant: '',
        tag: '',
        tags: [],
        date: ''
    }] : [])
    
    if (issues.length === 0) {
        return (
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
                <div className="safety-empty-state safety-empty-state-success">
                    <div className="safety-empty-icon">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <h4>All Clear</h4>
                    <p>No safety issues were reported during this reporting period</p>
                </div>
            </div>
        )
    }
    
    return (
        <div className="safety-report-section">
            <div className="safety-section-header">
                <div className="safety-section-title">
                    <div className="safety-section-icon">
                        <i className="fas fa-exclamation-circle"></i>
                    </div>
                    <div>
                        <h3>Safety Issues & Incidents</h3>
                        <p>{issues.length} issue{issues.length > 1 ? 's' : ''} reported for this period</p>
                    </div>
                </div>
                <div className="safety-summary-badge">
                    <i className="fas fa-clipboard-list"></i>
                    {issues.length} Incident{issues.length > 1 ? 's' : ''}
                </div>
            </div>
            
            <div className="safety-issues-grid">
                {issues.map((issue, idx) => {
                    const tags = Array.isArray(issue.tags) ? issue.tags : (issue.tag ? [issue.tag] : [])
                    const tagColors = tags.map(t => TAG_COLORS[t]).filter(Boolean)
                    const primaryColor = tagColors[0]?.color || 'var(--accent)'
                    
                    return (
                        <div key={issue.id || idx} className="safety-issue-card safety-issue-card-review" style={{'--issue-accent': primaryColor}}>
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
                                            {new Date(issue.date + 'T00:00:00').toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}
                                        </span>
                                    )}
                                    {issue.affectsEfficiency && (
                                        <span className="safety-badge" style={{background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444'}}>
                                            <i className="fas fa-chart-line"></i>
                                            Affects Efficiency
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="safety-issue-content">
                                {tags.length > 0 && (
                                    <div className="safety-tags-display">
                                        {tags.map(t => {
                                            const tagStyle = TAG_COLORS[t] || { bg: 'var(--background)', color: 'var(--text-primary)', icon: 'fas fa-tag' }
                                            return (
                                                <span key={t} className="safety-tag-chip" style={{background: tagStyle.bg, color: tagStyle.color}}>
                                                    <i className={tagStyle.icon}></i>
                                                    {t}
                                                </span>
                                            )
                                        })}
                                    </div>
                                )}
                                
                                <div className="safety-description-box">
                                    <div className="safety-description-label">
                                        <i className="fas fa-file-alt"></i>
                                        Description
                                    </div>
                                    <div className="safety-description-text">{issue.description || 'No description provided'}</div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
