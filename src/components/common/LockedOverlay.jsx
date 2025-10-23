import React, {useEffect, useState} from 'react';
import {useAuth} from '../../app/context/AuthContext';
import {useLocation} from 'react-router-dom';
import SmyrnaLogo from '../../assets/images/SmyrnaLogo.png';
import LoadingScreen from './LoadingScreen';
import {UserService} from '../../services/UserService';
import './styles/LockedOverlay.css';

function LockedOverlay({reason}) {
    const {signOut} = useAuth();
    const location = useLocation();
    const [isValidating, setIsValidating] = useState(true);
    const [reasonToUse, setReasonToUse] = useState(null);

    useEffect(() => {
        const validateSession = async () => {
            setIsValidating(true);

            await new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const user = await UserService.getCurrentUser();

                if (!user?.id) {
                    setReasonToUse('invalid-session');
                    setIsValidating(false);
                    return;
                }

                setReasonToUse(reason || location.state?.reason || 'pending');
            } catch (error) {
                setReasonToUse('invalid-session');
            } finally {
                setIsValidating(false);
            }
        };

        validateSession();
    }, [reason, location.state?.reason]);

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = '/';
        } catch (error) {
        }
    };

    if (isValidating || !reasonToUse) {
        return <LoadingScreen message="Attempting to authenticate your user" fullPage={true}/>;
    }

    const getMessage = () => {
        if (reasonToUse === 'invalid-session') {
            return 'Your session has expired or is invalid. Please sign out and log in again to continue.';
        }
        if (reasonToUse === 'no-plant') {
            return 'Your plant has not been assigned. Please contact your district manager to assign a plant to your profile.';
        }
        return 'You must contact your district manager for them to approve your sign-up.';
    };

    const getTitle = () => {
        if (reasonToUse === 'invalid-session') {
            return 'Session Invalid';
        }
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

export default LockedOverlay;