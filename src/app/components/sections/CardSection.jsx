import React from 'react'
/**
 * Shared CSS classes consumed by child card components (OperatorCard, TractorCard, etc.).
 * These must remain as a style block until all consumer components are migrated to Tailwind.
 */
const childCardStyles = `
    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-light);
    }
    .detail-row:last-child {
        border-bottom: none;
    }
    .detail-label {
        color: var(--text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
    }
    .detail-value {
        color: var(--text-primary);
        font-size: 0.875rem;
        font-weight: 600;
        text-align: right;
    }
    .detail-value.overdue {
        color: var(--danger);
        font-weight: 700;
    }
    .stars-container {
        display: inline-flex;
        gap: 2px;
    }
    .stars-container .filled-star {
        color: #facc15;
    }
    .stars-container .empty-star {
        color: var(--border-medium);
    }
    .in-yard-badge {
        background-color: #fef2f2;
        border-radius: 6px;
        color: #991b1b;
        font-size: 10px;
        font-weight: 700;
        padding: 4px 8px;
    }
    html.dark .in-yard-badge {
        background-color: #1a0a0a;
        color: #fca5a5;
    }
`
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
    const cardProps = onSelect ? { onClick: handleCardClick } : {}
    return (
        <>
            <style>{childCardStyles}</style>
            <div
                className={`relative bg-bg-primary border border-border-light rounded-card shadow-card overflow-hidden mb-6 transition-all duration-200 ${onSelect ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0' : ''}`}
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
                                    <span className="text-amber-400 text-lg ml-2" title={subtitleWarning}>
                                        <i className="fas fa-exclamation-triangle"></i>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Detail rows — consumers provide .detail-row / .detail-label / .detail-value children */}
                    <div className="flex flex-col gap-1">{children}</div>
                </div>
            </div>
        </>
    )
}
export default CardSection
