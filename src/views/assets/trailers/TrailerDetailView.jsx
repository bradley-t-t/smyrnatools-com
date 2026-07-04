import React, { useEffect, useState } from 'react'

import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import {
    loadInitialTrailerDetailData,
    useBeforeUnloadGuard,
    useCanDeleteTrailer,
    useCurrentRegionForTrailer,
    useFilteredPlants,
    useRegionPlantCodes,
    useTrailerCommentsAndIssues
} from '../../../app/hooks/useTrailerDetailData'
import { PlantService } from '../../../services/PlantService'
import { TractorService } from '../../../services/TractorService'
import { TrailerService } from '../../../services/TrailerService'
import { UserService } from '../../../services/UserService'
import TrailerAssignmentCard from './detail/TrailerAssignmentCard'
import TrailerBasicInfoCard from './detail/TrailerBasicInfoCard'
import TrailerCleanlinessCard from './detail/TrailerCleanlinessCard'
import { getTractorName } from './detail/trailerDetailHelpers'
import TrailerDetailModals from './detail/TrailerDetailModals'
import { applyTrailerToFormState, saveTrailerWithOverrides } from './detail/trailerStateHelpers'

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
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [status, setStatus] = useState(trailer?.status || '')

    const regionPlantCodes = useRegionPlantCodes(preferences.selectedRegion?.code)
    const filteredPlants = useFilteredPlants(plants, regionPlantCodes)
    const canDeleteTrailer = useCanDeleteTrailer()
    const currentRegion = useCurrentRegionForTrailer(trailer?.assignedPlant)
    useTrailerCommentsAndIssues(trailer, trailerId)
    useBeforeUnloadGuard(hasUnsavedChanges)

    const formStateSetters = {
        setAssignedPlant,
        setAssignedTractor,
        setCleanlinessRating,
        setOriginalValues,
        setStatus,
        setTrailer,
        setTrailerNumber,
        setTrailerType
    }

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true)
            try {
                const { allTrailers, plantsData, tractorsData, trailerData } = await loadInitialTrailerDetailData(
                    initialTrailer,
                    trailerId
                )
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

    async function handleRegionTransfer(newRegionCode, newPlantCode) {
        if (!trailer?.id || !newRegionCode || !newPlantCode) {
            throw new Error('Invalid trailer, region, or plant')
        }
        const newRegion = await PlantService.fetchRegionByCode(newRegionCode)
        if (!newRegion) {
            throw new Error('Target region not found')
        }
        setIsSaving(true)
        setMessage('')
        try {
            const userObj = await UserService.getCurrentUser()
            const userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
            const updatedTrailer = { ...trailer, assignedPlant: newPlantCode }
            const result = await TrailerService.updateTrailer(trailer.id, updatedTrailer, userId, trailer)
            setTrailer(result)
            setAssignedPlant(newPlantCode)
            setOriginalValues({ ...originalValues, assignedPlant: newPlantCode })
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
        await saveTrailerWithOverrides({
            current: {
                assignedPlant,
                assignedTractor,
                cleanlinessRating,
                originalStatus: originalValues.status,
                status,
                trailerNumber,
                trailerType
            },
            deps: { setHasUnsavedChanges, setIsSaving, setMessage },
            overrideValues,
            setters: formStateSetters,
            trailer
        })
    }

    async function handleDelete() {
        if (!trailer) return
        if (!showDeleteConfirmation) return setShowDeleteConfirmation(true)
        try {
            await TrailerService.deleteTrailer(trailer.id)
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

    async function handleTractorSelect(tractorId) {
        const newTractor = tractorId === '0' ? '' : tractorId
        setShowTractorModal(false)
        if (newTractor === assignedTractor) return
        try {
            const currentTrailerId = trailerId || trailer?.id
            await handleSave({ assignedTractor: newTractor })
            setAssignedTractor(newTractor)
            setLastUnassignedTractorId(null)
            await refreshTractors()
            const updatedTrailer = await TrailerService.fetchTrailerById(currentTrailerId)
            applyTrailerToFormState(updatedTrailer, formStateSetters)
            setHasUnsavedChanges(false)
            setMessage('Tractor assigned')
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            setMessage('Error assigning tractor. Please try again.')
            setTimeout(() => setMessage(''), 3000)
        }
    }

    async function handleUnassignTractor() {
        try {
            const prevTractor = assignedTractor
            const currentTrailerId = trailerId || trailer?.id
            await handleSave({ assignedTractor: null, prevAssignedTractor: prevTractor, status: 'Spare' })
            const updatedTrailer = await TrailerService.fetchTrailerById(currentTrailerId)
            applyTrailerToFormState(updatedTrailer, formStateSetters)
            setAssignedTractor(null)
            setStatus('Spare')
            setLastUnassignedTractorId(prevTractor)
            await refreshTractors()
            await fetchTractorsForModal()
            setMessage('Tractor unassigned and status set to Spare')
            setTimeout(() => setMessage(''), 3000)
            if (showTractorModal) {
                setShowTractorModal(false)
                setTimeout(() => setShowTractorModal(true), 0)
            }
            setHasUnsavedChanges(false)
            setTimeout(() => setHasUnsavedChanges(false), 0)
        } catch {
            setMessage('Error unassigning tractor. Please try again.')
            setTimeout(() => setMessage(''), 3000)
        }
    }

    async function handleUndoUnassign() {
        try {
            const currentTrailerId = trailerId || trailer?.id
            await handleSave({ assignedTractor: lastUnassignedTractorId, status: 'Active' })
            setAssignedTractor(lastUnassignedTractorId)
            setStatus('Active')
            setLastUnassignedTractorId(null)
            await refreshTractors()
            await fetchTractorsForModal()
            const updatedTrailer = await TrailerService.fetchTrailerById(currentTrailerId)
            applyTrailerToFormState(updatedTrailer, formStateSetters)
            setHasUnsavedChanges(false)
            setMessage('Tractor re-assigned and status set to Active')
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            setMessage('Error undoing unassign. Please try again.')
            setTimeout(() => setMessage(''), 3000)
        }
    }

    async function handleOpenTractorModal() {
        if (!canEditTrailer) return
        await fetchTractorsForModal()
        setShowTractorModal(true)
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
            <TrailerDetailModals
                trailer={trailer}
                trailerId={trailerId}
                showComments={showComments}
                onCloseComments={() => setShowComments(false)}
                showIssues={showIssues}
                onCloseIssues={() => setShowIssues(false)}
                showPlantModal={showPlantModal}
                onClosePlantModal={() => setShowPlantModal(false)}
                filteredPlants={filteredPlants}
                onSelectPlant={setAssignedPlant}
                showTractorModal={showTractorModal}
                onCloseTractorModal={() => setShowTractorModal(false)}
                onSelectTractor={handleTractorSelect}
                assignedTractor={assignedTractor}
                assignedPlant={assignedPlant}
                trailers={trailers}
                canEditTrailer={canEditTrailer}
                tractorModalTractors={tractorModalTractors}
                onRefreshTractorModal={fetchTractorsForModal}
                showHistory={showHistory}
                onCloseHistory={() => setShowHistory(false)}
            />
            <DetailViewSection
                title={`Trailer #${trailer.trailerNumber || 'Not Assigned'}`}
                onClose={handleBackClick}
                isSaving={isSaving}
                message={message}
                itemAssignedPlant={trailer?.assignedPlant}
                onCanEditChange={setCanEditTrailer}
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
                        <button type="button" className="global-button-secondary" onClick={() => setShowIssues(true)}>
                            <i className="fas fa-tools"></i>
                            <span>Issues</span>
                        </button>
                        <button type="button" className="global-button-secondary" onClick={() => setShowComments(true)}>
                            <i className="fas fa-comments"></i>
                            <span>Comments</span>
                        </button>
                        <button type="button" className="global-button-secondary" onClick={() => setShowHistory(true)}>
                            <i className="fas fa-history"></i>
                            <span>History</span>
                        </button>
                    </>
                }
                footerActions={
                    canEditTrailer && (
                        <>
                            <button type="button"
                                className="global-button-secondary flex-1 justify-center"
                                onClick={async () => {
                                    await handleSave()
                                    setHasUnsavedChanges(false)
                                }}
                                disabled={isSaving}
                            >
                                <i className="fas fa-save"></i>
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {canDeleteTrailer && (
                                <button type="button"
                                    className="global-button-secondary flex-1 justify-center"
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={isSaving}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    )
                }
            >
                <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-truck-loading">
                    <TrailerBasicInfoCard
                        trailerNumber={trailerNumber}
                        onTrailerNumberChange={setTrailerNumber}
                        trailerType={trailerType}
                        onTrailerTypeChange={setTrailerType}
                        canEditTrailer={canEditTrailer}
                        plantDisplayText={plantDisplayText}
                        onOpenPlantModal={() => setShowPlantModal(true)}
                        status={status}
                        onStatusChange={setStatus}
                        assignedTractor={assignedTractor}
                    />
                    <TrailerAssignmentCard
                        canEditTrailer={canEditTrailer}
                        assignedTractor={assignedTractor}
                        tractorDisplayText={
                            assignedTractor ? getTractorName(assignedTractor, tractors) : 'None (Click to select)'
                        }
                        onOpenTractorModal={handleOpenTractorModal}
                        onUnassignTractor={handleUnassignTractor}
                        lastUnassignedTractorId={lastUnassignedTractorId}
                        onUndoUnassign={handleUndoUnassign}
                    />
                </DetailViewSection.Section>
                <DetailViewSection.Section id="maintenance" title="Maintenance" icon="fas fa-wrench">
                    <TrailerCleanlinessCard
                        cleanlinessRating={cleanlinessRating}
                        onCleanlinessRatingChange={setCleanlinessRating}
                        canEditTrailer={canEditTrailer}
                    />
                </DetailViewSection.Section>
            </DetailViewSection>
        </>
    )
}
export default TrailerDetailView
