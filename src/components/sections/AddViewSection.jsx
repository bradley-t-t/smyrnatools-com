import React, {useEffect, useState} from 'react';
import './styles/AddView.css';
import {UserService} from '../../services/UserService';

function AddViewSection({title, onClose, children, error}) {
    const [hasPermission, setHasPermission] = useState(null);

    useEffect(() => {
        async function checkPermission() {
            const userId = sessionStorage.getItem('userId');
            if (userId) {
                const permitted = await UserService.hasPermission(userId, 'assets.add');
                setHasPermission(permitted);
            } else {
                setHasPermission(false);
            }
        }

        checkPermission();
    }, []);

    if (hasPermission === null) {
        return null;
    }

    if (!hasPermission) {
        return (
            <div className="add-view-modal-backdrop">
                <div className="add-view-modal">
                    <div className="add-view-header sticky">
                        <h2>Permission Denied</h2>
                        <button className="ios-button close-btn" onClick={onClose} aria-label="Close">×</button>
                    </div>
                    <div className="add-view-content-scrollable">
                        <div className="add-view-content">
                            <div className="permission-denied-message">
                                You are not permitted to create assets or items. Please contact your RMI or District Manager.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="add-view-modal-backdrop">
            <div className="add-view-modal">
                <div className="add-view-header sticky">
                    <h2>{title}</h2>
                    <button className="ios-button close-btn" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="add-view-content-scrollable">
                    <div className="add-view-content">
                        {error && <div className="error-message">{error}</div>}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddViewSection;
