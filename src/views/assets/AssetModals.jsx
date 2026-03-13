import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react'

import VerificationRequirementsModal from '../../app/components/common/VerificationRequirementsModal'
import CommentModalSection from '../../app/components/sections/CommentModalSection'
import HistoryViewSection from '../../app/components/sections/HistoryViewSection'
import IssueModalSection from '../../app/components/sections/IssueModalSection'
import RecapModalSection from '../../app/components/sections/RecapModalSection'
import { OperatorService } from '../../services/OperatorService'

const INITIAL_MODAL_STATE = {
    comment: false,
    history: false,
    issue: false,
    operatorComment: false,
    operatorHistory: false,
    recap: false
}

/**
 * Owns all modal visibility state and rendering for AssetView.
 * Parent triggers modals via ref-exposed open functions (useImperativeHandle).
 */
const AssetModals = forwardRef(function AssetModals(
    {
        config,
        filteredOperatorsForRecap,
        filteredResult,
        isLoading,
        items,
        allItems,
        itemsLoaded,
        operators,
        plants,
        selectedPlant,
        service,
        setAllItems,
        setItems,
        setShowAddSheet,
        showAddSheet,
        verification
    },
    ref
) {
    const [modals, setModals] = useState(INITIAL_MODAL_STATE)
    const [modalItemId, setModalItemId] = useState(null)
    const [modalItemNumber, setModalItemNumber] = useState('')
    const [selectedItemForHistory, setSelectedItemForHistory] = useState(null)
    const [operatorModalTarget, setOperatorModalTarget] = useState(null)

    const closeModal = useCallback((key) => {
        setModals((prev) => ({ ...prev, [key]: false }))
    }, [])

    const openModal = useCallback((key) => {
        setModals((prev) => ({ ...prev, [key]: true }))
    }, [])

    // Expose open functions to parent via ref
    useImperativeHandle(
        ref,
        () => ({
            openCommentModal(id, number) {
                setModalItemId(id)
                setModalItemNumber(number)
                openModal('comment')
            },
            openHistoryModal(item) {
                setSelectedItemForHistory(item)
                openModal('history')
            },
            openIssueModal(id, number) {
                setModalItemId(id)
                setModalItemNumber(number)
                openModal('issue')
            },
            openOperatorCommentModal(op) {
                setOperatorModalTarget(op)
                openModal('operatorComment')
            },
            openOperatorHistoryModal(op) {
                setOperatorModalTarget(op)
                openModal('operatorHistory')
            },
            openRecap() {
                openModal('recap')
            }
        }),
        [openModal]
    )

    const AddView = config.AddView

    return (
        <>
            {/* Add View */}
            {showAddSheet && (
                <AddView
                    onClose={() => setShowAddSheet(false)}
                    {...{
                        [config.addViewCallbackProp || 'onAdded']: (newItem) => {
                            setItems((prev) => [...prev, newItem])
                            if (config.hasVinSearch) setAllItems((prev) => [...prev, newItem])
                        }
                    }}
                    {...(config.addViewPassesPlants ? { plants } : {})}
                    {...(config.addViewPassesOperators ? { operators } : {})}
                />
            )}

            {/* Comment Modal */}
            {modals.comment && (
                <CommentModalSection
                    itemId={modalItemId}
                    itemNumber={modalItemNumber}
                    itemType={config.itemTypeLabel}
                    onClose={() => closeModal('comment')}
                    service={service}
                />
            )}

            {/* Issue Modal */}
            {modals.issue && (
                <IssueModalSection
                    itemId={modalItemId}
                    itemNumber={modalItemNumber}
                    itemType={config.itemTypeLabel}
                    onClose={() => closeModal('issue')}
                    service={service}
                />
            )}

            {/* Asset History Modal */}
            {modals.history && selectedItemForHistory && (
                <HistoryViewSection
                    item={selectedItemForHistory}
                    onClose={() => closeModal('history')}
                    type={config.historyType}
                />
            )}

            {/* Operator Comment Modal */}
            {modals.operatorComment && operatorModalTarget && (
                <CommentModalSection
                    itemId={operatorModalTarget.employeeId}
                    itemNumber={operatorModalTarget.name}
                    itemType="Operator"
                    onClose={() => {
                        closeModal('operatorComment')
                        setOperatorModalTarget(null)
                    }}
                    service={OperatorService}
                />
            )}

            {/* Operator History Modal */}
            {modals.operatorHistory && operatorModalTarget && (
                <HistoryViewSection
                    item={operatorModalTarget}
                    onClose={() => {
                        closeModal('operatorHistory')
                        setOperatorModalTarget(null)
                    }}
                    type="operator"
                />
            )}

            {/* Verification Modal */}
            {verification.showVerifyModal && verification.verifyItem && config.verification && (
                <VerificationRequirementsModal
                    assignedOperator={verification.verifyItem.assignedOperator}
                    isServiceOverdue={config.verification.isServiceOverdueFn}
                    itemId={verification.verifyItem.id}
                    itemType={config.verification.itemType}
                    lastChipDate={config.verification.hasLastChipDate ? verification.verifyLastChipDate : undefined}
                    lastServiceDate={verification.verifyLastServiceDate}
                    make={verification.verifyMake}
                    missingFields={config.verification.getMissingFields(verification.verifyItem)}
                    model={verification.verifyModel}
                    onClose={() => {
                        verification.setShowVerifyModal(false)
                        verification.setVerifyItem(null)
                    }}
                    onSaveAndVerify={verification.handleSaveAndVerify}
                    open={verification.showVerifyModal}
                    service={service}
                    setLastChipDate={
                        config.verification.hasLastChipDate ? verification.setVerifyLastChipDate : undefined
                    }
                    setLastServiceDate={verification.setVerifyLastServiceDate}
                    setMake={verification.setVerifyMake}
                    setModel={verification.setVerifyModel}
                    setVin={verification.setVerifyVin}
                    setYear={verification.setVerifyYear}
                    status={verification.verifyItem.status}
                    vin={verification.verifyVin}
                    year={verification.verifyYear}
                />
            )}

            {/* Recap Modal (Mixer) */}
            {config.hasRecap && (
                <RecapModalSection
                    isAllPlants={!selectedPlant}
                    isLoading={isLoading}
                    isOpen={modals.recap}
                    mixers={filteredResult.filtered}
                    mixersLoaded={itemsLoaded}
                    onClose={() => closeModal('recap')}
                    operators={filteredOperatorsForRecap}
                    plantCode={selectedPlant || ''}
                    plantName={
                        selectedPlant
                            ? plants.find((p) => String(p.plantCode) === String(selectedPlant))?.plantName
                            : ''
                    }
                />
            )}
        </>
    )
})

export default AssetModals
