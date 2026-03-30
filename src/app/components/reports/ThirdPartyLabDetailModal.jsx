import React, { useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { Database } from '../../../services/DatabaseService'

function ThirdPartyLabDetailModal({ report, getUserName, onClose, onReviewed }) {
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
    const attachments = Array.isArray(data.attachments) ? data.attachments : []

    const handleMarkReviewed = async () => {
        if (!report?.id) return
        setMarking(true)
        try {
            await Database.from('reports').update({ been_reviewed: true }).eq('id', report.id)
            onReviewed?.(report.id)
        } catch {}
        setMarking(false)
    }

    const fields = [
        { label: 'Lab Company Name', value: data.lab_company_name },
        { label: 'Customer', value: data.customer },
        { label: 'Order No.', value: data.order_no },
        {
            label: 'Date',
            value: data.report_date
                ? new Date(data.report_date + 'T12:00:00').toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                  })
                : null
        }
    ]

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center">
                            <i className="fas fa-vial text-white text-sm" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                {data.lab_company_name || 'Third Party Lab Report'}
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
                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {fields.map(
                            (field) =>
                                field.value && (
                                    <div key={field.label}>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            {field.label}
                                        </label>
                                        <div className="text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5">
                                            {field.value}
                                        </div>
                                    </div>
                                )
                        )}
                    </div>
                    {data.lab_issue && (
                        <div className="mt-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                What did the lab do wrong?
                            </label>
                            <div className="text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5 whitespace-pre-wrap">
                                {data.lab_issue}
                            </div>
                        </div>
                    )}
                    {attachments.length > 0 && (
                        <div className="mt-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Attachments ({attachments.length})
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {attachments.map((att, i) => {
                                    const isVideo = att.type?.startsWith('video/')
                                    return (
                                        <a
                                            key={i}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                                        >
                                            {isVideo ? (
                                                <div className="bg-slate-100 h-24 flex items-center justify-center">
                                                    <i className="fas fa-play-circle text-slate-400 text-2xl" />
                                                </div>
                                            ) : (
                                                <img
                                                    src={att.url}
                                                    alt={att.name}
                                                    className="w-full h-24 object-cover"
                                                />
                                            )}
                                            <div className="px-2 py-1.5">
                                                <span className="text-xs text-slate-600 truncate block">
                                                    {att.name}
                                                </span>
                                            </div>
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    )}
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
export default ThirdPartyLabDetailModal
