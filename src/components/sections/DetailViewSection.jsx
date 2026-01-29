import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import LoadingScreen from '../common/LoadingScreen'
import { UserService } from '../../services/UserService'

const detailViewStyles = `
.detail-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1rem; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
.card-header h2 { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.form-sections { display: flex; flex-direction: column; gap: 1.5rem; }
.form-section { }
.form-section h3 { font-size: 0.9375rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #1e3a5f; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; }
.form-control { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; box-sizing: border-box; transition: all 0.15s; }
.form-control:focus { outline: none; border-color: #1e3a5f; box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1); }
.form-control:disabled, .form-control[readonly] { background: #f8fafc; color: #64748b; cursor: not-allowed; }
select.form-control { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.25em 1.25em; padding-right: 2.5rem; }
textarea.form-control { min-height: 100px; resize: vertical; }
.operator-select-button { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; text-align: left; cursor: pointer; transition: all 0.15s; }
.operator-select-button:hover:not(:disabled) { border-color: #1e3a5f; }
.operator-select-button:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }
.operator-select-container { display: flex; gap: 0.5rem; }
.operator-select-container .operator-select-button { flex: 1; }
.unassign-operator-button { padding: 0.75rem; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.unassign-operator-button:hover { background: #fecaca; }
.assign-operator-button { padding: 0.75rem; background: #d1fae5; color: #059669; border: 1px solid #a7f3d0; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.assign-operator-button:hover { background: #a7f3d0; }
.primary-button { width: 100%; padding: 0.75rem 1.5rem; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.primary-button:hover { background: #15304f; }
.primary-button:disabled { background: #94a3b8; cursor: not-allowed; }
.danger-button { width: 100%; padding: 0.75rem 1.5rem; background: #dc2626; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.danger-button:hover { background: #b91c1c; }
.danger-button:disabled { background: #94a3b8; cursor: not-allowed; }
.cancel-button { width: 100%; padding: 0.75rem 1.5rem; background: #f1f5f9; color: #475569; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
.cancel-button:hover { background: #e2e8f0; }
.global-button-secondary { padding: 0.5rem 1rem; background: #f1f5f9; color: #475569; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 0.375rem; }
.global-button-secondary:hover { background: #e2e8f0; border-color: #cbd5e1; }
.global-button-secondary i { font-size: 0.75rem; }
.save-button { width: 100%; justify-content: center; }
.form-actions { display: flex; flex-direction: column; gap: 0.75rem; }
.form-actions button { width: 100%; }
.transfer-region-button { padding: 0.75rem 1.5rem; background: #f59e0b; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; }
.transfer-region-button:hover { background: #d97706; }
.transfer-region-button:disabled { background: #94a3b8; cursor: not-allowed; }
.spare-status-note { padding: 0.75rem 1rem; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; color: #92400e; font-size: 0.875rem; margin-top: 0.5rem; }
.down-in-yard-container { margin-top: 0.75rem; }
.down-in-yard-toggle { margin-bottom: 0.5rem; }
.down-in-yard-note { padding: 0.75rem 1rem; background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 8px; color: #0369a1; font-size: 0.875rem; }
.toggle-label { display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.toggle-label.disabled { opacity: 0.6; cursor: not-allowed; }
.toggle-checkbox { display: none; }
.toggle-switch { position: relative; width: 44px; height: 24px; background: #cbd5e1; border-radius: 12px; transition: all 0.2s; }
.toggle-checkbox:checked + .toggle-switch { background: #1e3a5f; }
.toggle-slider { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.toggle-checkbox:checked + .toggle-switch .toggle-slider { left: 22px; }
.toggle-text { font-size: 0.9375rem; font-weight: 500; color: #1e293b; }
.error-message { padding: 1rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.875rem; }
.error-text { color: #dc2626; font-size: 0.875rem; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
@media (max-width: 640px) { .form-row-2, .form-row-3 { grid-template-columns: 1fr; } }
.cleanliness-rating { display: flex; gap: 0.25rem; }
.cleanliness-star { font-size: 1.5rem; color: #e5e7eb; cursor: pointer; transition: color 0.15s; }
.cleanliness-star.active { color: #f59e0b; }
.cleanliness-star:hover { color: #fbbf24; }
.cleanliness-rating-display { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; }
.cleanliness-rating-stars { display: flex; gap: 0.25rem; }
.cleanliness-rating-stars i { font-size: 1.25rem; color: #f59e0b; }
.cleanliness-rating-stars i.empty { color: #e5e7eb; }
.cleanliness-rating-label { font-size: 0.9375rem; font-weight: 500; color: #1e293b; }
.cleanliness-rating-editor { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; }
.star-input { display: flex; gap: 0.25rem; }
.star-button { background: none; border: none; padding: 0.25rem; cursor: pointer; transition: transform 0.15s; }
.star-button:hover:not(.disabled) { transform: scale(1.15); }
.star-button.disabled { cursor: not-allowed; opacity: 0.7; }
.star-button i { font-size: 1.5rem; color: #e5e7eb; transition: color 0.15s; }
.star-button.active i, .star-button i.filled { color: #f59e0b; }
.star-button:hover:not(.disabled) i { color: #fbbf24; }
.rating-value-display { display: flex; align-items: center; gap: 0.5rem; padding-left: 0.75rem; border-left: 1px solid #e5e7eb; }
.rating-label { font-size: 0.9375rem; font-weight: 600; color: #1e293b; }
.rating-container { display: flex; flex-direction: column; gap: 0.5rem; }
.rating-stars { display: flex; gap: 0.375rem; }
.rating-stars .star { font-size: 1.5rem; color: #e5e7eb; cursor: pointer; transition: all 0.15s; background: none; border: none; padding: 0; }
.rating-stars .star:hover { transform: scale(1.1); }
.rating-stars .star.filled { color: #f59e0b; }
.rating-stars .star.hovered { color: #fbbf24; }
.rating-value { font-size: 0.875rem; color: #64748b; font-weight: 500; }
.rating-text { font-size: 0.9375rem; font-weight: 600; color: #1e293b; }
.warning-text { color: #dc2626; font-size: 0.875rem; margin-top: 0.5rem; font-weight: 500; }
.date-input-container { position: relative; }
.date-input-container input { width: 100%; }
.overdue-warning { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; color: #92400e; font-size: 0.8125rem; margin-top: 0.5rem; }
.overdue-warning i { color: #f59e0b; }
.view-only-mode { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fcd34d; border-radius: 10px; margin-bottom: 1rem; }
.view-only-mode i { font-size: 1.25rem; color: #b45309; }
.view-only-mode-content { flex: 1; }
.view-only-mode-title { font-size: 0.9375rem; font-weight: 600; color: #92400e; margin: 0 0 0.25rem 0; }
.view-only-mode-message { font-size: 0.8125rem; color: #a16207; margin: 0; line-height: 1.4; }
.view-only-banner { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; background: #fef3c7; border-bottom: 1px solid #fcd34d; color: #92400e; font-size: 0.875rem; font-weight: 500; }
.view-only-banner i { color: #f59e0b; }
.restriction-warning { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 1rem; }
.restriction-warning i { color: #dc2626; font-size: 1.125rem; margin-top: 0.125rem; }
.restriction-warning-content { flex: 1; }
.restriction-warning-title { font-size: 0.9375rem; font-weight: 600; color: #991b1b; margin: 0 0 0.25rem 0; }
.restriction-warning-message { font-size: 0.8125rem; color: #b91c1c; margin: 0; line-height: 1.4; }
.read-only-field { position: relative; }
.read-only-field::after { content: ''; position: absolute; inset: 0; background: transparent; pointer-events: none; }
.read-only-indicator { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; background: #f1f5f9; border-radius: 4px; font-size: 0.75rem; color: #64748b; margin-left: 0.5rem; }
.read-only-indicator i { font-size: 0.625rem; }
`

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
    const [_internalCanEdit, setInternalCanEdit] = useState(itemAssignedPlant !== undefined ? false : canEdit)
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
                    const hasBypass = await UserService.hasPermission(userId, 'detailview.bypass.plantrestriction')
                    if (hasBypass) {
                        setInternalCanEdit(true)
                        setInternalRestrictionWarning(null)
                        onCanEditChange && onCanEditChange(true)
                        return
                    }
                    const profilePlant = await UserService.getUserPlant(userId)
                    const plantCode =
                        typeof profilePlant === 'string'
                            ? profilePlant
                            : profilePlant?.plant_code || profilePlant?.plantCode || null
                    if (plantCode && itemAssignedPlant) {
                        const isSamePlant = plantCode === itemAssignedPlant
                        setInternalCanEdit(isSamePlant)
                        if (!isSamePlant) {
                            setInternalRestrictionWarning(
                                `You cannot edit this because it belongs to plant ${itemAssignedPlant} and you are assigned to plant ${plantCode}.`
                            )
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
                    const { RegionService } = await import('../../services/RegionService')
                    const allRegions = await RegionService.fetchRegions()
                    setRegions(allRegions || [])
                } catch (error) {
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
                    const { RegionService } = await import('../../services/RegionService')
                    const plants = await RegionService.fetchRegionPlants(selectedRegion)
                    setAvailablePlants(plants || [])
                    setSelectedPlant('')
                } catch (error) {
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

        const targetRegion = regions.find((r) => r.regionCode === selectedRegion)
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
            <>
                <style>{detailViewStyles}</style>
                <div
                    className={`fixed left-0 right-0 bottom-0 bg-white z-40 flex flex-col ${className}`}
                    style={{ top: '64px' }}
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                        <div className="flex items-center gap-3">
                            <button
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                onClick={onBack || onClose}
                                aria-label="Back"
                            >
                                <i className="fas fa-arrow-left"></i>
                            </button>
                        </div>
                        <h1 className="text-lg font-semibold text-slate-800">{notFoundMessage}</h1>
                        <div className="w-10"></div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                            </div>
                            <p className="text-slate-600 mb-4">{notFoundDescription}</p>
                            <button
                                className="px-6 py-2.5 bg-[#1e3a5f] text-white font-semibold rounded-lg hover:bg-[#15304f] transition-colors"
                                onClick={onClose || onBack}
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <style>{detailViewStyles}</style>
            <div
                className={`fixed left-0 right-0 bottom-0 bg-slate-50 z-40 ${className}`}
                style={{ top: '64px', display: 'flex', flexDirection: 'column' }}
            >
                {isSaving && (
                    <div className="absolute inset-0 bg-white/80 z-[100] flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
                    </div>
                )}
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 24px',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: 'white',
                        flexShrink: 0,
                        minHeight: '68px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                backgroundColor: '#f1f5f9',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#475569'
                            }}
                            onClick={onBack || onClose}
                            aria-label="Back"
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{headerActions}</div>
                </header>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {isLoading ? (
                        <LoadingScreen inline message={loadingMessage} />
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6 p-6 w-full">
                            {(verificationCard || footerActions) && (
                                <div className="hidden lg:block w-80 flex-shrink-0 order-last lg:order-first">
                                    <div className="sticky top-6 z-0">
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                                    Control Panel
                                                </h3>
                                            </div>
                                            <div className="p-4">{verificationCard}</div>
                                            {footerActions && (
                                                <div className="p-4 bg-slate-50 border-t border-slate-200">
                                                    <div className="flex flex-col gap-2">
                                                        {footerActions}
                                                        {hasRegionTransferPermission &&
                                                            onRegionTransfer &&
                                                            currentRegion && (
                                                                <button
                                                                    type="button"
                                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                                                                    onClick={handleOpenRegionTransfer}
                                                                    disabled={isSaving}
                                                                >
                                                                    <i className="fas fa-exchange-alt"></i>
                                                                    <span>Transfer</span>
                                                                </button>
                                                            )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">{children}</div>
                        </div>
                    )}
                </div>
                {footerActions && (
                    <div className="lg:hidden flex-shrink-0 p-4 bg-white border-t border-slate-200 shadow-lg">
                        <div className="flex flex-col gap-2">
                            {footerActions}
                            {hasRegionTransferPermission && onRegionTransfer && currentRegion && (
                                <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                                    onClick={handleOpenRegionTransfer}
                                    disabled={isSaving}
                                >
                                    <i className="fas fa-exchange-alt"></i>
                                    <span>Transfer</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {(message || internalRestrictionWarning) &&
                ReactDOM.createPortal(
                    <div
                        className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-[60] text-white font-medium ${
                            (message || internalRestrictionWarning || '').toLowerCase().includes('error') ||
                            (message || internalRestrictionWarning || '').toLowerCase().includes('cannot')
                                ? 'bg-red-500'
                                : 'bg-green-500'
                        }`}
                    >
                        {message || internalRestrictionWarning}
                    </div>,
                    document.body
                )}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">{deleteTitle}</h2>
                        <p className="text-slate-600 mb-6">{deleteMessage}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                                onClick={onDeleteCancel}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                                onClick={onDeleteConfirm}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showRegionTransferModal &&
                ReactDOM.createPortal(
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleCloseRegionTransfer()
                            }
                        }}
                    >
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#1e3a5f]">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-exchange-alt text-white"></i>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Transfer to Another Region</h2>
                                        <span className="text-sm text-slate-300">Region Transfer</span>
                                    </div>
                                </div>
                                <button
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors"
                                    onClick={handleCloseRegionTransfer}
                                    aria-label="Close"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                                    <div className="text-sm text-slate-500 mb-1">Current Region</div>
                                    <div className="text-base font-semibold text-slate-800">
                                        {currentRegion || 'Unknown'}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label
                                        htmlFor="region-select"
                                        className="block text-sm font-medium text-slate-700 mb-1.5"
                                    >
                                        Target Region
                                    </label>
                                    <select
                                        id="region-select"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20"
                                        value={selectedRegion}
                                        onChange={(e) => setSelectedRegion(e.target.value)}
                                        disabled={transferLoading}
                                    >
                                        <option value="">Choose a region...</option>
                                        {regions
                                            .filter((r) => r.regionCode !== currentRegion)
                                            .filter((r) => r.type !== 'Office')
                                            .filter((r) => !(assetType === 'mixer' && r.type === 'Aggregate'))
                                            .map((region) => (
                                                <option key={region.regionCode} value={region.regionCode}>
                                                    {region.regionName} ({region.regionCode}) - {region.type}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {selectedRegion && (
                                    <div className="mb-4">
                                        <label
                                            htmlFor="plant-select"
                                            className="block text-sm font-medium text-slate-700 mb-1.5"
                                        >
                                            Target Plant
                                        </label>
                                        <select
                                            id="plant-select"
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 disabled:bg-slate-50 disabled:text-slate-400"
                                            value={selectedPlant}
                                            onChange={(e) => setSelectedPlant(e.target.value)}
                                            disabled={transferLoading || availablePlants.length === 0}
                                        >
                                            <option value="">Choose a plant...</option>
                                            {availablePlants.map((plant) => (
                                                <option
                                                    key={plant.plantCode || plant.plant_code}
                                                    value={plant.plantCode || plant.plant_code}
                                                >
                                                    {plant.plantName || plant.plant_name} (
                                                    {plant.plantCode || plant.plant_code})
                                                </option>
                                            ))}
                                        </select>
                                        {availablePlants.length === 0 && (
                                            <p className="mt-1.5 text-sm text-red-500">
                                                No plants available in this region
                                            </p>
                                        )}
                                    </div>
                                )}

                                {transferError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                                        <i className="fas fa-exclamation-circle"></i>
                                        {transferError}
                                    </div>
                                )}

                                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
                                    <button
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                                        onClick={handleCloseRegionTransfer}
                                        disabled={transferLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#15304f] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        onClick={handleRegionTransferConfirm}
                                        disabled={transferLoading || !selectedRegion || !selectedPlant}
                                    >
                                        {transferLoading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i>
                                                Transferring...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-exchange-alt"></i>
                                                Transfer
                                            </>
                                        )}
                                    </button>
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
