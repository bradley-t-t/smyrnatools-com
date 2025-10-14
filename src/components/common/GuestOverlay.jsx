import React from 'react';
import {useAuth} from '../../app/context/AuthContext';
import {useLocation} from 'react-router-dom';
import SmyrnaLogo from '../../assets/images/SmyrnaLogo.png';
import './styles/GuestOverlay.css';

function GuestOverlay({reason}) {
    const {signOut} = useAuth();
    const location = useLocation();
    const reasonToUse = reason || location.state?.reason || 'pending';

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = '/';
        } catch (error) {
        }
    };

    const getMessage = () => {
        if (reasonToUse === 'no-plant') {
            return 'Your plant has not been assigned. Please contact your district manager to assign a plant to your profile.';
        }
        return 'You must contact your district manager for them to approve your sign-up.';
    };

    const getTitle = () => {
        if (reasonToUse === 'no-plant') {
            return 'Plant Not Assigned';
        }
        return 'Access Pending';
    };

    return (
        <div className="guest-view-container" onClick={() => {
        }}>
            <div className="guest-view-content">
                <img src={SmyrnaLogo} alt="Smyrna Logo" className="guest-logo"/>
                <h1>{getTitle()}</h1>
                <p className="guest-message">
                    {getMessage()}
                </p>
                <button className="sign-out-button" onClick={handleSignOut}>
                    Sign Out
                </button>
            </div>
        </div>
    );
}

export default GuestOverlay;