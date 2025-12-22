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
                               onCanEditChange,
                               currentRegion = null,
                               assetType = null,
                               onRegionTransfer = null
                           }) {
    const [internalCanEdit, setInternalCanEdit] = useState(itemAssignedPlant !== undefined ? false : canEdit)
    const [internalRestrictionWarning, setInternalRestrictionWarning] = useState(restrictionWarning)
    const [showRegionTransferModal, setShowRegionTransferModal] = useState(false)
    const [hasRegionTransferPermission, setHasRegionTransferPermission] = useState(false)
    const [regions, setRegions] = useState([])
    const [selectedRegion, setSelectedRegion] = useState('')
    const [selectedPlant, setSelectedPlant] = useState('')
    const [availablePlants, setAvailablePlants] = useState([])
    const [transferLoading, setTransferLoading] = useState(false)
    const [transferError, setTransferError] = useState('')

    useEffect(() => {
        if (itemAssignedPlant !== undefined) {
            const checkPlantRestriction = async () => {
                try {
                    const userObj = await UserService.getCurrentUser()
                    const userId = userObj?.id || userObj
                    if (!userId || userId === '0' || userId === 0) {
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
                            setInternalRestrictionWarning(`You cannot edit this because it belongs to plant ${itemAssignedPlant} and you are assigned to plant ${plantCode}.`)
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

    useEffect(() => {
        const checkRegionTransferPermission = async () => {
            try {
                const userObj = await UserService.getCurrentUser()
                const userId = userObj?.id || userObj
                if (!userId || userId === '0' || userId === 0) {
                    setHasRegionTransferPermission(false)
                    return
                }
                const hasPerm = await UserService.hasPermission(userId, 'detailview.regiontransfer')
                setHasRegionTransferPermission(!!hasPerm)
            } catch (error) {
                setHasRegionTransferPermission(false)
            }
        }
        checkRegionTransferPermission()
    }, [])

    useEffect(() => {
        if (showRegionTransferModal && hasRegionTransferPermission) {
            const loadRegions = async () => {
                try {
                    const {RegionService} = await import('../../services/RegionService')
                    const allRegions = await RegionService.fetchRegions()
                    setRegions(allRegions || [])
                } catch (error) {
                    console.error('Failed to load regions:', error)
                    setTransferError('Failed to load regions')
                }
            }
            loadRegions()
        }
    }, [showRegionTransferModal, hasRegionTransferPermission])

    useEffect(() => {
        if (selectedRegion) {
            const loadPlantsForRegion = async () => {
                try {
                    const {RegionService} = await import('../../services/RegionService')
                    const plants = await RegionService.fetchRegionPlants(selectedRegion)
                    setAvailablePlants(plants || [])
                    setSelectedPlant('')
                } catch (error) {
                    console.error('Failed to load plants:', error)
                    setAvailablePlants([])
                    setSelectedPlant('')
                }
            }
            loadPlantsForRegion()
        } else {
            setAvailablePlants([])
            setSelectedPlant('')
        }
    }, [selectedRegion])

    const handleOpenRegionTransfer = () => {
        setShowRegionTransferModal(true)
        setSelectedRegion('')
        setSelectedPlant('')
        setAvailablePlants([])
        setTransferError('')
    }

    const handleCloseRegionTransfer = () => {
        setShowRegionTransferModal(false)
        setSelectedRegion('')
        setSelectedPlant('')
        setAvailablePlants([])
        setTransferError('')
    }

    const handleRegionTransferConfirm = async () => {
        if (!selectedRegion) {
            setTransferError('Please select a region')
            return
        }

        if (!selectedPlant) {
            setTransferError('Please select a plant')
            return
        }

        const targetRegion = regions.find(r => r.regionCode === selectedRegion)
        if (!targetRegion) {
            setTransferError('Invalid region selected')
            return
        }

        if (assetType === 'mixer' && targetRegion.type === 'Aggregate') {
            setTransferError('Cannot transfer mixers to Aggregate regions')
            return
        }

        if (targetRegion.type === 'Office') {
            setTransferError('Cannot transfer assets to Office regions')
            return
        }

        setTransferLoading(true)
        setTransferError('')

        try {
            if (onRegionTransfer) {
                await onRegionTransfer(selectedRegion, selectedPlant)
                handleCloseRegionTransfer()
            }
        } catch (error) {
            setTransferError(error.message || 'Failed to transfer region')
        } finally {
            setTransferLoading(false)
        }
    }

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
                        </button>
                        <h1>{title}</h1>
                    </div>
                    <div className="detail-view-header-actions">
                        {headerActions}
                    </div>
                </div>
                <div className="detail-view-content">
                    {isLoading ? (
                        <LoadingScreen inline message={loadingMessage}/>
                    ) : (
                        <div className="detail-view-layout">
                            {(verificationCard || footerActions) && (
                                <div className="detail-view-sidebar">
                                    {verificationCard}
                                    {footerActions && (
                                        <div className="form-actions">
                                            <div className="form-actions-right">
                                                {footerActions}
                                            </div>
                                            {hasRegionTransferPermission && onRegionTransfer && currentRegion && (
                                                <div className="form-actions-left">
                                                    <button
                                                        type="button"
                                                        className="transfer-region-button"
                                                        onClick={handleOpenRegionTransfer}
                                                        disabled={isSaving}
                                                    >
                                                        <i className="fas fa-exchange-alt"></i>
                                                        <span>Transfer</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="detail-view-main">
                                {React.Children.map(children, (child) => {
                                    if (React.isValidElement(child) && child.props.className?.includes('detail-card')) {
                                        return React.cloneElement(child, {
                                            className: `${child.props.className || 'detail-card'}`
                                        })
                                    }
                                    return child
                                })}
                            </div>
                        </div>
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
            {showRegionTransferModal && ReactDOM.createPortal(
                <div className="add-view-modal-backdrop" onClick={(e) => {
                    if (e.target.classList.contains('add-view-modal-backdrop')) {
                        handleCloseRegionTransfer()
                    }
                }}>
                    <div className="add-view-modal">
                        <div className="add-view-header">
                            <div className="add-view-header-content">
                                <i className="fas fa-exchange-alt"></i>
                                <div>
                                    <h2>Transfer to Another Region</h2>
                                    <span className="add-view-subtitle">Region Transfer</span>
                                </div>
                            </div>
                            <button className="add-view-close-button" onClick={handleCloseRegionTransfer}
                                    aria-label="Close">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="add-view-content-scrollable">
                            <div className="add-view-content">
                                <div style={{
                                    padding: '1rem',
                                    background: 'var(--background)',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    border: '1px solid var(--divider)'
                                }}>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '0.25rem'
                                    }}>Current Region
                                    </div>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)'
                                    }}>{currentRegion || 'Unknown'}</div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="region-select">Target Region</label>
                                    <select
                                        id="region-select"
                                        className="form-control"
                                        value={selectedRegion}
                                        onChange={(e) => setSelectedRegion(e.target.value)}
                                        disabled={transferLoading}
                                    >
                                        <option value="">Choose a region...</option>
                                        {regions
                                            .filter(r => r.regionCode !== currentRegion)
                                            .filter(r => r.type !== 'Office')
                                            .filter(r => !(assetType === 'mixer' && r.type === 'Aggregate'))
                                            .map(region => (
                                                <option key={region.regionCode} value={region.regionCode}>
                                                    {region.regionName} ({region.regionCode}) - {region.type}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {selectedRegion && (
                                    <div className="form-group">
                                        <label htmlFor="plant-select">Target Plant</label>
                                        <select
                                            id="plant-select"
                                            className="form-control"
                                            value={selectedPlant}
                                            onChange={(e) => setSelectedPlant(e.target.value)}
                                            disabled={transferLoading || availablePlants.length === 0}
                                        >
                                            <option value="">Choose a plant...</option>
                                            {availablePlants.map(plant => (
                                                <option key={plant.plantCode || plant.plant_code}
                                                        value={plant.plantCode || plant.plant_code}>
                                                    {plant.plantName || plant.plant_name} ({plant.plantCode || plant.plant_code})
                                                </option>
                                            ))}
                                        </select>
                                        {availablePlants.length === 0 && (
                                            <div className="error-text"
                                                 style={{marginTop: '0.5rem', fontSize: '0.875rem'}}>
                                                No plants available in this region
                                            </div>
                                        )}
                                    </div>
                                )}

                                {transferError && (
                                    <div className="error-message" style={{
                                        padding: '1rem',
                                        background: 'rgba(var(--error-rgb), 0.1)',
                                        border: '1px solid var(--error)',
                                        borderRadius: '8px',
                                        color: 'var(--error)',
                                        fontSize: '0.875rem'
                                    }}>
                                        <i className="fas fa-exclamation-circle" style={{marginRight: '0.5rem'}}></i>
                                        {transferError}
                                    </div>
                                )}

                                <div className="form-actions" style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    justifyContent: 'flex-end',
                                    marginTop: '1.5rem',
                                    paddingTop: '1.5rem',
                                    borderTop: '1px solid var(--divider)'
                                }}>
                                    <button
                                        className="cancel-button"
                                        onClick={handleCloseRegionTransfer}
                                        disabled={transferLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="primary-button"
                                        onClick={handleRegionTransferConfirm}
                                        disabled={transferLoading || !selectedRegion || !selectedPlant}
                                    >
                                        {transferLoading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"
                                                   style={{marginRight: '0.5rem'}}></i>
                                                Transferring...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-exchange-alt" style={{marginRight: '0.5rem'}}></i>
                                                Transfer
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {modals}
        </>
    )
}

export default DetailViewSection
