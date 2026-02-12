import React from 'react'

function ConfirmationModal({ confirmationChecks, setConfirmationChecks, onCancel, onConfirm }) {
    return (
        <div className="rpts-sbmt-modal-backdrop">
            <div className="rpts-sbmt-modal-content">
                <h2 className="rpts-sbmt-modal-title">Confirm Submission</h2>
                <div className="rpts-sbmt-modal-text">Please confirm the following before submitting:</div>
                <div>
                    <label className="rpts-sbmt-checkbox-label">
                        <input
                            type="checkbox"
                            checked={confirmationChecks[0]}
                            onChange={(e) => setConfirmationChecks([e.target.checked, confirmationChecks[1]])}
                        />
                        Total yardage includes all yardage we can bill for and does not include lost yardage.
                    </label>
                </div>
                <div>
                    <label className="rpts-sbmt-checkbox-label">
                        <input
                            type="checkbox"
                            checked={confirmationChecks[1]}
                            onChange={(e) => setConfirmationChecks([confirmationChecks[0], e.target.checked])}
                        />
                        Total hours only includes hours from operators and not from plant managers, loader operators or
                        any other roles.
                    </label>
                </div>
                <div className="rpts-sbmt-modal-actions">
                    <button type="button" className="rpts-sbmt-btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rpts-sbmt-btn-confirm"
                        disabled={!(confirmationChecks[0] && confirmationChecks[1])}
                        onClick={onConfirm}
                    >
                        Confirm & Submit
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmationModal
