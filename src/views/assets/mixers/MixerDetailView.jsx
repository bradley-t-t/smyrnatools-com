import React, { useCallback, useMemo } from 'react'

import { buildMixerVerificationItems } from '../../../app/components/mixer/buildMixerVerificationItems'
import MixerAssignmentCard from '../../../app/components/mixer/MixerAssignmentCard'
import MixerCleanlinessRatingCard from '../../../app/components/mixer/MixerCleanlinessRatingCard'
import MixerDetailModals from '../../../app/components/mixer/MixerDetailModals'
import { MixerDetailFooterActions, MixerDetailHeaderActions } from '../../../app/components/mixer/MixerDetailToolbar'
import MixerServiceInfoCard from '../../../app/components/mixer/MixerServiceInfoCard'
import MixerTruckDetailsCard from '../../../app/components/mixer/MixerTruckDetailsCard'
import MixerVehicleInfoCard from '../../../app/components/mixer/MixerVehicleInfoCard'
import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import VerificationCardSection from '../../../app/components/sections/VerificationCardSection'
import { MIXER_CLEANLINESS_MIN_FOR_ACTIVE } from '../../../app/constants/mixerDetailConstants'
import useMixerDetailActions from '../../../app/hooks/useMixerDetailActions'
import useMixerDetailData from '../../../app/hooks/useMixerDetailData'
import useMixerDetailEditState from '../../../app/hooks/useMixerDetailEditState'
import useMixerDetailModalsState from '../../../app/hooks/useMixerDetailModalsState'
import useMixerOperatorsModal from '../../../app/hooks/useMixerOperatorsModal'
import { Mixer } from '../../../app/models/mixers/Mixer'
import { MixerService } from '../../../services/MixerService'

/**
 * Full detail/edit view for a single mixer record. Handles loading, saving,
 * verification (with missing-field modal), deletion, operator assignment/
 * unassignment, region-scoped plant transfer, In Shop sub-status tracking,
 * and sub-modals for comments, issues, and history.
 *
 * @param {string} mixerId - ID of the mixer record to display.
 * @param {Function} onClose - Callback to return to the list view.
 */
