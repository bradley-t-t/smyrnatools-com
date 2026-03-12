import React, { useEffect, useRef, useState } from 'react'

import SrmLogo from '../../../assets/images/srm-logo.svg'
import { OnlineUsersService } from '../../../services/OnlineUsersService'
import { UserPresenceService } from '../../../services/UserPresenceService'
import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
import { useAccentColor } from '../../hooks/useAccentColor'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useMagneticHover } from '../../hooks/useMagneticHover'
import { useMessages } from '../../hooks/useMessages'
import { useNotifications } from '../../hooks/useNotifications'
import NotificationsModal from './NotificationsModal'
import OnlineUsersModal from './OnlineUsersModal'

/** Menu items visible only for Office-type regions. */
const OFFICE_VISIBLE_ITEMS = ['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions']
/** Items hidden for Aggregate-type regions. */
const AGGREGATE_HIDDEN_ITEMS = ['Mixers', 'Plants', 'Regions', 'Leaderboards', 'Calculators', 'Maintenance']
/** Items hidden by default for standard regions. */
const DEFAULT_HIDDEN_ITEMS = ['Plants', 'Regions']
/** Items exclusively available to Office regions. */
const OFFICE_ONLY_ITEMS = ['Roles']

/** FontAwesome icon class mapping for each navigation item ID. */
const ICONS = {
    Archive: 'fa-archive',
    Assets: 'fa-truck',
    Calculators: 'fa-calculator',
    Dashboard: 'fa-tachometer-alt',
    Documents: 'fa-folder-open',
    'Heavy Equipment': 'fa-snowplow',
    Leaderboards: 'fa-trophy',
    List: 'fa-list',
    Logout: 'fa-sign-out-alt',
    Maintenance: 'fa-wrench',
    Managers: 'fa-user-tie',
    Mixers: 'fa-truck',
    MyAccount: 'fa-user',
    Operators: 'fa-users',
    People: 'fa-users',
    'Pickup Trucks': 'fa-truck-pickup',
    Plan: 'fa-calendar-alt',
    Plants: 'fa-industry',
    Productivity: 'fa-chart-line',
    Regions: 'fa-map-marker-alt',
    Reports: 'fa-file-alt',
    Roles: 'fa-lock',
    Tractors: 'fa-tractor',
    Trailers: 'fa-trailer'
}

const menuItems = [
    { id: 'Dashboard', permission: 'dashboard.view', text: 'Dashboard' },
    { id: 'Mixers', permission: 'mixers.view', text: 'Mixers' },
    { id: 'Tractors', permission: 'tractors.view', text: 'Tractors' },
    { id: 'Trailers', permission: 'trailers.view', text: 'Trailers' },
    { id: 'Heavy Equipment', permission: 'equipment.view', text: 'Heavy Equipment' },
    { id: 'Pickup Trucks', permission: 'pickup_trucks.view', text: 'Pickup Trucks' },
    { id: 'Operators', permission: 'operators.view', text: 'Operators' },
    { id: 'Managers', permission: 'managers.view', text: 'Managers' },
    { id: 'List', permission: 'list.view', text: 'List' },
    { id: 'Reports', permission: 'reports.view', text: 'Reports' },
    { id: 'Plan', permission: 'plan.view', text: 'Plan' },
    { id: 'Plants', permission: 'plants.view', text: 'Plants' },
    { id: 'Regions', permission: 'regions.view', text: 'Regions' },
    { id: 'Roles', permission: 'roles.view', text: 'Roles' },
    { id: 'Calculators', permission: 'calculator.view', text: 'Calculators' },
    { id: 'Leaderboards', permission: 'leaderboards.view', text: 'Leaderboards' },
    { id: 'Documents', permission: 'documents.view', text: 'Documents' }
]

/** Navigation item IDs grouped under the "Assets" section. */
const ASSET_ITEMS = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
/** Navigation item IDs grouped under the "People" section. */
const PEOPLE_ITEMS = ['Operators', 'Managers']
/** Navigation item IDs grouped under the "Productivity" section. */
const PRODUCTIVITY_ITEMS = ['List', 'Reports', 'Plan', 'Calculators', 'Leaderboards', 'Documents']

