import React from 'react'

import { useIsMobile } from '../../hooks/useIsMobile'
const BASE_ROW_DELAY_MS = 160
const MIN_ROW_DELAY_MS = 12
const DECAY_FACTOR = 0.9
/**
 * Computes cumulative animation delay for a row index using exponential decay.
 * Early rows cascade slowly; later rows arrive almost simultaneously.
 */
function getRowDelay(index) {
    let total = 0
    for (let i = 0; i < index; i++) {
        total += Math.max(MIN_ROW_DELAY_MS, BASE_ROW_DELAY_MS * Math.pow(DECAY_FACTOR, i))
    }
    return Math.round(total)
}
/**
 * Table-based list view mode for assets.
 * Renders rows with action buttons for comments, issues, history, and verification.
 * Responsive layout with compact sizing on mobile.
 */
function ListViewModeSection({
    filteredItems,
    operators,
    plants,
    handleSelectItem,
    renderRow,
    onShowCommentModal,
    onShowIssueModal,
    onShowHistoryModal,
    onVerify
}) {
    const isMobile = useIsMobile()
    const styles = {
        actionBtn: {
            alignItems: 'center',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            fontSize: isMobile ? '12px' : '14px',
            height: isMobile ? '28px' : '36px',
            justifyContent: 'center',
            width: isMobile ? '28px' : '36px'
        },
        actionsContainer: {
            alignItems: 'center',
            display: 'flex',
            gap: isMobile ? '4px' : '8px'
        },
        cell: {
            color: 'var(--text-primary)',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 500,
            padding: isMobile ? '10px 8px' : '16px 20px',
            textAlign: 'left',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap'
        },
        cellHighlight: {
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '13px' : '15px',
            fontWeight: 700,
            padding: isMobile ? '10px 8px' : '16px 20px',
            textAlign: 'left',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap'
        },
        cellSecondary: {
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '11px' : '13px',
            padding: isMobile ? '10px 8px' : '16px 20px',
            textAlign: 'left',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap'
        },
        container: {
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: isMobile ? '8px 8px 0 0' : '12px 12px 0 0',
            boxSizing: 'border-box',
            minWidth: isMobile ? '1100px' : 'auto',
            overflow: 'hidden',
            width: '100%'
        },
        emptyIcon: {
            color: '#cbd5e1',
            fontSize: isMobile ? '40px' : '56px',
            marginBottom: '16px'
        },
        emptyState: {
            backgroundColor: 'var(--bg-primary)',
            padding: isMobile ? '40px 20px' : '80px 40px',
            textAlign: 'center'
        },
        emptyText: {
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '14px' : '18px',
            fontWeight: 500,
            margin: 0
        },
        notRated: {
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '10px' : '12px',
            fontStyle: 'italic'
        },
        row: {
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-light)',
            cursor: 'pointer'
        },
        starEmpty: {
            color: '#e2e8f0',
            fontSize: isMobile ? '12px' : '14px'
        },
        starFilled: {
            color: '#f59e0b',
            fontSize: isMobile ? '12px' : '14px'
        },
        starsContainer: {
            alignItems: 'center',
            display: 'flex',
            gap: '1px'
        },
        statusBadge: (status) => {
            const colorMap = {
                Active: 'bg-[#dcfce7] text-[#166534]',
                'Down In Yard': 'bg-[#fee2e2] text-[#dc2626]',
                'In Shop': 'bg-[#dbeafe] text-[#1e40af]',
                Spare: 'bg-[#f3e8ff] text-[#7c3aed]',
                'Third Party Work': 'bg-[#fef9c3] text-[#a16207]',
                'Waiting For Shop': 'bg-[#ffedd5] text-[#c2410c]'
            }
            const colors = colorMap[status] || 'bg-bg-tertiary text-text-secondary'
            const size = isMobile ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'
            return `inline-block rounded-2xl font-semibold ${size} ${colors}`
        },
        table: {
            borderCollapse: 'collapse',
            width: '100%'
        },
        verifyBtn: (isVerified) => {
            const colors = isVerified ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'
            const cursor = isVerified ? 'cursor-default' : 'cursor-pointer'
            const size = isMobile ? 'text-[10px] gap-1 px-2.5 py-1.5' : 'text-xs gap-1.5 px-3.5 py-2'
            return `inline-flex items-center border-none rounded-lg font-semibold whitespace-nowrap ${size} ${cursor} ${colors}`
        },
        verifyNA: {
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            display: 'inline-block',
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: 600,
            padding: isMobile ? '6px 10px' : '8px 14px'
        },
        vinText: {
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: isMobile ? '10px' : '12px',
            padding: isMobile ? '3px 6px' : '4px 8px'
        },
        wrapper: {
            WebkitOverflowScrolling: 'touch',
            boxSizing: 'border-box',
            marginBottom: '24px',
            marginLeft: isMobile ? '4px' : '24px',
            marginRight: isMobile ? '4px' : '24px',
            marginTop: isMobile ? '12px' : '30px',
            overflowX: 'auto'
        }
    }
    if (!filteredItems || filteredItems.length === 0) {
        return (
            <div style={styles.wrapper}>
                <div style={styles.container}>
                    <div style={styles.emptyState}>
                        <i className="fas fa-inbox" style={styles.emptyIcon}></i>
                        <p style={styles.emptyText}>No items to display</p>
                    </div>
                </div>
            </div>
        )
    }
    if (renderRow) {
        return (
            <div style={styles.wrapper}>
                <style>{`
                    @keyframes slideInRow {
                        from { opacity: 0; transform: translateX(-20px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    .list-row-animated {
                        animation: slideInRow 0.4s ease-out both;
                    }
                `}</style>
                <div style={styles.container}>
                    <table style={styles.table}>
                        <tbody>
                            {filteredItems.map((item, index) => {
                                const alternatingBg = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                                const row = renderRow(
                                    item,
                                    handleSelectItem,
                                    onShowCommentModal,
                                    onShowIssueModal,
                                    onVerify,
                                    onShowHistoryModal,
                                    index,
                                    alternatingBg
                                )
                                return React.cloneElement(row, {
                                    className: `list-row-animated ${row.props.className || ''}`.trim(),
                                    key: row.key || item.id,
                                    style: {
                                        ...styles.row,
                                        animationDelay: `${getRowDelay(index)}ms`,
                                        backgroundColor: alternatingBg,
                                        ...row.props.style
                                    }
                                })
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
    const renderStars = (rating) => {
        if (!rating) return <span style={styles.notRated}>Not Rated</span>
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i key={i} className="fas fa-star" style={i <= rating ? styles.starFilled : styles.starEmpty}></i>
            )
        }
        return <div style={styles.starsContainer}>{stars}</div>
    }
    return (
        <div style={styles.wrapper}>
            <style>{`
                @keyframes slideInRow {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .list-row-animated {
                    animation: slideInRow 0.4s ease-out both;
                }
            `}</style>
            <div style={styles.container}>
                <table style={styles.table}>
                    <tbody>
                        {filteredItems.map((item, index) => {
                            const operator = operators?.find((op) => op.employeeId === item.assignedOperator)
                            const plant = plants?.find((p) => p.code === item.assignedPlant)
                            const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || ''
                            const isVerified = typeof item.isVerified === 'function' ? item.isVerified() : item.verified
                            const alternatingBg = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                            return (
                                <tr
                                    key={item.id}
                                    className="list-row-animated"
                                    style={{
                                        ...styles.row,
                                        animationDelay: `${getRowDelay(index)}ms`,
                                        backgroundColor: alternatingBg
                                    }}
                                    onClick={() => handleSelectItem(item.id)}
                                    onMouseEnter={(e) => {
                                        const cells = e.currentTarget.querySelectorAll('td')
                                        cells.forEach((cell) => (cell.style.backgroundColor = '#e0f2fe'))
                                    }}
                                    onMouseLeave={(e) => {
                                        const cells = e.currentTarget.querySelectorAll('td')
                                        cells.forEach((cell) => (cell.style.backgroundColor = ''))
                                    }}
                                >
                                    <td style={styles.cell}>{plant?.name || item.assignedPlant || '-'}</td>
                                    <td style={styles.cellHighlight}>
                                        {item.truckNumber || item.trailerNumber || '-'}
                                    </td>
                                    <td style={styles.cellSecondary}>
                                        <span className={styles.statusBadge(item.status)}>{item.status}</span>
                                    </td>
                                    <td style={styles.cellSecondary}>
                                        {operator?.name || (
                                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                Not Assigned
                                            </span>
                                        )}
                                    </td>
                                    <td style={styles.cellSecondary}>{renderStars(item.cleanlinessRating)}</td>
                                    <td style={styles.cellSecondary}>
                                        {item.vinNumber || item.vin ? (
                                            <span style={styles.vinText}>{item.vinNumber || item.vin}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                        )}
                                    </td>
                                    <td style={styles.cellSecondary}>
                                        {item.status === 'Retired' ? (
                                            <span style={styles.verifyNA}>N/A</span>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (!isVerified && onVerify) {
                                                        onVerify(item.id, number)
                                                    }
                                                }}
                                                title={isVerified ? 'Verified' : 'Click to verify'}
                                                className={styles.verifyBtn(isVerified)}
                                                disabled={isVerified}
                                            >
                                                <i
                                                    className={`fas ${isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
                                                ></i>
                                                <span>{isVerified ? 'Verified' : 'Verify'}</span>
                                            </button>
                                        )}
                                    </td>
                                    <td style={styles.cellSecondary}>
                                        <div style={styles.actionsContainer}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onShowCommentModal && onShowCommentModal(item.id, number)
                                                }}
                                                title="Comments"
                                                style={styles.actionBtn}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--accent)'
                                                    e.currentTarget.style.color = 'white'
                                                    e.currentTarget.style.borderColor = 'var(--accent)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                                    e.currentTarget.style.borderColor = 'var(--border-light)'
                                                }}
                                            >
                                                <i className="fas fa-comment"></i>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onShowIssueModal && onShowIssueModal(item.id, number)
                                                }}
                                                title="Issues"
                                                style={styles.actionBtn}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--accent)'
                                                    e.currentTarget.style.color = 'white'
                                                    e.currentTarget.style.borderColor = 'var(--accent)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                                    e.currentTarget.style.borderColor = 'var(--border-light)'
                                                }}
                                            >
                                                <i className="fas fa-wrench"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
export default ListViewModeSection
