import React, { createContext, useContext, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
const DetailViewContext = createContext({
    activeSection: '',
    registerSection: () => {},
    sections: [],
    setActiveSection: () => {}
})
/**
 * Full-screen detail view shell for asset editing.
 * Provides a sidebar with section navigation, plant-based edit restrictions,
 * region transfer support, delete confirmation, loading/saving overlays,
 * and responsive mobile bottom navigation.
 */
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
.detail-card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; min-width: 0; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
.card-header h2 { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.form-sections { display: flex; flex-direction: column; gap: 1.5rem; }
.form-section { }
.form-section h3 { font-size: 0.9375rem; font-weight: 600; color: ${accent}; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid ${accent}; }
.form-group { margin-bottom: 1.25rem; overflow: hidden; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-size: 0.8125rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.02em; }
.form-control { width: 100%; max-width: 100%; padding: 0.875rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem; color: #1e293b; background: white; box-sizing: border-box; transition: all 0.2s; }
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
.form-row { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
@media (min-width: 480px) { .form-row { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); } }
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
        const checkPlantPermission = async () => {
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
        }
        checkPlantPermission()
    }, [itemAssignedPlant, canEdit, restrictionWarning, onCanEditChange])
    useEffect(() => {
        const checkTransferPerm = async () => {
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || user
                if (!uid) return setHasTransferPerm(false)
                const has = await UserService.hasPermission(uid, 'detailview.regiontransfer')
                setHasTransferPerm(!!has)
            } catch {
                setHasTransferPerm(false)
            }
        }
        checkTransferPerm()
    }, [])
    useEffect(() => {
        if (!showTransfer || !hasTransferPerm) return
        const loadRegions = async () => {
            try {
                const { RegionService } = await import('../../../services/RegionService')
                setRegions((await RegionService.fetchRegions()) || [])
            } catch {
                setTransferErr('Failed to load regions')
            }
        }
        loadRegions()
    }, [showTransfer, hasTransferPerm])
    useEffect(() => {
        if (!targetRegion) {
            setPlants([])
            return
        }
        const loadPlants = async () => {
            try {
                const { RegionService } = await import('../../../services/RegionService')
                setPlants((await RegionService.fetchRegionPlants(targetRegion)) || [])
                setTargetPlant('')
            } catch {
                setPlants([])
            }
        }
        loadPlants()
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
                className={`${className} fixed top-16 left-0 right-0 bottom-0 z-40 flex flex-col items-center justify-center gap-5 bg-slate-50 p-10 text-center`}
            >
                <div
                    className="flex h-20 w-20 items-center justify-center rounded-[20px]"
                    style={{ background: `${accent}12` }}
                >
                    <i className="fas fa-search text-[32px]" style={{ color: accent }}></i>
                </div>
                <div>
                    <h2 className="m-0 mb-2 text-[22px] font-bold text-slate-800">{notFoundMessage}</h2>
                    <p className="m-0 max-w-[300px] text-sm text-slate-500">{notFoundDescription}</p>
                </div>
                <button
                    onClick={onClose || onBack}
                    className="flex items-center gap-2 rounded-xl border-none text-sm font-semibold text-white cursor-pointer px-6 py-3"
                    style={{ background: accent }}
                >
                    <i className="fas fa-arrow-left"></i> Go Back
                </button>
            </div>
        )
    }
    return (
        <DetailViewContext.Provider value={{ activeSection, registerSection, sections, setActiveSection }}>
            <div className={`${className} fixed top-16 left-0 right-0 bottom-0 z-40 flex flex-col bg-slate-50`}>
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
                        .dv-mobile-nav { display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; padding: 12px 10px; gap: 6px; z-index: 50; overflow-x: auto; -webkit-overflow-scrolling: touch; min-height: 72px; }
                        .dv-mobile-nav::-webkit-scrollbar { display: none; }
                        .dv-mobile-nav-btn { flex: 0 0 auto; padding: 12px 18px; border: none; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 72px; transition: all 0.15s; }
                        .dv-mobile-nav-btn i { font-size: 18px; }
                        .dv-main-content { padding: 16px !important; padding-bottom: 90px !important; }
                        .dv-header { padding: 12px 16px !important; }
                        .dv-header-title { font-size: 18px !important; }
                        .dv-header-actions { gap: 4px !important; }
                        .dv-header-actions .global-button-secondary { padding: 10px !important; min-width: 40px; justify-content: center; }
                        .dv-header-actions .global-button-secondary span { display: none; }
                        .dv-section-grid { grid-template-columns: 1fr !important; }
                        .dv-section-header h2 { font-size: 18px !important; }
                        .form-row-2, .form-row-3 { grid-template-columns: 1fr !important; }
                    }
                    @media (max-width: 480px) {
                        .dv-mobile-nav { padding: 10px 8px; min-height: 68px; }
                        .dv-mobile-nav-btn { min-width: 64px; padding: 10px 14px; font-size: 11px; }
                        .dv-mobile-nav-btn i { font-size: 16px; }
                        .dv-main-content { padding: 12px !important; padding-bottom: 85px !important; }
                        .detail-card { padding: 1rem !important; }
                        .form-control { font-size: 0.875rem !important; padding: 0.75rem 0.75rem !important; }
                        input[type="datetime-local"].form-control,
                        input[type="date"].form-control { font-size: 0.8125rem !important; padding: 0.625rem 0.5rem !important; }
                    }
                    ${legacyStyles}
                `}</style>
                {isSaving && (
                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3.5 bg-white/95">
                        <div
                            className="h-12 w-12 rounded-full border-[3px] border-slate-200"
                            style={{
                                animation: 'dv-spin 0.7s linear infinite',
                                borderTopColor: accent
                            }}
                        ></div>
                        <span className="text-sm font-medium text-slate-500">Saving changes...</span>
                    </div>
                )}
                <div className="relative overflow-hidden border-b border-slate-200 bg-white">
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `linear-gradient(to right, var(--accent) 1px, transparent 1px), linear-gradient(to bottom, var(--accent) 1px, transparent 1px)`,
                            backgroundSize: '20px 20px'
                        }}
                    ></div>
                    <div className="dv-header relative flex items-center gap-4 px-6 py-4">
                        <button
                            onClick={onBack || onClose}
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-none bg-slate-100 text-base text-slate-500 cursor-pointer transition-all duration-150 hover:bg-slate-200 hover:text-slate-700"
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                                {icon && <i className={icon} style={{ color: accent, fontSize: 20 }}></i>}
                                <h1 className="dv-header-title m-0 truncate text-[22px] font-bold text-slate-900">
                                    {title}
                                </h1>
                            </div>
                            {subtitle && <p className="m-0 mt-1 text-[13px] text-slate-500">{subtitle}</p>}
                        </div>
                        <div className="dv-header-actions flex items-center gap-2">{headerActions}</div>
                    </div>
                </div>
                <div className="dv-container flex min-h-0 flex-1 overflow-hidden w-full">
                    {isLoading ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3.5">
                            <div
                                className="h-12 w-12 rounded-full border-[3px] border-slate-200"
                                style={{
                                    animation: 'dv-spin 0.7s linear infinite',
                                    borderTopColor: accent
                                }}
                            ></div>
                            <span className="text-sm font-medium text-slate-500">{loadingMessage}</span>
                        </div>
                    ) : (
                        <>
                            <aside
                                className={`dv-sidebar ${sidebarCollapsed ? 'dv-sidebar-collapsed' : ''} flex flex-shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-slate-200 bg-white`}
                                style={{ width: sidebarCollapsed ? 64 : 240 }}
                            >
                                <div style={{ padding: sidebarCollapsed ? '12px 8px' : '16px' }}>
                                    <button
                                        onClick={handleSidebarToggle}
                                        className="flex h-9 items-center justify-center gap-2 rounded-lg border-none bg-slate-100 text-sm text-slate-500 cursor-pointer transition-all duration-200 hover:bg-slate-200"
                                        style={{ width: sidebarCollapsed ? 48 : '100%' }}
                                    >
                                        <i
                                            className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'} text-xs`}
                                        ></i>
                                        {!sidebarCollapsed && <span className="text-[13px] font-medium">Collapse</span>}
                                    </button>
                                </div>
                                <nav
                                    className="flex flex-1 flex-col gap-1"
                                    style={{ padding: sidebarCollapsed ? '0 8px' : '0 12px' }}
                                >
                                    {sections.map((section, idx) => (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            title={sidebarCollapsed ? section.title : undefined}
                                            className="flex w-full items-center border-none rounded-[10px] text-sm text-left cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
                                            style={{
                                                animation: `dv-fadeIn 0.2s ease-out ${0.03 * idx}s both`,
                                                background:
                                                    activeSection === section.id ? `${accent}10` : 'transparent',
                                                color: activeSection === section.id ? accent : '#64748b',
                                                fontWeight: activeSection === section.id ? 600 : 500,
                                                gap: 12,
                                                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                                padding: sidebarCollapsed ? '12px' : '12px 14px'
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
                                                className={`${section.icon || 'fas fa-circle'} flex-shrink-0 text-base`}
                                            ></i>
                                            {!sidebarCollapsed && <span className="truncate">{section.title}</span>}
                                        </button>
                                    ))}
                                </nav>
                                {(footerActions || (hasTransferPerm && onRegionTransfer && currentRegion)) && (
                                    <div
                                        className="dv-footer-actions mt-auto border-t border-slate-200"
                                        style={{ padding: sidebarCollapsed ? '12px 8px' : '16px' }}
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
                            <main className="dv-main-content min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
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
                                        <span className="max-w-[60px] truncate">{section.title}</span>
                                    </button>
                                ))}
                                {footerActions && (
                                    <div className="ml-auto flex gap-1 border-l border-slate-200 pl-2">
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
                            className={`fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2.5 rounded-[10px] px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${
                                (message || warning || '').toLowerCase().includes('error') ||
                                (message || warning || '').toLowerCase().includes('cannot')
                                    ? 'bg-red-600'
                                    : 'bg-green-600'
                            }`}
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
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-5">
                            <div className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                <div className="p-6 text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                                        <i className="fas fa-trash-alt text-2xl text-red-600"></i>
                                    </div>
                                    <h3 className="m-0 mb-1.5 text-lg font-bold text-slate-800">{deleteTitle}</h3>
                                    <p className="m-0 text-[13px] text-slate-500">{deleteMessage}</p>
                                </div>
                                <div className="flex gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
                                    <button
                                        className="dv-btn flex-1 rounded-[10px] border-none bg-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-600 cursor-pointer"
                                        onClick={onDeleteCancel}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="dv-btn flex-1 rounded-[10px] border-none bg-red-600 px-4 py-2.5 text-[13px] font-semibold text-white cursor-pointer"
                                        onClick={onDeleteConfirm}
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
                            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-5"
                        >
                            <div className="flex w-full max-w-[400px] max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                                <div
                                    className="flex items-center justify-between gap-3 px-5 py-4"
                                    style={{ background: accent }}
                                >
                                    <span className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
                                        <i className="fas fa-exchange-alt"></i> Transfer Region
                                    </span>
                                    <button
                                        onClick={closeTransfer}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-white/15 text-sm text-white cursor-pointer"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5">
                                    <div className="mb-4 rounded-[10px] bg-slate-100 p-3.5">
                                        <div className="mb-0.5 text-[11px] font-semibold text-slate-500">
                                            CURRENT REGION
                                        </div>
                                        <div className="text-sm font-semibold text-slate-800">
                                            {currentRegion || 'Unknown'}
                                        </div>
                                    </div>
                                    <div className="mb-3.5">
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                                            Target Region
                                        </label>
                                        <select
                                            className="dv-input w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-slate-200 text-sm text-slate-800 outline-none"
                                            value={targetRegion}
                                            onChange={(e) => setTargetRegion(e.target.value)}
                                            disabled={transferring}
                                            style={{
                                                background: selectBg,
                                                padding: '10px 40px 10px 14px'
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
                                        <div className="mb-3.5">
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                                                Target Plant
                                            </label>
                                            <select
                                                className="dv-input w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-slate-200 text-sm text-slate-800 outline-none"
                                                value={targetPlant}
                                                onChange={(e) => setTargetPlant(e.target.value)}
                                                disabled={transferring || !plants.length}
                                                style={{
                                                    background: selectBg,
                                                    padding: '10px 40px 10px 14px'
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
                                        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600">
                                            <i className="fas fa-exclamation-circle"></i>
                                            {transferErr}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
                                    <button
                                        className="dv-btn flex-1 rounded-[10px] border-none bg-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-600 cursor-pointer"
                                        onClick={closeTransfer}
                                        disabled={transferring}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="dv-btn flex-1 flex items-center justify-center gap-2 rounded-[10px] border-none px-4 py-2.5 text-[13px] font-semibold text-white"
                                        onClick={doTransfer}
                                        disabled={transferring || !targetRegion || !targetPlant}
                                        style={{
                                            background: accent,
                                            cursor:
                                                transferring || !targetRegion || !targetPlant
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            opacity: transferring || !targetRegion || !targetPlant ? 0.5 : 1
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
        registerSection({ icon, id, title })
    }, [id, title, icon, registerSection])
    if (activeSection !== id) return null
    const childArray = React.Children.toArray(children)
    const count = childArray.length
    const getGridClass = () => {
        if (count === 1) return 'flex flex-col gap-5'
        return 'grid grid-cols-2 gap-5'
    }
    const renderChildren = () => {
        if (count === 3) {
            return (
                <>
                    {childArray[0]}
                    {childArray[1]}
                    <div className="col-span-full">{childArray[2]}</div>
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
                    <div className="col-span-full">{childArray[4]}</div>
                </>
            )
        }
        return childArray
    }
    return (
        <div className="flex flex-col gap-5">
            <div className="dv-section-header flex items-center gap-3.5">
                <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px]"
                    style={{ background: `${accent}12` }}
                >
                    <i className={icon} style={{ color: accent, fontSize: 20 }}></i>
                </div>
                <h2 className="m-0 text-[22px] font-bold text-slate-800">{title}</h2>
            </div>
            <div className={`dv-section-grid ${getGridClass()}`}>{renderChildren()}</div>
        </div>
    )
}
DetailViewSection.Card = function Card({ title, icon, children, actions, fullWidth }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <div
            className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${fullWidth ? 'col-[1_/_-1]' : ''}`}
        >
            {title && (
                <div className="flex items-center justify-between gap-2.5 border-b border-gray-200 bg-[#fafbfc] px-5 py-3.5">
                    <div className="flex items-center gap-2.5 text-[15px] font-semibold text-slate-800">
                        {icon && <i className={icon} style={{ color: accent, fontSize: 15 }}></i>}
                        {title}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className="flex flex-col gap-4 p-5">{children}</div>
        </div>
    )
}
DetailViewSection.Row = function Row({ children, cols = 2 }) {
    return (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {children}
        </div>
    )
}
DetailViewSection.Field = function Field({ label, value, empty = '-', icon }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                {icon && <i className={icon} style={{ color: accent, fontSize: 11 }}></i>}
                {label}
            </span>
            <span
                className={`rounded-[10px] border border-gray-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium ${value ? 'text-slate-800' : 'text-slate-400'}`}
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
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
                    {icon && <i className={icon} style={{ color: accent, fontSize: 12 }}></i>}
                    {label}
                </label>
            )}
            <input
                {...props}
                className="dv-input w-full rounded-[10px] border-[1.5px] border-gray-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-[border-color,box-shadow] duration-150"
                style={props.style}
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
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
                    {icon && <i className={icon} style={{ color: accent, fontSize: 12 }}></i>}
                    {label}
                </label>
            )}
            <select
                {...props}
                className="dv-input w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-gray-200 text-sm text-slate-800 outline-none"
                style={{
                    background: selectBg,
                    padding: '12px 40px 12px 14px',
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
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
                    {icon && <i className={icon} style={{ color: accent, fontSize: 12 }}></i>}
                    {label}
                </label>
            )}
            <textarea
                {...props}
                className="dv-input w-full min-h-[120px] resize-y rounded-[10px] border-[1.5px] border-gray-200 bg-white px-3.5 py-3 text-sm leading-[1.6] text-slate-800 outline-none transition-[border-color,box-shadow] duration-150"
                style={props.style}
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
            className={`dv-btn inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold transition-[opacity,transform] duration-150 ${block ? 'w-full' : 'w-auto'} ${props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer opacity-100'}`}
            style={{
                border: v.border || 'none',
                ...v,
                ...props.style
            }}
        >
            {children}
        </button>
    )
}
DetailViewSection.Divider = function Divider() {
    return <div className="my-1 h-px bg-slate-200"></div>
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
            className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px]"
            style={{
                background: t.bg,
                border: `1px solid ${t.border}`,
                color: t.color
            }}
        >
            <i className={`fas ${icon || t.icon}`}></i>
            <span className="flex-1">{children}</span>
        </div>
    )
}
DetailViewSection.Toggle = function Toggle({ label, checked, onChange, disabled }) {
    const { preferences } = usePreferences()
    const accent = preferences.accentColor || '#1e3a5f'
    return (
        <label className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <div
                className="relative h-7 w-[52px] rounded-[14px] p-[3px] transition-colors duration-200"
                style={{ background: checked ? accent : '#cbd5e1' }}
            >
                <div
                    className="h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200"
                    style={{ transform: checked ? 'translateX(24px)' : 'translateX(0)' }}
                ></div>
            </div>
            <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="hidden" />
            {label && <span className="text-sm font-medium text-slate-800">{label}</span>}
        </label>
    )
}
DetailViewSection.Rating = function Rating({ value = 0, onChange, max = 5, disabled }) {
    const [hover, setHover] = useState(0)
    return (
        <div className="flex items-center gap-1">
            {[...Array(max)].map((_, i) => (
                <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange?.(i + 1)}
                    onMouseEnter={() => !disabled && setHover(i + 1)}
                    onMouseLeave={() => setHover(0)}
                    className={`border-none bg-transparent p-0.5 text-[22px] transition-[transform,color] duration-[100ms,150ms] ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                    style={{ color: i < (hover || value) ? '#fbbf24' : '#e2e8f0' }}
                >
                    <i className="fas fa-star"></i>
                </button>
            ))}
            {value > 0 && (
                <span className="ml-2 text-[13px] font-semibold text-slate-500">
                    {value}/{max}
                </span>
            )}
        </div>
    )
}
export default DetailViewSection
