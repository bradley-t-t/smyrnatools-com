import React, {useState, useEffect} from 'react';
import {useAuth} from '../../app/context/AuthContext';
import {useLocation} from 'react-router-dom';
import SmyrnaLogo from '../../assets/images/SmyrnaLogo.png';
import LoadingScreen from './LoadingScreen';
import {UserService} from '../../services/UserService';
import './styles/GuestOverlay.css';

function GuestOverlay({reason}) {
    const {signOut} = useAuth();
    const location = useLocation();
    const reasonToUse = reason || location.state?.reason || 'pending';
    const [isValidating, setIsValidating] = useState(true);
    const [isValidUser, setIsValidUser] = useState(false);

    useEffect(() => {
        const validateSession = async () => {
            try {
                const user = await UserService.getCurrentUser();
                setIsValidUser(!!user?.id);
            } catch (error) {
                setIsValidUser(false);
            } finally {
                setIsValidating(false);
            }
        };

        validateSession();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = '/';
        } catch (error) {
        }
    };

    if (isValidating) {
        return <LoadingScreen message="Attempting to authenticate your user" fullPage={true} />;
    }

    if (!isValidUser) {
        return <LoadingScreen message="Attempting to authenticate your user" fullPage={true} />;
    }

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