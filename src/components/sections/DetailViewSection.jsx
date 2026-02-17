import React, { createContext, useContext, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { usePreferences } from '../../app/context/PreferencesContext'
import { UserService } from '../../services/UserService'

const DetailViewContext = createContext({
    activeSection: '',
    setActiveSection: () => {},
    sections: [],
    registerSection: () => {}
})

function DetailViewSection({
    title,
    subtitle,
    icon,
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
    notFoundDescription = 'The requested item could not be found.',
    showDeleteConfirmation = false,
    onDeleteConfirm = null,
    onDeleteCancel = null,
    deleteTitle = 'Delete Item',
    deleteMessage = 'This action cannot be undone.',
    footerActions = null,
    modals = null,
    itemAssignedPlant,
    onCanEditChange,
    currentRegion = null,
    assetType = null,
    onRegionTransfer = null
}) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    const [_canEdit, setCanEdit] = useState(canEdit)
    const [warning, setWarning] = useState(restrictionWarning)
    const [showTransfer, setShowTransfer] = useState(false)
    const [hasTransferPerm, setHasTransferPerm] = useState(false)
    const [regions, setRegions] = useState([])
    const [targetRegion, setTargetRegion] = useState('')
    const [targetPlant, setTargetPlant] = useState('')
    const [plants, setPlants] = useState([])
    const [transferring, setTransferring] = useState(false)
    const [transferErr, setTransferErr] = useState('')
    const [activeSection, setActiveSection] = useState('')
    const [sections, setSections] = useState([])
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('detailview-sidebar-collapsed') === 'true'
        } catch {
            return false
        }
    })

    const handleSidebarToggle = () => {
        const newValue = !sidebarCollapsed
        setSidebarCollapsed(newValue)
        try {
            localStorage.setItem('detailview-sidebar-collapsed', String(newValue))
        } catch {}
    }

    const registerSection = (section) => {
        setSections((prev) => {
            if (prev.find((s) => s.id === section.id)) return prev
            return [...prev, section]
        })
    }

    useEffect(() => {
        if (sections.length > 0 && !activeSection) {
            setActiveSection(sections[0].id)
        }
    }, [sections, activeSection])

    const legacyStyles = `
.detail-card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
.card-header h2 { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.form-sections { display: flex; flex-direction: column; gap: 1.5rem; }
.form-section { }
.form-section h3 { font-size: 0.9375rem; font-weight: 600; color: ${accent}; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid ${accent}; }
.form-group { margin-bottom: 1.25rem; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-size: 0.8125rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.02em; }
.form-control { width: 100%; padding: 0.875rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem; color: #1e293b; background: white; box-sizing: border-box; transition: all 0.2s; }
.form-control:focus { outline: none; border-color: ${accent}; box-shadow: 0 0 0 3px ${accent}15; }
.form-control:disabled, .form-control[readonly] { background: #f8fafc; color: #64748b; cursor: not-allowed; border-color: #e5e7eb; }
select.form-control { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 1rem center; background-repeat: no-repeat; background-size: 1rem 1rem; padding-right: 2.75rem; cursor: pointer; }
select.form-control:disabled { cursor: not-allowed; }
textarea.form-control { min-height: 120px; resize: vertical; line-height: 1.6; }
.operator-select-button { width: 100%; padding: 0.875rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem; color: #1e293b; background: white; text-align: left; cursor: pointer; transition: all 0.2s; }
.operator-select-button:hover:not(:disabled) { border-color: ${accent}; background: #fafbfc; }
.operator-select-button:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }
.operator-select-container { display: flex; gap: 0.5rem; }
.operator-select-container .operator-select-button { flex: 1; }
.unassign-operator-button { padding: 0.875rem; background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.unassign-operator-button:hover { background: #fee2e2; border-color: #f87171; }
.assign-operator-button { padding: 0.875rem; background: #f0fdf4; color: #16a34a; border: 1.5px solid #bbf7d0; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.assign-operator-button:hover { background: #dcfce7; border-color: #86efac; }
.primary-button { width: 100%; padding: 0.875rem 1.5rem; background: ${accent}; color: white; border: none; border-radius: 10px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.primary-button:hover { filter: brightness(0.92); transform: translateY(-1px); }
.primary-button:active { transform: translateY(0); }
.primary-button:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
.danger-button { width: 100%; padding: 0.875rem 1.5rem; background: #dc2626; color: white; border: none; border-radius: 10px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.danger-button:hover { background: #b91c1c; transform: translateY(-1px); }
.danger-button:active { transform: translateY(0); }
.danger-button:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
.cancel-button { width: 100%; padding: 0.875rem 1.5rem; background: #f1f5f9; color: #475569; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.cancel-button:hover { background: #e2e8f0; border-color: #cbd5e1; }
.global-button-secondary { padding: 0.625rem 1rem; background: #f1f5f9; color: #475569; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 0.5rem; }
.global-button-secondary:hover { background: #e2e8f0; border-color: #cbd5e1; }
.global-button-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.global-button-secondary i { font-size: 0.8125rem; }
.sidebar-readonly-notice { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fcd34d; border-radius: 10px; color: #92400e; font-size: 0.8125rem; font-weight: 600; width: 100%; }
.sidebar-readonly-notice i { font-size: 0.875rem; color: #b45309; }
.save-button { width: 100%; justify-content: center; }
.form-actions { display: flex; flex-direction: column; gap: 0.75rem; }
.form-actions button { width: 100%; }
.transfer-region-button { padding: 0.875rem 1.5rem; background: #f59e0b; color: white; border: none; border-radius: 10px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; }
.transfer-region-button:hover { background: #d97706; }
.transfer-region-button:disabled { background: #94a3b8; cursor: not-allowed; }
.spare-status-note { padding: 1rem 1.25rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; color: #92400e; font-size: 0.875rem; margin-top: 0.75rem; display: flex; align-items: flex-start; gap: 0.75rem; line-height: 1.5; }
.spare-status-note::before { content: '\\f071'; font-family: 'Font Awesome 6 Free'; font-weight: 900; color: #f59e0b; }
.down-in-yard-container { margin-top: 1rem; }
.down-in-yard-toggle { margin-bottom: 0.5rem; }
.down-in-yard-note { padding: 0.75rem 1rem; background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 8px; color: #0369a1; font-size: 0.875rem; }
.toggle-label { display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.toggle-label.disabled { opacity: 0.6; cursor: not-allowed; }
.toggle-checkbox { display: none; }
.toggle-switch { position: relative; width: 44px; height: 24px; background: #cbd5e1; border-radius: 12px; transition: all 0.2s; }
.toggle-checkbox:checked + .toggle-switch { background: ${accent}; }
.toggle-slider { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.toggle-checkbox:checked + .toggle-switch .toggle-slider { left: 22px; }
.toggle-text { font-size: 0.9375rem; font-weight: 500; color: #1e293b; }
.error-message { padding: 1rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.875rem; }
.error-text { color: #dc2626; font-size: 0.875rem; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.25rem; }
@media (max-width: 640px) { .form-row-2, .form-row-3 { grid-template-columns: 1fr; } }
.cleanliness-rating { display: flex; gap: 0.375rem; }
.cleanliness-star { font-size: 1.75rem; color: #e5e7eb; cursor: pointer; transition: all 0.15s; }
.cleanliness-star.active { color: #f59e0b; }
.cleanliness-star:hover { color: #fbbf24; transform: scale(1.1); }
.cleanliness-rating-display { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: white; border: 1.5px solid #e5e7eb; border-radius: 10px; }
.cleanliness-rating-stars { display: flex; gap: 0.375rem; }
.cleanliness-rating-stars i { font-size: 1.375rem; color: #f59e0b; }
.cleanliness-rating-stars i.empty { color: #e5e7eb; }
.cleanliness-rating-label { font-size: 0.9375rem; font-weight: 600; color: #1e293b; }
.cleanliness-rating-editor { display: flex; align-items: center; gap: 1.25rem; padding: 1rem 1.25rem; background: white; border: 1.5px solid #e5e7eb; border-radius: 10px; }
.star-input { display: flex; gap: 0.375rem; }
.star-button { background: none; border: none; padding: 0.375rem; cursor: pointer; transition: all 0.15s; border-radius: 6px; }
.star-button:hover:not(.disabled) { transform: scale(1.15); background: #fef3c7; }
.star-button.disabled { cursor: not-allowed; opacity: 0.5; }
.star-button i { font-size: 1.625rem; color: #e5e7eb; transition: color 0.15s; }
.star-button.active i, .star-button i.filled { color: #f59e0b; }
.star-button:hover:not(.disabled) i { color: #fbbf24; }
.rating-value-display { display: flex; align-items: center; gap: 0.75rem; padding-left: 1rem; border-left: 2px solid #e5e7eb; }
.rating-label { font-size: 1rem; font-weight: 600; color: #1e293b; }
.rating-container { display: flex; flex-direction: column; gap: 0.75rem; }
.rating-stars { display: flex; gap: 0.5rem; }
.rating-stars .star { font-size: 1.75rem; color: #e5e7eb; cursor: pointer; transition: all 0.15s; background: none; border: none; padding: 0.25rem; border-radius: 6px; }
.rating-stars .star:hover { transform: scale(1.15); background: #fef3c7; }
.rating-stars .star.filled { color: #f59e0b; }
.rating-stars .star.hovered { color: #fbbf24; }
.rating-value { font-size: 0.9375rem; color: #64748b; font-weight: 500; }
.rating-text { font-size: 1rem; font-weight: 600; color: #1e293b; }
.warning-text { color: #dc2626; font-size: 0.875rem; margin-top: 0.75rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
.date-input-container { position: relative; }
.date-input-container input { width: 100%; }
.overdue-warning { display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; color: #92400e; font-size: 0.875rem; margin-top: 0.75rem; }
.overdue-warning i { color: #f59e0b; font-size: 1rem; }
.view-only-mode { display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fde68a; border-radius: 12px; margin-bottom: 1.25rem; }
.view-only-mode i { font-size: 1.375rem; color: #d97706; }
.view-only-mode-content { flex: 1; }
.view-only-mode-title { font-size: 1rem; font-weight: 600; color: #92400e; margin: 0 0 0.25rem 0; }
.view-only-mode-message { font-size: 0.875rem; color: #b45309; margin: 0; line-height: 1.5; }
.view-only-banner { display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1.25rem; background: #fffbeb; border-bottom: 1px solid #fde68a; color: #92400e; font-size: 0.9375rem; font-weight: 500; }
.view-only-banner i { color: #f59e0b; }
.restriction-warning { display: flex; align-items: flex-start; gap: 1rem; padding: 1.25rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin-bottom: 1.25rem; }
.restriction-warning i { color: #dc2626; font-size: 1.25rem; margin-top: 0.125rem; }
.restriction-warning-content { flex: 1; }
.restriction-warning-title { font-size: 1rem; font-weight: 600; color: #991b1b; margin: 0 0 0.375rem 0; }
.restriction-warning-message { font-size: 0.875rem; color: #b91c1c; margin: 0; line-height: 1.5; }
.read-only-field { position: relative; }
.read-only-field::after { content: ''; position: absolute; inset: 0; background: transparent; pointer-events: none; }
.read-only-indicator { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; background: #f1f5f9; border-radius: 6px; font-size: 0.75rem; color: #64748b; margin-left: 0.5rem; font-weight: 500; }
.read-only-indicator i { font-size: 0.625rem; }
`

    useEffect(() => {
        if (itemAssignedPlant === undefined) {
            setCanEdit(canEdit)
            setWarning(restrictionWarning)
            onCanEditChange?.(canEdit)
            return
        }
        ;(async () => {
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || user
                if (!uid || uid === '0' || uid === 0) {
                    setCanEdit(true)
                    setWarning(null)
                    onCanEditChange?.(true)
                    return
                }
                const bypass = await UserService.hasPermission(uid, 'detailview.bypass.plantrestriction')
                if (bypass) {
                    setCanEdit(true)
                    setWarning(null)
                    onCanEditChange?.(true)
                    return
                }
                const profile = await UserService.getUserPlant(uid)
                const code = typeof profile === 'string' ? profile : profile?.plant_code || profile?.plantCode
                if (code && itemAssignedPlant) {
                    const same = code === itemAssignedPlant
                    setCanEdit(same)
                    setWarning(same ? null : `This item belongs to plant ${itemAssignedPlant}.`)
                    onCanEditChange?.(same)
                } else {
                    setCanEdit(true)
                    setWarning(null)
                    onCanEditChange?.(true)
                }
            } catch {
                setCanEdit(true)
                setWarning(null)
                onCanEditChange?.(true)
            }
        })()
    }, [itemAssignedPlant, canEdit, restrictionWarning, onCanEditChange])

    useEffect(() => {
        ;(async () => {
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || user
                if (!uid) return setHasTransferPerm(false)
                const has = await UserService.hasPermission(uid, 'detailview.regiontransfer')
                setHasTransferPerm(!!has)
            } catch {
                setHasTransferPerm(false)
            }
        })()
    }, [])

    useEffect(() => {
        if (!showTransfer || !hasTransferPerm) return
        ;(async () => {
            try {
                const { RegionService } = await import('../../services/RegionService')
                setRegions((await RegionService.fetchRegions()) || [])
            } catch {
                setTransferErr('Failed to load regions')
            }
        })()
    }, [showTransfer, hasTransferPerm])

    useEffect(() => {
        if (!targetRegion) {
            setPlants([])
            return
        }
        ;(async () => {
            try {
                const { RegionService } = await import('../../services/RegionService')
                setPlants((await RegionService.fetchRegionPlants(targetRegion)) || [])
                setTargetPlant('')
            } catch {
                setPlants([])
            }
        })()
    }, [targetRegion])

    const openTransfer = () => {
        setShowTransfer(true)
        setTargetRegion('')
        setTargetPlant('')
        setPlants([])
        setTransferErr('')
    }
    const closeTransfer = () => {
        setShowTransfer(false)
        setTargetRegion('')
        setTargetPlant('')
        setPlants([])
        setTransferErr('')
    }

    const doTransfer = async () => {
        if (!targetRegion) return setTransferErr('Select a region')
        if (!targetPlant) return setTransferErr('Select a plant')
        const reg = regions.find((r) => r.regionCode === targetRegion)
        if (!reg) return setTransferErr('Invalid region')
        if (assetType === 'mixer' && reg.type === 'Aggregate')
            return setTransferErr('Cannot transfer mixers to Aggregate')
        if (reg.type === 'Office') return setTransferErr('Cannot transfer to Office')
        setTransferring(true)
        setTransferErr('')
        try {
            await onRegionTransfer?.(targetRegion, targetPlant)
            closeTransfer()
        } catch (e) {
            setTransferErr(e.message || 'Transfer failed')
        } finally {
            setTransferring(false)
        }
    }

    const selectBg =
        "#f8fafc url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\") right 10px center/18px no-repeat"

    if (notFound) {
        return (
            <div
                className={className}
                style={{
                    alignItems: 'center',
                    background: '#f8fafc',
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    justifyContent: 'center',
                    left: 0,
                    padding: 40,
                    position: 'fixed',
                    right: 0,
                    textAlign: 'center',
                    top: 64,
                    zIndex: 40
                }}
            >
                <div
                    style={{
                        alignItems: 'center',
                        background: `${accent}12`,
                        borderRadius: 20,
                        display: 'flex',
                        height: 80,
                        justifyContent: 'center',
                        width: 80
                    }}
                >
                    <i className="fas fa-search" style={{ color: accent, fontSize: 32 }}></i>
                </div>
                <div>
                    <h2 style={{ color: '#1e293b', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
                        {notFoundMessage}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: 14, margin: 0, maxWidth: 300 }}>{notFoundDescription}</p>
                </div>
                <button
                    onClick={onClose || onBack}
                    style={{
                        alignItems: 'center',
                        background: accent,
                        border: 'none',
                        borderRadius: 12,
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        fontSize: 14,
                        fontWeight: 600,
                        gap: 8,
                        padding: '12px 24px'
                    }}
                >
                    <i className="fas fa-arrow-left"></i> Go Back
                </button>
            </div>
        )
    }

    return (
        <DetailViewContext.Provider value={{ activeSection, setActiveSection, sections, registerSection }}>
            <div
                className={className}
                style={{
                    background: '#f8fafc',
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    left: 0,
                    position: 'fixed',
                    right: 0,
                    top: 64,
                    zIndex: 40
                }}
            >
                <style>{`
                    @keyframes dv-spin { to { transform: rotate(360deg); } }
                    @keyframes dv-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes dv-slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                    @keyframes dv-scaleIn { from { opacity: 0; transform: translateY(-50%) scaleY(0); } to { opacity: 1; transform: translateY(-50%) scaleY(1); } }
                    .dv-input:focus { border-color: ${accent} !important; box-shadow: 0 0 0 3px ${accent}20 !important; }
                    .dv-btn:hover:not(:disabled) { opacity: 0.85; }
                    .dv-btn:active:not(:disabled) { transform: scale(0.97); }
                    .dv-sidebar { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                    .dv-footer-actions { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; }
                    .dv-footer-actions .global-button-secondary { flex: 1; justify-content: center; }
                    .dv-sidebar-collapsed .dv-footer-actions { flex-direction: column; }
                    .dv-sidebar-collapsed .dv-footer-actions .global-button-secondary { padding: 10px; min-width: 48px; flex: unset; }
                    .dv-sidebar-collapsed .dv-footer-actions .global-button-secondary span { display: none; }
                    .dv-mobile-nav { display: none; }
                    @media (max-width: 768px) {
                        .dv-sidebar { display: none !important; }
                        .dv-mobile-nav { display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; padding: 8px; gap: 4px; z-index: 50; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                        .dv-mobile-nav::-webkit-scrollbar { display: none; }
                        .dv-mobile-nav-btn { flex: 0 0 auto; padding: 10px 16px; border: none; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 70px; transition: all 0.15s; }
                        .dv-mobile-nav-btn i { font-size: 16px; }
                        .dv-main-content { padding: 16px !important; padding-bottom: 80px !important; }
                        .dv-header { padding: 12px 16px !important; }
                        .dv-header-title { font-size: 18px !important; }
                        .dv-header-actions { gap: 4px !important; }
                        .dv-header-actions .global-button-secondary { padding: 8px !important; }
                        .dv-header-actions .global-button-secondary span { display: none; }
                        .dv-section-grid { grid-template-columns: 1fr !important; }
                        .dv-section-header h2 { font-size: 18px !important; }
                        .form-row-2, .form-row-3 { grid-template-columns: 1fr !important; }
                    }
                    @media (max-width: 480px) {
                        .dv-mobile-nav-btn { min-width: 60px; padding: 8px 12px; font-size: 11px; }
                        .dv-mobile-nav-btn i { font-size: 14px; }
                        .dv-main-content { padding: 12px !important; padding-bottom: 75px !important; }
                    }
                    ${legacyStyles}
                `}</style>

                {isSaving && (
                    <div
                        style={{
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.95)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            inset: 0,
                            justifyContent: 'center',
                            position: 'absolute',
                            zIndex: 100
                        }}
                    >
                        <div
                            style={{
                                animation: 'dv-spin 0.7s linear infinite',
                                border: '3px solid #e2e8f0',
                                borderRadius: '50%',
                                borderTopColor: accent,
                                height: 48,
                                width: 48
                            }}
                        ></div>
                        <span style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Saving changes...</span>
                    </div>
                )}

                <div
                    style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: 'white',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        style={{
                            backgroundImage: `linear-gradient(to right, #1e3a5f 1px, transparent 1px), linear-gradient(to bottom, #1e3a5f 1px, transparent 1px)`,
                            backgroundSize: '20px 20px',
                            inset: 0,
                            opacity: 0.03,
                            position: 'absolute'
                        }}
                    ></div>
                    <div
                        className="dv-header"
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            gap: 16,
                            padding: '16px 24px',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={onBack || onClose}
                            style={{
                                alignItems: 'center',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: 12,
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                flexShrink: 0,
                                fontSize: 16,
                                height: 44,
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                width: 44
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#e2e8f0'
                                e.currentTarget.style.color = '#334155'
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#f1f5f9'
                                e.currentTarget.style.color = '#64748b'
                            }}
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                                {icon && <i className={icon} style={{ color: accent, fontSize: 20 }}></i>}
                                <h1
                                    className="dv-header-title"
                                    style={{
                                        color: '#0f172a',
                                        fontSize: 22,
                                        fontWeight: 700,
                                        margin: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {title}
                                </h1>
                            </div>
                            {subtitle && (
                                <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{subtitle}</p>
                            )}
                        </div>
                        <div className="dv-header-actions" style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                            {headerActions}
                        </div>
                    </div>
                </div>

                <div
                    className="dv-container"
                    style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', width: '100%' }}
                >
                    {isLoading ? (
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flex: 1,
                                flexDirection: 'column',
                                gap: 14,
                                justifyContent: 'center'
                            }}
                        >
                            <div
                                style={{
                                    animation: 'dv-spin 0.7s linear infinite',
                                    border: '3px solid #e2e8f0',
                                    borderRadius: '50%',
                                    borderTopColor: accent,
                                    height: 48,
                                    width: 48
                                }}
                            ></div>
                            <span style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>{loadingMessage}</span>
                        </div>
                    ) : (
                        <>
                            <aside
                                className={`dv-sidebar ${sidebarCollapsed ? 'dv-sidebar-collapsed' : ''}`}
                                style={{
                                    background: 'white',
                                    borderRight: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flexShrink: 0,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    width: sidebarCollapsed ? 64 : 240
                                }}
                            >
                                <div style={{ padding: sidebarCollapsed ? '12px 8px' : '16px' }}>
                                    <button
                                        onClick={handleSidebarToggle}
                                        style={{
                                            alignItems: 'center',
                                            background: '#f1f5f9',
                                            border: 'none',
                                            borderRadius: 8,
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            fontSize: 14,
                                            gap: 8,
                                            height: 36,
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            width: sidebarCollapsed ? 48 : '100%'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#e2e8f0'
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = '#f1f5f9'
                                        }}
                                    >
                                        <i
                                            className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}
                                            style={{ fontSize: 12 }}
                                        ></i>
                                        {!sidebarCollapsed && (
                                            <span style={{ fontSize: 13, fontWeight: 500 }}>Collapse</span>
                                        )}
                                    </button>
                                </div>
                                <nav
                                    style={{
                                        display: 'flex',
                                        flex: 1,
                                        flexDirection: 'column',
                                        gap: 4,
                                        padding: sidebarCollapsed ? '0 8px' : '0 12px'
                                    }}
                                >
                                    {sections.map((section, idx) => (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            title={sidebarCollapsed ? section.title : undefined}
                                            style={{
                                                alignItems: 'center',
                                                animation: `dv-fadeIn 0.2s ease-out ${0.03 * idx}s both`,
                                                background:
                                                    activeSection === section.id ? `${accent}10` : 'transparent',
                                                border: 'none',
                                                borderRadius: 10,
                                                color: activeSection === section.id ? accent : '#64748b',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                fontSize: 14,
                                                fontWeight: activeSection === section.id ? 600 : 500,
                                                gap: 12,
                                                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                                padding: sidebarCollapsed ? '12px' : '12px 14px',
                                                textAlign: 'left',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                width: '100%'
                                            }}
                                            onMouseOver={(e) => {
                                                if (activeSection !== section.id) {
                                                    e.currentTarget.style.background = '#f1f5f9'
                                                }
                                            }}
                                            onMouseOut={(e) => {
                                                if (activeSection !== section.id) {
                                                    e.currentTarget.style.background = 'transparent'
                                                }
                                            }}
                                        >
                                            <i
                                                className={section.icon || 'fas fa-circle'}
                                                style={{ fontSize: 16, flexShrink: 0 }}
                                            ></i>
                                            {!sidebarCollapsed && (
                                                <span
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {section.title}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                                {(footerActions || (hasTransferPerm && onRegionTransfer && currentRegion)) && (
                                    <div
                                        className="dv-footer-actions"
                                        style={{
                                            borderTop: '1px solid #e2e8f0',
                                            marginTop: 'auto',
                                            padding: sidebarCollapsed ? '12px 8px' : '16px'
                                        }}
                                    >
                                        {footerActions}
                                        {hasTransferPerm && onRegionTransfer && currentRegion && (
                                            <button
                                                className="global-button-secondary"
                                                onClick={openTransfer}
                                                disabled={isSaving}
                                                title="Transfer Region"
                                            >
                                                <i className="fas fa-exchange-alt"></i>
                                                <span>Transfer</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </aside>

                            <main
                                className="dv-main-content"
                                style={{ background: '#f8fafc', flex: 1, overflowY: 'auto', padding: 24 }}
                            >
                                <div style={{ animation: 'dv-fadeIn 0.3s ease-out' }}>{children}</div>
                            </main>

                            <nav className="dv-mobile-nav">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className="dv-mobile-nav-btn"
                                        style={{
                                            background: activeSection === section.id ? `${accent}15` : '#f8fafc',
                                            color: activeSection === section.id ? accent : '#64748b'
                                        }}
                                    >
                                        <i className={section.icon || 'fas fa-circle'}></i>
                                        <span
                                            style={{
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: 60
                                            }}
                                        >
                                            {section.title}
                                        </span>
                                    </button>
                                ))}
                                {footerActions && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 4,
                                            marginLeft: 'auto',
                                            paddingLeft: 8,
                                            borderLeft: '1px solid #e2e8f0'
                                        }}
                                    >
                                        {footerActions}
                                    </div>
                                )}
                            </nav>
                        </>
                    )}
                </div>

                {(message || warning) &&
                    ReactDOM.createPortal(
                        <div
                            style={{
                                alignItems: 'center',
                                background:
                                    (message || warning || '').toLowerCase().includes('error') ||
                                    (message || warning || '').toLowerCase().includes('cannot')
                                        ? '#dc2626'
                                        : '#16a34a',
                                borderRadius: 10,
                                bottom: 24,
                                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                                color: 'white',
                                display: 'flex',
                                fontSize: 13,
                                fontWeight: 500,
                                gap: 10,
                                left: '50%',
                                padding: '12px 18px',
                                position: 'fixed',
                                transform: 'translateX(-50%)',
                                zIndex: 100
                            }}
                        >
                            <i
                                className={`fas ${(message || warning || '').toLowerCase().includes('error') || (message || warning || '').toLowerCase().includes('cannot') ? 'fa-times-circle' : 'fa-check-circle'}`}
                            ></i>
                            {message || warning}
                        </div>,
                        document.body
                    )}

                {showDeleteConfirmation &&
                    ReactDOM.createPortal(
                        <div
                            style={{
                                alignItems: 'center',
                                background: 'rgba(15,23,42,0.6)',
                                display: 'flex',
                                inset: 0,
                                justifyContent: 'center',
                                padding: 20,
                                position: 'fixed',
                                zIndex: 60
                            }}
                        >
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: 16,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                                    maxWidth: 360,
                                    overflow: 'hidden',
                                    width: '100%'
                                }}
                            >
                                <div style={{ padding: 24, textAlign: 'center' }}>
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            background: '#fef2f2',
                                            borderRadius: 16,
                                            display: 'flex',
                                            height: 64,
                                            justifyContent: 'center',
                                            margin: '0 auto 16px',
                                            width: 64
                                        }}
                                    >
                                        <i className="fas fa-trash-alt" style={{ color: '#dc2626', fontSize: 24 }}></i>
                                    </div>
                                    <h3 style={{ color: '#1e293b', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
                                        {deleteTitle}
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{deleteMessage}</p>
                                </div>
                                <div
                                    style={{
                                        background: '#f8fafc',
                                        borderTop: '1px solid #e2e8f0',
                                        display: 'flex',
                                        gap: 10,
                                        padding: '14px 20px'
                                    }}
                                >
                                    <button
                                        className="dv-btn"
                                        onClick={onDeleteCancel}
                                        style={{
                                            background: '#f1f5f9',
                                            border: 'none',
                                            borderRadius: 10,
                                            color: '#475569',
                                            cursor: 'pointer',
                                            flex: 1,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            padding: '10px 16px'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="dv-btn"
                                        onClick={onDeleteConfirm}
                                        style={{
                                            background: '#dc2626',
                                            border: 'none',
                                            borderRadius: 10,
                                            color: 'white',
                                            cursor: 'pointer',
                                            flex: 1,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            padding: '10px 16px'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                {showTransfer &&
                    ReactDOM.createPortal(
                        <div
                            onClick={(e) => e.target === e.currentTarget && closeTransfer()}
                            style={{
                                alignItems: 'center',
                                background: 'rgba(15,23,42,0.6)',
                                display: 'flex',
                                inset: 0,
                                justifyContent: 'center',
                                padding: 20,
                                position: 'fixed',
                                zIndex: 200
                            }}
                        >
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: 16,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: '85vh',
                                    maxWidth: 400,
                                    overflow: 'hidden',
                                    width: '100%'
                                }}
                            >
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: accent,
                                        display: 'flex',
                                        gap: 12,
                                        justifyContent: 'space-between',
                                        padding: '16px 20px'
                                    }}
                                >
                                    <span
                                        style={{
                                            alignItems: 'center',
                                            color: 'white',
                                            display: 'flex',
                                            fontSize: 15,
                                            fontWeight: 600,
                                            gap: 10
                                        }}
                                    >
                                        <i className="fas fa-exchange-alt"></i> Transfer Region
                                    </span>
                                    <button
                                        onClick={closeTransfer}
                                        style={{
                                            alignItems: 'center',
                                            background: 'rgba(255,255,255,0.15)',
                                            border: 'none',
                                            borderRadius: 8,
                                            color: 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            fontSize: 14,
                                            height: 32,
                                            justifyContent: 'center',
                                            width: 32
                                        }}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                                    <div
                                        style={{
                                            background: '#f1f5f9',
                                            borderRadius: 10,
                                            marginBottom: 16,
                                            padding: 14
                                        }}
                                    >
                                        <div
                                            style={{ color: '#64748b', fontSize: 11, fontWeight: 600, marginBottom: 2 }}
                                        >
                                            CURRENT REGION
                                        </div>
                                        <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>
                                            {currentRegion || 'Unknown'}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 14 }}>
                                        <label
                                            style={{
                                                color: '#64748b',
                                                display: 'block',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                marginBottom: 6
                                            }}
                                        >
                                            Target Region
                                        </label>
                                        <select
                                            className="dv-input"
                                            value={targetRegion}
                                            onChange={(e) => setTargetRegion(e.target.value)}
                                            disabled={transferring}
                                            style={{
                                                appearance: 'none',
                                                background: selectBg,
                                                border: '1.5px solid #e2e8f0',
                                                borderRadius: 10,
                                                color: '#1e293b',
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                outline: 'none',
                                                padding: '10px 40px 10px 14px',
                                                width: '100%'
                                            }}
                                        >
                                            <option value="">Select region...</option>
                                            {regions
                                                .filter(
                                                    (r) =>
                                                        r.regionCode !== currentRegion &&
                                                        r.type !== 'Office' &&
                                                        !(assetType === 'mixer' && r.type === 'Aggregate')
                                                )
                                                .map((r) => (
                                                    <option key={r.regionCode} value={r.regionCode}>
                                                        {r.regionName}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    {targetRegion && (
                                        <div style={{ marginBottom: 14 }}>
                                            <label
                                                style={{
                                                    color: '#64748b',
                                                    display: 'block',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    marginBottom: 6
                                                }}
                                            >
                                                Target Plant
                                            </label>
                                            <select
                                                className="dv-input"
                                                value={targetPlant}
                                                onChange={(e) => setTargetPlant(e.target.value)}
                                                disabled={transferring || !plants.length}
                                                style={{
                                                    appearance: 'none',
                                                    background: selectBg,
                                                    border: '1.5px solid #e2e8f0',
                                                    borderRadius: 10,
                                                    color: '#1e293b',
                                                    cursor: 'pointer',
                                                    fontSize: 14,
                                                    outline: 'none',
                                                    padding: '10px 40px 10px 14px',
                                                    width: '100%'
                                                }}
                                            >
                                                <option value="">Select plant...</option>
                                                {plants.map((p) => (
                                                    <option
                                                        key={p.plantCode || p.plant_code}
                                                        value={p.plantCode || p.plant_code}
                                                    >
                                                        {p.plantName || p.plant_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {transferErr && (
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                background: '#fef2f2',
                                                borderRadius: 8,
                                                color: '#dc2626',
                                                display: 'flex',
                                                fontSize: 12,
                                                gap: 8,
                                                padding: '10px 12px'
                                            }}
                                        >
                                            <i className="fas fa-exclamation-circle"></i>
                                            {transferErr}
                                        </div>
                                    )}
                                </div>
                                <div
                                    style={{
                                        background: '#f8fafc',
                                        borderTop: '1px solid #e2e8f0',
                                        display: 'flex',
                                        gap: 10,
                                        padding: '14px 20px'
                                    }}
                                >
                                    <button
                                        className="dv-btn"
                                        onClick={closeTransfer}
                                        disabled={transferring}
                                        style={{
                                            background: '#f1f5f9',
                                            border: 'none',
                                            borderRadius: 10,
                                            color: '#475569',
                                            cursor: 'pointer',
                                            flex: 1,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            padding: '10px 16px'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="dv-btn"
                                        onClick={doTransfer}
                                        disabled={transferring || !targetRegion || !targetPlant}
                                        style={{
                                            alignItems: 'center',
                                            background: accent,
                                            border: 'none',
                                            borderRadius: 10,
                                            color: 'white',
                                            cursor:
                                                transferring || !targetRegion || !targetPlant
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            display: 'flex',
                                            flex: 1,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            gap: 8,
                                            justifyContent: 'center',
                                            opacity: transferring || !targetRegion || !targetPlant ? 0.5 : 1,
                                            padding: '10px 16px'
                                        }}
                                    >
                                        {transferring ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Transferring...
                                            </>
                                        ) : (
                                            'Confirm'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                {modals}
            </div>
        </DetailViewContext.Provider>
    )
}

DetailViewSection.Section = function Section({ id, title, icon, children }) {
    const { activeSection, registerSection } = useContext(DetailViewContext)
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'

    useEffect(() => {
        registerSection({ id, title, icon })
    }, [id, title, icon, registerSection])

    if (activeSection !== id) return null

    const childArray = React.Children.toArray(children)
    const count = childArray.length

    const getGridStyle = () => {
        if (count === 1) return { display: 'flex', flexDirection: 'column', gap: 20 }
        if (count === 2) return { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(2, 1fr)' }
        if (count === 3) return { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(2, 1fr)' }
        if (count === 4) return { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(2, 1fr)' }
        return { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(2, 1fr)' }
    }

    const renderChildren = () => {
        if (count === 3) {
            return (
                <>
                    {childArray[0]}
                    {childArray[1]}
                    <div style={{ gridColumn: '1 / -1' }}>{childArray[2]}</div>
                </>
            )
        }
        if (count === 5) {
            return (
                <>
                    {childArray[0]}
                    {childArray[1]}
                    {childArray[2]}
                    {childArray[3]}
                    <div style={{ gridColumn: '1 / -1' }}>{childArray[4]}</div>
                </>
            )
        }
        return childArray
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="dv-section-header" style={{ alignItems: 'center', display: 'flex', gap: 14 }}>
                <div
                    style={{
                        alignItems: 'center',
                        background: `${accent}12`,
                        borderRadius: 14,
                        display: 'flex',
                        flexShrink: 0,
                        height: 48,
                        justifyContent: 'center',
                        width: 48
                    }}
                >
                    <i className={icon} style={{ color: accent, fontSize: 20 }}></i>
                </div>
                <h2 style={{ color: '#1e293b', fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
            </div>
            <div className="dv-section-grid" style={getGridStyle()}>
                {renderChildren()}
            </div>
        </div>
    )
}

DetailViewSection.Card = function Card({ title, icon, children, actions, fullWidth }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <div
            style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                gridColumn: fullWidth ? '1 / -1' : undefined,
                overflow: 'hidden'
            }}
        >
            {title && (
                <div
                    style={{
                        alignItems: 'center',
                        background: '#fafbfc',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        gap: 10,
                        justifyContent: 'space-between',
                        padding: '14px 20px'
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            color: '#1e293b',
                            display: 'flex',
                            fontSize: 15,
                            fontWeight: 600,
                            gap: 10
                        }}
                    >
                        {icon && <i className={icon} style={{ color: accent, fontSize: 15 }}></i>}
                        {title}
                    </div>
                    {actions && <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>{actions}</div>}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>{children}</div>
        </div>
    )
}

DetailViewSection.Row = function Row({ children, cols = 2 }) {
    return <div style={{ display: 'grid', gap: 16, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>{children}</div>
}

DetailViewSection.Field = function Field({ label, value, empty = '-', icon }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
                style={{
                    alignItems: 'center',
                    color: '#64748b',
                    display: 'flex',
                    fontSize: 12,
                    fontWeight: 600,
                    gap: 6,
                    textTransform: 'uppercase'
                }}
            >
                {icon && <i className={icon} style={{ color: accent, fontSize: 11 }}></i>}
                {label}
            </span>
            <span
                style={{
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    color: value ? '#1e293b' : '#94a3b8',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '10px 14px'
                }}
            >
                {value || empty}
            </span>
        </div>
    )
}

DetailViewSection.Input = function Input({ label, icon, ...props }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {label && (
                <label
                    style={{
                        alignItems: 'center',
                        color: '#374151',
                        display: 'flex',
                        fontSize: 13,
                        fontWeight: 600,
                        gap: 6
                    }}
                >
                    {icon && <i className={icon} style={{ color: accent, fontSize: 12 }}></i>}
                    {label}
                </label>
            )}
            <input
                {...props}
                className="dv-input"
                style={{
                    background: 'white',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 10,
                    color: '#1e293b',
                    fontSize: 14,
                    outline: 'none',
                    padding: '12px 14px',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    width: '100%',
                    ...props.style
                }}
            />
        </div>
    )
}

DetailViewSection.Select = function Select({ label, icon, options = [], placeholder, ...props }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    const selectBg =
        "white url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\") right 12px center/16px no-repeat"
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {label && (
                <label
                    style={{
                        alignItems: 'center',
                        color: '#374151',
                        display: 'flex',
                        fontSize: 13,
                        fontWeight: 600,
                        gap: 6
                    }}
                >
                    {icon && <i className={icon} style={{ color: accent, fontSize: 12 }}></i>}
                    {label}
                </label>
            )}
            <select
                {...props}
                className="dv-input"
                style={{
                    appearance: 'none',
                    background: selectBg,
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 10,
                    color: '#1e293b',
                    cursor: 'pointer',
                    fontSize: 14,
                    outline: 'none',
                    padding: '12px 40px 12px 14px',
                    width: '100%',
                    ...props.style
                }}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option
                        key={typeof opt === 'string' ? opt : opt.value}
                        value={typeof opt === 'string' ? opt : opt.value}
                    >
                        {typeof opt === 'string' ? opt : opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

DetailViewSection.Textarea = function Textarea({ label, icon, ...props }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {label && (
                <label
                    style={{
                        alignItems: 'center',
                        color: '#374151',
                        display: 'flex',
                        fontSize: 13,
                        fontWeight: 600,
                        gap: 6
                    }}
                >
                    {icon && <i className={icon} style={{ color: accent, fontSize: 12 }}></i>}
                    {label}
                </label>
            )}
            <textarea
                {...props}
                className="dv-input"
                style={{
                    background: 'white',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 10,
                    color: '#1e293b',
                    fontSize: 14,
                    lineHeight: 1.6,
                    minHeight: 120,
                    outline: 'none',
                    padding: '12px 14px',
                    resize: 'vertical',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    width: '100%',
                    ...props.style
                }}
            />
        </div>
    )
}

DetailViewSection.Button = function Button({ variant = 'primary', block, children, ...props }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    const variants = {
        danger: { background: '#dc2626', color: 'white' },
        ghost: { background: 'transparent', color: '#64748b' },
        outline: { background: 'white', border: `1.5px solid ${accent}`, color: accent },
        primary: { background: accent, color: 'white' },
        secondary: { background: '#f1f5f9', color: '#475569' },
        warning: { background: '#f59e0b', color: 'white' }
    }
    const v = variants[variant] || variants.primary
    return (
        <button
            {...props}
            className="dv-btn"
            style={{
                alignItems: 'center',
                border: v.border || 'none',
                borderRadius: 10,
                cursor: props.disabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                fontSize: 13,
                fontWeight: 600,
                gap: 8,
                justifyContent: 'center',
                opacity: props.disabled ? 0.5 : 1,
                padding: '10px 16px',
                transition: 'opacity 0.15s, transform 0.1s',
                width: block ? '100%' : 'auto',
                ...v,
                ...props.style
            }}
        >
            {children}
        </button>
    )
}

DetailViewSection.Divider = function Divider() {
    return <div style={{ background: '#e2e8f0', height: 1, margin: '4px 0' }}></div>
}

DetailViewSection.Banner = function Banner({ type = 'info', icon, children }) {
    const types = {
        error: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: 'fa-times-circle' },
        info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'fa-info-circle' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: 'fa-check-circle' },
        warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: 'fa-exclamation-triangle' }
    }
    const t = types[type] || types.info
    return (
        <div
            style={{
                alignItems: 'center',
                background: t.bg,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                color: t.color,
                display: 'flex',
                fontSize: 13,
                gap: 10,
                padding: '12px 14px'
            }}
        >
            <i className={`fas ${icon || t.icon}`}></i>
            <span style={{ flex: 1 }}>{children}</span>
        </div>
    )
}

DetailViewSection.Toggle = function Toggle({ label, checked, onChange, disabled }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <label
            style={{
                alignItems: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                gap: 12,
                opacity: disabled ? 0.5 : 1
            }}
        >
            <div
                style={{
                    background: checked ? accent : '#cbd5e1',
                    borderRadius: 14,
                    height: 28,
                    padding: 3,
                    position: 'relative',
                    transition: 'background 0.2s',
                    width: 52
                }}
            >
                <div
                    style={{
                        background: 'white',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        height: 22,
                        transform: checked ? 'translateX(24px)' : 'translateX(0)',
                        transition: 'transform 0.2s',
                        width: 22
                    }}
                ></div>
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                style={{ display: 'none' }}
            />
            {label && <span style={{ color: '#1e293b', fontSize: 14, fontWeight: 500 }}>{label}</span>}
        </label>
    )
}

DetailViewSection.Rating = function Rating({ value = 0, onChange, max = 5, disabled }) {
    const [hover, setHover] = useState(0)
    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 4 }}>
            {[...Array(max)].map((_, i) => (
                <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange?.(i + 1)}
                    onMouseEnter={() => !disabled && setHover(i + 1)}
                    onMouseLeave={() => setHover(0)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: i < (hover || value) ? '#fbbf24' : '#e2e8f0',
                        cursor: disabled ? 'default' : 'pointer',
                        fontSize: 22,
                        padding: 2,
                        transition: 'transform 0.1s, color 0.15s'
                    }}
                >
                    <i className="fas fa-star"></i>
                </button>
            ))}
            {value > 0 && (
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600, marginLeft: 8 }}>
                    {value}/{max}
                </span>
            )}
        </div>
    )
}

export default DetailViewSection
