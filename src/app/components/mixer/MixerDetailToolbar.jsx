import React from 'react'

const buttonClasses = 'global-button-secondary'
const footerButtonClasses = `${buttonClasses} flex-1 justify-center`

/** Header buttons: Issues / Comments / History. Always visible to anyone with access. */
export function MixerDetailHeaderActions({ onOpenComments, onOpenHistory, onOpenIssues }) {
    return (
        <>
            <button type="button" className={buttonClasses} onClick={onOpenIssues}>
                <i className="fas fa-tools"></i>
                <span>Issues</span>
            </button>
            <button type="button" className={buttonClasses} onClick={onOpenComments}>
                <i className="fas fa-comments"></i>
                <span>Comments</span>
            </button>
            <button type="button" className={buttonClasses} onClick={onOpenHistory}>
                <i className="fas fa-history"></i>
                <span>History</span>
            </button>
        </>
    )
}

/** Footer buttons: Save (always when editable) and Delete (permission-gated). */
export function MixerDetailFooterActions({ canDeleteMixer, isSaving, onDelete, onSave }) {
    return (
        <>
            <button type="button" className={footerButtonClasses} onClick={onSave} disabled={isSaving}>
                <i className="fas fa-save"></i>
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            {canDeleteMixer && (
                <button type="button" className={footerButtonClasses} onClick={onDelete} disabled={isSaving}>
                    <i className="fas fa-trash-alt"></i>
                    <span>Delete</span>
                </button>
            )}
        </>
    )
}
