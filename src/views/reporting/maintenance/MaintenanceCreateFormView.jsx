import React, { useCallback, useEffect, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { MaintenanceService } from '../../../services/MaintenanceService'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import { getFieldTypeIcon, getFieldTypeName } from '../../../utils/MaintenanceUtility'
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
    const loadRegionalPlants = useCallback(async () => {
        try {
            const regionCode = preferences.selectedRegion?.code
            if (regionCode) {
                const plants = await PlantService.fetchRegionPlants(regionCode)
                setAvailablePlants(plants || [])
            } else {
                setAvailablePlants([])
            }
        } catch (error) {
            setAvailablePlants([])
        }
    }, [preferences.selectedRegion?.code])
    useEffect(() => {
        loadRegionalPlants()
    }, [preferences.selectedRegion?.code, loadRegionalPlants])
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
    return (
        <div className="min-h-screen w-full" style={{ background: 'var(--bg-secondary)' }}>
            {/* Sticky header */}
            <div
                className="flex items-center gap-4 px-8 py-4 sticky top-0 z-50 border-b shadow-sm"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
            >
                <button
                    className="flex items-center justify-center w-10 h-10 border-none rounded-lg text-base cursor-pointer transition-all duration-200 hover:opacity-80"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}
                    onClick={onBack}
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold m-0" style={{ color: 'var(--text-primary)' }}>
                        {editingForm ? 'Edit Form' : 'Create Maintenance Form'}
                    </h1>
                </div>
                {editingForm && (
                    <button
                        className="flex items-center justify-center w-10 h-10 border-none rounded-lg text-base cursor-pointer transition-all duration-200 bg-red-100 text-red-500 hover:bg-red-200"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="max-w-[1000px] mx-auto p-4 sm:p-8">
                {/* Form Details section */}
                <div className="rounded-xl shadow-sm mb-6 p-4 sm:p-8" style={{ background: 'var(--bg-primary)' }}>
                    <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                        Form Details
                    </h3>

                    {/* Title */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Title <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                            type="text"
                            className={`w-full rounded-lg text-[0.9375rem] outline-none px-4 py-3 transition-all duration-200 border-2 focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${
                                errors.title
                                    ? 'border-red-500'
                                    : 'border-[var(--border-light)] focus:border-[var(--accent)]'
                            }`}
                            style={{ color: 'var(--text-primary)' }}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter form title"
                        />
                        {errors.title && (
                            <span className="block text-red-500 text-[0.8125rem] font-medium mt-2">{errors.title}</span>
                        )}
                    </div>

                    {/* Plants */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Plants <span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="flex flex-col gap-3">
                            {selectedPlants.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedPlants.map((code) => {
                                        const plant = availablePlants.find(
                                            (p) => (p.plantCode || p.plant_code) === code
                                        )
                                        const name = plant?.plantName || plant?.plant_name || code
                                        return (
                                            <span
                                                key={code}
                                                className="inline-flex items-center gap-2 rounded-md border border-blue-500 text-sm font-semibold px-3 py-2"
                                                style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
                                            >
                                                {name}
                                                <button
                                                    type="button"
                                                    className="flex items-center justify-center w-[18px] h-[18px] p-0 border-none rounded-full bg-blue-500 text-white text-xs cursor-pointer transition-all duration-200 hover:bg-blue-600"
                                                    onClick={() =>
                                                        setSelectedPlants(selectedPlants.filter((c) => c !== code))
                                                    }
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
                                className={`flex items-center justify-between w-full rounded-lg text-[0.9375rem] font-semibold px-4 py-3 cursor-pointer transition-all duration-200 border-2 focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${
                                    errors.plants
                                        ? 'border-red-500'
                                        : 'border-[var(--border-light)] focus:border-[var(--accent)]'
                                }`}
                                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                onClick={() => setShowPlantModal(true)}
                            >
                                {selectedPlants.length === 0 ? 'Select plants' : 'Add more plants'}
                                <i className="fas fa-plus"></i>
                            </button>
                        </div>
                        {errors.plants && (
                            <span className="block text-red-500 text-[0.8125rem] font-medium mt-2">
                                {errors.plants}
                            </span>
                        )}
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

                    {/* Description */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Description
                        </label>
                        <textarea
                            className="w-full rounded-lg text-[0.9375rem] outline-none px-4 py-3 transition-all duration-200 border-2 border-[var(--border-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] min-h-[100px] resize-y"
                            style={{ color: 'var(--text-primary)' }}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter form description (optional)"
                            rows={3}
                        />
                    </div>

                    {/* Frequency row */}
                    <div className="flex items-end gap-4">
                        <div className="flex-1 mb-6">
                            <label
                                className="block text-sm font-semibold mb-2"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Frequency
                            </label>
                            <select
                                className="w-full appearance-none rounded-lg text-[0.9375rem] outline-none px-4 py-3 pr-10 bg-no-repeat cursor-pointer transition-all duration-200 border-2 border-[var(--border-light)] focus:border-[var(--accent)]"
                                style={{
                                    background: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    backgroundImage:
                                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
                                    backgroundPosition: 'right 12px center',
                                    backgroundSize: '18px'
                                }}
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
                            <div className="w-[120px] mb-6">
                                <label
                                    className="block text-sm font-semibold mb-2"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    Every
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-full rounded-lg text-[0.9375rem] outline-none px-4 py-3 transition-all duration-200 border-2 border-[var(--border-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)]"
                                        style={{ color: 'var(--text-primary)' }}
                                        value={frequencyValue}
                                        onChange={(e) => setFrequencyValue(Math.max(1, parseInt(e.target.value) || 1))}
                                        min="1"
                                    />
                                    <span
                                        className="text-sm whitespace-nowrap"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
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

                    {/* Start date */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                            First Due Date <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                            type="date"
                            className="w-full rounded-lg text-[0.9375rem] outline-none px-4 py-3 transition-all duration-200 border-2 border-[var(--border-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)]"
                            style={{ color: 'var(--text-primary)' }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                            {frequency === 'daily' && 'Task will be due every day starting from this date'}
                            {frequency === 'weekly' && 'Task will be due every week starting from this date'}
                            {frequency === 'biweekly' && 'Task will be due every two weeks starting from this date'}
                            {frequency === 'monthly' && 'Task will be due on this day of each month'}
                            {frequency === 'quarterly' && 'Task will be due quarterly starting from this date'}
                            {frequency === 'yearly' && 'Task will be due yearly on this date'}
                        </p>
                    </div>
                </div>

                {/* Assigned Roles section */}
                <div className="rounded-xl shadow-sm mb-6 p-4 sm:p-8" style={{ background: 'var(--bg-primary)' }}>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Assigned Roles <span className="text-red-500 ml-1">*</span>
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Select which roles are responsible for completing this form.
                    </p>
                    {errors.assignment && (
                        <span className="block text-red-500 text-[0.8125rem] font-medium mb-4">
                            {errors.assignment}
                        </span>
                    )}
                    <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: 'var(--border-light)' }}>
                        <div
                            className="flex items-center justify-between px-4 py-3 font-semibold text-sm"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        >
                            <span>Roles ({assignedRoles.length} selected)</span>
                            <button
                                className="flex items-center justify-center w-8 h-8 border-none rounded-md cursor-pointer transition-all duration-200 hover:opacity-80"
                                style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}
                                onClick={() => setShowRoleSelector(!showRoleSelector)}
                            >
                                <i className={`fas ${showRoleSelector ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                            </button>
                        </div>
                        {showRoleSelector && (
                            <div className="max-h-60 overflow-y-auto">
                                {availableRoles.length === 0 ? (
                                    <div
                                        className="text-center py-6 text-sm"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        No roles available
                                    </div>
                                ) : (
                                    availableRoles.map((role) => (
                                        <label
                                            key={role.id}
                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 hover:opacity-80 border-t"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={assignedRoles.includes(role.id)}
                                                onChange={() => toggleRole(role.id)}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <div className="flex flex-col">
                                                <span
                                                    className="text-sm font-medium"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {role.name}
                                                </span>
                                                {role.description && (
                                                    <small
                                                        className="text-xs"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {role.description}
                                                    </small>
                                                )}
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                        {assignedRoles.length > 0 && (
                            <div
                                className="flex flex-wrap gap-2 px-4 py-3 border-t"
                                style={{ borderColor: 'var(--border-light)', background: 'var(--bg-secondary)' }}
                            >
                                {assignedRoles.map((roleId) => {
                                    const role = availableRoles.find((r) => r.id === roleId)
                                    return role ? (
                                        <span
                                            key={roleId}
                                            className="inline-flex items-center gap-2 rounded-md border border-blue-500 text-sm font-semibold px-3 py-1"
                                            style={{ color: 'var(--accent)' }}
                                        >
                                            {role.name}
                                            <button
                                                className="flex items-center justify-center w-[18px] h-[18px] p-0 border-none rounded-full bg-blue-500 text-white text-xs cursor-pointer transition-all duration-200 hover:bg-blue-600"
                                                onClick={() => toggleRole(roleId)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </span>
                                    ) : null
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Fields section */}
                <div className="rounded-xl shadow-sm mb-6 p-4 sm:p-8" style={{ background: 'var(--bg-primary)' }}>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Form Fields <span className="text-red-500 ml-1">*</span>
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Add questions and fields for the form.
                    </p>
                    {errors.fields && (
                        <span className="block text-red-500 text-[0.8125rem] font-medium mb-4">{errors.fields}</span>
                    )}

                    {/* Field type buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            className="flex items-center gap-2 rounded-lg text-sm font-semibold px-4 py-3 cursor-pointer transition-all duration-200 border-2 hover:opacity-80"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-light)',
                                color: 'var(--accent)'
                            }}
                            onClick={() => addField('short_answer')}
                        >
                            <i className="fas fa-font"></i>
                            <span>Short Answer</span>
                        </button>
                        <button
                            className="flex items-center gap-2 rounded-lg text-sm font-semibold px-4 py-3 cursor-pointer transition-all duration-200 border-2 hover:opacity-80"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-light)',
                                color: 'var(--accent)'
                            }}
                            onClick={() => addField('long_answer')}
                        >
                            <i className="fas fa-align-left"></i>
                            <span>Long Answer</span>
                        </button>
                        <button
                            className="flex items-center gap-2 rounded-lg text-sm font-semibold px-4 py-3 cursor-pointer transition-all duration-200 border-2 hover:opacity-80"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-light)',
                                color: 'var(--accent)'
                            }}
                            onClick={() => addField('checklist')}
                        >
                            <i className="fas fa-check-square"></i>
                            <span>Checklist</span>
                        </button>
                        <button
                            className="flex items-center gap-2 rounded-lg text-sm font-semibold px-4 py-3 cursor-pointer transition-all duration-200 border-2 hover:opacity-80"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-light)',
                                color: 'var(--accent)'
                            }}
                            onClick={() => addField('notes')}
                        >
                            <i className="fas fa-sticky-note"></i>
                            <span>Notes</span>
                        </button>
                    </div>

                    {/* Fields list */}
                    <div className="flex flex-col gap-4">
                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="rounded-lg border-2 overflow-hidden"
                                style={{ borderColor: 'var(--border-light)' }}
                            >
                                {/* Field header */}
                                <div
                                    className="flex items-center justify-between px-4 py-3"
                                    style={{ background: 'var(--bg-secondary)' }}
                                >
                                    <div
                                        className="flex items-center gap-2 text-sm font-semibold"
                                        style={{ color: 'var(--accent)' }}
                                    >
                                        <i className={`fas ${getFieldTypeIcon(field.field_type)}`}></i>
                                        <span>{getFieldTypeName(field.field_type)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            className="flex items-center justify-center w-8 h-8 border-none rounded-md cursor-pointer transition-all duration-200 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                            onClick={() => moveField(index, -1)}
                                            disabled={index === 0}
                                            title="Move Up"
                                        >
                                            <i className="fas fa-arrow-up"></i>
                                        </button>
                                        <button
                                            className="flex items-center justify-center w-8 h-8 border-none rounded-md cursor-pointer transition-all duration-200 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                            onClick={() => moveField(index, 1)}
                                            disabled={index === fields.length - 1}
                                            title="Move Down"
                                        >
                                            <i className="fas fa-arrow-down"></i>
                                        </button>
                                        <button
                                            className="flex items-center justify-center w-8 h-8 border-none rounded-md cursor-pointer transition-all duration-200 bg-red-100 text-red-500 hover:bg-red-200"
                                            onClick={() => removeField(index)}
                                            title="Remove Field"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Field body */}
                                <div className="p-4 flex flex-col gap-4">
                                    {/* Label */}
                                    <div>
                                        <label
                                            className="block text-sm font-semibold mb-2"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            Question/Label <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`w-full rounded-lg text-[0.9375rem] outline-none px-4 py-3 transition-all duration-200 border-2 focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] ${
                                                errors[`field-${index}`]
                                                    ? 'border-red-500'
                                                    : 'border-[var(--border-light)] focus:border-[var(--accent)]'
                                            }`}
                                            style={{ color: 'var(--text-primary)' }}
                                            value={field.label}
                                            onChange={(e) => updateField(index, { label: e.target.value })}
                                            placeholder="Enter question or label"
                                        />
                                        {errors[`field-${index}`] && (
                                            <span className="block text-red-500 text-[0.8125rem] font-medium mt-2">
                                                {errors[`field-${index}`]}
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label
                                            className="block text-sm font-semibold mb-2"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            Description (optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg text-[0.9375rem] outline-none px-4 py-3 transition-all duration-200 border-2 border-[var(--border-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)]"
                                            style={{ color: 'var(--text-primary)' }}
                                            value={field.description || ''}
                                            onChange={(e) => updateField(index, { description: e.target.value })}
                                            placeholder="Add a description or instructions"
                                        />
                                    </div>

                                    {/* Checklist items */}
                                    {field.field_type === 'checklist' && (
                                        <div className="flex flex-col gap-3">
                                            <label
                                                className="block text-sm font-semibold"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                Checklist Items <span className="text-red-500 ml-1">*</span>
                                            </label>
                                            {errors[`field-${index}-checklist`] && (
                                                <span className="block text-red-500 text-[0.8125rem] font-medium">
                                                    {errors[`field-${index}-checklist`]}
                                                </span>
                                            )}
                                            {(field.options?.items || []).map((item, itemIndex) => (
                                                <div key={itemIndex} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 rounded-lg text-[0.9375rem] outline-none px-4 py-3 transition-all duration-200 border-2 border-[var(--border-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)]"
                                                        style={{ color: 'var(--text-primary)' }}
                                                        value={item}
                                                        onChange={(e) =>
                                                            updateChecklistItem(index, itemIndex, e.target.value)
                                                        }
                                                        placeholder={`Item ${itemIndex + 1}`}
                                                    />
                                                    <button
                                                        className="flex items-center justify-center w-8 h-8 border-none rounded-md cursor-pointer transition-all duration-200 bg-red-100 text-red-500 hover:bg-red-200"
                                                        onClick={() => removeChecklistItem(index, itemIndex)}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 hover:opacity-80"
                                                style={{
                                                    borderColor: 'var(--border-light)',
                                                    color: 'var(--accent)',
                                                    background: 'transparent'
                                                }}
                                                onClick={() => addChecklistItem(index)}
                                            >
                                                <i className="fas fa-plus"></i>
                                                <span>Add Item</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Toggles */}
                                    <label
                                        className="flex items-center gap-2 cursor-pointer text-sm"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 cursor-pointer"
                                            checked={field.is_required}
                                            onChange={(e) => updateField(index, { is_required: e.target.checked })}
                                        />
                                        <span>Required field</span>
                                    </label>
                                    <label
                                        className="flex items-center gap-2 cursor-pointer text-sm"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 cursor-pointer"
                                            checked={field.image_required || false}
                                            onChange={(e) => updateField(index, { image_required: e.target.checked })}
                                        />
                                        <span>Image required</span>
                                    </label>
                                </div>
                            </div>
                        ))}
                        {fields.length === 0 && (
                            <div
                                className="flex flex-col items-center justify-center py-12 rounded-lg border-2 border-dashed"
                                style={{ borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }}
                            >
                                <i className="fas fa-plus-circle text-3xl mb-3"></i>
                                <p className="text-sm">Add fields using the buttons above</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save error */}
                {errors.save && (
                    <div className="flex items-center gap-3 rounded-lg px-4 py-3 mb-6 bg-red-50 text-red-600 text-sm font-medium">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{errors.save}</span>
                    </div>
                )}

                {/* Form actions */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        className="px-6 py-3 rounded-lg text-sm font-semibold border-2 cursor-pointer transition-all duration-200 hover:opacity-80"
                        style={{
                            borderColor: 'var(--border-light)',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-primary)'
                        }}
                        onClick={onBack}
                    >
                        Cancel
                    </button>
                    <button
                        className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSave}
                        disabled={saving}
                    >
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

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        className="rounded-xl shadow-xl p-8 max-w-md w-full mx-4"
                        style={{ background: 'var(--bg-primary)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                            Delete Form
                        </h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                            Are you sure you want to delete this form? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                className="px-6 py-3 rounded-lg text-sm font-semibold border-2 cursor-pointer transition-all duration-200 hover:opacity-80"
                                style={{
                                    borderColor: 'var(--border-light)',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-primary)'
                                }}
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-6 py-3 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all duration-200 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleDelete}
                                disabled={saving}
                            >
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
