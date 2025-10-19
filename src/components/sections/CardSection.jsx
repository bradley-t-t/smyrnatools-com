import React from 'react';
import './styles/CardSection.css';
import {usePreferences} from '../../app/context/PreferencesContext';
import ThemeUtility from '../../utils/ThemeUtility';

function CardSection({
                         item,
                         itemType,
                         itemNumber,
                         subtitle,
                         subtitleWarning,
                         onSelect,
                         onShowCommentModal,
                         onShowIssueModal,
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

    return (
        <div className="item-card" {...cardProps}>
            <div className="status-bar" style={{background: statusColor}}/>

            {isVerified !== undefined && (
                isVerified ? (
                    <div
                        className="verification-flag"
                        style={{color: 'var(--success)'}}
                        title="Verified"
                    >
                        <i className="fas fa-check-circle" style={{color: 'var(--success)'}}></i>
                    </div>
                ) : (
                    <div
                        className="verification-flag"
                        style={{color: 'var(--error)'}}
                        title={verificationTooltip || 'Not verified'}
                    >
                        <i className="fas fa-flag" style={{color: 'var(--error)'}}></i>
                    </div>
                )
            )}

            <div className="card-content">
                <div className="card-header">
                    <h3 className="item-name" style={{color: accentColor}}>
                        {itemType} #{itemNumber || 'Not Assigned'}
                    </h3>
                    {subtitle && (
                        <div className="item-subtitle">
                            {subtitle}
                            {subtitleWarning && (
                                <span className="warning-badge" title={subtitleWarning}>
                                    <i className="fas fa-exclamation-triangle"></i>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="card-details">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default CardSection;
