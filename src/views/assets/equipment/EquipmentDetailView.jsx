import React, { useState } from 'react'

import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import useEquipmentDetail from '../../../app/hooks/useEquipmentDetail'
import useEquipmentDetailActions from '../../../app/hooks/useEquipmentDetailActions'
import EquipmentBasicInfoSection from './detail/EquipmentBasicInfoSection'
import EquipmentDetailModals from './detail/EquipmentDetailModals'
import EquipmentMaintenanceSection from './detail/EquipmentMaintenanceSection'
import EquipmentVerificationSection from './detail/EquipmentVerificationSection'

/**
 * Full detail/edit view for a single equipment record. Handles loading,
 * saving, verification, deletion, region transfer, and unsaved-change
 * protection. Renders sub-modals for comments, issues, history, plant
 * selection, and verification requirements.
 *
 * @param {string} equipmentId - ID of the equipment record to display.
 * @param {Function} onClose - Callback to return to the list view.
 * @param {Function} [onSaved] - Optional callback fired after a successful save/verify with the updated record.
 */
function EquipmentDetailView({ equipmentId, onClose, onSaved }) {
    const { preferences } = usePreferences()
    const state = useEquipmentDetail(equipmentId, preferences)
    const actions = useEquipmentDetailActions(state, equipmentId, onClose, onSaved)

    const [showComments, setShowComments] = useState(false)
    const [showIssues, setShowIssues] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showPlantModal, setShowPlantModal] = useState(false)

    if (state.isLoading) return null

    if (!state.equipment) {
        return (
            <DetailViewSection
                title="Equipment Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Equipment Not Found"
                notFoundDescription="Could not find the requested equipment. It may have been deleted."
            />
        )
    }

    const selectedPlantObj = state.plants.find((p) => (p.plantCode || p.plant_code) === state.assignedPlant)
    const plantDisplayText = state.assignedPlant
        ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code || state.assignedPlant}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name || ''}`
        : 'Select Plant'

    return (
        <>
            <EquipmentDetailModals
                equipment={state.equipment}
                equipmentId={equipmentId}
                filteredPlants={state.filteredPlants}
                handleSaveAndVerify={actions.handleSaveAndVerify}
                lastServiceDate={state.lastServiceDate}
                make={state.make}
                missingFields={actions.missingFields}
                model={state.model}
                setAssignedPlant={state.setAssignedPlant}
                setLastServiceDate={state.setLastServiceDate}
                setMake={state.setMake}
                setModel={state.setModel}
                setShowComments={setShowComments}
                setShowHistory={setShowHistory}
                setShowIssues={setShowIssues}
                setShowMissingFieldsModal={actions.setShowMissingFieldsModal}
                setShowPlantModal={setShowPlantModal}
                setYear={state.setYear}
                showComments={showComments}
                showHistory={showHistory}
                showIssues={showIssues}
                showMissingFieldsModal={actions.showMissingFieldsModal}
                showPlantModal={showPlantModal}
                status={state.status}
                year={state.year}
            />
            <DetailViewSection
                title={`${state.equipment.equipmentType} #${state.equipment.identifyingNumber || 'Not Assigned'}`}
                onClose={actions.handleBackClick}
                isSaving={actions.isSaving}
                message={state.message}
                canEdit={actions.canEditEquipment}
                isLoading={false}
                showDeleteConfirmation={actions.showDeleteConfirmation}
                onDeleteConfirm={actions.handleDelete}
                onDeleteCancel={() => actions.setShowDeleteConfirmation(false)}
                deleteTitle="Confirm Delete"
                deleteMessage={`Are you sure you want to delete ${state.equipment.equipmentType} #${state.equipment.identifyingNumber}? This action cannot be undone.`}
                itemAssignedPlant={state.assignedPlant}
                onCanEditChange={actions.setCanEditEquipment}
                currentRegion={state.currentRegion}
                assetType="equipment"
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
                    actions.canEditEquipment && (
                        <>
                            <button type="button"
                                className="global-button-secondary flex-1 justify-center"
                                onClick={() => actions.handleSave()}
                                disabled={actions.isSaving}
                            >
                                <i className="fas fa-save"></i>
                                <span>{actions.isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {actions.canDeleteEquipment && (
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
            >
                <EquipmentBasicInfoSection
                    canEditEquipment={actions.canEditEquipment}
                    equipmentType={state.equipmentType}
                    identifyingNumber={state.identifyingNumber}
                    make={state.make}
                    model={state.model}
                    plantDisplayText={plantDisplayText}
                    setEquipmentType={state.setEquipmentType}
                    setIdentifyingNumber={state.setIdentifyingNumber}
                    setMake={state.setMake}
                    setModel={state.setModel}
                    setShowPlantModal={setShowPlantModal}
                    setStatus={state.setStatus}
                    setYear={state.setYear}
                    status={state.status}
                    year={state.year}
                />
                <EquipmentMaintenanceSection
                    canEditEquipment={actions.canEditEquipment}
                    cleanlinessRating={state.cleanlinessRating}
                    conditionRating={state.conditionRating}
                    hours={state.hours}
                    hoursMileage={state.hoursMileage}
                    lastServiceDate={state.lastServiceDate}
                    setCleanlinessRating={state.setCleanlinessRating}
                    setConditionRating={state.setConditionRating}
                    setHours={state.setHours}
                    setHoursMileage={state.setHoursMileage}
                    setLastServiceDate={state.setLastServiceDate}
                />
                <EquipmentVerificationSection
                    canEditEquipment={actions.canEditEquipment}
                    equipment={state.equipment}
                    equipmentId={equipmentId}
                    handleVerifyEquipment={actions.handleVerifyEquipment}
                    updatedByEmail={state.updatedByEmail}
                />
            </DetailViewSection>
        </>
    )
}

export default EquipmentDetailView
