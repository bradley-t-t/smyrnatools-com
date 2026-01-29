import React, { useCallback, useEffect, useState } from 'react'
import { ListService } from '../../services/ListService'
import { UserService } from '../../services/UserService'
import { RegionService } from '../../services/RegionService'
import { PlantService } from '../../services/PlantService'
import { usePreferences } from '../../app/context/PreferencesContext'
import GrammarUtility from '../../utils/GrammarUtility'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import AddViewSection from '../../components/sections/AddViewSection'
import { AIInsightsService } from '../../services/AIInsightsService'

function ListAddView({ onClose, onItemAdded, item = null }) {
    const { preferences } = usePreferences()
    const [description, setDescription] = useState('')
    const [plantCode, setPlantCode] = useState('')
    const [selectedPlantCodes, setSelectedPlantCodes] = useState([])
    const [deadline, setDeadline] = useState(() => {
        const today = new Date()
        today.setHours(17, 0, 0, 0)
        return today.toISOString().slice(0, 16)
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
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'ordered_materials', label: 'Ordered Materials / Parts' },
        { value: 'waiting', label: 'Waiting' },
        { value: 'blocked', label: 'Blocked' }
    ]

    const responsibleRoleOptions = [
        { value: '', label: 'Unassigned' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'plant_manager', label: 'Plant Manager' },
        { value: 'district_manager', label: 'District Manager' }
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
            const allowedCodes = await RegionService.getAllowedPlantCodes(selectedRegionCode)
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
            setDeadline(item.deadline ? new Date(item.deadline).toISOString().slice(0, 16) : deadline)
            setComments(item.comments || '')
        }
    }, [item])

    const fetchSuggestions = useCallback(async (partial = '') => {
        setIsLoadingSuggestions(true)
        try {
            const suggestions = await AIInsightsService.suggestListItems(partial)
            setAiSuggestions(suggestions)
            setShowSuggestions(suggestions.length > 0)
        } catch {
            setAiSuggestions([])
        } finally {
            setIsLoadingSuggestions(false)
        }
    }, [])

    const handleImproveDescription = async () => {
        if (!description.trim()) return
        setIsImprovingDescription(true)
        try {
            const improved = await AIInsightsService.improveListItem(description, comments)
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
        if (!deadline) newErrors.deadline = 'Deadline is required'
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
                    plant_code: plantCode,
                    description: description.trim(),
                    deadline: new Date(deadline).toISOString(),
                    comments: comments.trim()
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
                            <div className="flex flex-col gap-2">
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
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
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
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
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
                                                    <i className="fas fa-robot text-[#1e3a5f]"></i>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
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
                            <div className="flex flex-col gap-2">
                                <label htmlFor="deadline" className="text-sm font-medium text-slate-700">
                                    Deadline*
                                </label>
                                <input
                                    id="deadline"
                                    type="datetime-local"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="status" className="text-sm font-medium text-slate-700">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    style={{
                                        padding: '12px 40px 12px 16px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        color: '#1e293b',
                                        backgroundColor: '#f8fafc',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '18px',
                                        width: '100%'
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
                            <div className="flex flex-col gap-2">
                                <label htmlFor="responsibleRole" className="text-sm font-medium text-slate-700">
                                    Responsible
                                </label>
                                <select
                                    id="responsibleRole"
                                    style={{
                                        padding: '12px 40px 12px 16px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        color: '#1e293b',
                                        backgroundColor: '#f8fafc',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '18px',
                                        width: '100%'
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
                            <div className="flex flex-col gap-2">
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
                            className="px-6 py-3 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
