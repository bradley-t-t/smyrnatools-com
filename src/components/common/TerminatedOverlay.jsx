import React from 'react';
import {useAuth} from '../../app/context/AuthContext';
import SmyrnaLogo from '../../assets/images/SmyrnaLogo.png';
import './styles/TerminatedOverlay.css';

function TerminatedOverlay() {
    const {signOut} = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = '/';
        } catch (error) {
        }
    };

    return (
        <div className="terminated-view-container" onClick={() => {
        }}>
            <div className="terminated-view-content">
                <img src={SmyrnaLogo} alt="Smyrna Logo" className="terminated-logo"/>
                <h1>Access Revoked</h1>
                <p className="terminated-message">
                    Your access to this application has been revoked. Please contact your district manager for more
                    information.
                </p>
                <button className="sign-out-button" onClick={handleSignOut}>
                    Sign Out
                </button>
            </div>
        </div>
    );
}

export default TerminatedOverlay;

