/* eslint-disable react/forbid-dom-props */
import React from 'react'

export default function DetailViewSidebar({
    accent,
    activeSection,
    currentRegion,
    footerActions,
    handleSidebarToggle,
    hasTransferPerm,
    isSaving,
    onRegionTransfer,
    openTransfer,
    sections,
    setActiveSection,
    sidebarCollapsed
}) {
    return (
        <aside
            className={`dv-sidebar ${sidebarCollapsed ? 'dv-sidebar-collapsed' : ''} flex flex-shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border-light bg-white`}
            style={{ width: sidebarCollapsed ? 64 : 240 }}
        >
            <div style={{ padding: sidebarCollapsed ? '12px 8px' : '16px' }}>
                <button type="button"
                    onClick={handleSidebarToggle}
                    className="flex h-9 items-center justify-center gap-2 rounded-lg border-none bg-slate-100 text-sm text-slate-500 cursor-pointer transition-all duration-200 hover:bg-slate-200"
                    style={{ width: sidebarCollapsed ? 48 : '100%' }}
                >
                    <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'} text-xs`}></i>
                    {!sidebarCollapsed && <span className="text-[13px] font-medium">Collapse</span>}
                </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1" style={{ padding: sidebarCollapsed ? '0 8px' : '0 12px' }}>
                {sections.map((section, idx) => (
                    <button type="button"
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        title={sidebarCollapsed ? section.title : undefined}
                        className="flex w-full items-center border-none rounded-[10px] text-sm text-left cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] animate-dv-fade-in [animation-fill-mode:both]"
                        style={{
                            animationDelay: `${0.03 * idx}s`,
                            background: activeSection === section.id ? `${accent}10` : 'transparent',
                            color: activeSection === section.id ? accent : 'var(--text-secondary)',
                            fontWeight: activeSection === section.id ? 600 : 500,
                            gap: 12,
                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                            padding: sidebarCollapsed ? '12px' : '12px 14px'
                        }}
                        onMouseOver={(e) => {
                            if (activeSection !== section.id) {
                                e.currentTarget.style.background = 'var(--bg-secondary)'
                            }
                        }}
                        onMouseOut={(e) => {
                            if (activeSection !== section.id) {
                                e.currentTarget.style.background = 'transparent'
                            }
                        }}
                    >
                        <i className={`${section.icon || 'fas fa-circle'} flex-shrink-0 text-base`}></i>
                        {!sidebarCollapsed && <span className="truncate">{section.title}</span>}
                    </button>
                ))}
            </nav>
            {(footerActions || (hasTransferPerm && onRegionTransfer && currentRegion)) && (
                <div
                    className="dv-footer-actions mt-auto border-t border-border-light"
                    style={{ padding: sidebarCollapsed ? '12px 8px' : '16px' }}
                >
                    {footerActions}
                    {hasTransferPerm && onRegionTransfer && currentRegion && (
                        <button type="button"
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
    )
}
