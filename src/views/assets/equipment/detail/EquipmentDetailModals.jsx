import React from 'react'

import PlantDropdownModal from '../../../../app/components/common/PlantDropdownModal'
import VerificationRequirementsModal from '../../../../app/components/common/VerificationRequirementsModal'
import CommentModalSection from '../../../../app/components/sections/CommentModalSection'
import HistoryViewSection from '../../../../app/components/sections/HistoryViewSection'
import IssueModalSection from '../../../../app/components/sections/IssueModalSection'
import { EquipmentService } from '../../../../services/EquipmentService'

/**
 * Renders the five overlay modals used by the equipment detail view:
 * history, comments, issues, plant picker, and the verification
 * requirements modal that gates verifying with missing fields.
 */
export default function EquipmentDetailModals({
    equipment,
    equipmentId,
    filteredPlants,
    handleSaveAndVerify,
    lastServiceDate,
    make,
    missingFields,
    model,
    setAssignedPlant,
    setLastServiceDate,
    setMake,
    setModel,
    setShowComments,
    setShowHistory,
    setShowIssues,
    setShowMissingFieldsModal,
    setShowPlantModal,
    setYear,
    showComments,
    showHistory,
    showIssues,
    showMissingFieldsModal,
    showPlantModal,
    status,
    year
}) {
    return (
        <>
            {showHistory && (
                <HistoryViewSection item={equipment} onClose={() => setShowHistory(false)} type="equipment" />
            )}
            {showComments && (
                <CommentModalSection
                    itemId={equipmentId}
                    itemNumber={equipment?.identifyingNumber}
                    itemType="Equipment"
                    onClose={() => setShowComments(false)}
                    service={EquipmentService}
                />
            )}
            {showIssues && (
                <IssueModalSection
                    itemId={equipmentId}
                    itemNumber={equipment?.identifyingNumber}
                    itemType="Equipment"
                    onClose={() => setShowIssues(false)}
                    service={EquipmentService}
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
            {showMissingFieldsModal && (
                <VerificationRequirementsModal
                    open={showMissingFieldsModal}
                    onClose={() => setShowMissingFieldsModal(false)}
                    onSaveAndVerify={handleSaveAndVerify}
                    missingFields={missingFields}
                    make={make}
                    model={model}
                    year={year}
                    lastServiceDate={lastServiceDate}
                    setMake={setMake}
                    setModel={setModel}
                    setYear={setYear}
                    setLastServiceDate={setLastServiceDate}
                    status={status}
                />
            )}
        </>
    )
}
