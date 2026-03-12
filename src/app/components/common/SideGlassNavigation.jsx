import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import SrmLogo from '../../../assets/images/srm-logo.svg'
import { OnlineUsersService } from '../../../services/OnlineUsersService'
import { UserPresenceService } from '../../../services/UserPresenceService'
import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
import { useAccentColor } from '../../hooks/useAccentColor'
import { useIsMobile } from '../../hooks/useIsMobile'
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
    Maintenance: 'fa-wrench',
    Managers: 'fa-user-tie',
    Mixers: 'fa-truck',
    MyAccount: 'fa-user',
    Operators: 'fa-users',
    People: 'fa-users',
    'Pickup Trucks': 'fa-truck-pickup',
    Plan: 'fa-calendar-alt',
    Plants: 'fa-industry',
    Productivity: 'fa-chart-bar',
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

/** Navigation item IDs grouped under the "Assets" category. */
const ASSET_ITEMS = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
/** Navigation item IDs grouped under the "People" category. */
const PEOPLE_ITEMS = ['Operators', 'Managers']
/** Navigation item IDs grouped under the "Productivity" category. */
const PRODUCTIVITY_ITEMS = ['List', 'Reports', 'Plan', 'Calculators', 'Leaderboards', 'Documents']
/** Navigation item IDs grouped under the "Admin" category. */
const ADMIN_ITEMS = ['Plants', 'Regions', 'Roles', 'Maintenance']

/** Category definitions for the primary nav row. */
const CATEGORIES = [
    { icon: 'fa-tachometer-alt', id: 'dashboard', items: [], label: 'Dashboard' },
    { icon: 'fa-truck', id: 'assets', items: ASSET_ITEMS, label: 'Assets' },
    { icon: 'fa-users', id: 'people', items: PEOPLE_ITEMS, label: 'People' },
    { icon: 'fa-chart-bar', id: 'productivity', items: PRODUCTIVITY_ITEMS, label: 'Productivity' },
    { icon: 'fa-cog', id: 'admin', items: ADMIN_ITEMS, label: 'Admin' }
]

/** Resolves which category a view ID belongs to. */
const getCategoryForView = (viewId) => {
    if (!viewId || viewId === 'Dashboard') return 'dashboard'
    if (ASSET_ITEMS.includes(viewId)) return 'assets'
    if (PEOPLE_ITEMS.includes(viewId)) return 'people'
    if (PRODUCTIVITY_ITEMS.includes(viewId)) return 'productivity'
    if (ADMIN_ITEMS.includes(viewId)) return 'admin'
    return 'dashboard'
}

