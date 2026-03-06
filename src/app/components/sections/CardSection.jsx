import React from 'react'
const cardStyles = `
    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
    }
    .detail-row:last-child {
        border-bottom: none;
    }
    .detail-label {
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 500;
    }
    .detail-value {
        color: #1e293b;
        font-size: 0.875rem;
        font-weight: 600;
        text-align: right;
    }
    .detail-value.overdue {
        color: #dc2626;
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
        color: #e5e7eb;
    }
    .in-yard-badge {
        background-color: #fef2f2;
        border-radius: 6px;
        color: #991b1b;
        font-size: 10px;
        font-weight: 700;
        padding: 4px 8px;
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
    const accentColor = 'var(--accent)'
    const handleCardClick = () => {
        if (onSelect && typeof onSelect === 'function') {
            onSelect(item.id)
        }
    }
    const cardProps = onSelect ? { onClick: handleCardClick } : {}
    const styles = {
        card: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            cursor: onSelect ? 'pointer' : 'default',
            marginBottom: '24px',
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.2s ease'
        },
        cardContent: {
            padding: '32px'
        },
        cardDetails: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        },
        cardHeader: {
            alignItems: 'flex-start',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            justifyContent: 'flex-start',
            marginBottom: '28px',
            paddingBottom: '18px'
        },
        itemName: {
            color: accentColor,
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            margin: 0,
            textAlign: 'left',
            width: '100%'
        },
        itemSubtitle: {
            alignItems: 'center',
            color: '#64748b',
            display: 'flex',
            fontSize: '1rem',
            fontWeight: 600,
            gap: '6px',
            margin: 0,
            textAlign: 'left',
            width: '100%'
        },
        statusBar: {
            background: statusColor,
            borderRadius: '8px 0 0 8px',
            bottom: 0,
            height: '100%',
            left: 0,
            position: 'absolute',
            top: 0,
            width: '6px',
            zIndex: 10
        },
        verificationFlag: (verified) => ({
            color: verified ? '#16a34a' : '#dc2626',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
            fontSize: '1.3rem',
            position: 'absolute',
            right: '12px',
            top: '16px',
            zIndex: 5
        }),
        warningBadge: {
            color: '#f59e0b',
            fontSize: '1.1rem',
            marginLeft: '8px'
        }
    }
    return (
        <>
            <style>{cardStyles}</style>
            <div
                style={styles.card}
                {...cardProps}
                onMouseEnter={(e) => {
                    if (onSelect) {
                        e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.15)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                    }
                }}
                onMouseLeave={(e) => {
                    if (onSelect) {
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                        e.currentTarget.style.transform = 'translateY(0)'
                    }
                }}
                onMouseDown={(e) => {
                    if (onSelect) {
                        e.currentTarget.style.transform = 'translateY(0)'
                    }
                }}
            >
                <div style={styles.statusBar} />
                {isVerified !== undefined && (
                    <div
                        style={styles.verificationFlag(isVerified)}
                        title={isVerified ? 'Verified' : verificationTooltip || 'Not verified'}
                    >
                        <i
                            className={`fas ${isVerified ? 'fa-check-circle' : 'fa-flag'}`}
                            style={{ color: isVerified ? '#16a34a' : '#dc2626' }}
                        ></i>
                    </div>
                )}
                <div style={styles.cardContent}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.itemName}>
                            {itemType} #{itemNumber || 'Not Assigned'}
                        </h3>
                        {subtitle && (
                            <div style={styles.itemSubtitle}>
                                {subtitle}
                                {subtitleWarning && (
                                    <span style={styles.warningBadge} title={subtitleWarning}>
                                        <i className="fas fa-exclamation-triangle"></i>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={styles.cardDetails}>{children}</div>
                </div>
            </div>
        </>
    )
}
export default CardSection
