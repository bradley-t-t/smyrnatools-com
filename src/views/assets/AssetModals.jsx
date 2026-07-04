import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react'

import SendAssetMessageModal from '../../app/components/common/SendAssetMessageModal'
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
    recap: false,
    sendMessage: false
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
        items: _items,
        allItems: _allItems,
        itemsLoaded,
        operators,
        plants,
        selectedPlant,
        service,
        setAllItems,
        setItems,
        setShowAddSheet,
        showAddSheet,
        verification,
        /**
         * When provided, the comment, issue, and operator-comment "modals" are
         * delegated to the parent — invoked as a right-side panel next to the
         * table on list-view layouts. When `null`, those three render here as
         * centered portal modals (default behavior on grid / detail / mobile).
         */
        onSidePanelOpen = null
    },
    ref
) {
    const [modals, setModals] = useState(INITIAL_MODAL_STATE)
    const [modalItemId, setModalItemId] = useState(null)
    const [modalItemNumber, setModalItemNumber] = useState('')
    const [selectedItemForHistory, setSelectedItemForHistory] = useState(null)
    const [operatorModalTarget, setOperatorModalTarget] = useState(null)
    const [sendMessageTarget, setSendMessageTarget] = useState(null)

    const closeModal = useCallback((key) => {
        setModals((prev) => ({ ...prev, [key]: false }))
    }, [])

    const openModal = useCallback((key) => {
        setModals((prev) => ({ ...prev, [key]: true }))
    }, [])

    // Expose open functions to parent via ref. When `onSidePanelOpen` is wired,
    // the comment / issue / operator-comment surfaces are delegated to the
    // parent so it can render them as a right-side panel next to the list.
    useImperativeHandle(
        ref,
        () => ({
            openCommentModal(id, number) {
                if (onSidePanelOpen) {
                    onSidePanelOpen({ itemId: id, itemNumber: number, kind: 'comment' })
                    return
                }
                setModalItemId(id)
                setModalItemNumber(number)
                openModal('comment')
            },
            openHistoryModal(item) {
                setSelectedItemForHistory(item)
                openModal('history')
            },
            openIssueModal(id, number) {
                if (onSidePanelOpen) {
                    onSidePanelOpen({ itemId: id, itemNumber: number, kind: 'issue' })
                    return
                }
                setModalItemId(id)
                setModalItemNumber(number)
                openModal('issue')
            },
            openOperatorCommentModal(op) {
                if (onSidePanelOpen) {
                    onSidePanelOpen({ kind: 'operatorComment', operator: op })
                    return
                }
                setOperatorModalTarget(op)
                openModal('operatorComment')
            },
            openOperatorHistoryModal(op) {
                setOperatorModalTarget(op)
                openModal('operatorHistory')
            },
            openRecap() {
                openModal('recap')
            },
            openSendMessageModal(item, itemNumber) {
                setSendMessageTarget({ item, itemNumber })
                openModal('sendMessage')
            }
        }),
        [openModal, onSidePanelOpen]
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
                    hours={config.verification.hasHours ? verification.verifyHours : undefined}
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
                    setHours={config.verification.hasHours ? verification.setVerifyHours : undefined}
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

            {/* Send Asset Message Modal */}
            {modals.sendMessage && sendMessageTarget && (
                <SendAssetMessageModal
                    item={sendMessageTarget.item}
                    itemNumber={sendMessageTarget.itemNumber}
                    itemType={config.itemTypeLabel}
                    onClose={() => {
                        closeModal('sendMessage')
                        setSendMessageTarget(null)
                    }}
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
