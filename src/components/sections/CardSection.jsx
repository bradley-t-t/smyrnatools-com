import React from 'react';
import './styles/CardSection.css';
import {usePreferences} from '../../app/context/PreferencesContext';
import ThemeUtility from '../../utils/ThemeUtility';

function CardSection({
                         item,
                         itemType,
                         itemNumber,
                         onSelect,
                         onShowCommentModal,
                         onShowIssueModal,
                         statusColor,
                         isVerified,
                         verificationTooltip,
                         children
                     }) {
    const {preferences} = usePreferences();
    const openIssuesCount = Number(item.openIssuesCount || 0);
    const commentsCount = Number(item.commentsCount || 0);
    const otherAccent = ThemeUtility.getOtherAccentColor(preferences.accentColor);
    const accentColor = ThemeUtility.getAccentColor(otherAccent);
    const hasVerification = isVerified !== undefined;

    const handleCardClick = () => {
        if (onSelect && typeof onSelect === 'function') {
            onSelect(item.id);
        }
    };

    const cardProps = onSelect ? {onClick: handleCardClick} : {};

    return (
        <div className="item-card" {...cardProps}>
            <div className="status-bar" style={{background: statusColor}}/>

            {commentsCount > 0 && (
                <div
                    className="comments-badge"
                    style={{
                        right: hasVerification
                            ? (openIssuesCount > 0 ? '92px' : '42px')
                            : (openIssuesCount > 0 ? '62px' : '12px')
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onShowCommentModal) onShowCommentModal();
                    }}
                    title={`${commentsCount} comment${commentsCount !== 1 ? 's' : ''}`}
                >
                    <i className="fas fa-comments comment-icon"></i>
                    <span>{commentsCount}</span>
                </div>
            )}

            {openIssuesCount > 0 && (
                <div
                    className="issues-badge"
                    style={{
                        right: hasVerification ? '42px' : '12px'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onShowIssueModal) onShowIssueModal();
                    }}
                    title={`${openIssuesCount} open issue${openIssuesCount !== 1 ? 's' : ''}`}
                >
                    <i className="fas fa-tools issues-icon"></i>
                    <span>{openIssuesCount}</span>
                </div>
            )}

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
                </div>

                <div className="card-details">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default CardSection;
