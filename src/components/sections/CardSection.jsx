import React from 'react';
import {usePreferences} from '../../app/context/PreferencesContext';
import ThemeUtility from '../../utils/ThemeUtility';

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
    const {preferences} = usePreferences();
    const otherAccent = ThemeUtility.getOtherAccentColor(preferences.accentColor);
    const accentColor = ThemeUtility.getAccentColor(otherAccent);

    const handleCardClick = () => {
        if (onSelect && typeof onSelect === 'function') {
            onSelect(item.id);
        }
    };

    const cardProps = onSelect ? {onClick: handleCardClick} : {};

    const styles = {
        card: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
            cursor: onSelect ? 'pointer' : 'default',
            position: 'relative',
            border: '1px solid #e5e7eb'
        },
        statusBar: {
            height: '100%',
            width: '6px',
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 10,
            borderRadius: '8px 0 0 8px',
            background: statusColor
        },
        verificationFlag: (verified) => ({
            position: 'absolute',
            top: '16px',
            right: '12px',
            fontSize: '1.3rem',
            zIndex: 5,
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
            color: verified ? '#16a34a' : '#dc2626'
        }),
        cardContent: {
            padding: '32px'
        },
        cardHeader: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            marginBottom: '28px',
            paddingBottom: '18px',
            borderBottom: '2px solid #e5e7eb',
            gap: '8px'
        },
        itemName: {
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            textAlign: 'left',
            width: '100%',
            color: accentColor
        },
        itemSubtitle: {
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textAlign: 'left',
            width: '100%'
        },
        warningBadge: {
            color: '#f59e0b',
            marginLeft: '8px',
            fontSize: '1.1rem'
        },
        cardDetails: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        }
    };

    return (
        <div 
            style={styles.card} 
            {...cardProps}
            onMouseEnter={(e) => {
                if (onSelect) {
                    e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }
            }}
            onMouseLeave={(e) => {
                if (onSelect) {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
            onMouseDown={(e) => {
                if (onSelect) {
                    e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
        >
            <div style={styles.statusBar} />

            {isVerified !== undefined && (
                <div
                    style={styles.verificationFlag(isVerified)}
                    title={isVerified ? 'Verified' : (verificationTooltip || 'Not verified')}
                >
                    <i 
                        className={`fas ${isVerified ? 'fa-check-circle' : 'fa-flag'}`}
                        style={{color: isVerified ? '#16a34a' : '#dc2626'}}
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

                <div style={styles.cardDetails}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default CardSection;
