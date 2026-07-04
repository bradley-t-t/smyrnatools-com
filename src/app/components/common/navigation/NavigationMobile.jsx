/* eslint-disable react/forbid-dom-props */
import React from 'react'
import ReactDOM from 'react-dom'

import SrmLogo from '../../../../assets/images/srm-logo.svg'
import {
    ADMIN_ITEMS,
    ASSET_ITEMS,
    buildHeaderStyle,
    PEOPLE_ITEMS,
    TOOLS_ITEMS
} from '../../../constants/navigationConstants'
import { MobileMenuItem, MobileRegionSelect, MobileSection } from './NavigationParts'

const SECTIONS = [
    { items: TOOLS_ITEMS, key: 'hasTools', title: 'Tools' },
    { items: ASSET_ITEMS, key: 'hasAssets', title: 'Assets' },
    { items: PEOPLE_ITEMS, key: 'hasPeople', title: 'People' },
    { items: ADMIN_ITEMS, key: 'hasAdmin', title: 'Admin' }
]

/** Renders the mobile header bar and the slide-in navigation drawer. */
export default function NavigationMobile({
    children,
    accentColor,
    mobileMenuOpen,
    setMobileMenuOpen,
    regionCode,
    permittedRegions,
    handleRegionChange,
    visibleMenuItems,
    standaloneItems,
    groupFlags,
    selectedView,
    handleMenuClick
}) {
    const headerStyle = buildHeaderStyle(accentColor)
    const dashboardItem = standaloneItems.find((i) => i.id === 'Dashboard')
    const canPortal = typeof document !== 'undefined' && !!document.body
    const drawer = mobileMenuOpen ? (
        <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
            onClick={() => setMobileMenuOpen(false)}
        >
            <div
                className="absolute right-0 top-0 h-full w-[280px] overflow-y-auto bg-bg-primary p-5 shadow-modal animate-slide-up motion-reduce:animate-none"
                onClick={(e) => e.stopPropagation()}
            >
                <MobileRegionSelect
                    regionCode={regionCode}
                    permittedRegions={permittedRegions}
                    onChange={handleRegionChange}
                    accentColor={accentColor}
                />
                {dashboardItem && (
                    <MobileMenuItem
                        item={dashboardItem}
                        isActive={selectedView === 'Dashboard'}
                        onClick={() => handleMenuClick('Dashboard')}
                        accentColor={accentColor}
                    />
                )}
                {SECTIONS.map(({ key, items, title }) =>
                    groupFlags[key] ? (
                        <MobileSection key={title} title={title}>
                            {items.map((id) => {
                                const item = visibleMenuItems.find((i) => i.id === id)
                                if (!item) return null
                                return (
                                    <MobileMenuItem
                                        key={id}
                                        item={item}
                                        isActive={selectedView === id}
                                        onClick={() => handleMenuClick(id)}
                                        accentColor={accentColor}
                                    />
                                )
                            })}
                        </MobileSection>
                    ) : null
                )}
                {standaloneItems
                    .filter((i) => i.id !== 'Dashboard')
                    .map((item) => (
                        <MobileMenuItem
                            key={item.id}
                            item={item}
                            isActive={selectedView === item.id}
                            onClick={() => handleMenuClick(item.id)}
                            accentColor={accentColor}
                        />
                    ))}
                <MobileSection title="Account">
                    <MobileMenuItem
                        item={{ id: 'MyAccount', text: 'My Account' }}
                        isActive={selectedView === 'MyAccount'}
                        onClick={() => handleMenuClick('MyAccount')}
                        accentColor={accentColor}
                    />
                </MobileSection>
            </div>
        </div>
    ) : null
    return (
        <div className="flex h-screen w-full flex-col">
            <div
                style={headerStyle}
                className="sticky top-0 z-[100] flex items-center justify-between border-b border-white/10 px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
            >
                <img className="h-[34px]" src={SrmLogo} alt="Logo" draggable={false} />
                <div className="flex items-center gap-2">
                    <button type="button"
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="mobile-nav-drawer"
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-[10px] border-none text-white cursor-pointer active:scale-[0.94] transition-[background-color,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${mobileMenuOpen ? 'bg-white/[0.2]' : 'bg-white/[0.1] hover:bg-white/[0.16]'}`}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <i
                            className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'} transition-transform duration-150 motion-reduce:transition-none`}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>
            {drawer && canPortal && ReactDOM.createPortal(drawer, document.body)}
            <div className="relative flex-1 overflow-x-hidden overflow-y-auto" data-content-scroll>
                {children}
            </div>
        </div>
    )
}
