import React from 'react'

/**
 * Modal for saving and loading plan templates.
 * Extracted from PlanView to reduce file size.
 */
export default function PlanTemplatesModal({
    accentColor,
    templates,
    templateName,
    setTemplateName,
    saveAsTemplate,
    loadTemplate,
    deleteTemplate,
    onClose
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4 border-b"
                    style={{ borderColor: 'var(--border-light)' }}
                >
                    <div className="flex items-center gap-2">
                        <i className="fas fa-bookmark text-sm" style={{ color: accentColor }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            Plan Templates
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="border-none bg-transparent cursor-pointer p-1 rounded-md"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
                {/* Save current plan as template */}
                <div className="px-5 py-4" style={{ background: 'var(--bg-secondary)' }}>
                    <div
                        className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Save Current Plan
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Template name..."
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveAsTemplate()}
                            className="flex-1 border rounded-lg text-sm outline-none py-1.5 px-3"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-medium)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <button
                            onClick={saveAsTemplate}
                            disabled={!templateName.trim()}
                            className="border-none rounded-lg cursor-pointer text-sm font-semibold px-3 py-1.5 text-white disabled:opacity-40"
                            style={{ background: accentColor }}
                        >
                            Save
                        </button>
                    </div>
                </div>
                {/* Saved templates */}
                <div className="px-5 py-4 max-h-[300px] overflow-y-auto">
                    <div
                        className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Saved Templates
                    </div>
                    {templates.length === 0 ? (
                        <div className="text-xs py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                            No templates saved yet
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {templates.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                                    style={{ background: 'var(--bg-tertiary)' }}
                                >
                                    <div className="flex flex-col">
                                        <span
                                            className="text-xs font-semibold"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {t.name}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                            {t.assignments?.length || 0} assignment
                                            {(t.assignments?.length || 0) !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => loadTemplate(t)}
                                            className="border-none rounded cursor-pointer text-[11px] font-semibold px-2.5 py-1 text-white"
                                            style={{ background: accentColor }}
                                        >
                                            Load
                                        </button>
                                        <button
                                            onClick={() => deleteTemplate(t.id)}
                                            className="border-none bg-transparent cursor-pointer p-1 rounded"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <i className="fas fa-trash text-[10px]" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
