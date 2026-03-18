import React from 'react'

import StatusHistoryBar from '../../app/components/common/StatusHistoryBar'

/**
 * Single table row for the asset list view, driven by column type configs.
 * Extracted from AssetView's renderRow to keep the parent manageable.
 */
export default function AssetListRow({
    alternatingBg,
    config,
    duplicates,
    item,
    onComment,
    onHistory,
    onIssue,
    onOperatorComment,
    onOperatorHistory,
    onSelect,
    onSendMessage,
    onVerify,
    operators,
    plants,
    tractors
}) {
    const { columns } = config.listConfig

    const cellBase = {
        backgroundColor: alternatingBg,
        borderBottom: '1px solid var(--border-light)',
        color: 'var(--text-primary)',
        fontSize: '14px',
        padding: '20px 16px',
        verticalAlign: 'middle'
    }

    const cellBold = { ...cellBase, color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 700 }

    const actionBtnStyle = {
        alignItems: 'center',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'inline-flex',
        fontSize: '14px',
        height: '36px',
        justifyContent: 'center',
        marginRight: '8px',
        width: '36px'
    }

    /** Copies text to clipboard and briefly swaps the icon to a checkmark. */
    const handleCopy = (e, text) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        const icon = e.currentTarget.querySelector('i')
        icon.className = 'fas fa-check'
        icon.style.color = '#22c55e'
        setTimeout(() => {
            icon.className = 'fas fa-copy'
            icon.style.color = ''
        }, 1500)
    }

    const copyButton = (text, title = 'Copy') => (
        <button
            type="button"
            onClick={(e) => handleCopy(e, text)}
            title={title}
            className="inline-flex items-center bg-transparent border-none text-[color:var(--text-secondary)] cursor-pointer text-xs p-0.5"
        >
            <i className="fas fa-copy" />
        </button>
    )

    const renderCell = (col) => {
        const style = col.bold ? { ...cellBold, width: col.width } : { ...cellBase, width: col.width }

        // --- Status badge ---
        if (col.type === 'status') {
            const displayStatus = col.getDisplayStatus ? col.getDisplayStatus(item) : item.status
            const badgeClasses = config.statusBadgeClasses?.[displayStatus] || 'bg-slate-100 text-slate-500'
            const dateToUse = item.statusChangedAt || item.createdAt
            const days = dateToUse
                ? Math.max(1, Math.floor((Date.now() - new Date(dateToUse).getTime()) / 86400000))
                : 1
            const daysSuffix =
                displayStatus && displayStatus !== 'Retired' ? ` (${days} day${days !== 1 ? 's' : ''})` : ''
            return (
                <td key={col.key} style={style}>
                    <div>
                        <span
                            className={`inline-block rounded-2xl text-xs font-semibold px-3.5 py-1.5 ${badgeClasses}`}
                        >
                            {displayStatus || '---'}
                            {daysSuffix}
                        </span>
                        <StatusHistoryBar
                            itemId={item.id}
                            itemType={config.historyType}
                            currentStatus={item.status}
                            createdAt={item.createdAt}
                        />
                    </div>
                </td>
            )
        }

        // --- Truck/equipment number with copy ---
        if (col.type === 'truckNumber') {
            const val = col.getValue ? col.getValue(item) : item[col.key]
            return (
                <td key={col.key} style={{ ...cellBold, width: col.width }}>
                    {val ? (
                        <div className="flex items-center gap-1.5">
                            {val}
                            {copyButton(val, col.copyTitle || 'Copy')}
                        </div>
                    ) : (
                        '---'
                    )}
                </td>
            )
        }

        // --- Operator lookup with action buttons ---
        if (col.type === 'operator') {
            const operator = operators.find((op) => op.employeeId === item[col.lookupField || 'assignedOperator'])
            return (
                <td key={col.key} style={style}>
                    {operator?.name ? (
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium">{operator.name}</span>
                                {copyButton(operator.name, 'Copy operator name')}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onOperatorComment?.(operator)
                                    }}
                                    title="Operator comments"
                                    className="relative inline-flex items-center gap-1 rounded-md border border-[color:var(--border-light)] bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] cursor-pointer text-[10px] px-1.5 py-0.5 transition-all hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)]"
                                >
                                    <i className="fas fa-comment text-[9px]" />
                                    <span>Comments</span>
                                    {operator.commentsCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full bg-blue-500 text-white text-[8px] font-bold leading-none shadow-sm">
                                            {operator.commentsCount > 9 ? '9+' : operator.commentsCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onOperatorHistory?.(operator)
                                    }}
                                    title="Operator history"
                                    className="relative inline-flex items-center gap-1 rounded-md border border-[color:var(--border-light)] bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] cursor-pointer text-[10px] px-1.5 py-0.5 transition-all hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)]"
                                >
                                    <i className="fas fa-history text-[9px]" />
                                    <span>History</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <span className="italic text-[color:var(--text-secondary)]">Not Assigned</span>
                    )}
                </td>
            )
        }

        // --- Star rating (cleanliness, condition) ---
        if (col.type === 'stars') {
            const rating = Math.round(item[col.ratingField || col.key] || 0)
            const showNAForRetired = col.naForRetired && item.status === 'Retired'
            return (
                <td key={col.key} style={style}>
                    {showNAForRetired ? (
                        <span className="text-[color:var(--text-secondary)]">N/A</span>
                    ) : (
                        <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <i
                                    key={i}
                                    className="fas fa-star text-sm"
                                    style={{ color: i < rating ? '#f59e0b' : 'var(--border-light)' }}
                                />
                            ))}
                            {col.dirtyWarning && rating > 0 && rating < 3 && (
                                <span className="bg-[#fee2e2] text-[#dc2626] rounded text-[10px] font-bold ml-2 px-2 py-0.5">
                                    DIRTY
                                </span>
                            )}
                        </div>
                    )}
                </td>
            )
        }

        // --- Verified button ---
        if (col.type === 'verified') {
            const isVerified = col.getIsVerified ? col.getIsVerified(item) : item.isVerified?.()
            const verifyBtnClass = (v) => {
                const base =
                    'inline-flex items-center border-none rounded-lg font-semibold whitespace-nowrap text-xs gap-1.5 px-3.5 py-2'
                return v
                    ? `${base} bg-[#dcfce7] text-[#166534] cursor-default`
                    : `${base} bg-[#fef3c7] text-[#92400e] cursor-pointer`
            }
            return (
                <td key={col.key} style={style}>
                    {item.status === 'Retired' ? (
                        <span className="bg-[color:var(--bg-secondary)] rounded-lg text-xs font-semibold text-[color:var(--text-secondary)] px-3.5 py-2">
                            N/A
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onVerify?.(item.id, config.getModalIdentifier(item))
                            }}
                            title={isVerified ? 'Verified' : 'Click to verify'}
                            className={verifyBtnClass(isVerified)}
                        >
                            <i className={`fas ${isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
                            <span>{isVerified ? 'Verified' : 'Verify'}</span>
                        </button>
                    )}
                </td>
            )
        }

        // --- Tractor lookup (Trailer view) ---
        if (col.type === 'tractor') {
            const tractor = item.assignedTractor ? tractors.find((t) => t.id === item.assignedTractor) : null
            return (
                <td key={col.key} style={style}>
                    {tractor?.truckNumber || '---'}
                </td>
            )
        }

        // --- VIN with copy button and duplicate warning ---
        if (col.type === 'vin') {
            const vinVal = col.getValue ? col.getValue(item) : item[col.key]
            const normalizedKey = col.normalize?.(item)
            const isDuplicate = normalizedKey && duplicates[col.duplicateKey]?.has(normalizedKey)
            return (
                <td
                    key={col.key}
                    style={{
                        ...style,
                        color: 'var(--text-secondary)',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '12px'
                    }}
                >
                    {vinVal ? (
                        <div className="flex items-center gap-1.5">
                            {vinVal}
                            {copyButton(vinVal, 'Copy VIN')}
                            {isDuplicate && (
                                <span
                                    className="bg-amber-50 text-amber-800 rounded text-[10px] font-bold px-2 py-1"
                                    title="Duplicate VIN"
                                >
                                    <i className="fas fa-exclamation-triangle" />
                                </span>
                            )}
                        </div>
                    ) : (
                        '---'
                    )}
                </td>
            )
        }

        // --- Text with duplicate warning ---
        if (col.type === 'textWithWarning') {
            const val = col.getValue ? col.getValue(item) : item[col.key]
            const normalizedKey = col.normalize?.(item)
            const isDuplicate = normalizedKey && duplicates[col.duplicateKey]?.has(normalizedKey)
            return (
                <td key={col.key} style={style}>
                    {val || '---'}
                    {isDuplicate && (
                        <span
                            className="bg-amber-50 text-amber-800 rounded text-[10px] font-bold ml-2 px-2 py-1"
                            title={col.warningTitle}
                        >
                            <i className="fas fa-exclamation-triangle" />
                        </span>
                    )}
                </td>
            )
        }

        // --- Number with conditional warning ---
        if (col.type === 'number') {
            const val = col.getValue ? col.getValue(item) : item[col.key]
            const hasWarning = col.getWarning?.(item)
            return (
                <td key={col.key} style={style}>
                    {val != null ? (
                        <>
                            {val}
                            {hasWarning && (
                                <span
                                    className={
                                        col.warningClassName ||
                                        'bg-red-50 text-red-800 rounded text-[10px] font-bold ml-2 px-2 py-1'
                                    }
                                    title={col.warningTitle}
                                >
                                    <i className="fas fa-exclamation-triangle" />
                                </span>
                            )}
                        </>
                    ) : (
                        '---'
                    )}
                </td>
            )
        }

        // --- Actions column (comments, issues, history) ---
        if (col.type === 'actions') {
            const identifier = config.getModalIdentifier(item)
            return (
                <td key={col.key} style={style}>
                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onComment(item.id, identifier)
                            }}
                            style={{ ...actionBtnStyle, position: 'relative' }}
                            title="View comments"
                        >
                            <i className="fas fa-comments" />
                            {item.commentsCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-md">
                                    {item.commentsCount > 9 ? '9+' : item.commentsCount}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onIssue(item.id, identifier)
                            }}
                            style={{ ...actionBtnStyle, position: 'relative' }}
                            title="View issues"
                        >
                            <i className="fas fa-tools" />
                            {item.openIssuesCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-md">
                                    {item.openIssuesCount > 9 ? '9+' : item.openIssuesCount}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onHistory(item)
                            }}
                            style={actionBtnStyle}
                            title="View history"
                        >
                            <i className="fas fa-history" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onSendMessage?.(item, identifier)
                            }}
                            style={actionBtnStyle}
                            title="Send as message"
                        >
                            <i className="fas fa-paper-plane" />
                        </button>
                    </div>
                </td>
            )
        }

        // --- Plant name lookup ---
        if (col.type === 'plant') {
            const plant = plants.find((p) => p.code === item[col.key || 'assignedPlant'])
            return (
                <td key={col.key || 'plant'} style={style}>
                    {plant?.name || item[col.key || 'assignedPlant'] || '---'}
                </td>
            )
        }

        // --- Default: plain text ---
        const val = col.getValue ? col.getValue(item) : item[col.key]
        return (
            <td key={col.key} style={style}>
                {val || '---'}
            </td>
        )
    }

    return (
        <tr
            onClick={() => onSelect(item.id)}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) =>
                e.currentTarget
                    .querySelectorAll('td')
                    .forEach((td) => (td.style.backgroundColor = 'var(--bg-tertiary)'))
            }
            onMouseLeave={(e) =>
                e.currentTarget.querySelectorAll('td').forEach((td) => (td.style.backgroundColor = alternatingBg))
            }
        >
            {columns.map(renderCell)}
        </tr>
    )
}
