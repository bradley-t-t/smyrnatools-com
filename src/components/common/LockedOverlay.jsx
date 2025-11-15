import React from 'react';
import ReactDOM from 'react-dom';
import {useAuth} from '../../app/context/AuthContext';
import './styles/LockedOverlay.css';

function LockedOverlay({reason}) {
    const {signOut} = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = '/';
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const getMessage = () => {
        if (reason === 'invalid-session') {
            return 'Your session has expired or is invalid. Please refresh the page or sign out and log in again to continue.';
        }
        if (reason === 'no-plant') {
            return 'Your account is not assigned to a plant. Please contact your district manager to complete your setup.';
        }
        return 'You must contact your district manager for them to approve your sign-up.';
    };

    const getTitle = () => {
        if (reason === 'invalid-session') {
            return 'Session Invalid';
        }
        if (reason === 'no-plant') {
            return 'Setup Incomplete';
        }
        return 'Access Pending';
    };

    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    return ReactDOM.createPortal(
        <div className="locked-overlay-backdrop">
            <div className="locked-overlay-modal">
                <div className="locked-overlay-content">
                    <h1>{getTitle()}</h1>
                    <p className="locked-message">
                        {getMessage()}
                    </p>
                    <div className="locked-actions">
                        <button className="locked-button refresh-button" onClick={handleRefresh}>
                            <i className="fas fa-sync-alt"></i>
                            Refresh Page
                        </button>
                        <button className="locked-button signout-button" onClick={handleSignOut}>
                            <i className="fas fa-sign-out-alt"></i>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default LockedOverlay;