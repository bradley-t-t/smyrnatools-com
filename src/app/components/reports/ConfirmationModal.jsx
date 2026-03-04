import React from 'react'

/** Checklist items the user must acknowledge before report submission. */
const CONFIRMATION_ITEMS = [
    'Total yardage includes all yardage we can bill for and does not include lost yardage.',
    'Total hours only includes hours from operators and not from plant managers, loader operators or any other roles.'
]

/** Pre-submission confirmation modal requiring all checklist items to be acknowledged. */
function ConfirmationModal({ confirmationChecks, setConfirmationChecks, onCancel, onConfirm }) {
    const updateCheck = (index, checked) =>
        setConfirmationChecks(confirmationChecks.map((c, i) => (i === index ? checked : c)))

    const allChecked = confirmationChecks.every(Boolean)

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-2xl p-5 sm:p-8 max-w-md w-full shadow-2xl">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4">Confirm Submission</h2>
                <div className="text-sm text-slate-600 mb-4 sm:mb-6">
                    Please confirm the following before submitting:
                </div>
                {CONFIRMATION_ITEMS.map((text, index) => (
                    <div key={index} className="mb-3 sm:mb-4">
                        <label className="flex items-start gap-2.5 sm:gap-3 text-sm text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={confirmationChecks[index]}
                                onChange={(e) => updateCheck(index, e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                            />
                            <span>{text}</span>
                        </label>
                    </div>
                ))}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152d4a] transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                        disabled={!allChecked}
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
