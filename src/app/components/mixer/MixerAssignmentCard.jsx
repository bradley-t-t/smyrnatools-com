import React from 'react'

import DetailViewSection from '../sections/DetailViewSection'

const FIELD_BUTTON_BASE =
    'operator-select-button form-control text-left active:scale-[0.97] disabled:active:scale-100 transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

const DISABLED_FIELD_CLASSES = 'bg-bg-secondary opacity-80 cursor-not-allowed'

const UNDO_BUTTON_CLASSES =
    'undo-operator-button unassign-operator-button bg-status-active text-white cursor-pointer text-[1rem] h-[38px] min-w-[140px] border-0 box-border ml-2 px-4 rounded-md active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:brightness-105'

/**
 * Renders the Assigned Plant and Assigned Operator selectors with their
 * inline unassign/undo controls. Disabling rules are passed in so the parent
 * controls the cleanliness gate.
 */
export default function MixerAssignmentCard({
    assignedOperator,
    canEditMixer,
    getOperatorName,
    isCleanlinessBlocking,
    lastUnassignedOperatorId,
    onOpenOperatorModal,
    onOpenPlantModal,
    onUndoUnassignOperator,
    onUnassignOperator,
    plantDisplayText
}) {
    const plantDisabled = !canEditMixer
    const operatorDisabled = !canEditMixer || isCleanlinessBlocking

    return (
        <DetailViewSection.Card title="Assignment" icon="fas fa-user-tag">
            <div className="form-group">
                <label>Assigned Plant</label>
                <button type="button"
                    className={`${FIELD_BUTTON_BASE} ${plantDisabled ? DISABLED_FIELD_CLASSES : ''}`}
                    onClick={() => canEditMixer && onOpenPlantModal()}
                    disabled={plantDisabled}
                >
                    <span className="block truncate">{plantDisplayText}</span>
                </button>
            </div>
            <div className="form-group">
                <label>Assigned Operator</label>
                <div className="operator-select-container">
                    <button type="button"
                        className={`${FIELD_BUTTON_BASE} ${operatorDisabled ? DISABLED_FIELD_CLASSES : ''}`}
                        onClick={onOpenOperatorModal}
                        disabled={operatorDisabled}
                    >
                        <span className="block truncate">
                            {assignedOperator ? getOperatorName(assignedOperator) : 'None (Click to select)'}
                        </span>
                    </button>
                    {canEditMixer &&
                        (assignedOperator ? (
                            <button type="button"
                                className="unassign-operator-button active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                aria-label="Unassign Operator"
                                onClick={onUnassignOperator}
                            >
                                Unassign Operator
                            </button>
                        ) : (
                            lastUnassignedOperatorId && (
                                <button type="button"
                                    className={UNDO_BUTTON_CLASSES}
                                    aria-label="Undo Unassign"
                                    onClick={onUndoUnassignOperator}
                                >
                                    Undo
                                </button>
                            )
                        ))}
                </div>
                {isCleanlinessBlocking && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-status-warning/10 rounded-md text-status-warning text-[0.8125rem]">
                        <i className="fas fa-exclamation-triangle" />
                        <span>Cleanliness must be 3+ stars to assign an operator</span>
                    </div>
                )}
            </div>
        </DetailViewSection.Card>
    )
}
