import React, { useState } from 'react'

import { OPERATOR_EXCLUSION_REASONS } from '../../constants/reportConstants'
/** Modal requiring the user to select a reason when all operators are excluded from a report. */
function OperatorExclusionReasonModal({ onConfirm, onCancel }) {
    const [selectedReason, setSelectedReason] = useState('')
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-2xl p-5 sm:p-8 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <i className="fas fa-users-slash"></i>
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 m-0">All Operators Excluded</h2>
                        <p className="text-sm text-slate-500 m-0">Please select a reason</p>
                    </div>
                </div>
                <div className="text-sm text-slate-600 mb-5">
                    All operators have been excluded from this report. Please select the reason before submitting:
                </div>
                <div className="flex flex-col gap-3 mb-6">
                    {Object.entries(OPERATOR_EXCLUSION_REASONS).map(([key, label]) => (
                        <label
                            key={key}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                selectedReason === key
                                    ? 'border-sky-500 bg-sky-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-slate-50'
                            }`}
                        >
                            <input
                                type="radio"
                                name="exclusion_reason"
                                value={key}
                                checked={selectedReason === key}
                                onChange={() => setSelectedReason(key)}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                            />
                            <div className="flex items-center gap-2">
                                <i
                                    className={`fas ${key === 'plant_shutdown' ? 'fa-industry' : 'fa-truck-loading'} text-slate-400`}
                                ></i>
                                <span className="text-sm font-medium text-slate-700">{label}</span>
                            </div>
                        </label>
                    ))}
                </div>
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
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                        disabled={!selectedReason}
                        onClick={() => onConfirm(selectedReason)}
                    >
                        Confirm & Submit
                    </button>
                </div>
            </div>
        </div>
    )
}
export default OperatorExclusionReasonModal
