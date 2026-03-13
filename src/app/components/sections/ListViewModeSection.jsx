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
    const cellBase = `text-text-primary font-medium text-left align-middle whitespace-nowrap ${isMobile ? 'text-xs py-2.5 px-2' : 'text-sm py-4 px-5'}`
    const cellHighlight = `text-text-secondary font-bold text-left align-middle whitespace-nowrap ${isMobile ? 'text-[13px] py-2.5 px-2' : 'text-[15px] py-4 px-5'}`
    const cellSecondary = `text-text-secondary text-left align-middle whitespace-nowrap ${isMobile ? 'text-[11px] py-2.5 px-2' : 'text-[13px] py-4 px-5'}`
    const statusBadge = (status) => {
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
    }
    const verifyBtnClass = (isVerified) => {
        const colors = isVerified ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'
        const cursor = isVerified ? 'cursor-default' : 'cursor-pointer'
        const size = isMobile ? 'text-[10px] gap-1 px-2.5 py-1.5' : 'text-xs gap-1.5 px-3.5 py-2'
        return `inline-flex items-center border-none rounded-lg font-semibold whitespace-nowrap ${size} ${cursor} ${colors}`
    }
    const wrapperClasses = `overflow-x-auto mb-6 ${isMobile ? 'mx-1 mt-3' : 'mx-6 mt-[30px]'}`
    const containerClasses = `bg-bg-primary border border-border-light w-full overflow-hidden box-border ${isMobile ? 'rounded-t-lg min-w-[1100px]' : 'rounded-t-xl'}`
    if (!filteredItems || filteredItems.length === 0) {
        return (
            <div className={wrapperClasses} style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className={containerClasses}>
                    <div className={`bg-bg-primary text-center ${isMobile ? 'py-10 px-5' : 'py-20 px-10'}`}>
                        <i
                            className={`fas fa-inbox text-slate-300 mb-4 ${isMobile ? 'text-[40px]' : 'text-[56px]'}`}
                        ></i>
                        <p className={`text-text-secondary font-medium m-0 ${isMobile ? 'text-sm' : 'text-lg'}`}>
                            No items to display
                        </p>
                    </div>
                </div>
            </div>
        )
    }
    if (renderRow) {
        return (
            <div className={wrapperClasses} style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className={containerClasses}>
                    <table className="border-collapse w-full">
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
                                    className: `animate-slide-in-row ${row.props.className || ''}`.trim(),
                                    key: row.key || item.id,
                                    style: {
                                        backgroundColor: alternatingBg,
                                        borderBottom: '1px solid var(--border-light)',
                                        cursor: 'pointer',
                                        animationDelay: `${getRowDelay(index)}ms`,
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
        if (!rating) {
            return (
                <span className={`text-text-secondary italic ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Not Rated</span>
            )
        }
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i
                    key={i}
                    className={`fas fa-star ${isMobile ? 'text-xs' : 'text-sm'}`}
                    style={{ color: i <= rating ? '#f59e0b' : '#e2e8f0' }}
                ></i>
            )
        }
        return <div className="flex items-center gap-px">{stars}</div>
    }
    return (
        <div className={wrapperClasses} style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className={containerClasses}>
                <table className="border-collapse w-full">
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
                                    className="animate-slide-in-row border-b border-border-light cursor-pointer hover:[&>td]:bg-bg-hover"
                                    style={{
                                        animationDelay: `${getRowDelay(index)}ms`,
                                        backgroundColor: alternatingBg
                                    }}
                                    onClick={() => handleSelectItem(item.id)}
                                >
                                    <td className={cellBase}>{plant?.name || item.assignedPlant || '-'}</td>
                                    <td className={cellHighlight}>{item.truckNumber || item.trailerNumber || '-'}</td>
                                    <td className={cellSecondary}>
                                        <span className={statusBadge(item.status)}>{item.status}</span>
                                    </td>
                                    <td className={cellSecondary}>
                                        {operator?.name || (
                                            <span className="text-text-secondary italic">Not Assigned</span>
                                        )}
                                    </td>
                                    <td className={cellSecondary}>{renderStars(item.cleanlinessRating)}</td>
                                    <td className={cellSecondary}>
                                        {item.vinNumber || item.vin ? (
                                            <span
                                                className={`bg-bg-secondary rounded font-mono ${isMobile ? 'text-[10px] py-0.5 px-1.5' : 'text-xs py-1 px-2'} text-text-secondary`}
                                            >
                                                {item.vinNumber || item.vin}
                                            </span>
                                        ) : (
                                            <span className="text-text-secondary">-</span>
                                        )}
                                    </td>
                                    <td className={cellSecondary}>
                                        {item.status === 'Retired' ? (
                                            <span
                                                className={`inline-block bg-bg-tertiary rounded-lg text-text-secondary font-semibold ${isMobile ? 'text-[10px] py-1.5 px-2.5' : 'text-xs py-2 px-3.5'}`}
                                            >
                                                N/A
                                            </span>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (!isVerified && onVerify) {
                                                        onVerify(item.id, number)
                                                    }
                                                }}
                                                title={isVerified ? 'Verified' : 'Click to verify'}
                                                className={verifyBtnClass(isVerified)}
                                                disabled={isVerified}
                                            >
                                                <i
                                                    className={`fas ${isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
                                                ></i>
                                                <span>{isVerified ? 'Verified' : 'Verify'}</span>
                                            </button>
                                        )}
                                    </td>
                                    <td className={cellSecondary}>
                                        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onShowCommentModal && onShowCommentModal(item.id, number)
                                                }}
                                                title="Comments"
                                                className={`flex items-center justify-center bg-bg-primary border border-border-light rounded-lg text-text-secondary cursor-pointer hover:bg-accent hover:text-white hover:border-accent transition-colors ${isMobile ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'}`}
                                            >
                                                <i className="fas fa-comment"></i>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onShowIssueModal && onShowIssueModal(item.id, number)
                                                }}
                                                title="Issues"
                                                className={`flex items-center justify-center bg-bg-primary border border-border-light rounded-lg text-text-secondary cursor-pointer hover:bg-accent hover:text-white hover:border-accent transition-colors ${isMobile ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'}`}
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
