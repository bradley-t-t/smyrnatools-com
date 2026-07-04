import React, { useState } from 'react'

import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import TractorBasicInfoSection from '../../../app/components/tractor/TractorBasicInfoSection'
import { TractorInlineModals, TractorOverlayModals } from '../../../app/components/tractor/TractorDetailModals'
import TractorMaintenanceSection from '../../../app/components/tractor/TractorMaintenanceSection'
import TractorVerificationSection from '../../../app/components/tractor/TractorVerificationSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import useTractorDetail from '../../../app/hooks/useTractorDetail'
import useTractorDetailActions from '../../../app/hooks/useTractorDetailActions'
import { OperatorService } from '../../../services/OperatorService'

/**
 * Full detail/edit view for a single tractor. Composes data + action hooks
 * with section sub-components and the modal hosts. All cross-cutting state
 * (modal visibility, operator-modal list, last-unassigned id) lives here so
 * the extracted pieces stay stateless and reusable.
 *
 * @param {string} tractorId - ID of the tractor record to display.
 * @param {Function} onClose - Callback to return to the list view.
 */
function TractorDetailView({ tractorId, onClose }) {
    const { preferences } = usePreferences()
    const state = useTractorDetail(tractorId, preferences)
    const actions = useTractorDetailActions(state, tractorId, onClose)

    const [showHistory, setShowHistory] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [showIssues, setShowIssues] = useState(false)
    const [showOperatorModal, setShowOperatorModal] = useState(false)
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [operatorModalOperators, setOperatorModalOperators] = useState([])
    const [lastUnassignedOperatorId, setLastUnassignedOperatorId] = useState(null)

    if (state.isLoading) return null
    if (!state.tractor) {
        return (
            <DetailViewSection
                title="Tractor Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Tractor Not Found"
                notFoundDescription="Could not find the requested tractor. It may have been deleted."
            />
        )
    }

    async function fetchOperatorsForModal() {
        let dbOperators = await OperatorService.fetchOperators()
        if (lastUnassignedOperatorId) {
            const unassignedOperator = dbOperators.find((op) => op.employeeId === lastUnassignedOperatorId)
            if (unassignedOperator) dbOperators = [...dbOperators, unassignedOperator]
        }
        setOperatorModalOperators(dbOperators)
    }

    async function refreshOperators() {
        state.setOperators(await OperatorService.fetchOperators())
    }

    const selectedPlantObj = state.plants.find((p) => (p.plantCode || p.plant_code) === state.assignedPlant)
    const plantDisplayText = state.assignedPlant
        ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code || state.assignedPlant}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name || ''}`
        : 'Select Plant'

    return (
        <>
            <TractorOverlayModals
                filteredPlants={state.filteredPlants}
                setAssignedPlant={state.setAssignedPlant}
                setShowComments={setShowComments}
                setShowHistory={setShowHistory}
                setShowIssues={setShowIssues}
                setShowPlantModal={setShowPlantModal}
                showComments={showComments}
                showHistory={showHistory}
                showIssues={showIssues}
                showPlantModal={showPlantModal}
                tractor={state.tractor}
                tractorId={tractorId}
            />
            <DetailViewSection
                title={`Truck #${state.tractor.truckNumber || 'Not Assigned'}`}
                onClose={actions.handleBackClick}
                isSaving={actions.isSaving}
                message={actions.message}
                itemAssignedPlant={state.tractor?.assignedPlant}
                onCanEditChange={actions.setCanEditTractor}
                isLoading={false}
                showDeleteConfirmation={actions.showDeleteConfirmation}
                onDeleteConfirm={actions.handleDelete}
                onDeleteCancel={() => actions.setShowDeleteConfirmation(false)}
                deleteTitle="Confirm Delete"
                deleteMessage={`Are you sure you want to delete Truck #${state.tractor.truckNumber}? This action cannot be undone.`}
                currentRegion={state.currentRegion}
                assetType="tractor"
                onRegionTransfer={actions.handleRegionTransfer}
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
                    actions.canEditTractor && (
                        <>
                            <button type="button"
                                className="global-button-secondary flex-1 justify-center"
                                onClick={actions.handleSave}
                                disabled={actions.isSaving}
                            >
                                <i className="fas fa-save"></i>
                                <span>{actions.isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {actions.canDeleteTractor && (
                                <button type="button"
                                    className="global-button-secondary flex-1 justify-center"
                                    onClick={() => actions.setShowDeleteConfirmation(true)}
                                    disabled={actions.isSaving}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    )
                }
                modals={
                    <TractorInlineModals
                        assignedOperator={state.assignedOperator}
                        assignedPlant={state.assignedPlant}
                        canEditTractor={actions.canEditTractor}
                        fetchOperatorsForModal={fetchOperatorsForModal}
                        handleSave={actions.handleSave}
                        handleSaveMissingFields={actions.handleSaveMissingFields}
                        hours={state.hours}
                        lastServiceDate={state.lastServiceDate}
                        make={state.make}
                        missingFields={actions.missingFields}
                        model={state.model}
                        operatorModalOperators={operatorModalOperators}
                        refreshOperators={refreshOperators}
                        setAssignedOperator={state.setAssignedOperator}
                        setHasUnsavedChanges={state.setHasUnsavedChanges}
                        setHours={state.setHours}
                        setLastServiceDate={state.setLastServiceDate}
                        setLastUnassignedOperatorId={setLastUnassignedOperatorId}
                        setMake={state.setMake}
                        setMessage={actions.setMessage}
                        setModel={state.setModel}
                        setShowMissingFieldsModal={actions.setShowMissingFieldsModal}
                        setShowOperatorModal={setShowOperatorModal}
                        setStatus={state.setStatus}
                        setTractor={state.setTractor}
                        setVin={state.setVin}
                        setYear={state.setYear}
                        showMissingFieldsModal={actions.showMissingFieldsModal}
                        showOperatorModal={showOperatorModal}
                        status={state.status}
                        tractor={state.tractor}
                        tractorId={tractorId}
                        tractors={state.tractors}
                        vin={state.vin}
                        year={state.year}
                    />
                }
            >
                <TractorBasicInfoSection
                    assignedOperator={state.assignedOperator}
                    canEditTractor={actions.canEditTractor}
                    fetchOperatorsForModal={fetchOperatorsForModal}
                    freight={state.freight}
                    getOperatorName={actions.getOperatorName}
                    handleSave={actions.handleSave}
                    lastUnassignedOperatorId={lastUnassignedOperatorId}
                    make={state.make}
                    model={state.model}
                    operators={state.operators}
                    originalValues={state.originalValues}
                    plantDisplayText={plantDisplayText}
                    refreshOperators={refreshOperators}
                    setAssignedOperator={state.setAssignedOperator}
                    setFreight={state.setFreight}
                    setLastUnassignedOperatorId={setLastUnassignedOperatorId}
                    setMake={state.setMake}
                    setMessage={actions.setMessage}
                    setModel={state.setModel}
                    setShowOperatorModal={setShowOperatorModal}
                    setShowPlantModal={setShowPlantModal}
                    setStatus={state.setStatus}
                    setTractor={state.setTractor}
                    setTruckNumber={state.setTruckNumber}
                    setVin={state.setVin}
                    setYear={state.setYear}
                    showOperatorModal={showOperatorModal}
                    status={state.status}
                    tractorId={tractorId}
                    truckNumber={state.truckNumber}
                    vin={state.vin}
                    year={state.year}
                />
                <TractorMaintenanceSection
                    canEditTractor={actions.canEditTractor}
                    cleanlinessRating={state.cleanlinessRating}
                    hasBlower={state.hasBlower}
                    hours={state.hours}
                    lastServiceDate={state.lastServiceDate}
                    setCleanlinessRating={state.setCleanlinessRating}
                    setHasBlower={state.setHasBlower}
                    setHours={state.setHours}
                    setLastServiceDate={state.setLastServiceDate}
                />
                <TractorVerificationSection
                    canEditTractor={actions.canEditTractor}
                    handleVerifyTractor={actions.handleVerifyTractor}
                    tractor={state.tractor}
                    tractorId={tractorId}
                    updatedByEmail={state.updatedByEmail}
                />
            </DetailViewSection>
        </>
    )
}

export default TractorDetailView
