import React, { useEffect, useMemo, useRef, useState } from 'react'

import PlantDropdownModal from '../../app/components/common/PlantDropdownModal'
import DetailViewSection from '../../app/components/sections/DetailViewSection'
import { usePreferences } from '../../app/context/PreferencesContext'
import Trailer from '../../models/trailers/Trailer'
import { supabase } from '../../services/DatabaseService'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import { TractorService } from '../../services/TractorService'
import { TrailerService } from '../../services/TrailerService'
import { UserService } from '../../services/UserService'
import TractorSelectModal from './TractorSelectModal'
import TrailerCommentModal from './TrailerCommentModal'
import TrailerHistoryView from './TrailerHistoryView'
import TrailerIssueModal from './TrailerIssueModal'

/**
 * Full detail/edit view for a single trailer. Handles tractor assignment/
 * unassignment, region-scoped plant transfer, deletion, trailer type,
 * cleanliness rating, and sub-modals for comments, issues, and history.
 *
 * @param {Object} [initialTrailer] - Pre-loaded trailer data (optional, fetched if absent).
 * @param {string} [trailerId] - Trailer ID used to fetch data when initialTrailer is absent.
 * @param {Function} onClose - Callback to return to the list view.
 */
function TrailerDetailView({ trailer: initialTrailer, trailerId, onClose }) {
    const { preferences } = usePreferences()
    const [trailer, setTrailer] = useState(initialTrailer || null)
    const [tractors, setTractors] = useState([])
    const [plants, setPlants] = useState([])
    const [trailers, setTrailers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [showIssues, setShowIssues] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [, setUpdatedByEmail] = useState(null)
    const [message, setMessage] = useState('')
    const [showTractorModal, setShowTractorModal] = useState(false)
    const [canEditTrailer, setCanEditTrailer] = useState(false)
    const [originalValues, setOriginalValues] = useState({})
    const [trailerNumber, setTrailerNumber] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [trailerType, setTrailerType] = useState('')
    const [assignedTractor, setAssignedTractor] = useState(null)
    const [cleanlinessRating, setCleanlinessRating] = useState(0)
    const [tractorModalTractors, setTractorModalTractors] = useState([])
    const [lastUnassignedTractorId, setLastUnassignedTractorId] = useState(null)
    const [comments, setComments] = useState([])
    const [issues, setIssues] = useState([])
    const [status, setStatus] = useState(trailer?.status || '')
    const _trailerCardRef = useRef(null)
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [canDeleteTrailer, setCanDeleteTrailer] = useState(false)
    const [currentRegion, setCurrentRegion] = useState(null)

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true)
            try {
                let trailerData = initialTrailer
                if (!trailerData && trailerId) {
                    trailerData = await TrailerService.fetchTrailerById(trailerId)
                }
                const [tractorsData, plantsData, allTrailers] = await Promise.all([
                    TractorService.fetchTractors(),
                    PlantService.fetchPlants(),
                    TrailerService.fetchTrailers()
                ])
                setTrailer(trailerData)
                setTractors(tractorsData)
                setPlants(plantsData)
                setTrailers(allTrailers)
                setTrailerNumber(trailerData?.trailerNumber || '')
                setAssignedPlant(trailerData?.assignedPlant || '')
                setTrailerType(trailerData?.trailerType || '')
                setAssignedTractor(trailerData?.assignedTractor || '')
                setCleanlinessRating(trailerData?.cleanlinessRating || 0)
                setStatus(trailerData?.status || '')
                setOriginalValues({
                    assignedPlant: trailerData?.assignedPlant || '',
                    assignedTractor: trailerData?.assignedTractor || '',
                    cleanlinessRating: trailerData?.cleanlinessRating || 0,
                    status: trailerData?.status || '',
                    trailerNumber: trailerData?.trailerNumber || '',
                    trailerType: trailerData?.trailerType || ''
                })

                document.documentElement.style.setProperty('--rating-value', trailerData?.cleanlinessRating || 0)

                if (trailerData?.updatedBy) {
                    try {
                        const userName = await UserService.getUserDisplayName(trailerData.updatedBy)
                        setUpdatedByEmail(userName)
                    } catch {
                        setUpdatedByEmail('Unknown User')
                    }
                }
            } catch (error) {
                setTrailer(null)
            } finally {
                setIsLoading(false)
                setHasUnsavedChanges(false)
            }
        }

        fetchData()
    }, [trailerId, initialTrailer])

    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete')
                    setCanDeleteTrailer(hasPermission)
                } else {
                    setCanDeleteTrailer(false)
                }
            } catch (error) {
                setCanDeleteTrailer(false)
            }
        }
        checkDeletePermission()
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadAllowedPlants() {
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
                            const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? r.regionCode || r.region_code || '' : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await RegionService.fetchRegionPlants(regionCode)
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
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }

        loadAllowedPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    const filteredPlants = useMemo(() => {
        if (!regionPlantCodes || regionPlantCodes.size === 0) return []
        return plants.filter((p) =>
            regionPlantCodes.has(
                String(p.plantCode || p.plant_code || '')
                    .trim()
                    .toUpperCase()
            )
        )
    }, [plants, regionPlantCodes])

    const selectedPlantObj = plants.find((p) => (p.plantCode || p.plant_code) === assignedPlant)
    const plantDisplayText = assignedPlant
        ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code || assignedPlant}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name || ''}`
        : 'Select Plant'

    useEffect(() => {
        if (!originalValues.trailerNumber || isLoading) return
        const hasChanges =
            trailerNumber !== originalValues.trailerNumber ||
            assignedPlant !== originalValues.assignedPlant ||
            trailerType !== originalValues.trailerType ||
            assignedTractor !== originalValues.assignedTractor ||
            cleanlinessRating !== originalValues.cleanlinessRating ||
            status !== originalValues.status
        setHasUnsavedChanges(hasChanges)
    }, [
        trailerNumber,
        assignedPlant,
        trailerType,
        assignedTractor,
        cleanlinessRating,
        status,
        originalValues,
        isLoading,
        lastUnassignedTractorId
    ])

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])

    useEffect(() => {
        if (trailer?.assignedPlant) {
            RegionService.fetchRegionsByPlantCode(trailer.assignedPlant)
                .then((regions) => {
                    if (regions && regions.length > 0) {
                        setCurrentRegion(regions[0].regionCode)
                    } else {
                        setCurrentRegion(null)
                    }
                })
                .catch(() => setCurrentRegion(null))
        }
    }, [trailer?.assignedPlant])

    async function handleRegionTransfer(newRegionCode, newPlantCode) {
        if (!trailer?.id || !newRegionCode || !newPlantCode) {
            throw new Error('Invalid trailer, region, or plant')
        }

        const newRegion = await RegionService.fetchRegionByCode(newRegionCode)
        if (!newRegion) {
            throw new Error('Target region not found')
        }

        setIsSaving(true)
        setMessage('')

        try {
            const userObj = await UserService.getCurrentUser()
            const userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj

            const updatedTrailer = {
                ...trailer,
                assignedPlant: newPlantCode
            }

            const result = await TrailerService.updateTrailer(trailer.id, updatedTrailer, userId, trailer)
            setTrailer(result)
            setAssignedPlant(newPlantCode)
            setOriginalValues({
                ...originalValues,
                assignedPlant: newPlantCode
            })
            setHasUnsavedChanges(false)
            setMessage(`Successfully transferred to ${newRegion.regionName}`)
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            console.error('Region transfer failed:', error)
            throw error
        } finally {
            setIsSaving(false)
        }
    }

    async function handleSave(overrideValues = {}) {
        if (!trailer?.id) {
            alert('Error: Cannot save trailer with undefined ID')
            return
        }
        setIsSaving(true)
        try {
            let userObj = await UserService.getCurrentUser()
            let userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
            let assignedTractorValue = Object.prototype.hasOwnProperty.call(overrideValues, 'assignedTractor')
                ? overrideValues.assignedTractor
                : assignedTractor
            let trailerTypeValue = Object.prototype.hasOwnProperty.call(overrideValues, 'trailerType')
                ? overrideValues.trailerType
                : trailerType
            let statusValue = Object.prototype.hasOwnProperty.call(overrideValues, 'status')
                ? overrideValues.status
                : status

            if (statusValue === 'In Shop' && originalValues.status !== 'In Shop') {
                const { data: openIssues } = await supabase
                    .from('trailers_maintenance')
                    .select('id')
                    .eq('trailer_id', trailer.id)
                    .is('time_completed', null)

                if (!openIssues || openIssues.length === 0) {
                    setIsSaving(false)
                    setMessage(
                        'Cannot change status to "In Shop" without having at least one open issue. Please add an issue first.'
                    )
                    setTimeout(() => setMessage(''), 5000)
                    return
                }
            }

            if (!['Cement', 'End Dump'].includes(trailerTypeValue)) {
                trailerTypeValue = 'Cement'
            }
            if (
                (!assignedTractorValue || assignedTractorValue === '' || assignedTractorValue === null) &&
                statusValue === 'Active'
            ) {
                statusValue = 'Spare'
            }
            if (assignedTractorValue && statusValue !== 'Active') {
                statusValue = 'Active'
            }
            if (Object.prototype.hasOwnProperty.call(overrideValues, 'status')) {
                statusValue = overrideValues.status
            }
            let trailerForHistory = {
                ...trailer,
                assignedTractor: Object.prototype.hasOwnProperty.call(overrideValues, 'prevAssignedTractor')
                    ? overrideValues.prevAssignedTractor
                    : trailer.assignedTractor
            }

            let cleanlinessValue = overrideValues.cleanlinessRating ?? cleanlinessRating
            if (!cleanlinessValue || isNaN(cleanlinessValue) || cleanlinessValue < 1) cleanlinessValue = 1

            const updatedTrailer = new Trailer({
                assigned_plant: overrideValues.assignedPlant ?? assignedPlant,
                assigned_tractor: assignedTractorValue || null,
                cleanliness_rating: cleanlinessValue,
                created_at: trailer.createdAt,
                id: trailer.id,
                status: statusValue,
                trailer_number: overrideValues.trailerNumber ?? trailerNumber,
                trailer_type: trailerTypeValue,
                updated_at: new Date().toISOString(),
                updated_by: userId,
                updated_last: trailer.updatedLast
            })
            await TrailerService.updateTrailer(updatedTrailer.id, updatedTrailer, userId, trailerForHistory)
            setTrailer(updatedTrailer)
            setTrailerNumber(updatedTrailer.trailerNumber || '')
            setAssignedPlant(updatedTrailer.assignedPlant || '')
            setTrailerType(updatedTrailer.trailerType || '')
            setAssignedTractor(updatedTrailer.assignedTractor || '')
            setCleanlinessRating(updatedTrailer.cleanlinessRating || 0)
            setStatus(updatedTrailer.status || '')
            setMessage('Changes saved successfully!')
            setTimeout(() => setMessage(''), 5000)
            setOriginalValues({
                assignedPlant: updatedTrailer.assignedPlant,
                assignedTractor: updatedTrailer.assignedTractor,
                cleanlinessRating: updatedTrailer.cleanlinessRating,
                status: updatedTrailer.status,
                trailerNumber: updatedTrailer.trailerNumber,
                trailerType: updatedTrailer.trailerType
            })
            setHasUnsavedChanges(false)
        } catch (error) {
            let errorMessage = 'Unknown error'

            if (error.message && typeof error.message === 'string') {
                if (error.message.includes('duplicate key') && error.message.includes('trailers_trailer_number_key')) {
                    errorMessage = `This trailer number already exists. Please use a different trailer number.`
                } else {
                    errorMessage = error.message
                }
            }

            alert(`Error saving changes: ${errorMessage}`)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (!trailer) return
        if (!showDeleteConfirmation) return setShowDeleteConfirmation(true)
        try {
            await supabase.from('trailers').delete().eq('id', trailer.id)
            alert('Trailer deleted successfully')
            onClose()
        } catch (error) {
            alert('Error deleting trailer')
        } finally {
            setShowDeleteConfirmation(false)
        }
    }

    async function handleBackClick() {
        if (hasUnsavedChanges) {
            await handleSave()
            setHasUnsavedChanges(false)
        }
        onClose()
    }

    function getTractorName(tractorId) {
        if (!tractorId || tractorId === '0') return 'None'
        const tractor = tractors.find((t) => t.id === tractorId)
        return tractor && tractor.truckNumber ? `Tractor #${tractor.truckNumber}` : 'Unknown'
    }

    function getPlantName(plantCode) {
        const plant = plants.find((p) => p.plantCode === plantCode)
        return plant ? plant.plantName : plantCode
    }

    async function fetchTractorsForModal() {
        try {
            let dbTractors = await TractorService.fetchTractors()
            if (lastUnassignedTractorId) {
                const unassignedTractor = dbTractors.find((t) => t.id === lastUnassignedTractorId)
                if (unassignedTractor) {
                    dbTractors = [...dbTractors, unassignedTractor]
                }
            }
            setTractorModalTractors(dbTractors)
        } catch (error) {
            console.error('Error fetching tractors for modal:', error)
        }
    }

    async function refreshTractors() {
        const updatedTractors = await TractorService.fetchTractors()
        setTractors(updatedTractors)
    }

    useEffect(() => {
        async function fetchCommentsAndIssues() {
            const id = trailer?.id || trailerId
            if (!id) return
            const { data: commentData } = await supabase
                .from('trailers_comments')
                .select('*')
                .eq('trailer_id', id)
                .order('created_at', { ascending: false })
            setComments(Array.isArray(commentData) ? commentData.filter((c) => c && (c.comment || c.text)) : [])
            const { data: issueData } = await supabase
                .from('trailers_maintenance')
                .select('*')
                .eq('trailer_id', id)
                .order('time_created', { ascending: false })
            setIssues(
                Array.isArray(issueData) ? issueData.filter((i) => i && (i.issue || i.title || i.description)) : []
            )
        }

        fetchCommentsAndIssues()
    }, [trailer, trailerId])

    function _handleExportEmail() {
        if (!trailer) return
        const hasComments = comments && comments.length > 0
        const openIssues = (issues || []).filter((issue) => !issue.time_completed)
        let summary = `Trailer Summary for Trailer #${trailer.trailerNumber || ''}

Basic Information
Trailer Number: ${trailer.trailerNumber || ''}
Assigned Plant: ${getPlantName(trailer.assignedPlant)}
Trailer Type: ${trailer.trailerType || ''}
Assigned Tractor: ${getTractorName(trailer.assignedTractor)}
Cleanliness Rating: ${trailer.cleanlinessRating || 'N/A'}

Comments
${
    hasComments
        ? comments
              .map(
                  (c) =>
                      `- ${c.author || 'Unknown'}: ${c.comment || c.text} (${new Date(c.created_at || c.createdAt).toLocaleString()})`
              )
              .join('\n')
        : 'No comments.'
}

Issues (${openIssues.length})
${
    openIssues.length > 0
        ? openIssues
              .map(
                  (i) =>
                      `- ${i.issue || i.title || i.description || ''} (${new Date(i.time_created || i.created_at).toLocaleString()})`
              )
              .join('\n')
        : 'No open issues.'
}
`
        const subject = encodeURIComponent(`Trailer Summary for Trailer #${trailer.trailerNumber || ''}`)
        const body = encodeURIComponent(summary)
        window.location.href = `mailto:?subject=${subject}&body=${body}`
    }

    if (isLoading) {
        return (
            <DetailViewSection
                title="Trailer Details"
                onClose={onClose}
                isLoading={true}
                loadingMessage="Loading trailer details..."
            />
        )
    }

    if (!trailer) {
        return (
            <DetailViewSection
                title="Trailer Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Trailer Not Found"
                notFoundDescription="Could not find the requested trailer. It may have been deleted."
            />
        )
    }

    return (
        <>
            {showComments && (
                <TrailerCommentModal
                    trailerId={trailer.id}
                    trailerNumber={trailer?.trailerNumber}
                    onClose={() => setShowComments(false)}
                />
            )}
            {showIssues && (
                <TrailerIssueModal
                    trailerId={trailer.id}
                    trailerNumber={trailer?.trailerNumber}
                    onClose={() => setShowIssues(false)}
                />
            )}
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => setShowPlantModal(false)}
                    plants={filteredPlants}
                    onSelect={setAssignedPlant}
                    searchPlaceholder="Search plants..."
                />
            )}
            {showTractorModal && (
                <TractorSelectModal
                    isOpen={showTractorModal}
                    onClose={() => setShowTractorModal(false)}
                    onSelect={async (tractorId) => {
                        const newTractor = tractorId === '0' ? '' : tractorId
                        setShowTractorModal(false)
                        if (newTractor !== assignedTractor) {
                            try {
                                const currentTrailerId = trailerId || trailer?.id
                                await handleSave({
                                    assignedTractor: newTractor
                                })
                                setAssignedTractor(newTractor)
                                setLastUnassignedTractorId(null)
                                await refreshTractors()
                                const updatedTrailer = await TrailerService.fetchTrailerById(currentTrailerId)
                                setTrailer(updatedTrailer)
                                setTrailerNumber(updatedTrailer.trailerNumber || '')
                                setAssignedPlant(updatedTrailer.assignedPlant || '')
                                setTrailerType(updatedTrailer.trailerType || '')
                                setCleanlinessRating(updatedTrailer.cleanlinessRating || 0)
                                setStatus(updatedTrailer.status || '')
                                setOriginalValues({
                                    assignedPlant: updatedTrailer.assignedPlant,
                                    assignedTractor: updatedTrailer.assignedTractor,
                                    cleanlinessRating: updatedTrailer.cleanlinessRating,
                                    status: updatedTrailer.status,
                                    trailerNumber: updatedTrailer.trailerNumber,
                                    trailerType: updatedTrailer.trailerType
                                })
                                setHasUnsavedChanges(false)
                                setMessage('Tractor assigned')
                                setTimeout(() => setMessage(''), 3000)
                            } catch (error) {
                                setMessage('Error assigning tractor. Please try again.')
                                setTimeout(() => setMessage(''), 3000)
                            }
                        }
                    }}
                    currentValue={assignedTractor}
                    trailers={trailers}
                    assignedPlant={assignedPlant}
                    readOnly={!canEditTrailer}
                    tractors={tractorModalTractors}
                    onRefresh={async () => {
                        await fetchTractorsForModal()
                    }}
                    trailerId={trailerId}
                />
            )}
            {showHistory && <TrailerHistoryView trailer={trailer} onClose={() => setShowHistory(false)} />}
            <DetailViewSection
                title={`Trailer #${trailer.trailerNumber || 'Not Assigned'}`}
                onClose={handleBackClick}
                isSaving={isSaving}
                message={message}
                itemAssignedPlant={trailer?.assignedPlant}
                onCanEditChange={(value) => {
                    setCanEditTrailer(value)
                }}
                isLoading={false}
                showDeleteConfirmation={showDeleteConfirmation}
                onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setShowDeleteConfirmation(false)}
                deleteTitle="Confirm Delete"
                deleteMessage={`Are you sure you want to delete Trailer #${trailer.trailerNumber}? This action cannot be undone.`}
                currentRegion={currentRegion}
                assetType="trailer"
                onRegionTransfer={handleRegionTransfer}
                headerActions={
                    <>
                        <button className="global-button-secondary" onClick={() => setShowIssues(true)}>
                            <i className="fas fa-tools"></i>
                            <span>Issues</span>
                        </button>
                        <button className="global-button-secondary" onClick={() => setShowComments(true)}>
                            <i className="fas fa-comments"></i>
                            <span>Comments</span>
                        </button>
                        <button className="global-button-secondary" onClick={() => setShowHistory(true)}>
                            <i className="fas fa-history"></i>
                            <span>History</span>
                        </button>
                    </>
                }
                footerActions={
                    <>
                        {canEditTrailer && (
                            <>
                                <button
                                    className="global-button-secondary"
                                    onClick={async () => {
                                        await handleSave()
                                        setHasUnsavedChanges(false)
                                    }}
                                    disabled={isSaving}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    <i className="fas fa-save"></i>
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                                {canDeleteTrailer && (
                                    <button
                                        className="global-button-secondary"
                                        onClick={() => setShowDeleteConfirmation(true)}
                                        disabled={isSaving}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                        <span>Delete</span>
                                    </button>
                                )}
                            </>
                        )}
                    </>
                }
            >
                <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-truck-loading">
                    <DetailViewSection.Card title="Trailer Details" icon="fas fa-info-circle">
                        <div className="form-group">
                            <label>Trailer Number</label>
                            <input
                                type="text"
                                value={trailerNumber}
                                onChange={(e) => setTrailerNumber(e.target.value)}
                                className="form-control"
                                readOnly={!canEditTrailer}
                            />
                        </div>
                        <div className="form-group">
                            <label>Trailer Type</label>
                            <select
                                value={trailerType}
                                onChange={(e) => setTrailerType(e.target.value)}
                                disabled={!canEditTrailer}
                                className="form-control"
                            >
                                <option value="">Select Trailer Type</option>
                                <option value="Cement">Cement</option>
                                <option value="End Dump">End Dump</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Assigned Plant</label>
                            <button
                                className="operator-select-button form-control"
                                onClick={() => canEditTrailer && setShowPlantModal(true)}
                                type="button"
                                disabled={!canEditTrailer}
                                style={
                                    !canEditTrailer
                                        ? {
                                              backgroundColor: 'var(--card-bg)',
                                              cursor: 'not-allowed',
                                              opacity: 0.8
                                          }
                                        : {}
                                }
                            >
                                <span
                                    style={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {plantDisplayText}
                                </span>
                            </button>
                        </div>
                        <div className="form-group">
                            <label>Active Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={!canEditTrailer}
                                className="form-control"
                            >
                                <option value="">Select Status</option>
                                <option value="Active" disabled={!assignedTractor}>
                                    Active{!assignedTractor ? ' (Cannot set without a tractor assigned)' : ''}
                                </option>
                                <option value="Spare">Spare</option>
                                <option value="In Shop">In Shop</option>
                                <option value="Retired">Retired</option>
                            </select>
                        </div>
                    </DetailViewSection.Card>

                    <DetailViewSection.Card title="Assignment" icon="fas fa-link">
                        <div className="form-group">
                            <label>Assigned Tractor</label>
                            <div className="operator-select-container">
                                <button
                                    className="operator-select-button form-control"
                                    onClick={async () => {
                                        if (canEditTrailer) {
                                            await fetchTractorsForModal()
                                            setShowTractorModal(true)
                                        }
                                    }}
                                    type="button"
                                    disabled={!canEditTrailer}
                                    style={!canEditTrailer ? { cursor: 'not-allowed', opacity: 0.8 } : {}}
                                >
                                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {assignedTractor ? getTractorName(assignedTractor) : 'None (Click to select)'}
                                    </span>
                                </button>
                                {canEditTrailer &&
                                    (assignedTractor ? (
                                        <button
                                            className="unassign-operator-button"
                                            title="Unassign Tractor"
                                            onClick={async () => {
                                                try {
                                                    const prevTractor = assignedTractor
                                                    const currentTrailerId = trailerId || trailer?.id
                                                    await handleSave({
                                                        assignedTractor: null,
                                                        prevAssignedTractor: prevTractor,
                                                        status: 'Spare'
                                                    })
                                                    const updatedTrailer =
                                                        await TrailerService.fetchTrailerById(currentTrailerId)
                                                    setTrailer(updatedTrailer)
                                                    setTrailerNumber(updatedTrailer.trailerNumber || '')
                                                    setAssignedPlant(updatedTrailer.assignedPlant || '')
                                                    setTrailerType(updatedTrailer.trailerType || '')
                                                    setCleanlinessRating(updatedTrailer.cleanlinessRating || 0)
                                                    setStatus(updatedTrailer.status || '')
                                                    setOriginalValues({
                                                        assignedPlant: updatedTrailer.assignedPlant,
                                                        assignedTractor: updatedTrailer.assignedTractor,
                                                        cleanlinessRating: updatedTrailer.cleanlinessRating,
                                                        status: updatedTrailer.status,
                                                        trailerNumber: updatedTrailer.trailerNumber,
                                                        trailerType: updatedTrailer.trailerType
                                                    })
                                                    setAssignedTractor(null)
                                                    setStatus('Spare')
                                                    setLastUnassignedTractorId(prevTractor)
                                                    await refreshTractors()
                                                    await fetchTractorsForModal()
                                                    setMessage('Tractor unassigned and status set to Spare')
                                                    setTimeout(() => setMessage(''), 3000)
                                                    if (showTractorModal) {
                                                        setShowTractorModal(false)
                                                        setTimeout(() => {
                                                            setShowTractorModal(true)
                                                        }, 0)
                                                    }
                                                    setHasUnsavedChanges(false)
                                                    setTimeout(() => setHasUnsavedChanges(false), 0)
                                                } catch {
                                                    setMessage('Error unassigning tractor. Please try again.')
                                                    setTimeout(() => setMessage(''), 3000)
                                                }
                                            }}
                                            type="button"
                                        >
                                            Unassign Tractor
                                        </button>
                                    ) : (
                                        lastUnassignedTractorId && (
                                            <button
                                                className="undo-operator-button unassign-operator-button"
                                                title="Undo Unassign"
                                                onClick={async () => {
                                                    try {
                                                        const currentTrailerId = trailerId || trailer?.id
                                                        await handleSave({
                                                            assignedTractor: lastUnassignedTractorId,
                                                            status: 'Active'
                                                        })
                                                        setAssignedTractor(lastUnassignedTractorId)
                                                        setStatus('Active')
                                                        setLastUnassignedTractorId(null)
                                                        await refreshTractors()
                                                        await fetchTractorsForModal()
                                                        const updatedTrailer =
                                                            await TrailerService.fetchTrailerById(currentTrailerId)
                                                        setTrailer(updatedTrailer)
                                                        setTrailerNumber(updatedTrailer.trailerNumber || '')
                                                        setAssignedPlant(updatedTrailer.assignedPlant || '')
                                                        setTrailerType(updatedTrailer.trailerType || '')
                                                        setCleanlinessRating(updatedTrailer.cleanlinessRating || 0)
                                                        setStatus(updatedTrailer.status || '')
                                                        setOriginalValues({
                                                            assignedPlant: updatedTrailer.assignedPlant,
                                                            assignedTractor: updatedTrailer.assignedTractor,
                                                            cleanlinessRating: updatedTrailer.cleanlinessRating,
                                                            status: updatedTrailer.status,
                                                            trailerNumber: updatedTrailer.trailerNumber,
                                                            trailerType: updatedTrailer.trailerType
                                                        })
                                                        setHasUnsavedChanges(false)
                                                        setMessage('Tractor re-assigned and status set to Active')
                                                        setTimeout(() => setMessage(''), 3000)
                                                    } catch (error) {
                                                        setMessage('Error undoing unassign. Please try again.')
                                                        setTimeout(() => setMessage(''), 3000)
                                                    }
                                                }}
                                                type="button"
                                            >
                                                Undo
                                            </button>
                                        )
                                    ))}
                            </div>
                        </div>
                    </DetailViewSection.Card>
                </DetailViewSection.Section>

                <DetailViewSection.Section id="maintenance" title="Maintenance" icon="fas fa-wrench">
                    <DetailViewSection.Card title="Cleanliness Rating" icon="fas fa-broom">
                        <div className="form-group">
                            <label>Cleanliness Rating</label>
                            <div className="cleanliness-rating-editor">
                                <div className="star-input">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-button ${star <= cleanlinessRating ? 'active' : ''} ${!canEditTrailer ? 'disabled' : ''}`}
                                            onClick={() =>
                                                canEditTrailer &&
                                                setCleanlinessRating(star === cleanlinessRating ? 0 : star)
                                            }
                                            aria-label={`Rate ${star} of 5 stars`}
                                            disabled={!canEditTrailer}
                                        >
                                            <i
                                                className={`fas fa-star ${star <= cleanlinessRating ? 'filled' : ''}`}
                                                style={star <= cleanlinessRating ? { color: '#f59e0b' } : {}}
                                            ></i>
                                        </button>
                                    ))}
                                </div>
                                {cleanlinessRating > 0 && (
                                    <div className="rating-value-display">
                                        <span className="rating-label">
                                            {
                                                [null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][
                                                    cleanlinessRating
                                                ]
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
            </DetailViewSection>
        </>
    )
}

export default TrailerDetailView
