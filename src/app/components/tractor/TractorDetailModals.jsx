import React from 'react'

import { TractorService } from '../../../services/TractorService'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import OperatorSelectModal from '../../../views/assets/mixers/OperatorSelectModal'
import PlantDropdownModal from '../common/PlantDropdownModal'
import VerificationRequirementsModal from '../common/VerificationRequirementsModal'
import CommentModalSection from '../sections/CommentModalSection'
import HistoryViewSection from '../sections/HistoryViewSection'
import IssueModalSection from '../sections/IssueModalSection'

/**
 * Modals rendered as direct siblings of <DetailViewSection> (above it in the
 * tree): history, comments, issues, plant picker.
 */
export function TractorOverlayModals({
    filteredPlants,
    setAssignedPlant,
    setShowComments,
    setShowHistory,
    setShowIssues,
    setShowPlantModal,
    showComments,
    showHistory,
    showIssues,
    showPlantModal,
    tractor,
    tractorId
}) {
    return (
        <>
            {showHistory && <HistoryViewSection item={tractor} onClose={() => setShowHistory(false)} type="tractor" />}
            {showComments && (
                <CommentModalSection
                    itemId={tractorId}
                    itemNumber={tractor?.truckNumber}
                    itemType="Tractor"
                    onClose={() => setShowComments(false)}
                    service={TractorService}
                />
            )}
            {showIssues && (
                <IssueModalSection
                    itemId={tractorId}
                    itemNumber={tractor?.truckNumber}
                    itemType="Tractor"
                    onClose={() => setShowIssues(false)}
                    service={TractorService}
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
        </>
    )
}

/**
 * Modals rendered inside the `modals` slot of <DetailViewSection>:
 * operator picker + verification requirements.
 */
export function TractorInlineModals({
    assignedOperator,
    assignedPlant,
    canEditTractor,
    fetchOperatorsForModal,
    handleSave,
    handleSaveMissingFields,
    hours,
    lastServiceDate,
    make,
    missingFields,
    model,
    operatorModalOperators,
    refreshOperators,
    setAssignedOperator,
    setHasUnsavedChanges,
    setHours,
    setLastServiceDate,
    setLastUnassignedOperatorId,
    setMake,
    setMessage,
    setModel,
    setShowMissingFieldsModal,
    setShowOperatorModal,
    setStatus,
    setTractor,
    setVin,
    setYear,
    showMissingFieldsModal,
    showOperatorModal,
    status,
    tractor,
    tractorId,
    tractors,
    vin,
    year
}) {
    async function handleOperatorSelect(operatorId) {
        const newOperator = operatorId === '0' ? '' : operatorId
        const newStatus = newOperator ? 'Active' : status
        setShowOperatorModal(false)
        if (!newOperator) return
        try {
            await handleSave({ assignedOperator: newOperator, status: newStatus })
            setAssignedOperator(newOperator)
            setStatus(newStatus)
            setLastUnassignedOperatorId(null)
            await refreshOperators()
            const updatedTractor = await TractorService.fetchTractorById(tractorId)
            setTractor(updatedTractor)
            setMessage('Operator assigned and status set to Active')
            setTimeout(() => setMessage(''), 3000)
            setHasUnsavedChanges(false)
        } catch {
            setMessage('Error assigning operator. Please try again.')
            setTimeout(() => setMessage(''), 3000)
        }
    }

    return (
        <>
            {showOperatorModal && (
                <OperatorSelectModal
                    isOpen={showOperatorModal}
                    onClose={() => setShowOperatorModal(false)}
                    onSelect={handleOperatorSelect}
                    currentValue={assignedOperator}
                    tractors={tractors}
                    assignedPlant={assignedPlant}
                    readOnly={!canEditTractor}
                    operators={operatorModalOperators}
                    onRefresh={fetchOperatorsForModal}
                />
            )}
            {showMissingFieldsModal && (
                <VerificationRequirementsModal
                    open={showMissingFieldsModal}
                    onClose={() => setShowMissingFieldsModal(false)}
                    missingFields={missingFields}
                    vin={vin}
                    make={make}
                    model={model}
                    year={year}
                    hours={hours}
                    lastServiceDate={lastServiceDate}
                    setVin={setVin}
                    setMake={setMake}
                    setModel={setModel}
                    setYear={setYear}
                    setHours={setHours}
                    setLastServiceDate={setLastServiceDate}
                    onSaveAndVerify={handleSaveMissingFields}
                    isServiceOverdue={AssetStatsUtility.isServiceOverdue}
                    assignedOperator={assignedOperator}
                    itemType="Tractor"
                    itemId={tractor?.id}
                    service={TractorService}
                    status={status}
                />
            )}
        </>
    )
}
