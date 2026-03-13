import React, { useCallback, useEffect, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { AIService } from '../../../services/AIService'
import { ListService } from '../../../services/ListService'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import GrammarUtility from '../../../utils/GrammarUtility'
/**
 * Add/edit form for task list items. Supports multi-plant creation in add mode
 * (broadcast a single task to multiple plants) and single-plant editing.
 * Integrates AI-powered description improvement and task suggestions via AIService.
 *
 * @param {Function} onClose - Dismiss the form.
 * @param {Function} [onItemAdded] - Callback after successful save.
 * @param {Object} [item] - When provided, switches to edit mode for this existing item.
 */
function ListAddView({ onClose, onItemAdded, item = null }) {
    const { preferences } = usePreferences()
    const [description, setDescription] = useState('')
    const [plantCode, setPlantCode] = useState('')
    const [selectedPlantCodes, setSelectedPlantCodes] = useState([])
    const [deadline, setDeadline] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() + 14)
        d.setHours(17, 0, 0, 0)
        return d.toISOString().slice(0, 16)
    })
    const [comments, setComments] = useState('')
    const [status, setStatus] = useState('pending')
    const [responsibleRole, setResponsibleRole] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [currentUserId, setCurrentUserId] = useState(null)
    const [errors, setErrors] = useState({})
    const [plants, setPlants] = useState([])
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [aiSuggestions, setAiSuggestions] = useState([])
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isImprovingDescription, setIsImprovingDescription] = useState(false)
    const statusOptions = [
        { label: 'Pending', value: 'pending' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Ordered Materials / Parts', value: 'ordered_materials' },
        { label: 'Waiting', value: 'waiting' },
        { label: 'Blocked', value: 'blocked' }
    ]
    const responsibleRoleOptions = [
        { label: 'Unassigned', value: '' },
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'Plant Manager', value: 'plant_manager' },
        { label: 'District Manager', value: 'district_manager' }
    ]
    useEffect(() => {
        async function fetchCurrentUser() {
            const user = await UserService.getCurrentUser()
            if (!user) return
            setCurrentUserId(user.id)
        }
        fetchCurrentUser()
    }, [])
    useEffect(() => {
        async function fetchPlants() {
            const selectedRegionCode = preferences?.selectedRegion?.code || ''
            const allowedCodes = await PlantService.getAllowedPlantCodes(selectedRegionCode)
            if (allowedCodes) {
                const allPlants = await PlantService.fetchAllPlants()
                setPlants(
                    allPlants
                        .filter((p) => allowedCodes.has(p.plantCode.toUpperCase()))
                        .map((p) => ({
                            plant_code: p.plantCode,
                            plant_name: p.plantName
                        }))
                )
            }
        }
        fetchPlants()
    }, [preferences])
    useEffect(() => {
        if (item) {
            setDescription(item.description || '')
            setPlantCode(item.plantCode || '')
            setDeadline((prev) => (item.deadline ? new Date(item.deadline).toISOString().slice(0, 16) : prev))
            setComments(item.comments || '')
        }
    }, [item])
    const fetchSuggestions = useCallback(async (partial = '') => {
        setIsLoadingSuggestions(true)
        try {
            const suggestions = await AIService.suggestListItems(partial)
            setAiSuggestions(suggestions)
            setShowSuggestions(suggestions.length > 0)
        } catch {
            setAiSuggestions([])
        } finally {
            setIsLoadingSuggestions(false)
        }
    }, [])
    /** Sends the description (and comments) to AI for rewriting; response may be a string or {description, comments} object. */
    const handleImproveDescription = async () => {
        if (!description.trim()) return
        setIsImprovingDescription(true)
        try {
            const improved = await AIService.improveListItem(description, comments)
            if (improved) {
                if (typeof improved === 'object') {
                    setDescription(improved.description || description)
                    if (improved.comments !== undefined) {
                        setComments(improved.comments)
                    }
                } else {
                    setDescription(improved)
                }
            }
        } catch {
        } finally {
            setIsImprovingDescription(false)
        }
    }
    const handleSelectSuggestion = (suggestion) => {
        setDescription(suggestion)
        setShowSuggestions(false)
        setAiSuggestions([])
    }
    const selectedPlantObj = plants.find((p) => p.plant_code === plantCode)
    const plantDisplayText = plantCode
        ? `(${selectedPlantObj?.plant_code}) ${selectedPlantObj?.plant_name}`
        : 'Select Plant'
    const validate = () => {
        const newErrors = {}
        if (!description.trim()) newErrors.description = 'Description is required'
        const isBulkMode = selectedPlantCodes.length > 0
        if (isBulkMode) {
            if (!selectedPlantCodes.length) {
                newErrors.plantCode = 'At least one plant is required'
            }
        } else {
            if (!plantCode) newErrors.plantCode = 'Plant is required'
        }
        setErrors(newErrors)
        return !Object.keys(newErrors).length
    }
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setIsSaving(true)
        try {
            let userId = currentUserId
            if (!userId) {
                const user = await UserService.getCurrentUser()
                if (!user || !user.id) {
                    alert('User ID is required. Please ensure you are logged in.')
                    setIsSaving(false)
                    return
                }
                userId = user.id
                setCurrentUserId(userId)
            }
            if (item) {
                const updateData = {
                    comments: comments.trim(),
                    deadline: new Date(deadline).toISOString(),
                    description: description.trim(),
                    plant_code: plantCode
                }
                await ListService.updateListItem({ ...item, ...updateData })
            } else if (selectedPlantCodes.length > 0) {
                const promises = selectedPlantCodes.map((code) =>
                    ListService.createListItem(code, description, new Date(deadline), comments, status, responsibleRole)
                )
                await Promise.all(promises)
            } else {
                await ListService.createListItem(
                    plantCode,
                    description,
                    new Date(deadline),
                    comments,
                    status,
                    responsibleRole
                )
            }
            onItemAdded?.()
            onClose?.()
        } catch (error) {
            alert(`Failed to save list item: ${error.message || 'Unknown error'}. Please try again.`)
        } finally {
            setIsSaving(false)
        }
    }
    return (
        <>
            <AddViewSection title={item ? 'Edit List Item' : 'Add New List Item'} onClose={onClose} isListItem={true}>
                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-2 min-w-0">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="description" className="text-sm font-medium text-slate-700">
                                        Description*
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {description.trim() && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={handleImproveDescription}
                                                    disabled={isImprovingDescription}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-accent bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                    title="AI will improve and add context to your description"
                                                >
                                                    {isImprovingDescription ? (
                                                        <i className="fas fa-circle-notch fa-spin"></i>
                                                    ) : (
                                                        <i className="fas fa-magic"></i>
                                                    )}
                                                    <span className="hidden sm:inline">Improve</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fetchSuggestions(description)}
                                                    disabled={isLoadingSuggestions}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-accent bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                    title="Get AI task suggestions based on your input"
                                                >
                                                    {isLoadingSuggestions ? (
                                                        <i className="fas fa-circle-notch fa-spin"></i>
                                                    ) : (
                                                        <i className="fas fa-lightbulb"></i>
                                                    )}
                                                    <span className="hidden sm:inline">Suggest</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        id="description"
                                        type="text"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={description}
                                        onChange={(e) => {
                                            setDescription(e.target.value)
                                            setShowSuggestions(false)
                                        }}
                                        onBlur={() => setDescription(GrammarUtility.cleanDescription(description))}
                                        placeholder="Enter item description or click Suggest for ideas"
                                        required
                                        autoFocus
                                    />
                                    {showSuggestions && aiSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                    <i className="fas fa-robot text-accent"></i>
                                                    <span>AI Suggestions</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowSuggestions(false)}
                                                        className="ml-auto text-slate-400 hover:text-slate-600"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {aiSuggestions.map((suggestion, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => handleSelectSuggestion(suggestion)}
                                                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 min-w-0">
                            <div className="flex flex-col gap-2 min-w-0">
                                <label htmlFor="plantCode" className="text-sm font-medium text-slate-700">
                                    {selectedPlantCodes.length > 0 ? 'Plants*' : 'Plant*'}
                                </label>
                                {!item ? (
                                    <>
                                        <button
                                            type="button"
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => setIsPlantModalOpen(true)}
                                            aria-label="Select plants"
                                        >
                                            {selectedPlantCodes.length === 0
                                                ? 'Select Plants'
                                                : `${selectedPlantCodes.length} plant${selectedPlantCodes.length !== 1 ? 's' : ''} selected`}
                                        </button>
                                        {selectedPlantCodes.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {selectedPlantCodes.map((code) => {
                                                    const plant = plants.find((p) => p.plant_code === code)
                                                    return (
                                                        <div
                                                            key={code}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm"
                                                        >
                                                            <span>
                                                                ({plant?.plant_code}) {plant?.plant_name}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-200 text-blue-700 hover:bg-blue-300 transition-colors"
                                                                onClick={() =>
                                                                    setSelectedPlantCodes((prev) =>
                                                                        prev.filter((c) => c !== code)
                                                                    )
                                                                }
                                                                aria-label="Remove plant"
                                                            >
                                                                <i className="fas fa-times text-xs"></i>
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => setIsPlantModalOpen(true)}
                                        aria-label="Select plant"
                                    >
                                        {plantDisplayText}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                            <div className="flex flex-col gap-2 min-w-0">
                                <label htmlFor="status" className="text-sm font-medium text-slate-700">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    className="w-full appearance-none cursor-pointer rounded-xl border border-border-light bg-bg-secondary py-3 pl-4 pr-10 text-sm text-text-primary bg-[length:18px] bg-[position:right_12px_center] bg-no-repeat"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                                    }}
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    {statusOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 min-w-0">
                                <label htmlFor="responsibleRole" className="text-sm font-medium text-slate-700">
                                    Responsible
                                </label>
                                <select
                                    id="responsibleRole"
                                    className="w-full appearance-none cursor-pointer rounded-xl border border-border-light bg-bg-secondary py-3 pl-4 pr-10 text-sm text-text-primary bg-[length:18px] bg-[position:right_12px_center] bg-no-repeat"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                                    }}
                                    value={responsibleRole}
                                    onChange={(e) => setResponsibleRole(e.target.value)}
                                >
                                    {responsibleRoleOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-2 min-w-0">
                                <label htmlFor="comments" className="text-sm font-medium text-slate-700">
                                    Comments
                                </label>
                                <textarea
                                    id="comments"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Enter any additional comments"
                                    rows="3"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="px-6 py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving}
                        >
                            {isSaving
                                ? 'Saving...'
                                : item
                                  ? 'Update Item'
                                  : selectedPlantCodes.length > 0
                                    ? `Add to ${selectedPlantCodes.length} Plant${selectedPlantCodes.length !== 1 ? 's' : ''}`
                                    : 'Add Item'}
                        </button>
                    </div>
                    {errors.description && <div className="text-red-500 text-sm mt-2">{errors.description}</div>}
                    {errors.plantCode && <div className="text-red-500 text-sm mt-2">{errors.plantCode}</div>}
                </form>
            </AddViewSection>
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    onSelect={(code) => {
                        if (!item) {
                            if (!selectedPlantCodes.includes(code)) {
                                setSelectedPlantCodes((prev) => [...prev, code])
                            }
                        } else {
                            setPlantCode(code)
                            setIsPlantModalOpen(false)
                        }
                    }}
                    plants={plants}
                    allowMultiple={!item}
                    selectedPlantCodes={selectedPlantCodes}
                />
            )}
        </>
    )
}
export default ListAddView
