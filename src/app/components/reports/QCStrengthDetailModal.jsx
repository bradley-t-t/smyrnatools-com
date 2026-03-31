import React, { useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { Database } from '../../../services/DatabaseService'
import { oneOffReportTypeMap } from '../../types/ReportTypes'

const REPORT_DEF = oneOffReportTypeMap.qc_strength

/** Detail modal for viewing a submitted QC Strength Report. Supports marking as reviewed. */
function QCStrengthDetailModal({ report, getUserName, onClose, onReviewed }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [marking, setMarking] = useState(false)
    const data = report?.data || {}
    const submitterName = getUserName?.(report?.userId) || 'Unknown'
    const submittedDate = report?.submittedAt
        ? new Date(report.submittedAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
          })
        : ''

    const handleMarkReviewed = async () => {
        if (!report?.id) return
        setMarking(true)
        try {
            await Database.from('reports').update({ been_reviewed: true }).eq('id', report.id)
            onReviewed?.(report.id)
        } catch {}
        setMarking(false)
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start sm:justify-center bg-black/40 backdrop-blur-sm overflow-y-auto sm:p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-none sm:rounded-2xl shadow-xl border-0 sm:border border-slate-200 w-full sm:max-w-2xl min-h-screen sm:min-h-0 sm:my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center">
                            <i className="fas fa-flask text-white text-sm" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                {data.project || 'Quality Control Strength Report'}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span>{submitterName}</span>
                                <span className="text-slate-300">●</span>
                                <span>{submittedDate}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                {/* Fields */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 sm:flex-none sm:max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(REPORT_DEF?.fields || []).map((field) => {
                            const value = data[field.name]
                            if (value === undefined || value === null || value === '') return null
                            return (
                                <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        {field.label}
                                    </label>
                                    <div className="text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5">
                                        {value}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                    <div>
                        {report?.reviewed ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                                <i className="fas fa-check-circle" />
                                Reviewed
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 text-sm font-semibold">
                                <i className="fas fa-flag" />
                                Pending Review
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 border-none cursor-pointer hover:bg-slate-200 transition-colors"
                        >
                            Close
                        </button>
                        {!report?.reviewed && (
                            <button
                                onClick={handleMarkReviewed}
                                disabled={marking}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-50"
                                style={{ background: accentColor }}
                            >
                                {marking ? (
                                    <span className="flex items-center gap-2">
                                        <i className="fas fa-spinner fa-spin" /> Marking...
                                    </span>
                                ) : (
                                    'Mark as Reviewed'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
export default QCStrengthDetailModal
