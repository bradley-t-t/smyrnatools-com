import React from 'react'

import { MixerService } from '../../../services/MixerService'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import OperatorSelectModal from '../../../views/assets/mixers/OperatorSelectModal'
import PlantDropdownModal from '../common/PlantDropdownModal'
import VerificationRequirementsModal from '../common/VerificationRequirementsModal'
import CommentModalSection from '../sections/CommentModalSection'
import HistoryViewSection from '../sections/HistoryViewSection'
import IssueModalSection from '../sections/IssueModalSection'

/**
 * Renders every sibling/overlay modal for the mixer detail view. Keeps the
 * orchestrator's JSX focused on the form itself.
 */
export default function MixerDetailModals({
    assignedOperator,
    assignedPlant,
    canEditMixer,
    editState,
    filteredPlants,
    mixer,
    mixerId,
    mixers,
    missingFields,
    onCloseComments,
    onCloseHistory,
    onCloseIssues,
    onCloseMissingFieldsModal,
    onClosePlantModal,
    onCloseOperatorModal,
    onFetchOperatorsForModal,
    onOperatorAssign,
    onSaveMissingFields,
    onSelectPlant,
    operatorModalOperators,
    showComments,
    showHistory,
    showIssues,
    showMissingFieldsModal,
    showOperatorModal,
    showPlantModal
}) {
    return (
        <>
            {showHistory && <HistoryViewSection item={mixer} onClose={onCloseHistory} type="mixer" />}
            {showComments && (
                <CommentModalSection
                    itemId={mixerId}
                    itemNumber={mixer?.truckNumber}
                    itemType="Mixer"
                    onClose={onCloseComments}
                    service={MixerService}
                />
            )}
            {showIssues && (
                <IssueModalSection
                    itemId={mixerId}
                    itemNumber={mixer?.truckNumber}
                    itemType="Mixer"
                    onClose={onCloseIssues}
                    service={MixerService}
                />
            )}
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={onClosePlantModal}
                    plants={filteredPlants}
                    onSelect={onSelectPlant}
                    searchPlaceholder="Search plants..."
                />
            )}
            {showOperatorModal && (
                <OperatorSelectModal
                    isOpen={showOperatorModal}
                    onClose={onCloseOperatorModal}
                    onSelect={onOperatorAssign}
                    currentValue={assignedOperator}
                    mixers={mixers}
                    assignedPlant={assignedPlant}
                    readOnly={!canEditMixer}
                    operators={operatorModalOperators}
                    onRefresh={onFetchOperatorsForModal}
                />
            )}
            {showMissingFieldsModal && (
                <VerificationRequirementsModal
                    open={showMissingFieldsModal}
                    onClose={onCloseMissingFieldsModal}
                    missingFields={missingFields}
                    vin={editState.vin}
                    make={editState.make}
                    model={editState.model}
                    year={editState.year}
                    hours={editState.hours}
                    lastServiceDate={editState.lastServiceDate}
                    lastChipDate={editState.lastChipDate}
                    setVin={editState.setVin}
                    setMake={editState.setMake}
                    setModel={editState.setModel}
                    setYear={editState.setYear}
                    setHours={editState.setHours}
                    setLastServiceDate={editState.setLastServiceDate}
                    setLastChipDate={editState.setLastChipDate}
                    onSaveAndVerify={onSaveMissingFields}
                    isServiceOverdue={AssetStatsUtility.isServiceOverdue}
                    assignedOperator={assignedOperator}
                    itemType="Mixer"
                    itemId={mixer?.id}
                    service={MixerService}
                    status={editState.status}
                />
            )}
        </>
    )
}
