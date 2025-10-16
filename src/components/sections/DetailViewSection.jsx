import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'
import './styles/DetailView.css'
import LoadingScreen from '../common/LoadingScreen'
import {UserService} from '../../services/UserService'

function DetailViewSection({
                               title,
                               onClose,
                               onBack,
                               headerActions,
                               children,
                               isSaving = false,
                               message = null,
                               canEdit = true,
                               restrictionWarning = null,
                               className = '',
                               isLoading = false,
                               loadingMessage = 'Loading...',
                               notFound = false,
                               notFoundMessage = 'Item not found',
                               notFoundDescription = 'The requested item could not be found. It may have been deleted.',
                               showDeleteConfirmation = false,
                               onDeleteConfirm = null,
                               onDeleteCancel = null,
                               deleteTitle = 'Confirm Delete',
                               deleteMessage = 'Are you sure you want to delete this item? This action cannot be undone.',
                               verificationCard = null,
                               footerActions = null,
                               modals = null,
                               itemAssignedPlant,
                               onCanEditChange
                           }) {
    const [internalCanEdit, setInternalCanEdit] = useState(itemAssignedPlant !== undefined ? false : canEdit)
    const [internalRestrictionWarning, setInternalRestrictionWarning] = useState(restrictionWarning)

    useEffect(() => {
        if (itemAssignedPlant !== undefined) {
            const checkPlantRestriction = async () => {
                try {
                    const userObj = await UserService.getCurrentUser()
                    const userId = userObj?.id || userObj
                    if (!userId) {
                        setInternalCanEdit(true)
                        setInternalRestrictionWarning(null)
                        onCanEditChange && onCanEditChange(true)
                        return
                    }
                    const hasBypass = await UserService.hasPermission(userId, "detailview.bypass.plantrestriction")
                    if (hasBypass) {
                        setInternalCanEdit(true)
                        setInternalRestrictionWarning(null)
                        onCanEditChange && onCanEditChange(true)
                        return
                    }
                    const profilePlant = await UserService.getUserPlant(userId)
                    const plantCode = typeof profilePlant === 'string' ? profilePlant : (profilePlant?.plant_code || profilePlant?.plantCode || null)
                    if (plantCode && itemAssignedPlant) {
                        const isSamePlant = plantCode === itemAssignedPlant
                        setInternalCanEdit(isSamePlant)
                        if (!isSamePlant) {
                            setInternalRestrictionWarning(`You cannot this because it belongs to plant ${itemAssignedPlant} and you are assigned to plant ${plantCode}.`)
                        } else {
                            setInternalRestrictionWarning(null)
                        }
                        onCanEditChange && onCanEditChange(isSamePlant)
                    } else {
                        setInternalCanEdit(true)
                        setInternalRestrictionWarning(null)
                        onCanEditChange && onCanEditChange(true)
                    }
                } catch (error) {
                    setInternalCanEdit(true)
                    setInternalRestrictionWarning(null)
                    onCanEditChange && onCanEditChange(true)
                }
            }
            checkPlantRestriction()
        } else {
            setInternalCanEdit(canEdit)
            setInternalRestrictionWarning(restrictionWarning)
            onCanEditChange && onCanEditChange(canEdit)
        }
    }, [itemAssignedPlant, canEdit, restrictionWarning, onCanEditChange])

    if (notFound) {
        return (
            <div className={`detail-view ${className}`}>
                <div className="detail-view-header">
                    <div className="detail-view-header-left">
                        <button
                            className="detail-view-back-button"
                            onClick={onBack || onClose}
                            aria-label="Back"
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                    </div>
                    <h1>{notFoundMessage}</h1>
                    <div className="detail-view-header-actions"></div>
                </div>
                <div className="detail-view-content">
                    <div className="error-message">
                        <p>{notFoundDescription}</p>
                        <button className="primary-button" onClick={onClose || onBack}>Go Back</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className={`detail-view ${className}`}>
                {isSaving && (
                    <div className="detail-view-saving-overlay">
                        <div className="detail-view-saving-indicator"></div>
                    </div>
                )}
                <div className="detail-view-header">
                    <div className="detail-view-header-left">
                        <button
                            className="detail-view-back-button"
                            onClick={onBack || onClose}
                            aria-label="Back"
                        >
                            <i className="fas fa-arrow-left"></i>
                            <span>Back</span>
                        </button>
                    </div>
                    <h1>{title}</h1>
                    <div className="detail-view-header-actions">
                        {headerActions}
                    </div>
                </div>
                <div className="detail-view-content">
                    {isLoading ? (
                        <LoadingScreen inline message={loadingMessage}/>
                    ) : (
                        <>
                            {verificationCard && (
                                <div className="detail-card">
                                    {verificationCard}
                                </div>
                            )}
                            {children}
                            {footerActions && (
                                <div className="form-actions">
                                    {footerActions}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {(message || internalRestrictionWarning) && ReactDOM.createPortal(
                <div
                    className={`detail-view-message ${((message || internalRestrictionWarning) || '').toLowerCase().includes('error') || ((message || internalRestrictionWarning) || '').toLowerCase().includes('cannot') ? 'error' : 'success'}`}>
                    {message || internalRestrictionWarning}
                </div>,
                document.body
            )}
            {showDeleteConfirmation && (
                <div className="confirmation-modal">
                    <div className="confirmation-content">
                        <h2>{deleteTitle}</h2>
                        <p>{deleteMessage}</p>
                        <div className="confirmation-actions">
                            <button className="cancel-button" onClick={onDeleteCancel}>Cancel</button>
                            <button className="danger-button" onClick={onDeleteConfirm}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
            {modals}
        </>
    )
}

export default DetailViewSection
