/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { isDarkLikeTheme } from '../../constants/themeConstants'
import { usePreferences } from '../../context/PreferencesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Badge from '../common/Badge'
import StarRating from '../common/StarRating'

const BASE_ROW_DELAY_MS = 80
const MIN_ROW_DELAY_MS = 6
const DECAY_FACTOR = 0.88

/**
 * Status name → unified Badge tone. Mirrors AssetListRow so list view and
 * detail panels read identically across all three themes.
 */
const STATUS_TO_TONE = {
    Active: 'success',
    'Down In Yard': 'danger',
    'In Shop': 'info',
    Spare: 'neutral',
    'Third Party Work': 'warning',
    'Waiting For Shop': 'warning'
}

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

/** Minimal row icon button — 20px tap target, no chrome, hover brightness. */
const RowIconButton = ({ icon, title, onClick }) => (
    <button type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="flex items-center justify-center w-5 h-5 rounded text-[11px] cursor-pointer border-none bg-transparent hover:brightness-90 transition-colors text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
    >
        <i className={`fas ${icon}`} />
    </button>
)

/**
 * Asset list — dense, single-line rows on a solid `var(--bg-primary)`
 * surface with hairline dividers. Tightened from the previous version:
 * cell padding 1.5/2.5 (was 2/3), 12px body (was 12.5px), 9.5px status
 * pills, 5×5 row icons. Hover darkens the row to `var(--bg-tertiary)`.
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
    const { preferences } = usePreferences()
    /** Status + verified pills flip their text colour to white on the
     *  dark / grayed themes so the count + label reads against the
     *  darker chrome. The tinted background stays so each pill still
     *  carries the per-status colour cue. */
    const isDarkBadgeTheme = isDarkLikeTheme(preferences.themeMode)
    const cellBase = 'text-[12px] font-medium text-left align-middle whitespace-nowrap py-1.5 px-2.5'
    const cellHighlight = `font-bold text-left align-middle whitespace-nowrap font-mono tabular-nums py-1.5 ${
        isMobile ? 'text-[12px] px-2' : 'text-[12.5px] px-2.5'
    }`
    const cellSecondary = `text-left align-middle whitespace-nowrap py-1.5 ${
        isMobile ? 'text-[11px] px-2' : 'text-[12px] px-2.5'
    }`

    const verifyBtnClass = (isVerified) => {
        const bg = isVerified ? 'bg-[#dcfce7]' : 'bg-[#fef3c7] hover:brightness-95'
        const text = isDarkBadgeTheme ? 'text-white' : 'text-text-primary'
        const cursor = isVerified ? 'cursor-default' : 'cursor-pointer'
        return `inline-flex items-center gap-1 border-none rounded text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${cursor} ${bg} ${text}`
    }

    // Horizontal scroll lives on the outer wrapper; the inner container sets a
    // min-width on mobile so the dense column set forces overflow inside the
    // table area instead of bleeding past the viewport edge.
    const wrapperClasses = `mb-5 overflow-x-auto ${isMobile ? 'mx-1 mt-2' : 'mx-4 lg:mx-6 mt-3'}`
    const containerStyle = {
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: 6,
        overflow: 'hidden'
    }
    const containerClasses = `box-border ${isMobile ? 'min-w-[1100px]' : 'w-full'}`

    if (!filteredItems || filteredItems.length === 0) {
        return (
            <div className={wrapperClasses} style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className={containerClasses} style={containerStyle}>
                    <div className="text-center py-6 px-4 text-[12px] text-text-secondary">
                        No items match the current filters.
                    </div>
                </div>
            </div>
        )
    }

    if (renderRow) {
        return (
            <div className={wrapperClasses} style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className={containerClasses} style={containerStyle}>
                    <table className="border-collapse w-full">
                        <tbody>
                            {filteredItems.map((item, index) => {
                                const row = renderRow(
                                    item,
                                    handleSelectItem,
                                    onShowCommentModal,
                                    onShowIssueModal,
                                    onVerify,
                                    onShowHistoryModal,
                                    index,
                                    'var(--bg-primary)'
                                )
                                return React.cloneElement(row, {
                                    className:
                                        `animate-slide-in-row hover:[&>td]:bg-bg-tertiary ${row.props.className || ''}`.trim(),
                                    key: row.key || item.id,
                                    style: {
                                        animationDelay: `${getRowDelay(index)}ms`,
                                        backgroundColor: 'var(--bg-primary)',
                                        borderBottom: '1px solid var(--border-light)',
                                        cursor: 'pointer',
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

    const renderStars = (rating) => <StarRating value={rating} tone="warning" size="xs" notRatedLabel="—" />

    return (
        <div className={wrapperClasses} style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className={containerClasses} style={containerStyle}>
                <table className="border-collapse w-full">
                    <tbody>
                        {filteredItems.map((item, index) => {
                            const operator = operators?.find((op) => op.employeeId === item.assignedOperator)
                            const plant = plants?.find((p) => p.code === item.assignedPlant)
                            const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || ''
                            const isVerified = typeof item.isVerified === 'function' ? item.isVerified() : item.verified
                            return (
                                <tr
                                    key={item.id}
                                    className="animate-slide-in-row cursor-pointer hover:[&>td]:bg-bg-tertiary bg-bg-primary border-b border-border-light"
                                    style={{ animationDelay: `${getRowDelay(index)}ms` }}
                                    onClick={() => handleSelectItem(item.id)}
                                >
                                    <td className={cellBase} style={{ color: 'var(--text-primary)' }}>
                                        {plant?.name || item.assignedPlant || '—'}
                                    </td>
                                    <td className={cellHighlight} style={{ color: 'var(--text-primary)' }}>
                                        {item.truckNumber || item.trailerNumber || '—'}
                                    </td>
                                    <td className={cellSecondary} style={{ color: 'var(--text-secondary)' }}>
                                        <Badge
                                            tone={STATUS_TO_TONE[item.status] || 'neutral'}
                                            size="sm"
                                            weight="semibold"
                                        >
                                            {item.status}
                                        </Badge>
                                    </td>
                                    <td className={cellSecondary} style={{ color: 'var(--text-secondary)' }}>
                                        {operator?.name || <span className="italic text-text-tertiary">—</span>}
                                    </td>
                                    <td className={cellSecondary}>{renderStars(item.cleanlinessRating)}</td>
                                    <td className={cellSecondary} style={{ color: 'var(--text-secondary)' }}>
                                        {item.vinNumber || item.vin ? (
                                            <Badge
                                                tone="neutral"
                                                size="sm"
                                                weight="semibold"
                                                uppercase={false}
                                                className="font-mono tabular-nums"
                                            >
                                                {item.vinNumber || item.vin}
                                            </Badge>
                                        ) : (
                                            <span className="text-text-tertiary">—</span>
                                        )}
                                    </td>
                                    <td className={cellSecondary}>
                                        {item.status === 'Retired' ? (
                                            <Badge tone="neutral" size="sm" weight="bold">
                                                N/A
                                            </Badge>
                                        ) : (
                                            <button type="button"
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
                                                    className={`fas ${
                                                        isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'
                                                    } text-[8px]`}
                                                />
                                                <span>{isVerified ? 'Verified' : 'Verify'}</span>
                                            </button>
                                        )}
                                    </td>
                                    <td className={cellSecondary}>
                                        <div className="flex items-center gap-0.5">
                                            <RowIconButton
                                                icon="fa-comment"
                                                title="Comments"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onShowCommentModal && onShowCommentModal(item.id, number)
                                                }}
                                            />
                                            <RowIconButton
                                                icon="fa-wrench"
                                                title="Issues"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onShowIssueModal && onShowIssueModal(item.id, number)
                                                }}
                                            />
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