function MixerDetailView({ mixerId, onClose }) {
    const data = useMixerDetailData(mixerId)
    const editState = useMixerDetailEditState(data.initialMixer, data.isLoading)
    const modals = useMixerDetailModalsState()
    const operatorsState = useMixerOperatorsModal({ operators: data.operators, setOperators: data.setOperators })

    const [canEditMixer, setCanEditMixer] = React.useState(false)

    const actions = useMixerDetailActions({
        editState,
        mixer: data.mixer,
        mixerId,
        onClose,
        operatorsState,
        setMessage: modals.setMessage,
        setMissingFields: modals.setMissingFields,
        setMixer: data.setMixer,
        setShowDeleteConfirmation: modals.setShowDeleteConfirmation,
        setShowMissingFieldsModal: modals.setShowMissingFieldsModal,
        setShowOperatorModal: modals.setShowOperatorModal,
        setUpdatedByEmail: data.setUpdatedByEmail,
        showOperatorModal: modals.showOperatorModal
    })

    const isCleanlinessBlocking =
        editState.cleanlinessRating > 0 && editState.cleanlinessRating < MIXER_CLEANLINESS_MIN_FOR_ACTIVE

    const plantDisplayText = useMemo(
        () => buildPlantDisplayText(data.plants, editState.assignedPlant),
        [data.plants, editState.assignedPlant]
    )

    const verificationItems = useMemo(
        () => (data.mixer ? buildMixerVerificationItems(data.mixer, data.updatedByEmail) : []),
        [data.mixer, data.updatedByEmail]
    )

    const handleOpenOperatorModal = useCallback(async () => {
        if (!canEditMixer || isCleanlinessBlocking) return
        await operatorsState.fetchOperatorsForModal()
        modals.setShowOperatorModal(true)
    }, [canEditMixer, isCleanlinessBlocking, modals, operatorsState])

    const handleStatusChangeWithRefetch = useCallback(
        (newStatus) => actions.handleStatusChange(newStatus, () => MixerService.fetchMixerById(mixerId)),
        [actions, mixerId]
    )

    if (data.isLoading) return null
    if (!data.mixer) {
        return (
            <DetailViewSection
                title="Mixer Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Mixer Not Found"
                notFoundDescription="Could not find the requested mixer. It may have been deleted."
            />
        )
    }

    return (
        <DetailViewSection
            title={`Truck #${data.mixer.truckNumber || 'Not Assigned'}`}
            onClose={actions.handleBackClick}
            isSaving={actions.isSaving}
            message={modals.message}
            itemAssignedPlant={data.mixer?.assignedPlant}
            onCanEditChange={setCanEditMixer}
            isLoading={false}
            showDeleteConfirmation={modals.showDeleteConfirmation}
            onDeleteConfirm={actions.handleDelete}
            onDeleteCancel={() => modals.setShowDeleteConfirmation(false)}
            deleteTitle="Confirm Delete"
            deleteMessage={`Are you sure you want to delete Truck #${data.mixer.truckNumber}? This action cannot be undone.`}
            currentRegion={data.currentRegion}
            assetType="mixer"
            onRegionTransfer={actions.handleRegionTransfer}
            headerActions={
                <MixerDetailHeaderActions
                    onOpenComments={() => modals.setShowComments(true)}
                    onOpenHistory={() => modals.setShowHistory(true)}
                    onOpenIssues={() => modals.setShowIssues(true)}
                />
            }
            footerActions={
                canEditMixer && (
                    <MixerDetailFooterActions
                        canDeleteMixer={data.canDeleteMixer}
                        isSaving={actions.isSaving}
                        onDelete={() => modals.setShowDeleteConfirmation(true)}
                        onSave={actions.handleSave}
                    />
                )
            }
            modals={
                <MixerDetailModals
                    assignedOperator={editState.assignedOperator}
                    assignedPlant={editState.assignedPlant}
                    canEditMixer={canEditMixer}
                    editState={editState}
                    filteredPlants={data.filteredPlants}
                    mixer={data.mixer}
                    mixerId={mixerId}
                    mixers={data.mixers}
                    missingFields={modals.missingFields}
                    onCloseComments={() => modals.setShowComments(false)}
                    onCloseHistory={() => modals.setShowHistory(false)}
                    onCloseIssues={() => modals.setShowIssues(false)}
                    onCloseMissingFieldsModal={() => modals.setShowMissingFieldsModal(false)}
                    onClosePlantModal={() => modals.setShowPlantModal(false)}
                    onCloseOperatorModal={() => modals.setShowOperatorModal(false)}
                    onFetchOperatorsForModal={operatorsState.fetchOperatorsForModal}
                    onOperatorAssign={actions.handleOperatorAssign}
                    onSaveMissingFields={actions.handleSaveMissingFields}
                    onSelectPlant={editState.setAssignedPlant}
                    operatorModalOperators={operatorsState.operatorModalOperators}
                    showComments={modals.showComments}
                    showHistory={modals.showHistory}
                    showIssues={modals.showIssues}
                    showMissingFieldsModal={modals.showMissingFieldsModal}
                    showOperatorModal={modals.showOperatorModal}
                    showPlantModal={modals.showPlantModal}
                />
            }
        >
            <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-truck">
                <MixerTruckDetailsCard
                    canEditMixer={canEditMixer}
                    isCleanlinessBlocking={isCleanlinessBlocking}
                    onStatusChange={handleStatusChangeWithRefetch}
                    onTruckNumberChange={editState.setTruckNumber}
                    setShopStatus={editState.setShopStatus}
                    shopStatus={editState.shopStatus}
                    status={editState.status}
                    truckNumber={editState.truckNumber}
                />
                <MixerAssignmentCard
                    assignedOperator={editState.assignedOperator}
                    canEditMixer={canEditMixer}
                    getOperatorName={actions.getOperatorName}
                    isCleanlinessBlocking={isCleanlinessBlocking}
                    lastUnassignedOperatorId={operatorsState.lastUnassignedOperatorId}
                    onOpenOperatorModal={handleOpenOperatorModal}
                    onOpenPlantModal={() => modals.setShowPlantModal(true)}
                    onUndoUnassignOperator={actions.handleOperatorUndoUnassign}
                    onUnassignOperator={actions.handleOperatorUnassign}
                    plantDisplayText={plantDisplayText}
                />
                <MixerVehicleInfoCard
                    canEditMixer={canEditMixer}
                    make={editState.make}
                    model={editState.model}
                    setMake={editState.setMake}
                    setModel={editState.setModel}
                    setVin={editState.setVin}
                    setYear={editState.setYear}
                    vin={editState.vin}
                    year={editState.year}
                />
            </DetailViewSection.Section>
            <DetailViewSection.Section id="maintenance" title="Maintenance" icon="fas fa-wrench">
                <MixerServiceInfoCard
                    canEditMixer={canEditMixer}
                    hours={editState.hours}
                    lastChipDate={editState.lastChipDate}
                    lastServiceDate={editState.lastServiceDate}
                    setHours={editState.setHours}
                    setLastChipDate={editState.setLastChipDate}
                    setLastServiceDate={editState.setLastServiceDate}
                />
                <MixerCleanlinessRatingCard
                    canEditMixer={canEditMixer}
                    cleanlinessRating={editState.cleanlinessRating}
                    setCleanlinessRating={editState.setCleanlinessRating}
                />
            </DetailViewSection.Section>
            <DetailViewSection.Section id="verification" title="Verification" icon="fas fa-clipboard-check">
                <DetailViewSection.Card>
                    <VerificationCardSection
                        isVerified={Mixer.ensureInstance(data.mixer).isVerified()}
                        verificationLabel={
                            !data.mixer.updatedLast || !data.mixer.updatedBy
                                ? 'Needs Verification'
                                : 'Verification Outdated'
                        }
                        verificationItems={verificationItems}
                        onVerify={actions.handleVerifyMixer}
                        canEdit={canEditMixer}
                        lastVerifiedDate={data.mixer.updatedLast}
                        lastChangedDate={data.mixer.updatedAt}
                        assetId={mixerId}
                        assetType="mixer"
                    />
                </DetailViewSection.Card>
            </DetailViewSection.Section>
        </DetailViewSection>
    )
}

function buildPlantDisplayText(plants, assignedPlant) {
    if (!assignedPlant) return 'Select Plant'
    const selected = plants.find((p) => (p.plantCode || p.plant_code) === assignedPlant)
    const code = selected?.plantCode || selected?.plant_code || assignedPlant
    const name = selected?.plantName || selected?.plant_name || ''
    return `(${code}) ${name}`
}

export default MixerDetailView
