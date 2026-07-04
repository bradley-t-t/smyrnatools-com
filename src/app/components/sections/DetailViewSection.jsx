/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../context/PreferencesContext'
import { usePlantPermissions } from '../../hooks/usePlantPermissions'
import { useRegionTransfer } from '../../hooks/useRegionTransfer'
import { DetailViewContext } from './detail-view/DetailViewContext'
import DetailViewDeleteModal from './detail-view/DetailViewDeleteModal'
import DetailViewHeader from './detail-view/DetailViewHeader'
import DetailViewMessagePortal from './detail-view/DetailViewMessagePortal'
import DetailViewMobileNav from './detail-view/DetailViewMobileNav'
import DetailViewNotFound from './detail-view/DetailViewNotFound'
import DetailViewSidebar from './detail-view/DetailViewSidebar'
import {
    Banner,
    Button,
    Card,
    Divider,
    Field,
    Input,
    Rating,
    Row,
    Section,
    Select,
    Textarea,
    Toggle
} from './detail-view/DetailViewSubcomponents'
import DetailViewTransferModal from './detail-view/DetailViewTransferModal'

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
    const { warning } = usePlantPermissions({ canEdit, itemAssignedPlant, onCanEditChange, restrictionWarning })
    const transfer = useRegionTransfer({ assetType, onRegionTransfer })
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
    if (notFound) {
        return (
            <DetailViewNotFound
                accent={accent}
                className={className}
                notFoundDescription={notFoundDescription}
                notFoundMessage={notFoundMessage}
                onBack={onBack}
                onClose={onClose}
            />
        )
    }
    return (
        <DetailViewContext.Provider value={{ activeSection, registerSection, sections, setActiveSection }}>
            <div
                className={`${className} fixed top-16 left-0 right-0 bottom-0 z-40 flex flex-col bg-bg-secondary`}
                style={{ '--dv-accent': accent }}
            >
                {isSaving && (
                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-bg-primary/95">
                        <div
                            className="h-10 w-10 rounded-full border-[3px] border-border-light animate-dv-spin"
                            style={{ borderTopColor: accent }}
                        ></div>
                        <span className="text-[12.5px] font-medium text-text-secondary">Saving changes...</span>
                    </div>
                )}
                <DetailViewHeader
                    headerActions={headerActions}
                    icon={icon}
                    onBack={onBack}
                    onClose={onClose}
                    subtitle={subtitle}
                    title={title}
                />
                <div className="dv-container flex min-h-0 flex-1 overflow-hidden w-full">
                    {isLoading ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3">
                            <div
                                className="h-10 w-10 rounded-full border-[3px] border-border-light animate-dv-spin"
                                style={{ borderTopColor: accent }}
                            ></div>
                            <span className="text-[12.5px] font-medium text-text-secondary">{loadingMessage}</span>
                        </div>
                    ) : (
                        <>
                            <DetailViewSidebar
                                accent={accent}
                                activeSection={activeSection}
                                currentRegion={currentRegion}
                                footerActions={footerActions}
                                handleSidebarToggle={handleSidebarToggle}
                                hasTransferPerm={transfer.hasTransferPerm}
                                isSaving={isSaving}
                                onRegionTransfer={onRegionTransfer}
                                openTransfer={transfer.openTransfer}
                                sections={sections}
                                setActiveSection={setActiveSection}
                                sidebarCollapsed={sidebarCollapsed}
                            />
                            <main className="dv-main-content min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-bg-secondary p-4">
                                <div className="animate-dv-fade-in">{children}</div>
                            </main>
                            <DetailViewMobileNav
                                accent={accent}
                                activeSection={activeSection}
                                footerActions={footerActions}
                                sections={sections}
                                setActiveSection={setActiveSection}
                            />
                        </>
                    )}
                </div>
                <DetailViewMessagePortal message={message} warning={warning} />
                <DetailViewDeleteModal
                    deleteMessage={deleteMessage}
                    deleteTitle={deleteTitle}
                    onDeleteCancel={onDeleteCancel}
                    onDeleteConfirm={onDeleteConfirm}
                    show={showDeleteConfirmation}
                />
                <DetailViewTransferModal
                    accent={accent}
                    assetType={assetType}
                    closeTransfer={transfer.closeTransfer}
                    currentRegion={currentRegion}
                    doTransfer={transfer.doTransfer}
                    plants={transfer.plants}
                    regions={transfer.regions}
                    setTargetPlant={transfer.setTargetPlant}
                    setTargetRegion={transfer.setTargetRegion}
                    show={transfer.showTransfer}
                    targetPlant={transfer.targetPlant}
                    targetRegion={transfer.targetRegion}
                    transferErr={transfer.transferErr}
                    transferring={transfer.transferring}
                />
                {modals}
            </div>
        </DetailViewContext.Provider>
    )
}
DetailViewSection.Section = Section
DetailViewSection.Card = Card
DetailViewSection.Row = Row
DetailViewSection.Field = Field
DetailViewSection.Input = Input
DetailViewSection.Select = Select
DetailViewSection.Textarea = Textarea
DetailViewSection.Button = Button
DetailViewSection.Divider = Divider
DetailViewSection.Banner = Banner
DetailViewSection.Toggle = Toggle
DetailViewSection.Rating = Rating
export default DetailViewSection
