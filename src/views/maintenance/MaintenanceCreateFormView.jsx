import React, { useEffect, useState } from 'react'

import PlantDropdownModal from '../../app/components/common/PlantDropdownModal'
import { usePreferences } from '../../app/context/PreferencesContext'
import { MaintenanceService } from '../../services/MaintenanceService'
import { RegionService } from '../../services/RegionService'
import { UserService } from '../../services/UserService'
import { getFieldTypeIcon, getFieldTypeName } from '../../utils/MaintenanceUtility'
/**
 * Form builder for creating or editing a maintenance form definition.
 * Supports dynamic field composition (short answer, long answer, checklist,
 * notes), multi-plant assignment, role-based responsibility, configurable
 * recurrence frequency, and per-field image-required toggles.
 *
 * @param {Object} [editingForm] - When provided, pre-populates the builder for editing.
 * @param {Function} onBack - Callback to return to the maintenance list.
 * @param {Function} onSaved - Callback after successful create/update/delete.
 */
export default function MaintenanceCreateFormView({ editingForm, onBack, onSaved }) {
    const { preferences } = usePreferences()
    const [saving, setSaving] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [frequency, setFrequency] = useState('daily')
    const [frequencyValue, setFrequencyValue] = useState(1)
    const [assignedRoles, setAssignedRoles] = useState([])
    const [fields, setFields] = useState([])
    const [errors, setErrors] = useState({})
    const [availableRoles, setAvailableRoles] = useState([])
    const [showRoleSelector, setShowRoleSelector] = useState(true)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedPlants, setSelectedPlants] = useState([])
    const [availablePlants, setAvailablePlants] = useState([])
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    useEffect(() => {
        loadOptions()
        if (editingForm) {
            populateForm(editingForm)
        }
    }, [editingForm])
    useEffect(() => {
        loadRegionalPlants()
    }, [preferences.selectedRegion?.code])
    const loadOptions = async () => {
        try {
            const roles = await UserService.getAllRoles()
            if (roles && roles.length > 0) {
                const sortedRoles = roles.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                setAvailableRoles(sortedRoles)
            } else {
                setAvailableRoles([])
            }
        } catch (error) {
            setAvailableRoles([])
        }
    }
    const loadRegionalPlants = async () => {
        try {
            const regionCode = preferences.selectedRegion?.code
            if (regionCode) {
                const plants = await RegionService.fetchRegionPlants(regionCode)
                setAvailablePlants(plants || [])
            } else {
                setAvailablePlants([])
            }
        } catch (error) {
            setAvailablePlants([])
        }
    }
    /** Hydrates all form state from an existing form record, mapping DB field rows into the local builder shape. */
    const populateForm = (form) => {
        setTitle(form.title || '')
        setDescription(form.description || '')
        setFrequency(form.frequency || 'daily')
        setFrequencyValue(form.frequency_value || 1)
        setAssignedRoles(form.assigned_roles || [])
        const plants = form.plant_codes || (form.plant_code ? [form.plant_code] : [])
        setSelectedPlants(plants)
        setStartDate(form.start_date || new Date().toISOString().split('T')[0])
        const existingFields = (form.maintenance_form_fields || [])
            .sort((a, b) => a.field_order - b.field_order)
            .map((f) => ({
                description: f.description || '',
                field_type: f.field_type,
                id: f.id,
                image_required: f.image_required || false,
                is_required: f.is_required,
                label: f.label,
                options: f.options || {}
            }))
        setFields(existingFields)
    }
    const addField = (type) => {
        const newField = {
            description: '',
            field_type: type,
            id: `temp-${Date.now()}`,
            image_required: false,
            is_required: false,
            label: '',
            options: type === 'checklist' ? { items: [''] } : {}
        }
        setFields([...fields, newField])
    }
    const updateField = (index, updates) => {
        const newFields = [...fields]
        newFields[index] = { ...newFields[index], ...updates }
        setFields(newFields)
    }
    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index))
    }
    const moveField = (index, direction) => {
        const newFields = [...fields]
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= fields.length) {
            return
        }
        const temp = newFields[index]
        newFields[index] = newFields[newIndex]
        newFields[newIndex] = temp
        setFields(newFields)
    }
    const addChecklistItem = (fieldIndex) => {
        const newFields = [...fields]
        const items = newFields[fieldIndex].options?.items || []
        newFields[fieldIndex].options = { items: [...items, ''] }
        setFields(newFields)
    }
    const updateChecklistItem = (fieldIndex, itemIndex, value) => {
        const newFields = [...fields]
        newFields[fieldIndex].options.items[itemIndex] = value
        setFields(newFields)
    }
    const removeChecklistItem = (fieldIndex, itemIndex) => {
        const newFields = [...fields]
        newFields[fieldIndex].options.items = newFields[fieldIndex].options.items.filter((_, i) => i !== itemIndex)
        setFields(newFields)
    }
    const toggleRole = (roleId) => {
        if (assignedRoles.includes(roleId)) {
            setAssignedRoles(assignedRoles.filter((id) => id !== roleId))
        } else {
            setAssignedRoles([...assignedRoles, roleId])
        }
    }
    const validateForm = () => {
        const newErrors = {}
        if (!title.trim()) {
            newErrors.title = 'Title is required'
        }
        if (selectedPlants.length === 0) {
            newErrors.plants = 'At least one plant must be selected'
        }
        if (assignedRoles.length === 0) {
            newErrors.assignment = 'At least one role must be assigned'
        }
        if (fields.length === 0) {
            newErrors.fields = 'At least one field is required'
        }
        fields.forEach((field, index) => {
            if (!field.label.trim()) {
                newErrors[`field-${index}`] = 'Field label is required'
            }
            if (field.field_type === 'checklist') {
                const validItems = (field.options?.items || []).filter((item) => item.trim())
                if (validItems.length === 0) {
                    newErrors[`field-${index}-checklist`] = 'At least one checklist item is required'
                }
            }
        })
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }
    const handleSave = async () => {
        if (!validateForm()) return
        setSaving(true)
        try {
            const formData = {
                assigned_roles: assignedRoles,
                description: description.trim(),
                fields: fields.map((field, index) => ({
                    description: field.description?.trim() || null,
                    field_order: index,
                    field_type: field.field_type,
                    image_required: field.image_required || false,
                    is_required: field.is_required,
                    label: field.label.trim(),
                    options:
                        field.field_type === 'checklist'
                            ? { items: (field.options?.items || []).filter((item) => item.trim()) }
                            : null
                })),
                frequency,
                frequency_value: frequencyValue,
                plant_codes: selectedPlants,
                region_code: preferences.selectedRegion?.code || null,
                start_date: startDate,
                title: title.trim()
            }
            if (editingForm) {
                await MaintenanceService.updateForm(editingForm.id, formData)
            } else {
                await MaintenanceService.createForm(formData)
            }
            onSaved()
        } catch (error) {
            setErrors({ save: error.message })
        } finally {
            setSaving(false)
        }
    }
    const handleDelete = async () => {
        setSaving(true)
        try {
            await MaintenanceService.deleteForm(editingForm.id)
            onSaved()
        } catch (error) {
            setErrors({ save: error.message })
        } finally {
            setSaving(false)
            setShowDeleteConfirm(false)
        }
    }
    const styles = {
        backBtn: {
            alignItems: 'center',
            background: 'var(--bg-tertiary)',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--accent)',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '1rem',
            height: '40px',
            justifyContent: 'center',
            transition: 'all 0.2s',
            width: '40px'
        },
        chipRemoveBtn: {
            alignItems: 'center',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.75rem',
            height: '18px',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 0.2s',
            width: '18px'
        },
        container: {
            background: 'var(--bg-secondary)',
            minHeight: '100vh',
            width: '100%'
        },
        content: {
            margin: '0 auto',
            maxWidth: '1000px',
            padding: '2rem'
        },
        deleteBtn: {
            alignItems: 'center',
            background: '#fee2e2',
            border: 'none',
            borderRadius: '8px',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '1rem',
            height: '40px',
            justifyContent: 'center',
            transition: 'all 0.2s',
            width: '40px'
        },
        error: {
            color: '#ef4444',
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 500,
            marginTop: '0.5rem'
        },
        fieldTypeBtn: {
            alignItems: 'center',
            background: 'var(--bg-primary)',
            border: '2px solid var(--border-light)',
            borderRadius: '8px',
            color: 'var(--accent)',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            transition: 'all 0.2s'
        },
        fieldTypeButtons: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.5rem'
        },
        fieldsSection: {
            marginTop: '2rem'
        },
        formGroup: {
            marginBottom: '1.5rem'
        },
        frequencyGroup: {
            flex: 1
        },
        frequencyRow: {
            alignItems: 'flex-end',
            display: 'flex',
            gap: '1rem'
        },
        header: {
            alignItems: 'center',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-light)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '1rem',
            padding: '1rem 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 50
        },
        headerContent: {
            flex: 1
        },
        input: (hasError) => ({
            border: hasError ? '2px solid #ef4444' : '2px solid var(--border-light)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
            outline: 'none',
            padding: '0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        }),
        label: {
            color: 'var(--text-primary)',
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.5rem'
        },
        plantChip: {
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            color: 'var(--accent)',
            display: 'inline-flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.5rem 0.75rem'
        },
        plantMultiSelect: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        },
        plantSelectorBtn: (hasError) => ({
            alignItems: 'center',
            background: 'var(--bg-primary)',
            border: hasError ? '2px solid #ef4444' : '2px solid var(--border-light)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.9375rem',
            fontWeight: 600,
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        }),
        required: {
            color: '#ef4444',
            marginLeft: '0.25rem'
        },
        roleCheckbox: {
            alignItems: 'center',
            border: '2px solid var(--border-light)',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            gap: '0.75rem',
            padding: '0.75rem',
            transition: 'all 0.2s'
        },
        roleCheckboxChecked: {
            background: 'var(--bg-secondary)',
            border: '2px solid var(--accent)'
        },
        rolesGrid: {
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'
        },
        section: {
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem',
            padding: '2rem'
        },
        sectionTitle: {
            color: 'var(--text-primary)',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1.5rem'
        },
        select: (hasError) => ({
            background: 'var(--bg-primary)',
            border: hasError ? '2px solid #ef4444' : '2px solid var(--border-light)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            outline: 'none',
            padding: '0.75rem 1rem',
            transition: 'all 0.2s',
            width: '100%'
        }),
        selectedPlantsList: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
        },
        textarea: (hasError) => ({
            border: hasError ? '2px solid #ef4444' : '2px solid var(--border-light)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
            minHeight: '100px',
            outline: 'none',
            padding: '0.75rem 1rem',
            resize: 'vertical',
            transition: 'all 0.2s',
            width: '100%'
        }),
        title: {
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: 0
        },
        valueGroup: {
            width: '120px'
        }
    }
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button
                    style={styles.backBtn}
                    onClick={onBack}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div style={styles.headerContent}>
                    <h1 style={styles.title}>{editingForm ? 'Edit Form' : 'Create Maintenance Form'}</h1>
                </div>
                {editingForm && (
                    <button
                        style={styles.deleteBtn}
                        onClick={() => setShowDeleteConfirm(true)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fecaca')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                )}
            </div>
            <div style={styles.content}>
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Form Details</h3>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Title <span style={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            style={styles.input(!!errors.title)}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter form title"
                            onFocus={(e) => {
                                if (!errors.title) {
                                    e.target.style.borderColor = 'var(--accent)'
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                }
                            }}
                            onBlur={(e) => {
                                if (!errors.title) {
                                    e.target.style.borderColor = 'var(--border-light)'
                                    e.target.style.boxShadow = 'none'
                                }
                            }}
                        />
                        {errors.title && <span style={styles.error}>{errors.title}</span>}
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Plants <span style={styles.required}>*</span>
                        </label>
                        <div style={styles.plantMultiSelect}>
                            {selectedPlants.length > 0 && (
                                <div style={styles.selectedPlantsList}>
                                    {selectedPlants.map((code) => {
                                        const plant = availablePlants.find(
                                            (p) => (p.plantCode || p.plant_code) === code
                                        )
                                        const name = plant?.plantName || plant?.plant_name || code
                                        return (
                                            <span key={code} style={styles.plantChip}>
                                                {name}
                                                <button
                                                    type="button"
                                                    style={styles.chipRemoveBtn}
                                                    onClick={() =>
                                                        setSelectedPlants(selectedPlants.filter((c) => c !== code))
                                                    }
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </span>
                                        )
                                    })}
                                </div>
                            )}
                            <button
                                type="button"
                                style={styles.plantSelectorBtn(!!errors.plants)}
                                onClick={() => setShowPlantModal(true)}
                                onMouseEnter={(e) => {
                                    if (!errors.plants) {
                                        e.currentTarget.style.borderColor = 'var(--accent)'
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                                    }
                                }}
                                onBlur={(e) => {
                                    if (!errors.plants) {
                                        e.currentTarget.style.borderColor = 'var(--border-light)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }
                                }}
                            >
                                {selectedPlants.length === 0 ? 'Select plants' : 'Add more plants'}
                                <i className="fas fa-plus"></i>
                            </button>
                        </div>
                        {errors.plants && <span className="field-error">{errors.plants}</span>}
                        <PlantDropdownModal
                            isOpen={showPlantModal}
                            onClose={() => setShowPlantModal(false)}
                            plants={availablePlants.filter(
                                (p) => !selectedPlants.includes(p.plantCode || p.plant_code)
                            )}
                            onSelect={(code) => {
                                if (!selectedPlants.includes(code)) {
                                    setSelectedPlants([...selectedPlants, code])
                                }
                                setShowPlantModal(false)
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            className="maintenance-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter form description (optional)"
                            rows={3}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Frequency</label>
                            <select
                                className="maintenance-select"
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Bi-weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        {['daily', 'weekly', 'monthly', 'yearly'].includes(frequency) && (
                            <div className="form-group">
                                <label>Every</label>
                                <div className="frequency-input">
                                    <input
                                        type="number"
                                        className="maintenance-input"
                                        value={frequencyValue}
                                        onChange={(e) => setFrequencyValue(Math.max(1, parseInt(e.target.value) || 1))}
                                        min="1"
                                    />
                                    <span>
                                        {frequency === 'daily'
                                            ? 'day(s)'
                                            : frequency === 'weekly'
                                              ? 'week(s)'
                                              : frequency === 'monthly'
                                                ? 'month(s)'
                                                : 'year(s)'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label>
                            First Due Date <span className="required">*</span>
                        </label>
                        <input
                            type="date"
                            className="maintenance-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <p className="field-hint">
                            {frequency === 'daily' && 'Task will be due every day starting from this date'}
                            {frequency === 'weekly' && 'Task will be due every week starting from this date'}
                            {frequency === 'biweekly' && 'Task will be due every two weeks starting from this date'}
                            {frequency === 'monthly' && 'Task will be due on this day of each month'}
                            {frequency === 'quarterly' && 'Task will be due quarterly starting from this date'}
                            {frequency === 'yearly' && 'Task will be due yearly on this date'}
                        </p>
                    </div>
                </div>
                <div className="create-section">
                    <h3>
                        Assigned Roles <span className="required">*</span>
                    </h3>
                    <p className="section-description">Select which roles are responsible for completing this form.</p>
                    {errors.assignment && <span className="field-error">{errors.assignment}</span>}
                    <div className="assignment-group">
                        <div className="assignment-header">
                            <span>Roles ({assignedRoles.length} selected)</span>
                            <button className="add-btn" onClick={() => setShowRoleSelector(!showRoleSelector)}>
                                <i className={`fas ${showRoleSelector ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                            </button>
                        </div>
                        {showRoleSelector && (
                            <div className="selector-list">
                                {availableRoles.length === 0 ? (
                                    <div className="selector-empty">No roles available</div>
                                ) : (
                                    availableRoles.map((role) => (
                                        <label key={role.id} className="selector-item">
                                            <input
                                                type="checkbox"
                                                checked={assignedRoles.includes(role.id)}
                                                onChange={() => toggleRole(role.id)}
                                            />
                                            <div className="selector-item-content">
                                                <span>{role.name}</span>
                                                {role.description && <small>{role.description}</small>}
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                        {assignedRoles.length > 0 && (
                            <div className="selected-items">
                                {assignedRoles.map((roleId) => {
                                    const role = availableRoles.find((r) => r.id === roleId)
                                    return role ? (
                                        <span key={roleId} className="selected-chip">
                                            {role.name}
                                            <button onClick={() => toggleRole(roleId)}>
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </span>
                                    ) : null
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="create-section">
                    <h3>
                        Form Fields <span className="required">*</span>
                    </h3>
                    <p className="section-description">Add questions and fields for the form.</p>
                    {errors.fields && <span className="field-error">{errors.fields}</span>}
                    <div className="field-type-buttons">
                        <button onClick={() => addField('short_answer')}>
                            <i className="fas fa-font"></i>
                            <span>Short Answer</span>
                        </button>
                        <button onClick={() => addField('long_answer')}>
                            <i className="fas fa-align-left"></i>
                            <span>Long Answer</span>
                        </button>
                        <button onClick={() => addField('checklist')}>
                            <i className="fas fa-check-square"></i>
                            <span>Checklist</span>
                        </button>
                        <button onClick={() => addField('notes')}>
                            <i className="fas fa-sticky-note"></i>
                            <span>Notes</span>
                        </button>
                    </div>
                    <div className="fields-list">
                        {fields.map((field, index) => (
                            <div key={field.id} className="field-editor">
                                <div className="field-editor-header">
                                    <div className="field-type-badge">
                                        <i className={`fas ${getFieldTypeIcon(field.field_type)}`}></i>
                                        <span>{getFieldTypeName(field.field_type)}</span>
                                    </div>
                                    <div className="field-editor-actions">
                                        <button
                                            onClick={() => moveField(index, -1)}
                                            disabled={index === 0}
                                            title="Move Up"
                                        >
                                            <i className="fas fa-arrow-up"></i>
                                        </button>
                                        <button
                                            onClick={() => moveField(index, 1)}
                                            disabled={index === fields.length - 1}
                                            title="Move Down"
                                        >
                                            <i className="fas fa-arrow-down"></i>
                                        </button>
                                        <button
                                            onClick={() => removeField(index)}
                                            className="remove-btn"
                                            title="Remove Field"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="field-editor-body">
                                    <div className="form-group">
                                        <label>
                                            Question/Label <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`maintenance-input ${errors[`field-${index}`] ? 'error' : ''}`}
                                            value={field.label}
                                            onChange={(e) => updateField(index, { label: e.target.value })}
                                            placeholder="Enter question or label"
                                        />
                                        {errors[`field-${index}`] && (
                                            <span className="field-error">{errors[`field-${index}`]}</span>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>Description (optional)</label>
                                        <input
                                            type="text"
                                            className="maintenance-input"
                                            value={field.description || ''}
                                            onChange={(e) => updateField(index, { description: e.target.value })}
                                            placeholder="Add a description or instructions"
                                        />
                                    </div>
                                    {field.field_type === 'checklist' && (
                                        <div className="checklist-editor">
                                            <label>
                                                Checklist Items <span className="required">*</span>
                                            </label>
                                            {errors[`field-${index}-checklist`] && (
                                                <span className="field-error">
                                                    {errors[`field-${index}-checklist`]}
                                                </span>
                                            )}
                                            {(field.options?.items || []).map((item, itemIndex) => (
                                                <div key={itemIndex} className="checklist-item-editor">
                                                    <input
                                                        type="text"
                                                        className="maintenance-input"
                                                        value={item}
                                                        onChange={(e) =>
                                                            updateChecklistItem(index, itemIndex, e.target.value)
                                                        }
                                                        placeholder={`Item ${itemIndex + 1}`}
                                                    />
                                                    <button
                                                        onClick={() => removeChecklistItem(index, itemIndex)}
                                                        className="remove-item-btn"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                className="add-checklist-item-btn"
                                                onClick={() => addChecklistItem(index)}
                                            >
                                                <i className="fas fa-plus"></i>
                                                <span>Add Item</span>
                                            </button>
                                        </div>
                                    )}
                                    <label className="required-toggle">
                                        <input
                                            type="checkbox"
                                            checked={field.is_required}
                                            onChange={(e) => updateField(index, { is_required: e.target.checked })}
                                        />
                                        <span>Required field</span>
                                    </label>
                                    <label className="required-toggle">
                                        <input
                                            type="checkbox"
                                            checked={field.image_required || false}
                                            onChange={(e) => updateField(index, { image_required: e.target.checked })}
                                        />
                                        <span>Image required</span>
                                    </label>
                                </div>
                            </div>
                        ))}
                        {fields.length === 0 && (
                            <div className="no-fields">
                                <i className="fas fa-plus-circle"></i>
                                <p>Add fields using the buttons above</p>
                            </div>
                        )}
                    </div>
                </div>
                {errors.save && (
                    <div className="submit-error">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{errors.save}</span>
                    </div>
                )}
                <div className="form-actions">
                    <button className="cancel-btn" onClick={onBack}>
                        Cancel
                    </button>
                    <button className="save-btn" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                <span>{editingForm ? 'Update Form' : 'Create Form'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            {showDeleteConfirm && (
                <div className="confirm-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete Form</h3>
                        <p>Are you sure you want to delete this form? This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="delete-confirm-btn" onClick={handleDelete} disabled={saving}>
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