/**
 * Two-level horizontal tab navigation inspired by concept 30.
 * Top row: accent-colored header with category pills.
 * Second row: white bar with sub-item tabs and sliding underline.
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
    const [activeCategory, setActiveCategory] = useState(() => getCategoryForView(selectedView))
    const isMobile = useIsMobile()
    const secondaryNavRef = useRef(null)
    const underlineRef = useRef(null)
    const mobileDrawerRef = useRef(null)

    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code
    const accentColor = useAccentColor()
    useNotifications(userId, preferences?.selectedRegion)
    const messagesHook = useMessages(userId)
    const notificationsCount = messagesHook.unreadCount

    /* ── Sync active category when selectedView changes ── */
    useEffect(() => {
        setActiveCategory(getCategoryForView(selectedView))
    }, [selectedView])

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

    /* ── Close mobile drawer on outside click ── */
    useEffect(() => {
        if (!isMobile || !mobileMenuOpen) return
        const handleClickOutside = (e) => {
            if (mobileDrawerRef.current && !mobileDrawerRef.current.contains(e.target)) {
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

    /* ── Sliding underline position ── */
    const updateUnderline = useCallback(() => {
        if (!secondaryNavRef.current || !underlineRef.current) return
        const activeTab = secondaryNavRef.current.querySelector('[data-active="true"]')
        if (activeTab) {
            const navRect = secondaryNavRef.current.getBoundingClientRect()
            const tabRect = activeTab.getBoundingClientRect()
            underlineRef.current.style.left = `${tabRect.left - navRect.left + secondaryNavRef.current.scrollLeft}px`
            underlineRef.current.style.width = `${tabRect.width}px`
        } else {
            underlineRef.current.style.width = '0'
        }
    }, [])

    useEffect(() => {
        updateUnderline()
    }, [selectedView, activeCategory, visibleMenuItems, updateUnderline])

    useEffect(() => {
        window.addEventListener('resize', updateUnderline)
        return () => window.removeEventListener('resize', updateUnderline)
    }, [updateUnderline])

    /** Visible categories based on which items the user has permission to see. */
    const visibleCategories = useMemo(() => {
        return CATEGORIES.filter((cat) => {
            if (cat.id === 'dashboard') return visibleMenuItems.some((i) => i.id === 'Dashboard')
            return cat.items.some((itemId) => visibleMenuItems.some((i) => i.id === itemId))
        })
    }, [visibleMenuItems])

    /** Items for the currently active category, filtered by permission. */
    const secondaryItems = useMemo(() => {
        const cat = CATEGORIES.find((c) => c.id === activeCategory)
        if (!cat || cat.items.length === 0) return []
        return cat.items.map((id) => visibleMenuItems.find((i) => i.id === id)).filter(Boolean)
    }, [activeCategory, visibleMenuItems])

    const handleMenuClick = (id) => {
        if (window.appSwitchView && (id === 'List' || id === 'Archive')) {
            window.appSwitchView(id)
        } else {
            onSelectView(id)
        }
        setMobileMenuOpen(false)
    }

    const handleCategoryClick = (catId) => {
        setActiveCategory(catId)
        if (catId === 'dashboard') {
            handleMenuClick('Dashboard')
        } else {
            const cat = CATEGORIES.find((c) => c.id === catId)
            if (cat) {
                const currentInCategory = cat.items.includes(selectedView)
                if (!currentInCategory) {
                    const firstVisible = cat.items.find((id) => visibleMenuItems.some((i) => i.id === id))
                    if (firstVisible) handleMenuClick(firstVisible)
                }
            }
        }
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

    const userInitials = userName
        ? userName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '?'

    /** Header background with grid pattern matching the accent color. */
    const headerStyle = {
        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
        backgroundImage: `
            linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%),
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
        `,
        backgroundPosition: '0 0, 0 0, 0 0',
        backgroundSize: '100% 100%, 20px 20px, 20px 20px'
    }

    /* ── Mobile layout ── */
    if (isMobile) {
        return (
            <>
                <div className="flex flex-col h-screen w-full">
                    <div
                        className="flex items-center justify-between sticky top-0 z-[100] flex-shrink-0"
                        style={{
                            ...headerStyle,
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

                    {mobileMenuOpen && (
                        <div
                            className="fixed inset-0 z-[200]"
                            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div
                                ref={mobileDrawerRef}
                                className="absolute left-0 top-0 bottom-0 overflow-y-auto"
                                style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    borderRight: '1px solid var(--border-light)',
                                    boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
                                    width: 280
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-4">
                                    <img src={SrmLogo} alt="Logo" style={{ height: 28 }} draggable={false} />
                                </div>
                                {visibleCategories.map((cat) => (
                                    <div key={cat.id} className="mb-1">
                                        <div
                                            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            {cat.label}
                                        </div>
                                        {cat.id === 'dashboard' ? (
                                            <button
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm cursor-pointer border-none"
                                                style={{
                                                    backgroundColor:
                                                        selectedView === 'Dashboard'
                                                            ? `${accentColor}14`
                                                            : 'transparent',
                                                    color:
                                                        selectedView === 'Dashboard'
                                                            ? accentColor
                                                            : 'var(--text-primary)',
                                                    fontWeight: selectedView === 'Dashboard' ? 600 : 400,
                                                    outline: 'none'
                                                }}
                                                onClick={() => handleMenuClick('Dashboard')}
                                            >
                                                <i
                                                    className={`fas ${ICONS.Dashboard}`}
                                                    style={{ fontSize: 13, width: 18 }}
                                                />
                                                Dashboard
                                            </button>
                                        ) : (
                                            cat.items
                                                .map((id) => visibleMenuItems.find((i) => i.id === id))
                                                .filter(Boolean)
                                                .map((item) => (
                                                    <button
                                                        key={item.id}
                                                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm cursor-pointer border-none"
                                                        style={{
                                                            backgroundColor:
                                                                selectedView === item.id
                                                                    ? `${accentColor}14`
                                                                    : 'transparent',
                                                            color:
                                                                selectedView === item.id
                                                                    ? accentColor
                                                                    : 'var(--text-primary)',
                                                            fontWeight: selectedView === item.id ? 600 : 400,
                                                            outline: 'none'
                                                        }}
                                                        onClick={() => handleMenuClick(item.id)}
                                                    >
                                                        <i
                                                            className={`fas ${ICONS[item.id] || 'fa-circle'}`}
                                                            style={{ fontSize: 13, width: 18 }}
                                                        />
                                                        {item.text}
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div data-content-scroll className="flex-1 overflow-x-hidden overflow-y-auto relative">
                        {children}
                    </div>
                </div>

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
            <div className="flex flex-col h-screen w-full overflow-hidden">
                {/* Primary header bar */}
                <header
                    className="flex-shrink-0 sticky top-0 z-[100]"
                    style={{
                        ...headerStyle,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                    }}
                >
                    {/* Single row: logo + category tabs + actions */}
                    <div className="flex items-center justify-between" style={{ padding: '12px 32px' }}>
                        {/* Left: logo + category tabs on same line */}
                        <div className="flex items-center gap-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                            <img
                                src={SrmLogo}
                                alt="Smyrna Ready Mix"
                                className="flex-shrink-0 transition-all duration-300 hover:brightness-125"
                                style={{ height: 28 }}
                                draggable={false}
                            />
                            <div className="flex items-center gap-1">
                                {/* Skeleton while loading */}
                                {visibleMenuItems.length === 0 && (
                                    <>
                                        {[72, 56, 52, 64, 48].map((w, i) => (
                                            <div
                                                key={i}
                                                className="animate-pulse rounded-lg"
                                                style={{
                                                    animationDelay: `${i * 80}ms`,
                                                    animationFillMode: 'both',
                                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                                    height: 34,
                                                    width: w
                                                }}
                                            />
                                        ))}
                                    </>
                                )}
                                {visibleCategories.map((cat) => {
                                    const isActive = activeCategory === cat.id
                                    return (
                                        <button
                                            key={cat.id}
                                            className="flex items-center gap-2 whitespace-nowrap cursor-pointer border-none transition-all duration-200"
                                            style={{
                                                background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                                                borderRadius: 10,
                                                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                                                color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                                                fontSize: 13,
                                                fontWeight: isActive ? 600 : 500,
                                                outline: 'none',
                                                padding: '8px 18px'
                                            }}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            onMouseEnter={(e) => {
                                                if (!isActive)
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) e.currentTarget.style.background = 'transparent'
                                            }}
                                        >
                                            <i className={`fas ${cat.icon}`} style={{ fontSize: 13 }} />
                                            {cat.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Region selector */}
                            <select
                                value={regionCode || ''}
                                onChange={handleRegionChange}
                                className="cursor-pointer transition-all duration-200 outline-none"
                                style={{
                                    appearance: 'none',
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                    backgroundPosition: 'right 8px center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: 14,
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    color: 'white',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    padding: '8px 30px 8px 12px'
                                }}
                            >
                                {permittedRegions.length === 0 ? (
                                    <option value="">Loading...</option>
                                ) : (
                                    permittedRegions.map((r) => (
                                        <option
                                            key={r.regionCode || r.region_code}
                                            value={r.regionCode || r.region_code}
                                            style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}
                                        >
                                            {r.regionName || r.region_name}
                                        </option>
                                    ))
                                )}
                            </select>

                            {/* Notifications */}
                            <button
                                className="relative flex items-center justify-center cursor-pointer"
                                title="Notifications"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    color: 'rgba(255,255,255,0.7)',
                                    height: 34,
                                    outline: 'none',
                                    width: 34
                                }}
                                onClick={(e) => {
                                    setNotificationsAnchor(e.currentTarget.getBoundingClientRect())
                                    setShowNotifications(true)
                                }}
                            >
                                <i className="fas fa-bell" style={{ fontSize: 13 }} />
                                {notificationsCount > 0 && (
                                    <span
                                        className="absolute flex items-center justify-center rounded-full"
                                        style={{
                                            backgroundColor: '#ef4444',
                                            border: `2px solid ${accentColor}`,
                                            color: 'white',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            height: 16,
                                            minWidth: 16,
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
                                className="relative flex items-center justify-center cursor-pointer"
                                title="Online Users"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    color: 'rgba(255,255,255,0.7)',
                                    height: 34,
                                    outline: 'none',
                                    width: 34
                                }}
                                onClick={(e) => {
                                    setOnlineUsersAnchor(e.currentTarget.getBoundingClientRect())
                                    setShowOnlineUsers(true)
                                }}
                            >
                                <i className="fas fa-circle" style={{ color: '#22c55e', fontSize: 7 }} />
                                <span className="ml-1 text-xs font-semibold text-white">{onlineUsersCount}</span>
                            </button>

                            {/* User avatar */}
                            <div
                                className="flex items-center justify-center cursor-pointer"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    color: 'white',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    height: 34,
                                    width: 34
                                }}
                                onClick={() => handleMenuClick('MyAccount')}
                                title={userName || 'My Account'}
                            >
                                {userInitials}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Secondary nav bar with sliding underline */}
                {secondaryItems.length > 0 && (
                    <div
                        className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm"
                        style={{ minHeight: 44 }}
                    >
                        <div
                            ref={secondaryNavRef}
                            className="flex items-center relative overflow-x-auto"
                            style={{ padding: '0 32px', scrollbarWidth: 'none' }}
                        >
                            {secondaryItems.map((item) => {
                                const isActive = selectedView === item.id
                                return (
                                    <button
                                        key={item.id}
                                        data-active={isActive}
                                        className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-none bg-transparent transition-colors duration-150"
                                        style={{
                                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontSize: 13,
                                            fontWeight: isActive ? 600 : 500,
                                            outline: 'none',
                                            padding: '12px 16px'
                                        }}
                                        onClick={() => handleMenuClick(item.id)}
                                        onMouseEnter={(e) => {
                                            if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'
                                        }}
                                    >
                                        <i
                                            className={`fas ${ICONS[item.id] || 'fa-circle'}`}
                                            style={{ fontSize: 12 }}
                                        />
                                        {item.text}
                                    </button>
                                )
                            })}
                            {/* Sliding underline */}
                            <div
                                ref={underlineRef}
                                className="absolute bottom-0 rounded-t"
                                style={{
                                    backgroundColor: accentColor,
                                    height: 2.5,
                                    transition:
                                        'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    width: 0
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Content area */}
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