/** Sidebar content offset: 220px sidebar + 16px left margin + 16px gap. */
const SIDEBAR_OFFSET = 252

/** Glass panel base styles for backdrop blur and translucent background. */
const GLASS_PANEL_STYLE = {
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    backdropFilter: 'blur(24px) saturate(180%)'
}

/** Builds the accent-colored grid background matching TopSection's pattern. White variant for the sidebar overlay. */
const buildGridStyle = (color, white = false) => {
    const line = white ? 'rgba(255,255,255,0.06)' : `${color}10`
    const glow = white ? 'rgba(255,255,255,0.03)' : `${color}08`
    return {
        backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px), radial-gradient(circle at center, ${glow} 0%, transparent 50%)`,
        backgroundPosition: '0 0, 0 0, 0 0',
        backgroundSize: '20px 20px, 20px 20px, 40px 40px'
    }
}

/**
 * Glassmorphism floating sidebar navigation. Drop-in replacement for Navigation.jsx
 * with the same props interface and filtering logic, but rendered as a fixed glass sidebar.
 */
export default function SideGlassNavigation({
    selectedView,
    onSelectView,
    children,
    userName = '',
    userId = null,
    ..._rest
}) {
    const { preferences, updatePreferences } = usePreferences()
    const [visibleMenuItems, setVisibleMenuItems] = useState([])
    const [permittedRegions, setPermittedRegions] = useState([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [notificationsAnchor, setNotificationsAnchor] = useState(null)
    const [showOnlineUsers, setShowOnlineUsers] = useState(false)
    const [onlineUsersAnchor, setOnlineUsersAnchor] = useState(null)
    const [onlineUsersCount, setOnlineUsersCount] = useState(0)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const isMobile = useIsMobile()
    const sidebarRef = useRef(null)

    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code
    const accentColor = useAccentColor()
    useNotifications(userId, preferences?.selectedRegion)
    const messagesHook = useMessages(userId)
    const notificationsCount = messagesHook.unreadCount
    const { registerElement: registerMagnetic } = useMagneticHover()

    /* ── Presence tracking ── */
    useEffect(() => {
        const setupAndInit = async () => {
            try {
                await UserPresenceService.setup()
                await OnlineUsersService.init()
                setOnlineUsersCount(OnlineUsersService.getUsers().length)
            } catch {
                setOnlineUsersCount(0)
            }
        }
        setupAndInit()
        const handleUpdate = (snapshot) => {
            setOnlineUsersCount(snapshot.users?.length || 0)
        }
        OnlineUsersService.addListener(handleUpdate)
        return () => OnlineUsersService.removeListener(handleUpdate)
    }, [])

    /* ── Close sidebar on outside click (mobile) ── */
    useEffect(() => {
        if (!isMobile || !mobileMenuOpen) return
        const handleClickOutside = (e) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                setMobileMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMobile, mobileMenuOpen])

    /* ── Fetch permitted regions ── */
    useEffect(() => {
        async function fetchRegions() {
            if (!userId) return setPermittedRegions([])
            try {
                const regions = await UserService.getPermittedRegions(userId).catch(() => [])
                setPermittedRegions(regions)
                if (!regionCode && regions.length) {
                    const first = regions[0]
                    updatePreferences('selectedRegion', {
                        code: first.regionCode || first.region_code,
                        name: first.regionName || first.region_name || '',
                        type: first.type || first.region_type || ''
                    })
                }
            } catch {
                setPermittedRegions([])
            }
        }
        fetchRegions()
    }, [userId, regionCode, updatePreferences])

    /* ── Permission-based menu filtering ── */
    useEffect(() => {
        async function filterItems() {
            if (!userId) return setVisibleMenuItems([])
            try {
                const permissions = await UserService.getUserPermissions(userId)
                let filtered = menuItems.filter((item) => permissions.includes(item.permission))
                if (regionType === 'Office') {
                    filtered = filtered.filter(
                        (item) => OFFICE_VISIBLE_ITEMS.includes(item.id) || OFFICE_ONLY_ITEMS.includes(item.id)
                    )
                } else if (regionType === 'Aggregate') {
                    filtered = filtered.filter(
                        (item) => !AGGREGATE_HIDDEN_ITEMS.includes(item.id) && !OFFICE_ONLY_ITEMS.includes(item.id)
                    )
                } else {
                    filtered = filtered.filter(
                        (item) => !DEFAULT_HIDDEN_ITEMS.includes(item.id) && !OFFICE_ONLY_ITEMS.includes(item.id)
                    )
                }
                setVisibleMenuItems(filtered)
            } catch {
                setVisibleMenuItems([])
            }
        }
        filterItems()
    }, [userId, regionType, regionCode])

    /** Build an anchor rect that positions portal modals to the right of the sidebar, anchored from the bottom. */
    const sidebarAnchorRect = () => ({
        bottom: 16,
        left: SIDEBAR_OFFSET,
        useLeft: true
    })

    const handleMenuClick = (id) => {
        if (window.appSwitchView && (id === 'List' || id === 'Archive')) {
            window.appSwitchView(id)
        } else {
            onSelectView(id)
        }
        setMobileMenuOpen(false)
    }

    const handleRegionChange = (e) => {
        const code = e.target.value
        if (!code) return
        const r = permittedRegions.find((x) => (x.regionCode || x.region_code) === code)
        if (r) {
            const newRegion = {
                code: r.regionCode || r.region_code,
                name: r.regionName || r.region_name || '',
                type: r.type || r.region_type || ''
            }
            updatePreferences('selectedRegion', newRegion)
            window.dispatchEvent(new CustomEvent('region-changed', { detail: newRegion }))
        }
    }

    /* ── Group detection ── */
    const hasAssets = visibleMenuItems.some((i) => ASSET_ITEMS.includes(i.id))
    const hasPeople = visibleMenuItems.filter((i) => PEOPLE_ITEMS.includes(i.id)).length > 1
    const hasProductivity = visibleMenuItems.filter((i) => PRODUCTIVITY_ITEMS.includes(i.id)).length > 1
    const standaloneItems = visibleMenuItems.filter(
        (i) =>
            !ASSET_ITEMS.includes(i.id) &&
            !(hasPeople && PEOPLE_ITEMS.includes(i.id)) &&
            !(hasProductivity && PRODUCTIVITY_ITEMS.includes(i.id))
    )

    /** Extract user initials from display name for the avatar circle. */
    const userInitials = userName
        ? userName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '?'

    /* ── Render helpers ── */

    const renderNavItem = (item) => {
        const isActive = selectedView === item.id
        return (
            <button
                key={item.id}
                ref={registerMagnetic}
                onClick={() => handleMenuClick(item.id)}
                title={item.text}
                className="relative flex items-center w-full gap-2.5 rounded-lg cursor-pointer transition-all duration-150 group"
                style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border: 'none',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 600 : 400,
                    height: 32,
                    outline: 'none',
                    padding: '0 10px',
                    textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
            >
                {/* Active left bar indicator */}
                {isActive && (
                    <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
                        style={{ backgroundColor: 'rgba(255,255,255,0.8)', height: 16, width: 3 }}
                    />
                )}
                <i
                    className={`fas ${ICONS[item.id] || 'fa-circle'}`}
                    style={{
                        color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                        flexShrink: 0,
                        fontSize: 11,
                        textAlign: 'center',
                        width: 16
                    }}
                />
                <span className="truncate">{item.text}</span>
            </button>
        )
    }

    const renderSection = (label, itemIds) => {
        const sectionItems = itemIds.map((id) => visibleMenuItems.find((i) => i.id === id)).filter(Boolean)
        if (!sectionItems.length) return null
        return (
            <div className="mb-1">
                <div
                    className="uppercase tracking-wider px-2.5 pb-1 pt-2.5 select-none"
                    style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.06em'
                    }}
                >
                    {label}
                </div>
                {sectionItems.map(renderNavItem)}
            </div>
        )
    }

    const renderSeparator = () => (
        <div className="mx-3 my-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)', height: 1 }} />
    )

    /* ── Sidebar content (shared between desktop and mobile overlay) ── */
    const renderSidebarContent = () => (
        <>
            {/* Logo + Region selector */}
            <div className="px-3 pt-3 pb-1 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                    <img
                        src={SrmLogo}
                        alt="Smyrna Ready Mix"
                        className="transition-all duration-300 hover:brightness-110"
                        style={{ height: 28 }}
                        draggable={false}
                    />
                </div>
                <select
                    value={regionCode || ''}
                    onChange={handleRegionChange}
                    className="w-full rounded-lg cursor-pointer transition-all duration-200 outline-none"
                    style={{
                        appearance: 'none',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.5)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 8px center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 14,
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '7px 10px'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.08)'
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.boxShadow = 'none'
                    }}
                >
                    {permittedRegions.length === 0 ? (
                        <option value="">Loading...</option>
                    ) : (
                        permittedRegions.map((r) => (
                            <option key={r.regionCode || r.region_code} value={r.regionCode || r.region_code}>
                                {r.regionName || r.region_name}
                            </option>
                        ))
                    )}
                </select>
            </div>

            {renderSeparator()}

            {/* Navigation items */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1" style={{ scrollbarWidth: 'thin' }}>
                {/* Skeleton while loading */}
                {visibleMenuItems.length === 0 && (
                    <div className="px-2 py-1 flex flex-col gap-1.5">
                        {[1, 0.85, 0.7, 1, 0.9, 0.75, 1, 0.8, 0.65, 0.9, 0.7, 0.85].map((w, i) => (
                            <div
                                key={i}
                                className="animate-pulse rounded-lg"
                                style={{
                                    animationDelay: `${i * 60}ms`,
                                    animationFillMode: 'both',
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    height: 28,
                                    width: `${w * 100}%`
                                }}
                            />
                        ))}
                    </div>
                )}
                {/* Dashboard standalone */}
                {standaloneItems.find((i) => i.id === 'Dashboard') &&
                    renderNavItem(standaloneItems.find((i) => i.id === 'Dashboard'))}

                {hasAssets && (
                    <>
                        {renderSeparator()}
                        {renderSection('Fleet / Assets', ASSET_ITEMS)}
                    </>
                )}

                {hasPeople && (
                    <>
                        {renderSeparator()}
                        {renderSection('People', PEOPLE_ITEMS)}
                    </>
                )}

                {hasProductivity && (
                    <>
                        {renderSeparator()}
                        {renderSection('Productivity', PRODUCTIVITY_ITEMS)}
                    </>
                )}

                {/* Remaining standalone items (excluding Dashboard) */}
                {standaloneItems.filter((i) => i.id !== 'Dashboard').length > 0 && (
                    <>
                        {renderSeparator()}
                        <div className="mb-1">
                            <div
                                className="uppercase tracking-wider px-2.5 pb-1 pt-2.5 select-none"
                                style={{
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    letterSpacing: '0.06em'
                                }}
                            >
                                Admin
                            </div>
                            {standaloneItems.filter((i) => i.id !== 'Dashboard').map(renderNavItem)}
                        </div>
                    </>
                )}
            </div>

            {renderSeparator()}

            {/* Footer: notifications, online users, user avatar, settings */}
            <div className="flex-shrink-0 px-3 pb-3 pt-1.5">
                {/* Notification + Online users row */}
                <div className="flex items-center gap-2 mb-2.5">
                    {/* Notifications bell */}
                    <button
                        className="relative flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
                        title="Notifications"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.7)',
                            height: 32,
                            outline: 'none',
                            width: 32
                        }}
                        onClick={() => {
                            setNotificationsAnchor(sidebarAnchorRect())
                            setShowNotifications(true)
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                        }}
                    >
                        <i className="fas fa-bell" style={{ fontSize: 12 }} />
                        {notificationsCount > 0 && (
                            <span
                                className="absolute flex items-center justify-center rounded-full"
                                style={{
                                    backgroundColor: '#ef4444',
                                    border: `2px solid ${accentColor}`,
                                    boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                                    color: 'white',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    height: 16,
                                    minWidth: 16,
                                    padding: '0 4px',
                                    right: -4,
                                    top: -4
                                }}
                            >
                                {notificationsCount}
                            </span>
                        )}
                    </button>

                    {/* Online users */}
                    <button
                        className="relative flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
                        title="Online Users"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.7)',
                            height: 32,
                            outline: 'none',
                            width: 32
                        }}
                        onClick={() => {
                            setOnlineUsersAnchor(sidebarAnchorRect())
                            setShowOnlineUsers(true)
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                        }}
                    >
                        <i className="fas fa-users" style={{ fontSize: 11 }} />
                        {onlineUsersCount > 0 && (
                            <span
                                className="absolute flex items-center justify-center rounded-full"
                                style={{
                                    backgroundColor: '#22c55e',
                                    border: `2px solid ${accentColor}`,
                                    boxShadow: '0 2px 6px rgba(34,197,94,0.4)',
                                    color: 'white',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    height: 16,
                                    minWidth: 16,
                                    padding: '0 4px',
                                    right: -4,
                                    top: -4
                                }}
                            >
                                {onlineUsersCount}
                            </span>
                        )}
                    </button>

                    <div className="flex-1" />

                    {/* Settings gear */}
                    <button
                        className="flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
                        title="Settings"
                        style={{
                            backgroundColor:
                                selectedView === 'MyAccount' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: selectedView === 'MyAccount' ? 'white' : 'rgba(255,255,255,0.7)',
                            height: 32,
                            outline: 'none',
                            width: 32
                        }}
                        onClick={() => handleMenuClick('MyAccount')}
                        onMouseEnter={(e) => {
                            if (selectedView !== 'MyAccount')
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
                        }}
                        onMouseLeave={(e) => {
                            if (selectedView !== 'MyAccount')
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                        }}
                    >
                        <i className="fas fa-cog" style={{ fontSize: 12 }} />
                    </button>
                </div>

                {/* User avatar row */}
                <div
                    className="flex items-center gap-2.5 rounded-lg cursor-pointer transition-all duration-150 px-1.5 py-1.5"
                    onClick={() => handleMenuClick('MyAccount')}
                    title={userName || 'My Account'}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                >
                    {/* Avatar circle with initials */}
                    <div
                        className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 700,
                            height: 30,
                            letterSpacing: '0.02em',
                            width: 30
                        }}
                    >
                        {userInitials}
                    </div>
                    <span
                        className="truncate"
                        style={{
                            color: 'rgba(255,255,255,0.85)',
                            fontSize: 12,
                            fontWeight: 500
                        }}
                    >
                        {userName || 'Account'}
                    </span>
                </div>
            </div>
        </>
    )

    /* ── Mobile layout ── */
    if (isMobile) {
        return (
            <>
                {/* Mobile top bar */}
                <div className="flex flex-col h-screen w-full">
                    <div
                        className="flex items-center justify-between sticky top-0 z-[100] flex-shrink-0"
                        style={{
                            backgroundColor: accentColor,
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            padding: '12px 16px'
                        }}
                    >
                        <img src={SrmLogo} alt="Logo" style={{ height: 34 }} draggable={false} />
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="flex items-center justify-center cursor-pointer"
                            style={{
                                backgroundColor: mobileMenuOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: 10,
                                color: 'white',
                                height: 40,
                                width: 40
                            }}
                        >
                            <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`} />
                        </button>
                    </div>

                    {/* Mobile glass sidebar overlay */}
                    {mobileMenuOpen && (
                        <div
                            className="fixed inset-0 z-[200]"
                            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <nav
                                ref={sidebarRef}
                                className="absolute left-0 top-0 bottom-0 flex flex-col overflow-hidden"
                                style={{
                                    width: 260,
                                    ...GLASS_PANEL_STYLE,
                                    background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}99)`,
                                    borderRight: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '4px 0 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Grid overlay */}
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ ...buildGridStyle(accentColor, true), zIndex: 0 }}
                                />
                                <div className="relative z-10 flex flex-col h-full">{renderSidebarContent()}</div>
                            </nav>
                        </div>
                    )}

                    {/* Main content */}
                    <div data-content-scroll className="flex-1 overflow-x-hidden overflow-y-auto relative">
                        {children}
                    </div>
                </div>

                {/* Modals */}
                {showNotifications && (
                    <NotificationsModal
                        isOpen={showNotifications}
                        messagesHook={messagesHook}
                        onClose={() => {
                            setShowNotifications(false)
                            window.dispatchEvent(new CustomEvent('messages-refresh'))
                        }}
                        onViewAll={() => {
                            setShowNotifications(false)
                            handleMenuClick('Notifications')
                        }}
                        onSelectConversation={(otherId) => {
                            setShowNotifications(false)
                            onSelectView('Notifications', { initialConversationId: otherId })
                        }}
                        anchorRect={notificationsAnchor}
                    />
                )}
                {showOnlineUsers && (
                    <OnlineUsersModal
                        isOpen={showOnlineUsers}
                        onClose={() => setShowOnlineUsers(false)}
                        anchorRect={onlineUsersAnchor}
                    />
                )}
            </>
        )
    }

    /* ── Desktop layout ── */
    return (
        <>
            {/* Grid background behind the sidebar only */}
            <div
                className="fixed pointer-events-none z-[99]"
                style={{
                    ...buildGridStyle(accentColor),
                    backgroundColor: 'var(--bg-primary)',
                    bottom: 0,
                    left: 0,
                    top: 0,
                    width: SIDEBAR_OFFSET
                }}
            />

            {/* Floating glass sidebar */}
            <nav
                className="fixed flex flex-col z-[100] select-none overflow-hidden"
                style={{
                    borderRadius: 20,
                    bottom: 16,
                    left: 16,
                    top: 16,
                    width: 220,
                    ...GLASS_PANEL_STYLE,
                    background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}99)`,
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow:
                        '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)'
                }}
            >
                {/* Grid overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ ...buildGridStyle(accentColor, true), borderRadius: 20, zIndex: 0 }}
                />
                <div className="relative z-10 flex flex-col h-full">{renderSidebarContent()}</div>
            </nav>

            {/* Main content wrapper offset by sidebar */}
            <div
                className="flex flex-col h-screen overflow-hidden"
                style={{
                    ...buildGridStyle(accentColor),
                    backgroundColor: 'var(--bg-primary)',
                    marginLeft: SIDEBAR_OFFSET
                }}
            >
                <div data-content-scroll className="flex-1 overflow-x-hidden overflow-y-auto relative">
                    {children}
                </div>
            </div>

            {/* Modals */}
            {showNotifications && (
                <NotificationsModal
                    isOpen={showNotifications}
                    messagesHook={messagesHook}
                    onClose={() => {
                        setShowNotifications(false)
                        window.dispatchEvent(new CustomEvent('messages-refresh'))
                    }}
                    onViewAll={() => {
                        setShowNotifications(false)
                        handleMenuClick('Notifications')
                    }}
                    onSelectConversation={(otherId) => {
                        setShowNotifications(false)
                        onSelectView('Notifications', { initialConversationId: otherId })
                    }}
                    anchorRect={notificationsAnchor}
                />
            )}
            {showOnlineUsers && (
                <OnlineUsersModal
                    isOpen={showOnlineUsers}
                    onClose={() => setShowOnlineUsers(false)}
                    anchorRect={onlineUsersAnchor}
                />
            )}
        </>
    )
}
