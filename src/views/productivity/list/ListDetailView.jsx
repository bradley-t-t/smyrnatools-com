import React, { useCallback, useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { AIService } from '../../../services/AIService'
import { ListService } from '../../../services/ListService'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import GrammarUtility from '../../../utils/GrammarUtility'
/**
 * Detail/edit view for a single task list item. Supports editing description,
 * plant, deadline, status, role, and comments with AI-powered description
 * improvement. Tracks unsaved changes and provides save/delete with
 * keyboard shortcuts (Escape to close, Delete to remove).
 *
 * @param {string} itemId - ID of the task to display.
 * @param {Function} onClose - Callback to return to the list view.
 */
function ListDetailView({ itemId, onClose }) {
    const { preferences } = usePreferences()
    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [creator, setCreator] = useState(null)
    const [completer, setCompleter] = useState(null)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [formData, setFormData] = useState({ comments: '', deadline: '', description: '', plantCode: '' })
    const [status, setStatus] = useState('pending')
    const [priority, setPriority] = useState('none')
    const [responsibleRole, setResponsibleRole] = useState('')
    const [plants, setPlants] = useState([])
    const [message, setMessage] = useState('')
    const [isImprovingDescription, setIsImprovingDescription] = useState(false)
    const statusOptions = [
        { label: 'Pending', value: 'pending' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Ordered Materials / Parts', value: 'ordered_materials' },
        { label: 'Waiting', value: 'waiting' },
        { label: 'Blocked', value: 'blocked' },
        { label: 'Completed', value: 'completed' }
    ]
    const priorityOptions = ListService.getPriorityOptions()
    const responsibleRoleOptions = [
        { label: 'Unassigned', value: '' },
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'Plant Manager', value: 'plant_manager' },
        { label: 'District Manager', value: 'district_manager' }
    ]
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [originalValues, setOriginalValues] = useState({})
    const [canEditList, setCanEditList] = useState(false)
    const [canDeleteList, setCanDeleteList] = useState(false)
    const canEdit = true
    useEffect(() => {
        const contentArea = document.querySelector('.content-area')
        if (contentArea) contentArea.scrollTop = 0
    }, [])
    const fetchItem = useCallback(
        async function fetchItem() {
            setLoading(true)
            try {
                const items = await ListService.fetchListItems()
                const found = items.find((i) => i.id === itemId)
                setItem(found)
                setFormData({
                    comments: found?.comments || '',
                    deadline: ListService.formatDateForInput(found?.deadline) || '',
                    description: found?.description || '',
                    plantCode: found?.plant_code || ''
                })
                setCreator(ListService.creatorProfiles[found?.user_id])
                setCompleter(ListService.creatorProfiles[found?.completed_by])
                const loadedStatus = found?.status || (found?.completed ? 'completed' : 'pending')
                setStatus(loadedStatus)
                setPriority(found?.priority || 'none')
                setResponsibleRole(found?.responsible_role || '')
                setOriginalValues({
                    comments: found?.comments || '',
                    deadline: ListService.formatDateForInput(found?.deadline) || '',
                    description: found?.description || '',
                    plantCode: found?.plant_code || '',
                    priority: found?.priority || 'none',
                    responsibleRole: found?.responsible_role || '',
                    status: loadedStatus
                })
            } catch {
                showMessage('Failed to load item details', 'error')
            } finally {
                setLoading(false)
            }
        },
        [itemId]
    )
    const fetchPlants = useCallback(async function fetchPlants() {
        try {
            const plantsData = await ListService.fetchPlants()
            setPlants(plantsData)
        } catch {
            showMessage('Failed to load plants', 'error')
        }
    }, [])
    useEffect(() => {
        if (itemId) {
            Promise.all([fetchItem(), fetchPlants()]).catch(() => {})
        }
        return () => {}
    }, [itemId, fetchItem, fetchPlants])
    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete')
                    setCanDeleteList(hasPermission)
                } else {
                    setCanDeleteList(false)
                }
            } catch (error) {
                setCanDeleteList(false)
            }
        }
        checkDeletePermission()
    }, [])
    // Resolve which plants the user can assign to, scoped by their region permissions.
    useEffect(() => {
        let cancelled = false
        async function loadAllowed() {
            let regionCode = preferences.selectedRegion?.code || ''
            try {
                if (!regionCode) {
                    const user = await UserService.getCurrentUser()
                    const uid = user?.id || ''
                    if (uid) {
                        const profilePlant = await UserService.getUserPlant(uid)
                        const plantCode =
                            typeof profilePlant === 'string'
                                ? profilePlant
                                : profilePlant?.plant_code || profilePlant?.plantCode || ''
                        if (plantCode) {
                            const regions = await PlantService.fetchRegionsByPlantCode(plantCode)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? r.regionCode || r.region_code || '' : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await PlantService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(
                    regionPlants
                        .map((p) =>
                            String(p.plantCode || p.plant_code || '')
                                .trim()
                                .toUpperCase()
                        )
                        .filter(Boolean)
                )
                setRegionPlantCodes(codes)
                if (formData.plantCode && !codes.has(String(formData.plantCode).trim().toUpperCase()))
                    setFormData((prev) => ({ ...prev, plantCode: prev.plantCode }))
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }
        loadAllowed()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, formData.plantCode])
    const filteredPlants = useMemo(() => {
        if (!regionPlantCodes || regionPlantCodes.size === 0) return plants
        return plants.filter((p) =>
            regionPlantCodes.has(
                String(p.plant_code || '')
                    .trim()
                    .toUpperCase()
            )
        )
    }, [plants, regionPlantCodes])
    useEffect(() => {
        const hasChanges =
            formData.description !== originalValues.description ||
            formData.plantCode !== originalValues.plantCode ||
            formData.deadline !== originalValues.deadline ||
            formData.comments !== originalValues.comments ||
            status !== originalValues.status ||
            priority !== originalValues.priority ||
            responsibleRole !== originalValues.responsibleRole
        setHasUnsavedChanges(hasChanges)
    }, [formData, status, priority, responsibleRole, originalValues])
    function handleChange(e) {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }
    function showMessage(text, type = 'success', duration = 3000) {
        setMessage(type === 'error' ? `Error: ${text}` : text)
        if (duration) setTimeout(() => setMessage(''), duration)
    }
    async function handleSubmit() {
        try {
            if (!formData.description.trim()) return showMessage('Description is required', 'error')
            const deadlineDate = new Date(formData.deadline)
            if (isNaN(deadlineDate.getTime())) return showMessage('Invalid deadline date', 'error')
            await ListService.updateListItem({
                ...item,
                comments: formData.comments || null,
                completed: status === 'completed',
                deadline: deadlineDate.toISOString(),
                description: formData.description,
                plant_code: formData.plantCode || null,
                priority: priority || 'none',
                responsible_role: responsibleRole || null,
                status: status
            })
            await fetchItem()
            setHasUnsavedChanges(false)
            showMessage('Changes saved successfully!')
        } catch {
            showMessage('Failed to update item', 'error', 5000)
        }
    }
    async function handleImproveDescription() {
        if (!formData.description.trim()) return
        setIsImprovingDescription(true)
        try {
            const improved = await AIService.improveListItem(formData.description, formData.comments)
            if (improved) {
                if (typeof improved === 'object') {
                    const newDescription = improved.description || formData.description
                    const newComments = improved.comments !== undefined ? improved.comments : formData.comments
                    setFormData((prev) => ({
                        ...prev,
                        comments: newComments,
                        description: newDescription
                    }))
                    if (improved.comments && improved.comments !== formData.comments) {
                        showMessage('Description and comments improved by AI')
                    } else {
                        showMessage('Description improved by AI')
                    }
                } else {
                    setFormData((prev) => ({ ...prev, description: improved }))
                    showMessage('Description improved by AI')
                }
            }
        } catch {
            showMessage('Failed to improve description', 'error')
        } finally {
            setIsImprovingDescription(false)
        }
    }
    async function handleDelete() {
        try {
            await ListService.deleteListItem(itemId)
            onClose()
        } catch {
            showMessage('Failed to delete item', 'error')
            setShowDeleteConfirmation(false)
        }
    }
    // Keyboard shortcuts: Escape to close, Delete/Backspace to delete — but only when not focused on a form input.
    useEffect(() => {
        function onKeyDown(e) {
            const key = (e.key || '').toLowerCase()
            if (key === 'escape') {
                e.preventDefault()
                onClose?.()
            } else if (key === 'delete' || key === 'backspace') {
                const tag = (e.target.tagName || '').toLowerCase()
                const isEditable =
                    tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable
                if (isEditable) return
                e.preventDefault()
                setShowDeleteConfirmation(true)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])
    if (loading) {
        return (
            <>
                <DetailViewSection
                    title="Task Details"
                    onClose={onClose}
                    isLoading={true}
                    loadingMessage="Loading item details..."
                />
            </>
        )
    }
    if (!item) {
        return (
            <>
                <DetailViewSection
                    title="Item Not Found"
                    onClose={onClose}
                    notFound={true}
                    notFoundMessage="Item Not Found"
                    notFoundDescription="The requested item could not be found or has been deleted."
                />
            </>
        )
    }
    return (
        <>
            <DetailViewSection
                title="Task Details"
                onClose={onClose}
                headerActions={null}
                itemAssignedPlant={item?.plant_code}
                onCanEditChange={setCanEditList}
                footerActions={
                    canEditList && (
                        <>
                            <button
                                className="global-button-secondary"
                                onClick={handleSubmit}
                                disabled={!hasUnsavedChanges || !canEditList}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                <i className="fas fa-save"></i>
                                <span>Save</span>
                            </button>
                            {canDeleteList && (
                                <button
                                    className="global-button-secondary"
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={!canEditList}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    )
                }
                message={message}
                showDeleteConfirmation={showDeleteConfirmation}
                onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setShowDeleteConfirmation(false)}
                deleteTitle="Delete Item"
                deleteMessage="Are you sure you want to delete this item? This action cannot be undone."
            >
                <DetailViewSection.Section id="basic" title="Task Information" icon="fas fa-tasks">
                    <DetailViewSection.Card title="Basic Information" icon="fas fa-info-circle">
                        <div className="form-group">
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="description" className="m-0">
                                    Description
                                </label>
                                {canEditList && formData.description.trim() && (
                                    <button
                                        type="button"
                                        onClick={handleImproveDescription}
                                        disabled={isImprovingDescription}
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                        style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: 'none',
                                            color: 'var(--accent)',
                                            cursor: isImprovingDescription ? 'not-allowed' : 'pointer'
                                        }}
                                        title="AI will improve and add ready-mix context to your description"
                                    >
                                        {isImprovingDescription ? (
                                            <i className="fas fa-circle-notch fa-spin"></i>
                                        ) : (
                                            <i className="fas fa-magic"></i>
                                        )}
                                        <span>Improve with AI</span>
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                onBlur={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        description: GrammarUtility.cleanDescription(prev.description)
                                    }))
                                }
                                disabled={!canEdit || !canEditList}
                                required
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="plantCode">Plant</label>
                            <button
                                className="operator-select-button"
                                onClick={() => setShowPlantModal(true)}
                                disabled={!canEdit || !canEditList}
                            >
                                {formData.plantCode
                                    ? `(${filteredPlants.find((p) => p.plant_code === formData.plantCode)?.plant_code || formData.plantCode}) ${filteredPlants.find((p) => p.plant_code === formData.plantCode)?.plant_name || ''}`
                                    : 'Select Plant'}
                            </button>
                        </div>
                        <div className="form-group">
                            <label htmlFor="deadline">Deadline</label>
                            <input
                                type="datetime-local"
                                id="deadline"
                                name="deadline"
                                value={formData.deadline}
                                onChange={handleChange}
                                disabled={!canEdit || !canEditList}
                                required
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="status">Status</label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={!canEdit || !canEditList}
                                className="form-control"
                            >
                                {statusOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="priority">Priority</label>
                            <select
                                id="priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                disabled={!canEdit || !canEditList}
                                className="form-control"
                            >
                                {priorityOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="responsibleRole">Responsible</label>
                            <select
                                id="responsibleRole"
                                value={responsibleRole}
                                onChange={(e) => setResponsibleRole(e.target.value)}
                                disabled={!canEdit || !canEditList}
                                className="form-control"
                            >
                                {responsibleRoleOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
                <DetailViewSection.Section id="details" title="Additional Details" icon="fas fa-clipboard">
                    <DetailViewSection.Card title="Comments & History" icon="fas fa-comment-alt">
                        <div className="form-group">
                            <label htmlFor="comments">Comments</label>
                            <textarea
                                id="comments"
                                name="comments"
                                value={formData.comments}
                                onChange={handleChange}
                                onBlur={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        comments: GrammarUtility.cleanComments(prev.comments)
                                    }))
                                }
                                disabled={!canEdit || !canEditList}
                                className="form-control"
                                rows="4"
                            />
                        </div>
                        <div className="form-group">
                            <label>Created By</label>
                            <input
                                type="text"
                                value={creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown'}
                                disabled
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>Created On</label>
                            <input
                                type="text"
                                value={ListService.formatDate(item.created_at)}
                                disabled
                                className="form-control"
                            />
                        </div>
                        {item.completed && (
                            <>
                                <div className="form-group">
                                    <label>Completed By</label>
                                    <input
                                        type="text"
                                        value={completer ? `${completer.first_name} ${completer.last_name}` : 'Unknown'}
                                        disabled
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Completed On</label>
                                    <input
                                        type="text"
                                        value={ListService.formatDate(item.completed_at)}
                                        disabled
                                        className="form-control"
                                    />
                                </div>
                            </>
                        )}
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
            </DetailViewSection>
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => setShowPlantModal(false)}
                    plants={filteredPlants}
                    onSelect={(code) => {
                        setFormData((prev) => ({ ...prev, plantCode: code }))
                        setShowPlantModal(false)
                    }}
                    searchPlaceholder="Search plants..."
                />
            )}
        </>
    )
}
export default ListDetailView
