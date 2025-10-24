import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import './styles/AddView.css';
import {UserService} from '../../services/UserService';
import ErrorMessage from '../common/ErrorMessage';

function AddViewSection({title, onClose, children, error}) {
    const [hasPermission, setHasPermission] = useState(null);
    const [internalError, setInternalError] = useState(null);

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

    useEffect(() => {
        if (error) {
            let cleanError = error;
            if (typeof error === 'string') {
                if (error.includes('duplicate key value violates unique constraint')) {
                    if (error.includes('mixers_truck_number_key')) {
                        cleanError = 'This truck number already exists. Please use a different truck number.';
                    } else if (error.includes('tractors_truck_number_key')) {
                        cleanError = 'This truck number already exists. Please use a different truck number.';
                    } else if (error.includes('trailers_trailer_number_key')) {
                        cleanError = 'This trailer number already exists. Please use a different trailer number.';
                    } else if (error.includes('pickup_trucks_truck_number_key')) {
                        cleanError = 'This truck number already exists. Please use a different truck number.';
                    } else if (error.includes('equipment_equipment_number_key')) {
                        cleanError = 'This equipment number already exists. Please use a different equipment number.';
                    } else {
                        cleanError = 'This item already exists. Please use a different identifier.';
                    }
                }
            }
            setInternalError(cleanError);
        } else {
            setInternalError(null);
        }
    }, [error]);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('add-view-modal-backdrop')) {
            onClose();
        }
    };

    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    if (hasPermission === null) {
        return null;
    }

    if (!hasPermission) {
        return ReactDOM.createPortal(
            <div className="add-view-modal-backdrop" onClick={handleBackdropClick}>
                <div className="add-view-modal">
                    <div className="add-view-header">
                        <div className="add-view-header-content">
                            <i className="fas fa-lock"></i>
                            <div>
                                <h2>Permission Denied</h2>
                                <span className="add-view-subtitle">Access Restricted</span>
                            </div>
                        </div>
                        <button className="add-view-close-button" onClick={onClose} aria-label="Close">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="add-view-content-scrollable">
                        <div className="add-view-content">
                            <div className="permission-denied-message">
                                <i className="fas fa-ban"></i>
                                <p>You are not permitted to create assets or items.</p>
                                <span>Please contact your RMI or District Manager.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return ReactDOM.createPortal(
        <div className="add-view-modal-backdrop" onClick={handleBackdropClick}>
            <div className="add-view-modal">
                <div className="add-view-header">
                    <div className="add-view-header-content">
                        <i className="fas fa-plus-circle"></i>
                        <div>
                            <h2>{title}</h2>
                            <span className="add-view-subtitle">Create New</span>
                        </div>
                    </div>
                    <button className="add-view-close-button" onClick={onClose} aria-label="Close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="add-view-content-scrollable">
                    <div className="add-view-content">
                        <ErrorMessage message={internalError} onDismiss={() => setInternalError(null)} />
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default AddViewSection;
