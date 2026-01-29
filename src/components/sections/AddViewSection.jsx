import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { UserService } from '../../services/UserService'
import ErrorMessage from '../common/ErrorMessage'

function AddViewSection({ title, onClose, children, error, isListItem = false }) {
    const [hasPermission, setHasPermission] = useState(null)
    const [internalError, setInternalError] = useState(null)

    useEffect(() => {
        async function checkPermission() {
            const userId = sessionStorage.getItem('userId')
            if (userId) {
                if (isListItem) {
                    const hasListAdd = await UserService.hasPermission(userId, 'list.add')
                    const hasAssetsAdd = await UserService.hasPermission(userId, 'assets.add')
                    setHasPermission(hasListAdd || hasAssetsAdd)
                } else {
                    const hasAssetsAdd = await UserService.hasPermission(userId, 'assets.add')
                    setHasPermission(hasAssetsAdd)
                }
            } else {
                setHasPermission(false)
            }
        }

        checkPermission()
    }, [isListItem])

    useEffect(() => {
        if (error) {
            let cleanError = error
            if (typeof error === 'string') {
                if (error.includes('duplicate key value violates unique constraint')) {
                    if (error.includes('mixers_truck_number_key')) {
                        cleanError = 'This truck number already exists. Please use a different truck number.'
                    } else if (error.includes('tractors_truck_number_key')) {
                        cleanError = 'This truck number already exists. Please use a different truck number.'
                    } else if (error.includes('trailers_trailer_number_key')) {
                        cleanError = 'This trailer number already exists. Please use a different trailer number.'
                    } else if (error.includes('pickup_trucks_truck_number_key')) {
                        cleanError = 'This truck number already exists. Please use a different truck number.'
                    } else if (error.includes('equipment_equipment_number_key')) {
                        cleanError = 'This equipment number already exists. Please use a different equipment number.'
                    } else {
                        cleanError = 'This item already exists. Please use a different identifier.'
                    }
                }
            }
            setInternalError(cleanError)
        } else {
            setInternalError(null)
        }
    }, [error])

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const styles = {
        backdrop: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
        },
        modal: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            border: '1px solid #e5e7eb'
        },
        header: {
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            borderRadius: '12px 12px 0 0'
        },
        headerContent: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem'
        },
        headerIcon: {
            fontSize: '1.25rem',
            color: '#1e3a5f'
        },
        title: {
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#1e293b',
            lineHeight: 1.2
        },
        subtitle: {
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        closeButton: {
            background: 'transparent',
            border: 'none',
            fontSize: '1.25rem',
            color: '#64748b',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.2s',
            width: '2rem',
            height: '2rem'
        },
        contentScrollable: {
            flex: 1,
            overflowY: 'auto',
            minHeight: 0
        },
        content: {
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
        },
        permissionDenied: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.875rem'
        },
        permissionIcon: {
            fontSize: '3rem',
            color: '#ef4444',
            opacity: 0.3,
            marginBottom: '0.5rem'
        },
        permissionText: {
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1e293b',
            lineHeight: 1.5
        },
        permissionSubtext: {
            fontSize: '0.875rem',
            color: '#64748b',
            fontWeight: 500
        }
    }

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    if (hasPermission === null) {
        return null
    }

    if (!hasPermission) {
        return ReactDOM.createPortal(
            <>
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes popIn {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}</style>
                <div style={styles.backdrop} onClick={handleBackdropClick}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.header}>
                            <div style={styles.headerContent}>
                                <i className="fas fa-lock" style={styles.headerIcon}></i>
                                <div>
                                    <h2 style={styles.title}>Permission Denied</h2>
                                    <span style={styles.subtitle}>Access Restricted</span>
                                </div>
                            </div>
                            <button
                                style={styles.closeButton}
                                onClick={onClose}
                                aria-label="Close"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#e5e7eb'
                                    e.currentTarget.style.color = '#1e293b'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.color = '#64748b'
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div style={styles.contentScrollable}>
                            <div style={styles.content}>
                                <div style={styles.permissionDenied}>
                                    <i className="fas fa-ban" style={styles.permissionIcon}></i>
                                    <p style={styles.permissionText}>
                                        You are not permitted to create assets or items.
                                    </p>
                                    <span style={styles.permissionSubtext}>
                                        Please contact your RMI or District Manager.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>,
            document.body
        )
    }

    return ReactDOM.createPortal(
        <>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes popIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .add-view-form {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .add-view-form form {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .add-view-form .form-section {
                    background: #f8fafc;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 0;
                }
                .add-view-form .form-section + .form-section {
                    margin-top: 0;
                }
                .add-view-form .form-section-title {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }
                .add-view-form .form-section-title i {
                    font-size: 0.875rem;
                    color: #1e3a5f;
                    opacity: 0.8;
                }
                .add-view-form .form-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
                .add-view-form .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .add-view-form label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #334155;
                }
                .add-view-form input[type="text"],
                .add-view-form input[type="tel"],
                .add-view-form input[type="number"],
                .add-view-form input[type="date"],
                .add-view-form input[type="datetime-local"],
                .add-view-form textarea {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    color: #1e293b;
                    background: white;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                .add-view-form input:focus,
                .add-view-form textarea:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .add-view-form select {
                    width: 100%;
                    padding: 0.75rem 2.5rem 0.75rem 1rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    color: #1e293b;
                    background: white;
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 18px;
                    outline: none;
                    transition: all 0.2s;
                }
                .add-view-form select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .add-view-form button[type="button"]:not(.form-submit) {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    color: #1e293b;
                    background: white;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .add-view-form button[type="button"]:not(.form-submit):hover {
                    background: #f8fafc;
                }
                .add-view-form .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 0.5rem;
                    border-top: 1px solid #e5e7eb;
                    margin-top: 0.25rem;
                }
                .add-view-form button[type="submit"],
                .add-view-form .form-submit {
                    padding: 0.75rem 1.5rem;
                    background: #1e3a5f;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .add-view-form button[type="submit"]:hover,
                .add-view-form .form-submit:hover {
                    background: #2d4a6f;
                }
                .add-view-form button[type="submit"]:disabled,
                .add-view-form .form-submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .add-view-form .form-hint {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 0.25rem;
                }
                .add-view-form .form-warning {
                    font-size: 0.8125rem;
                    color: #d97706;
                    margin-top: 0.25rem;
                }
                .add-view-form .form-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                }
                .add-view-form .form-checkbox input[type="checkbox"] {
                    width: 1.25rem;
                    height: 1.25rem;
                    border-radius: 0.375rem;
                    cursor: pointer;
                }
                .add-view-form .selected-items {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }
                .add-view-form .selected-item-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.375rem 0.75rem;
                    background: #dbeafe;
                    color: #1e40af;
                    border-radius: 0.5rem;
                    font-size: 0.8125rem;
                }
                .add-view-form .selected-item-chip button {
                    width: 1.25rem;
                    height: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #bfdbfe;
                    border: none;
                    border-radius: 50%;
                    color: #1e40af;
                    cursor: pointer;
                    padding: 0;
                    font-size: 0.625rem;
                }
                .add-view-form .selected-item-chip button:hover {
                    background: #93c5fd;
                }
            `}</style>
            <div style={styles.backdrop} onClick={handleBackdropClick}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.header}>
                        <div style={styles.headerContent}>
                            <i className="fas fa-plus-circle" style={styles.headerIcon}></i>
                            <div>
                                <h2 style={styles.title}>{title}</h2>
                                <span style={styles.subtitle}>Create New</span>
                            </div>
                        </div>
                        <button
                            style={styles.closeButton}
                            onClick={onClose}
                            aria-label="Close"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e5e7eb'
                                e.currentTarget.style.color = '#1e293b'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = '#64748b'
                            }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div style={styles.contentScrollable}>
                        <div style={styles.content} className="add-view-form">
                            <ErrorMessage message={internalError} onDismiss={() => setInternalError(null)} />
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}

export default AddViewSection
