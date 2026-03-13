import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import ErrorMessage from '../common/ErrorMessage'
/**
 * Shared CSS classes consumed by child form components (MixerAddView, TractorAddView, etc.).
 * These must remain as a style block until all consumer components are migrated to Tailwind.
 */
const addViewFormStyles = `
    .add-view-form {
        display: flex;
        flex-direction: column;
        gap: 5px;
        overflow: hidden;
        min-width: 0;
    }
    .add-view-form form {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
    }
    .add-view-form * {
        min-width: 0;
    }
    .add-view-form .form-section {
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
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
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border-light);
    }
    .add-view-form .form-section-title i {
        font-size: 0.875rem;
        color: var(--accent);
        opacity: 0.8;
    }
    .add-view-form .form-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    @media (min-width: 480px) {
        .add-view-form .form-row {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
    }
    .add-view-form .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .add-view-form label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary);
    }
    .add-view-form input[type="text"],
    .add-view-form input[type="tel"],
    .add-view-form input[type="number"],
    .add-view-form input[type="date"],
    .add-view-form input[type="datetime-local"],
    .add-view-form textarea {
        width: 100%;
        max-width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border-light);
        border-radius: 12px;
        font-size: 0.875rem;
        color: var(--text-primary);
        background: var(--bg-primary);
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
        max-width: 100%;
        padding: 0.75rem 2.5rem 0.75rem 1rem;
        border: 1px solid var(--border-light);
        border-radius: 12px;
        font-size: 0.875rem;
        color: var(--text-primary);
        background: var(--bg-primary);
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
        border: 1px solid var(--border-light);
        border-radius: 12px;
        font-size: 0.875rem;
        color: var(--text-primary);
        background: var(--bg-primary);
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
    }
    .add-view-form button[type="button"]:not(.form-submit):hover {
        background: var(--bg-secondary);
    }
    .add-view-form .form-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: 0.5rem;
        border-top: 1px solid var(--border-light);
        margin-top: 0.25rem;
    }
    .add-view-form button[type="submit"],
    .add-view-form .form-submit {
        padding: 0.75rem 1.5rem;
        background: var(--accent);
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
        filter: brightness(0.85);
    }
    .add-view-form button[type="submit"]:disabled,
    .add-view-form .form-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    @media (max-width: 480px) {
        .add-view-form {
            gap: 4px !important;
            padding: 0.75rem !important;
        }
        .add-view-form .form-section {
            padding: 0.75rem !important;
        }
        .add-view-form input[type="datetime-local"],
        .add-view-form input[type="date"] {
            font-size: 0.8125rem !important;
            padding: 0.625rem 0.5rem !important;
        }
    }
    .add-view-form .form-hint {
        font-size: 0.75rem;
        color: var(--text-secondary);
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
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border-radius: 0.5rem;
        font-size: 0.8125rem;
    }
    .add-view-form .selected-item-chip button {
        width: 1.25rem;
        height: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-hover);
        border: none;
        border-radius: 50%;
        color: var(--text-primary);
        cursor: pointer;
        padding: 0;
        font-size: 0.625rem;
    }
    .add-view-form .selected-item-chip button:hover {
        background: var(--border-medium);
    }
`
/**
 * Portal-rendered modal wrapper for add/create forms.
 * Checks user permissions (assets.add / list.add) before rendering the form.
 * Handles duplicate key errors with user-friendly messages.
 * @param {Object} props
 * @param {string} props.title - Modal header title.
 * @param {Function} props.onClose - Closes the modal.
 * @param {React.ReactNode} props.children - Form content.
 * @param {string} [props.error] - External error message to display.
 * @param {boolean} [props.isListItem=false] - When true, also checks list.add permission.
 */
function AddViewSection({ title, onClose, children, error, isListItem = false }) {
    const [hasPermission, setHasPermission] = useState(null)
    const [internalError, setInternalError] = useState(null)
    const pointerDownTargetRef = useRef(null)
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
    const handleBackdropPointerDown = (e) => {
        pointerDownTargetRef.current = e.target
    }
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && pointerDownTargetRef.current === e.currentTarget) {
            onClose()
        }
        pointerDownTargetRef.current = null
    }
    if (typeof document === 'undefined' || !document.body) {
        return null
    }
    if (hasPermission === null) {
        return null
    }
    if (!hasPermission) {
        return ReactDOM.createPortal(
            <div
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-fast"
                onPointerDown={handleBackdropPointerDown}
                onClick={handleBackdropClick}
            >
                <div
                    className="animate-pop-in bg-bg-primary border border-border-light rounded-card shadow-card flex flex-col max-h-[90vh] max-w-[650px] w-full overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between bg-bg-secondary border-b border-border-light rounded-t-card py-5 px-6">
                        <div className="flex items-center gap-3.5">
                            <i className="fas fa-lock text-accent text-xl"></i>
                            <div>
                                <h2 className="text-text-primary text-lg font-bold leading-tight m-0">
                                    Permission Denied
                                </h2>
                                <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                                    Access Restricted
                                </span>
                            </div>
                        </div>
                        <button
                            className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-md text-text-secondary text-xl cursor-pointer transition-all duration-200 p-2 hover:bg-border-light hover:text-text-primary"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="flex flex-col gap-5 p-6">
                            <div className="flex flex-col items-center gap-3.5 bg-bg-primary border border-border-light rounded-[10px] py-12 px-8 text-center">
                                <i className="fas fa-ban text-red-500 text-5xl mb-2 opacity-30"></i>
                                <p className="text-text-primary text-base font-semibold leading-relaxed m-0">
                                    You are not permitted to create assets or items.
                                </p>
                                <span className="text-text-secondary text-sm font-medium">
                                    Please contact your RMI or District Manager.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )
    }
    return ReactDOM.createPortal(
        <>
            <style>{addViewFormStyles}</style>
            <div
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-fast"
                onPointerDown={handleBackdropPointerDown}
                onClick={handleBackdropClick}
            >
                <div
                    className="animate-pop-in bg-bg-primary border border-border-light rounded-card shadow-card flex flex-col max-h-[90vh] max-w-[650px] w-full overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between bg-bg-secondary border-b border-border-light rounded-t-card py-5 px-6">
                        <div className="flex items-center gap-3.5">
                            <i className="fas fa-plus-circle text-accent text-xl"></i>
                            <div>
                                <h2 className="text-text-primary text-lg font-bold leading-tight m-0">{title}</h2>
                                <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                                    Create New
                                </span>
                            </div>
                        </div>
                        <button
                            className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-md text-text-secondary text-xl cursor-pointer transition-all duration-200 p-2 hover:bg-border-light hover:text-text-primary"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="flex flex-col gap-5 p-6 add-view-form">
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
