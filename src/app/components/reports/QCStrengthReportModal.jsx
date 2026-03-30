import React, { useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { Database } from '../../../services/DatabaseService'
import { oneOffReportTypeMap } from '../../types/ReportTypes'

const REPORT_DEF = oneOffReportTypeMap.qc_strength
const TABLE = 'reports'

function getCurrentWeekBounds() {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    monday.setHours(12, 0, 0, 0)
    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)
    saturday.setHours(23, 59, 59, 0)
    return { monday, saturday }
}

/** Modal form for submitting a QC Strength Report. */
function QCStrengthReportModal({ onClose, onSubmitted, user }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const updateField = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async () => {
        setError('')
        const missingRequired = REPORT_DEF.fields
            .filter((f) => f.required && !formData[f.name]?.toString().trim())
            .map((f) => f.label)
        if (missingRequired.length > 0) {
            setError(`Required: ${missingRequired.slice(0, 3).join(', ')}${missingRequired.length > 3 ? '...' : ''}`)
            return
        }
        setSubmitting(true)
        try {
            const { monday, saturday } = getCurrentWeekBounds()
            const row = {
                user_id: user?.id,
                report_name: 'qc_strength',
                week: monday.toISOString(),
                report_date_range_start: monday.toISOString(),
                report_date_range_end: saturday.toISOString(),
                data: { ...formData },
                completed: true,
                submitted_at: new Date().toISOString()
            }
            const { data, error: dbError } = await Database.from(TABLE).insert(row).select().single()
            if (dbError) throw new Error(dbError.message)
            onSubmitted?.(data)
            onClose()
        } catch (e) {
            setError(e.message || 'Failed to submit report')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
            <div
                className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center">
                            <i className="fas fa-flask text-white text-sm" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Quality Control Strength Report</h2>
                            <p className="text-xs text-slate-400">Concrete cylinder strength testing</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <i className="fas fa-exclamation-circle shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {REPORT_DEF.fields.map((field) => (
                            <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                                    {field.label}
                                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        value={formData[field.name] || ''}
                                        onChange={(e) => updateField(field.name, e.target.value)}
                                        rows={3}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors resize-none"
                                        placeholder={field.label}
                                    />
                                ) : (
                                    <input
                                        type={
                                            field.type === 'number'
                                                ? 'number'
                                                : field.type === 'date'
                                                  ? 'date'
                                                  : field.type === 'time'
                                                    ? 'time'
                                                    : 'text'
                                        }
                                        value={formData[field.name] || ''}
                                        onChange={(e) => updateField(field.name, e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 transition-colors"
                                        placeholder={field.label}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 border-none cursor-pointer hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-50"
                        style={{ background: accentColor }}
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <i className="fas fa-spinner fa-spin" /> Submitting...
                            </span>
                        ) : (
                            'Submit Report'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
export default QCStrengthReportModal
