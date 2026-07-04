import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { getSessionUserId } from '../../../services/SessionService'
import { UserService } from '../../../services/UserService'
import ErrorMessage from '../common/ErrorMessage'

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
            const userId = getSessionUserId()
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
                        <button type="button"
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
                                <i className="fas fa-ban text-text-primary text-5xl mb-2 opacity-30"></i>
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
                    <button type="button"
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
        </div>,
        document.body
    )
}
export default AddViewSection
