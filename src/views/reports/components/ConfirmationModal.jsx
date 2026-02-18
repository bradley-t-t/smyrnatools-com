import React from 'react'

const CONFIRMATION_ITEMS = [
    'Total yardage includes all yardage we can bill for and does not include lost yardage.',
    'Total hours only includes hours from operators and not from plant managers, loader operators or any other roles.'
]

function ConfirmationModal({ confirmationChecks, setConfirmationChecks, onCancel, onConfirm }) {
    const updateCheck = (index, checked) =>
        setConfirmationChecks(confirmationChecks.map((c, i) => (i === index ? checked : c)))

    const allChecked = confirmationChecks.every(Boolean)

    return (
        <div className="rpts-sbmt-modal-backdrop">
            <div className="rpts-sbmt-modal-content">
                <h2 className="rpts-sbmt-modal-title">Confirm Submission</h2>
                <div className="rpts-sbmt-modal-text">Please confirm the following before submitting:</div>
                {CONFIRMATION_ITEMS.map((text, index) => (
                    <div key={index}>
                        <label className="rpts-sbmt-checkbox-label">
                            <input
                                type="checkbox"
                                checked={confirmationChecks[index]}
                                onChange={(e) => updateCheck(index, e.target.checked)}
                            />
                            {text}
                        </label>
                    </div>
                ))}
                <div className="rpts-sbmt-modal-actions">
                    <button type="button" className="rpts-sbmt-btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="rpts-sbmt-btn-confirm" disabled={!allChecked} onClick={onConfirm}>
                        Confirm & Submit
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmationModal
