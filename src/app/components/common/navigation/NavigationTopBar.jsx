/* eslint-disable react/forbid-dom-props */
import React from 'react'

import SrmLogo from '../../../../assets/images/srm-logo.svg'
import {
    ADMIN_ITEMS,
    ASSET_ITEMS,
    buildHeaderStyle,
    ICONS,
    NAV_SKELETON_WIDTHS,
    PEOPLE_ITEMS,
    TOOLS_ITEMS
} from '../../../constants/navigationConstants'
import { TopBarIconButton, TopBarMessagesButton } from './NavigationActionButtons'
import { TopBarRegionSelect } from './NavigationParts'

/** Returns Tailwind classes for a top-bar nav item pill. The active state lifts
 *  the background opacity and the border so the current section is unambiguous
 *  on the colored header. */
const navItemClasses = (isActive, isTablet) => {
    const size = isTablet ? 'px-2 py-1.5 text-xs gap-1 rounded-md' : 'px-4 py-2.5 text-sm gap-2 rounded-[10px]'
    const tone = isActive
        ? 'bg-white/[0.18] border border-white/15 font-semibold'
        : 'bg-transparent border border-transparent font-medium hover:bg-white/10'
    return `inline-flex items-center cursor-pointer whitespace-nowrap text-white flex-shrink-0 transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${size} ${tone}`
}

/** Renders a category dropdown trigger and its menu of nav items. */
function TopBarDropdown({
    label,
    icon,
    items,
    isOpen,
    isActive,
    isTablet,
    accentColor,
    visibleMenuItems,
    selectedView,
    onToggle,
    onItemClick,
    onTriggerRef,
    registerMagnetic
}) {
    return (
        <div className="relative" ref={isOpen ? onTriggerRef : null}>
            <button type="button"
                ref={registerMagnetic}
                className={navItemClasses(isActive, isTablet)}
                onClick={onToggle}
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <i className={`fas ${icon} ${isTablet ? 'text-[13px]' : 'text-sm'}`} aria-hidden="true" />
                {!isTablet && <span>{label}</span>}
                <i
                    className={`fas fa-chevron-${isOpen ? 'up' : 'down'} ${isTablet ? 'text-[9px] ml-0' : 'text-[10px] ml-0.5'} transition-transform duration-150 motion-reduce:transition-none`}
                    aria-hidden="true"
                />
            </button>
            {isOpen && (
                <div
                    role="menu"
                    className="absolute left-0 top-full z-[1000] mt-2 min-w-[220px] origin-top-left rounded-card border border-border-light bg-bg-primary p-2 shadow-modal animate-pop-in motion-reduce:animate-none"
                >
                    {items.map((itemId) => {
                        const item = visibleMenuItems.find((i) => i.id === itemId)
                        if (!item) return null
                        const isItemActive = selectedView === item.id
                        const activeTint = `${accentColor}14`
                        return (
                            <button type="button"
                                role="menuitem"
                                key={item.id}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-sm text-text-primary cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${isItemActive ? 'font-semibold' : 'font-normal'}`}
                                style={isItemActive ? { backgroundColor: activeTint } : undefined}
                                onClick={() => onItemClick(item.id)}
                            >
                                <i
                                    className={`fas ${ICONS[item.id]} w-[18px] text-sm text-text-secondary`}
                                    aria-hidden="true"
                                />
                                <span>{item.text}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const DROPDOWN_CONFIGS = [
    { activeKey: 'hasTools', icon: ICONS.Tools, id: 'tools', items: TOOLS_ITEMS, label: 'Tools' },
    { activeKey: 'hasAssets', icon: ICONS.Assets, id: 'assets', items: ASSET_ITEMS, label: 'Assets' },
    { activeKey: 'hasPeople', icon: ICONS.People, id: 'people', items: PEOPLE_ITEMS, label: 'People' },
    { activeKey: 'hasAdmin', icon: 'fa-cog', id: 'admin', items: ADMIN_ITEMS, label: 'Admin' }
]

/** Top-bar basic desktop nav: single-row header with grouped dropdowns. */
export default function NavigationTopBar({
    children,
    accentColor,
    isTablet,
    visibleMenuItems,
    standaloneItems,
    groupFlags,
    selectedView,
    openDropdown,
    setOpenDropdown,
    dropdownRef,
    onMenuClick,
    onRegionChange,
    regionCode,
    permittedRegions,
    combinedCount,
    onlineUsersCount,
    onShowNotifications,
    onShowOnlineUsers,
    userName,
    registerMagnetic
}) {
    const headerStyle = buildHeaderStyle(accentColor)
    const dashboardItem = standaloneItems.find((i) => i.id === 'Dashboard')
    const headerHeight = isTablet ? 'h-14' : 'h-[68px]'
    const headerPadding = isTablet ? 'px-3' : 'px-6'
    return (
        <div className="flex h-screen w-full flex-col overflow-hidden">
            <header
                style={headerStyle}
                className={`sticky top-0 z-[100] flex flex-shrink-0 items-center justify-between border-b border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${headerHeight} ${headerPadding}`}
            >
                <div className={`flex flex-1 items-center min-w-0 ${isTablet ? 'gap-2.5' : 'gap-7'}`}>
                    <div
                        className={`group flex flex-shrink-0 items-center cursor-pointer border-r border-white/10 ${isTablet ? 'pr-2.5' : 'pr-6'}`}
                    >
                        <img
                            src={SrmLogo}
                            alt="Smyrna Ready Mix"
                            className={`transition-[transform,filter] duration-300 ease-out motion-reduce:transition-none group-hover:brightness-125 group-hover:scale-105 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.3)] ${isTablet ? 'h-7' : 'h-10'}`}
                            draggable={false}
                        />
                    </div>
                    <nav
                        aria-label="Primary"
                        className={`flex flex-1 items-center min-w-0 ${isTablet ? 'gap-0.5' : 'gap-1.5'}`}
                    >
                        {visibleMenuItems.length === 0 && (
                            <div className="flex items-center gap-2">
                                {NAV_SKELETON_WIDTHS.map((w, i) => (
                                    <div
                                        key={i}
                                        className="h-8 animate-pulse rounded-lg bg-white/10 motion-reduce:animate-none"
                                        style={{
                                            animationDelay: `${i * 80}ms`,
                                            animationFillMode: 'both',
                                            width: w
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        {dashboardItem && (
                            <button type="button"
                                ref={registerMagnetic}
                                className={navItemClasses(selectedView === 'Dashboard', isTablet)}
                                onClick={() => onMenuClick('Dashboard')}
                                title="Dashboard"
                                aria-label="Dashboard"
                                aria-current={selectedView === 'Dashboard' ? 'page' : undefined}
                            >
                                <i
                                    className={`fas ${ICONS.Dashboard} ${isTablet ? 'text-[13px]' : 'text-sm'}`}
                                    aria-hidden="true"
                                />
                                {!isTablet && <span>Dashboard</span>}
                            </button>
                        )}
                        {DROPDOWN_CONFIGS.map((cfg) =>
                            groupFlags[cfg.activeKey] ? (
                                <TopBarDropdown
                                    key={cfg.id}
                                    label={cfg.label}
                                    icon={cfg.icon}
                                    items={cfg.items}
                                    isOpen={openDropdown === cfg.id}
                                    isActive={cfg.items.includes(selectedView)}
                                    isTablet={isTablet}
                                    accentColor={accentColor}
                                    visibleMenuItems={visibleMenuItems}
                                    selectedView={selectedView}
                                    onToggle={() => setOpenDropdown(openDropdown === cfg.id ? null : cfg.id)}
                                    onItemClick={onMenuClick}
                                    onTriggerRef={dropdownRef}
                                    registerMagnetic={registerMagnetic}
                                />
                            ) : null
                        )}
                        {standaloneItems
                            .filter((i) => i.id !== 'Dashboard')
                            .map((item) => (
                                <button type="button"
                                    key={item.id}
                                    ref={registerMagnetic}
                                    className={navItemClasses(selectedView === item.id, isTablet)}
                                    onClick={() => onMenuClick(item.id)}
                                    title={item.text}
                                    aria-label={item.text}
                                    aria-current={selectedView === item.id ? 'page' : undefined}
                                >
                                    <i
                                        className={`fas ${ICONS[item.id]} ${isTablet ? 'text-[13px]' : 'text-sm'}`}
                                        aria-hidden="true"
                                    />
                                    {!isTablet && <span>{item.text}</span>}
                                </button>
                            ))}
                    </nav>
                </div>
                <div className={`flex flex-shrink-0 items-center ${isTablet ? 'gap-2' : 'gap-4'}`}>
                    <TopBarRegionSelect
                        regionCode={regionCode}
                        permittedRegions={permittedRegions}
                        onChange={onRegionChange}
                        isTablet={isTablet}
                    />
                    <TopBarMessagesButton
                        onClick={onShowNotifications}
                        combinedCount={combinedCount}
                        accentColor={accentColor}
                        isTablet={isTablet}
                    />
                    <TopBarIconButton
                        icon="fa-users"
                        title="Online Users"
                        onClick={onShowOnlineUsers}
                        badge={onlineUsersCount}
                        badgeColor="#22c55e"
                        isTablet={isTablet}
                        accentColor={accentColor}
                    />
                    <TopBarIconButton
                        icon={ICONS.MyAccount}
                        title={userName ? `My Account - ${userName}` : 'My Account'}
                        onClick={() => onMenuClick('MyAccount')}
                        isActive={selectedView === 'MyAccount'}
                        tutorialTarget="account-nav"
                        isTablet={isTablet}
                        accentColor={accentColor}
                    />
                </div>
            </header>
            <main className="relative flex-1 overflow-x-hidden overflow-y-auto" data-content-scroll>
                {children}
            </main>
        </div>
    )
}
