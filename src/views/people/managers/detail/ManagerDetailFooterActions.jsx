import React from 'react'

const footerButtonClasses = 'global-button-secondary flex-1 justify-center'

/**
 * Footer-row action buttons for the manager detail view. Save is gated on edit
 * permission; Delete is gated independently on IT Access so an IT admin can
 * remove a manager even when they don't have edit rights on the record.
 */
export default function ManagerDetailFooterActions({
    isReadOnly,
    canEditManager,
    canDeleteManager,
    isSaving,
    onSave,
    onRequestDelete
}) {
    const showSave = !isReadOnly && canEditManager
    if (!showSave && !canDeleteManager) {
        return (
            <div className="flex items-center gap-1.5 text-text-secondary text-[12px] font-medium">
                <i className="fas fa-lock text-[11px]"></i>
                <span>View-Only Mode</span>
            </div>
        )
    }
    return (
        <>
            {showSave && (
                <button type="button" className={footerButtonClasses} onClick={onSave} disabled={isSaving}>
                    <i className="fas fa-save"></i>
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
            )}
            {canDeleteManager && (
                <button type="button" className={footerButtonClasses} onClick={onRequestDelete} disabled={isSaving}>
                    <i className="fas fa-trash-alt"></i>
                    <span>Delete</span>
                </button>
            )}
        </>
    )
}
