import React from 'react'

/**
 * Config-driven grid card for all asset types.
 * Renders a dashboard-panel layout with icon header, operator/tractor bar,
 * 2-column detail grid from gridCardFields, and action footer with
 * comment/issue/history buttons including count badges.
 */
function AssetGridCard({
    item,
    config,
    operator,
    tractor,
    plantName,
    isVerified,
    displayStatus,
    statusDays,
    onSelect,
    onShowCommentModal,
    onShowIssueModal,
    onShowHistoryModal,
    onShowOperatorCommentModal,
    onShowOperatorHistoryModal
}) {
    const number = item[config.primaryField] || '---'
    const statusBadgeClass = config.statusBadgeClasses?.[displayStatus] || 'bg-slate-100 text-slate-600'

    const getInitials = (name) => {
        if (!name) return '—'
        const parts = name.split(' ').filter(Boolean)
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : (name[0] || '?').toUpperCase()
    }

    const subtitleName = config.hasOperatorAssignment
        ? operator?.name
        : config.hasTractorAssignment
          ? tractor?.truckNumber
              ? `#${tractor.truckNumber}`
              : null
          : null

    const fields = config.gridCardFields || []

    return (
        <div
            className="flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border-light)] bg-[color:var(--bg-primary)] shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => onSelect?.(item.id)}
        >
            {/* Header: icon + number + verification + status */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[color:var(--border-light)]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 bg-[color:var(--accent)]">
                    <i className={`fas ${config.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div
                        className="text-lg font-extrabold tracking-tight truncate"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        #{number}
                    </div>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {config.singularLabel}
                    </div>
                </div>
                {config.hasVerification && isVerified !== undefined && (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                            isVerified ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'
                        }`}
                    >
                        <i className={`fas ${isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
                        {isVerified ? 'Verified' : 'Unverified'}
                    </span>
                )}
                <span
                    className={`inline-block rounded-2xl text-[11px] font-bold px-3 py-1.5 flex-shrink-0 ${statusBadgeClass}`}
                >
                    {displayStatus || '---'}
                    {statusDays ? ` (${statusDays}d)` : ''}
                </span>
            </div>

            {/* Operator / tractor bar */}
            {(config.hasOperatorAssignment || config.hasTractorAssignment) && (
                <div
                    className={`flex items-center gap-2.5 px-5 py-2.5 ${!subtitleName ? 'opacity-50' : ''}`}
                    style={{ background: 'color-mix(in srgb, var(--accent) 5%, transparent)' }}
                >
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{
                            background: subtitleName
                                ? 'linear-gradient(135deg, var(--accent), #60a5fa)'
                                : 'linear-gradient(135deg, #94a3b8, #cbd5e1)'
                        }}
                    >
                        {getInitials(config.hasOperatorAssignment ? operator?.name : tractor?.truckNumber)}
                    </div>
                    <span
                        className={`text-xs font-semibold flex-1 truncate ${!subtitleName ? 'italic' : ''}`}
                        style={{ color: subtitleName ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                        {subtitleName || 'Not Assigned'}
                    </span>
                    {config.hasOperatorAssignment && operator?.name && (
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onShowOperatorCommentModal?.(operator)
                                }}
                                title="Operator comments"
                                className="relative border-none bg-transparent rounded-md w-6 h-6 flex items-center justify-center cursor-pointer text-[10px] transition-all hover:bg-[color:var(--accent)] hover:text-white"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <i className="fas fa-comment" />
                                {operator.commentsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] rounded-full bg-blue-500 text-white text-[7px] font-bold flex items-center justify-center px-0.5">
                                        {operator.commentsCount > 9 ? '9+' : operator.commentsCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onShowOperatorHistoryModal?.(operator)
                                }}
                                title="Operator history"
                                className="border-none bg-transparent rounded-md w-6 h-6 flex items-center justify-center cursor-pointer text-[10px] transition-all hover:bg-[color:var(--accent)] hover:text-white"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <i className="fas fa-history" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 2-column detail grid */}
            <div className="grid grid-cols-2">
                {fields.map((field, idx) => {
                    const value = field.getValue
                        ? field.getValue(item, { operator, plantName, tractor })
                        : (item[field.key] ?? '---')
                    const isOverdue = field.isOverdue?.(item)
                    const warning = field.getWarning?.(item)
                    const isLastRow = idx >= fields.length - 2
                    const isOdd = idx % 2 === 0

                    return (
                        <div
                            key={field.label}
                            className={`flex flex-col gap-0.5 px-5 py-3 ${!isLastRow ? 'border-b border-[color:var(--border-light)]' : ''} ${isOdd ? 'border-r border-[color:var(--border-light)]' : ''}`}
                        >
                            <span
                                className="text-[10px] font-medium uppercase tracking-wide"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {field.label}
                            </span>
                            <span
                                className={`text-[13px] font-semibold ${isOverdue ? 'text-red-600' : ''}`}
                                style={!isOverdue ? { color: 'var(--text-primary)' } : undefined}
                            >
                                {field.type === 'stars' ? (
                                    <span className="inline-flex items-center gap-1">
                                        <span className="inline-flex gap-px text-[11px]">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <i
                                                    key={i}
                                                    className="fas fa-star"
                                                    style={{
                                                        color: i < (value || 0) ? '#facc15' : 'var(--border-light)'
                                                    }}
                                                />
                                            ))}
                                        </span>
                                        {warning && (
                                            <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">
                                                {warning}
                                            </span>
                                        )}
                                    </span>
                                ) : field.type === 'monospace' ? (
                                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                        {value}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5">
                                        {value}
                                        {isOverdue && (
                                            <span className="bg-red-100 text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded">
                                                OVERDUE
                                            </span>
                                        )}
                                    </span>
                                )}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Footer: Comments / Issues / History */}
            <div className="flex border-t border-[color:var(--border-light)]">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onShowCommentModal?.()
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-none bg-transparent text-[11px] font-semibold cursor-pointer transition-all border-r border-[color:var(--border-light)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    style={{ borderRight: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                >
                    <i className="fas fa-comments" />
                    Comments
                    {item.commentsCount > 0 && (
                        <span className="min-w-[16px] h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold inline-flex items-center justify-center px-1">
                            {item.commentsCount > 9 ? '9+' : item.commentsCount}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onShowIssueModal?.()
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-none bg-transparent text-[11px] font-semibold cursor-pointer transition-all hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    style={{ borderRight: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                >
                    <i className="fas fa-tools" />
                    Issues
                    {item.openIssuesCount > 0 && (
                        <span className="min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold inline-flex items-center justify-center px-1">
                            {item.openIssuesCount > 9 ? '9+' : item.openIssuesCount}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onShowHistoryModal?.()
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-none bg-transparent text-[11px] font-semibold cursor-pointer transition-all hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <i className="fas fa-history" />
                    History
                </button>
            </div>
        </div>
    )
}

export default AssetGridCard
