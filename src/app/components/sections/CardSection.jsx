/* eslint-disable react/forbid-dom-props */
import React from 'react'

/**
 * Asset summary card used in grid view mode.
 * Displays a colored status bar, item number, subtitle, verification flag,
 * and detail rows passed as children. Supports click-to-select.
 */
function CardSection({
    item,
    itemType,
    itemNumber,
    subtitle,
    subtitleWarning,
    onSelect,
    onShowCommentModal: _onShowCommentModal,
    onShowIssueModal: _onShowIssueModal,
    statusColor,
    isVerified,
    verificationTooltip,
    children
}) {
    const handleCardClick = () => {
        if (onSelect && typeof onSelect === 'function') {
            onSelect(item.id)
        }
    }
    const handleCardKeyDown = (e) => {
        if (onSelect && typeof onSelect === 'function' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onSelect(item.id)
        }
    }
    const cardProps = onSelect
        ? { onClick: handleCardClick, onKeyDown: handleCardKeyDown, role: 'button', tabIndex: 0 }
        : {}
    return (
        <div
            className={`relative bg-bg-primary border border-border-light rounded-card shadow-card overflow-hidden mb-6 transition-[colors,transform,box-shadow] duration-200 motion-reduce:transition-none ${onSelect ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] active:opacity-80' : ''}`}
            {...cardProps}
        >
            {/* Status color bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg z-10"
                style={{ background: statusColor }}
            />
            {/* Verification flag */}
            {isVerified !== undefined && (
                <div
                    className="absolute right-3 top-4 z-[5] text-xl drop-shadow-md"
                    title={isVerified ? 'Verified' : verificationTooltip || 'Not verified'}
                >
                    <i
                        className={`fas ${isVerified ? 'fa-check-circle' : 'fa-flag'}`}
                        style={{ color: isVerified ? '#16a34a' : '#dc2626' }}
                    ></i>
                </div>
            )}
            <div className="p-8">
                <div className="flex flex-col items-start gap-2 border-b-2 border-border-light mb-7 pb-[18px]">
                    <h3 className="text-accent text-2xl font-bold tracking-tight leading-[1.3] m-0 text-left w-full">
                        {itemType} #{itemNumber || 'Not Assigned'}
                    </h3>
                    {subtitle && (
                        <div className="flex items-center text-text-secondary text-base font-semibold gap-1.5 m-0 text-left w-full">
                            {subtitle}
                            {subtitleWarning && (
                                <span className="text-text-primary text-lg ml-2" title={subtitleWarning}>
                                    <i className="fas fa-exclamation-triangle"></i>
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-1">{children}</div>
            </div>
        </div>
    )
}
export default CardSection
