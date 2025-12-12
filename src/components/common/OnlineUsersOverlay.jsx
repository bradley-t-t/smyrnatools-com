import React, {useEffect, useRef, useState} from 'react';
import {usePresence} from '../../app/hooks/usePresence';
import {usePreferences} from '../../app/context/PreferencesContext';
import {RegionService} from '../../services/RegionService';
import './styles/OnlineUsersOverlay.css';

const formatLastActivity = (lastActivity) => {
    if (!lastActivity) return null;
    const now = new Date();
    const activityDate = new Date(lastActivity);
    if (isNaN(activityDate.getTime())) return null;
    const diffMs = now - activityDate;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 120) {
        return 'Active now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else {
        return `${diffDays}d ago`;
    }
};

function OnlineUsersOverlay() {
    const {onlineUsers, loading, error} = usePresence();
    const {preferences} = usePreferences();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [animateCount, setAnimateCount] = useState(false);
    const [, setTick] = useState(0);
    const prevCountRef = useRef(onlineUsers.length);
    const isLoggedIn = true;

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading && onlineUsers.length !== prevCountRef.current) {
            setAnimateCount(true);
            const timer = setTimeout(() => setAnimateCount(false), 500);
            prevCountRef.current = onlineUsers.length;
            return () => clearTimeout(timer);
        }
    }, [onlineUsers.length, loading]);

    const toggleExpand = () => setIsExpanded(!isExpanded);
    const toggleMinimize = () => setIsMinimized(!isMinimized);

    if (!preferences || preferences.showOnlineOverlay === false) return null;
    if (!isLoggedIn || loading || error || onlineUsers.length === 0) return null;

    return (
        <div className={`ouo-online-users-overlay${isExpanded ? ' expanded' : ''}${isMinimized ? ' minimized' : ''}`}>
            {isMinimized ? (
                <div className="ouo-online-users-minimized-compact" onClick={toggleMinimize} tabIndex={0}
                     aria-label="Show online users" role="button">
                    <span className="ouo-user-count">{onlineUsers.length}</span>
                    <button className="ouo-action-button ouo-icon-only" tabIndex={-1} aria-hidden="true">
                        <i className="fas fa-user"></i>
                    </button>
                </div>
            ) : (
                <>
                    <div className="ouo-online-users-header">
                        <div className="ouo-header-title">
                            <i className="fas fa-users"></i>
                            <span>Online Users</span>
                            <div
                                className={`ouo-user-count${animateCount ? ' ouo-pulse' : ''}`}>{onlineUsers.length}</div>
                        </div>
                        <div className="ouo-header-actions">
                            <button className="ouo-action-button ouo-circle" onClick={toggleExpand}
                                    title={isExpanded ? 'Show less' : 'Show more'}
                                    aria-label={isExpanded ? 'Show less users' : 'Show more users'}>
                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                            </button>
                            <button className="ouo-action-button ouo-circle" onClick={toggleMinimize} title="Minimize"
                                    aria-label="Minimize online users overlay">
                                <i className="fas fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                    <div className="ouo-online-users-list">
                        {onlineUsers.slice(0, isExpanded ? onlineUsers.length : 3).map(user => {
                            let displayName = typeof user.name === 'string' ? user.name : '';
                            let avatarChar = displayName.length > 0 ? displayName.charAt(0).toUpperCase() : 'U';
                            const userRoles = Array.isArray(user.roles) ? user.roles : [];
                            const primaryRole = userRoles.length > 0 ? userRoles[0] : null;
                            const region = user.regionCode ? RegionService.getRegionByCode(user.regionCode) : null;
                            const regionName = region?.regionName || region?.region_name || null;
                            const activityText = formatLastActivity(user.lastActivity || user.lastSeen);

                            return (
                                <div key={user.id} className="ouo-online-user">
                                    <div className="ouo-user-avatar">{avatarChar}</div>
                                    <div className="ouo-user-info">
                                        <div className="ouo-user-name-row">
                                            <span className="ouo-user-name">{displayName || 'Unknown User'}</span>
                                            {activityText && <span className="ouo-user-activity">{activityText}</span>}
                                        </div>
                                        {(primaryRole || regionName) && (
                                            <div className="ouo-user-meta">
                                                {primaryRole && <span className="ouo-user-role">{primaryRole}</span>}
                                                {primaryRole && regionName &&
                                                    <span className="ouo-meta-separator">•</span>}
                                                {regionName && <span className="ouo-user-region">{regionName}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ouo-user-status">
                                        <span className="ouo-status-indicator"></span>
                                    </div>
                                </div>
                            );
                        })}
                        {!isExpanded && onlineUsers.length > 3 && (
                            <div className="ouo-more-users">
                                <span>+{onlineUsers.length - 3} more</span>
                                <button className="ouo-action-button ouo-circle ouo-icon-only" title="Show more"
                                        aria-label="Show more users" onClick={toggleExpand}>
                                    <i className="fas fa-chevron-down"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default OnlineUsersOverlay;