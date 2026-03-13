import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import SrmLogo from '../../../assets/images/srm-logo.svg'
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
/** Permission-gated menu item definitions for the primary navigation. */
const menuItems = [
    { id: 'Dashboard', permission: 'dashboard.view', text: 'Dashboard' },
    { id: 'Mixers', permission: 'mixers.view', text: 'Mixers' },
    { id: 'Tractors', permission: 'tractors.view', text: 'Tractors' },
    { id: 'Trailers', permission: 'trailers.view', text: 'Trailers' },
    { id: 'Heavy Equipment', permission: 'equipment.view', text: 'Heavy Equipment' },
    { id: 'Pickup Trucks', permission: 'pickup_trucks.view', text: 'Pickup Trucks' },
    { id: 'Operators', permission: 'operators.view', text: 'Operators' },
    { id: 'Managers', permission: 'managers.view', text: 'Managers' },
    { id: 'Reports', permission: 'reports.view', text: 'Reports' },
    { id: 'List', permission: 'list.view', text: 'List' },
    { id: 'Plan', permission: 'plan.view', text: 'Plan' },
    { id: 'Plants', permission: 'plants.view', text: 'Plants' },
    { id: 'Regions', permission: 'regions.view', text: 'Regions' },
    { id: 'Roles', permission: 'roles.view', text: 'Roles' },
    { id: 'Calculators', permission: 'calculator.view', text: 'Calculators' },
    { id: 'Leaderboards', permission: 'leaderboards.view', text: 'Leaderboards' },
    { id: 'Documents', permission: 'documents.view', text: 'Documents' }
]
/** Navigation item IDs grouped under the "Assets" dropdown. */
const ASSET_ITEMS = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
/** Navigation item IDs grouped under the "People" dropdown. */
const PEOPLE_ITEMS = ['Operators', 'Managers']
/** Navigation item IDs grouped under the "Productivity" dropdown. */
const PRODUCTIVITY_ITEMS = ['Reports', 'List', 'Plan', 'Calculators', 'Leaderboards', 'Documents']
/** Navigation item IDs grouped under the "Admin" category (two-level mode). */
const ADMIN_ITEMS = ['Plants', 'Regions', 'Roles', 'Maintenance']

/** Category definitions for the two-level tab nav row. */
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
 * Unified app navigation supporting two desktop layout modes:
 * - `top_bar_basic` (default): single-row top bar with dropdown menus
 * - `two_level_tabs`: two-level horizontal tabs with category pills + sliding underline
 *
 * Mobile layout is shared across both modes.
 */
export default function Navigation({ selectedView, onSelectView, children, userName = '', userId = null, ..._rest }) {
    const { preferences, updatePreferences } = usePreferences()
    const navStyle = preferences.navStyle || 'top_bar_basic'
    const isTwoLevel = navStyle === 'two_level_tabs'

    /* ── Shared state ── */
    const [visibleMenuItems, setVisibleMenuItems] = useState([])
    const [permittedRegions, setPermittedRegions] = useState([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [notificationsAnchor, setNotificationsAnchor] = useState(null)
    const [showOnlineUsers, setShowOnlineUsers] = useState(false)
    const [onlineUsersAnchor, setOnlineUsersAnchor] = useState(null)
    const [onlineUsersCount, setOnlineUsersCount] = useState(0)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    /* ── Top-bar-specific state ── */
    const [openDropdown, setOpenDropdown] = useState(null)
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024)

    /* ── Two-level-specific state ── */
    const [activeCategory, setActiveCategory] = useState(() => getCategoryForView(selectedView))

    /* ── Refs ── */
    const dropdownRef = useRef(null)
    const secondaryNavRef = useRef(null)
    const underlineRef = useRef(null)
    const mobileDrawerRef = useRef(null)

    /* ── Shared hooks ── */
    const isMobile = useIsMobile()
    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code
    const accentColor = useAccentColor()
    useNotifications(userId, preferences?.selectedRegion)
    const messagesHook = useMessages(userId)
    const notificationsCount = messagesHook.unreadCount
    const { registerElement: registerMagnetic } = useMagneticHover()

    /* ── Tablet breakpoint for top-bar mode ── */
    useEffect(() => {
        const handleResize = () => {
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    /* ── Presence tracking ── */
    useEffect(() => {
        const setupAndInit = async () => {
            try {
                await UserPresenceService.setup()
                await UserPresenceService.initOnlineUsers()
                setOnlineUsersCount(UserPresenceService.getOnlineUsers().length)
            } catch {
                setOnlineUsersCount(0)
            }
        }
        setupAndInit()
        const handleUpdate = (snapshot) => {
            setOnlineUsersCount(snapshot.users?.length || 0)
        }
        UserPresenceService.addOnlineUsersListener(handleUpdate)
        return () => UserPresenceService.removeOnlineUsersListener(handleUpdate)
    }, [])

    /* ── Close dropdown on outside click (top-bar mode) ── */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(null)
            }
        }
        if (openDropdown) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openDropdown])

    /* ── Close mobile drawer on outside click (two-level mode) ── */
    useEffect(() => {
        if (!isMobile || !mobileMenuOpen || !isTwoLevel) return
        const handleClickOutside = (e) => {
            if (mobileDrawerRef.current && !mobileDrawerRef.current.contains(e.target)) {
                setMobileMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMobile, mobileMenuOpen, isTwoLevel])

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

    /* ── Two-level: sync activeCategory when selectedView changes ── */
    useEffect(() => {
        if (isTwoLevel) setActiveCategory(getCategoryForView(selectedView))
    }, [selectedView, isTwoLevel])

    /* ── Two-level: sliding underline position ── */
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
        if (isTwoLevel) updateUnderline()
    }, [selectedView, activeCategory, visibleMenuItems, updateUnderline, isTwoLevel])

    useEffect(() => {
        if (!isTwoLevel) return
        window.addEventListener('resize', updateUnderline)
        return () => window.removeEventListener('resize', updateUnderline)
    }, [updateUnderline, isTwoLevel])

    /* ── Two-level: visible categories filtered by permission ── */
    const visibleCategories = useMemo(() => {
        return CATEGORIES.filter((cat) => {
            if (cat.id === 'dashboard') return visibleMenuItems.some((i) => i.id === 'Dashboard')
            return cat.items.some((itemId) => visibleMenuItems.some((i) => i.id === itemId))
        })
    }, [visibleMenuItems])

    /* ── Two-level: secondary items for active category ── */
    const secondaryItems = useMemo(() => {
        const cat = CATEGORIES.find((c) => c.id === activeCategory)
        if (!cat || cat.items.length === 0) return []
        return cat.items.map((id) => visibleMenuItems.find((i) => i.id === id)).filter(Boolean)
    }, [activeCategory, visibleMenuItems])

    /* ── Shared handlers ── */
    const handleMenuClick = (id) => {
        if (window.appSwitchView && (id === 'List' || id === 'Archive')) {
            window.appSwitchView(id)
        } else {
            onSelectView(id)
        }
        setMobileMenuOpen(false)
        setOpenDropdown(null)
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

    /* ── Two-level: category click handler ── */
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

    /* ── Top-bar: derived grouping flags ── */
    const hasAssets = visibleMenuItems.some((i) => ASSET_ITEMS.includes(i.id))
    const hasPeople = visibleMenuItems.filter((i) => PEOPLE_ITEMS.includes(i.id)).length > 1
    const hasProductivity = visibleMenuItems.filter((i) => PRODUCTIVITY_ITEMS.includes(i.id)).length > 1
    const standaloneItems = visibleMenuItems.filter(
        (i) =>
            !ASSET_ITEMS.includes(i.id) &&
            !(hasPeople && PEOPLE_ITEMS.includes(i.id)) &&
            !(hasProductivity && PRODUCTIVITY_ITEMS.includes(i.id))
    )

    /* ── Two-level: user initials for avatar ── */
    const userInitials = userName
        ? userName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '?'

    /* ── Header background style shared across modes ── */
    const headerStyle = {
        backgroundColor: accentColor,
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 50%)
        `,
        backgroundPosition: '0 0, 0 0, 0 0',
        backgroundSize: '20px 20px, 20px 20px, 40px 40px'
    }

    /* ── Top-bar: style helpers ── */
    const navItemStyle = (isActive) => ({
        alignItems: 'center',
        backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
        borderRadius: isTablet ? '6px' : '10px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        flexShrink: 0,
        fontSize: isTablet ? '12px' : '14px',
        fontWeight: isActive ? 600 : 500,
        gap: isTablet ? '4px' : '8px',
        padding: isTablet ? '6px 8px' : '10px 16px',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
    })

    const dropdownStyle = {
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow)',
        left: 0,
        marginTop: '8px',
        minWidth: '220px',
        padding: '10px',
        position: 'absolute',
        top: '100%',
        zIndex: 1000
    }

    const renderDropdown = (label, icon, items, dropdownId, activeCheck) => {
        const isOpen = openDropdown === dropdownId
        const isActive = activeCheck()
        return (
            <div style={{ position: 'relative' }} ref={isOpen ? dropdownRef : null}>
                <div
                    ref={registerMagnetic}
                    style={{ ...navItemStyle(isActive), gap: isTablet ? '4px' : '6px' }}
                    onClick={() => setOpenDropdown(isOpen ? null : dropdownId)}
                >
                    <i className={`fas ${icon}`} style={{ fontSize: isTablet ? '13px' : '14px' }}></i>
                    {!isTablet && <span>{label}</span>}
                    <i
                        className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
                        style={{ fontSize: isTablet ? '9px' : '10px', marginLeft: isTablet ? '0' : '2px' }}
                    ></i>
                </div>
                {isOpen && (
                    <div style={dropdownStyle}>
                        {items.map((itemId) => {
                            const item = visibleMenuItems.find((i) => i.id === itemId)
                            if (!item) return null
                            const isItemActive = selectedView === item.id
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        alignItems: 'center',
                                        backgroundColor: isItemActive ? `${accentColor}12` : 'transparent',
                                        borderRadius: '8px',
                                        color: isItemActive ? accentColor : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        fontWeight: isItemActive ? 600 : 400,
                                        gap: '10px',
                                        padding: '10px 14px',
                                        transition: 'all 0.15s'
                                    }}
                                    onClick={() => handleMenuClick(item.id)}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor = isItemActive
                                            ? `${accentColor}12`
                                            : 'var(--bg-secondary)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor = isItemActive
                                            ? `${accentColor}12`
                                            : 'transparent')
                                    }
                                >
                                    <i
                                        className={`fas ${ICONS[item.id]}`}
                                        style={{ color: 'var(--text-secondary)', fontSize: '14px', width: '18px' }}
                                    ></i>
                                    <span style={{ color: isItemActive ? accentColor : 'var(--text-primary)' }}>
                                        {item.text}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    const renderIconButton = (
        icon,
        title,
        onClick,
        isActive = false,
        badge = null,
        badgeColor = '#ef4444',
        tutorialTarget = null
    ) => (
        <div
            style={{
                alignItems: 'center',
                backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: isTablet ? '8px' : '12px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                flexShrink: 0,
                height: isTablet ? '32px' : '42px',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.2s ease',
                width: isTablet ? '32px' : '42px'
            }}
            onClick={onClick}
            title={title}
            data-tutorial-target={tutorialTarget}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'
                e.currentTarget.style.transform = 'translateY(0)'
            }}
        >
            <i className={`fas ${icon}`} style={{ fontSize: isTablet ? '13px' : '16px' }}></i>
            {badge > 0 && (
                <span
                    style={{
                        alignItems: 'center',
                        backgroundColor: badgeColor,
                        border: `2px solid ${accentColor}`,
                        borderRadius: '10px',
                        boxShadow: `0 2px 8px ${badgeColor}66`,
                        color: 'white',
                        display: 'flex',
                        fontSize: isTablet ? '9px' : '11px',
                        fontWeight: 700,
                        height: isTablet ? '16px' : '20px',
                        justifyContent: 'center',
                        minWidth: isTablet ? '16px' : '20px',
                        padding: '0 4px',
                        position: 'absolute',
                        right: '-4px',
                        top: '-4px'
                    }}
                >
                    {badge}
                </span>
            )}
        </div>
    )

    /* ── Shared modals ── */
    const renderModals = () => (
        <>
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

    /* ══════════════════════════════════════════════
     * MOBILE LAYOUT (shared across both nav styles)
     * ══════════════════════════════════════════════ */
    if (isMobile) {
        return (
            <>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
                    <div
                        style={{
                            ...headerStyle,
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            position: 'sticky',
                            top: 0,
                            zIndex: 100
                        }}
                    >
                        <img src={SrmLogo} alt="Logo" style={{ height: '34px' }} draggable={false} />
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            style={{
                                alignItems: 'center',
                                backgroundColor: mobileMenuOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                height: '40px',
                                justifyContent: 'center',
                                width: '40px'
                            }}
                        >
                            <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`}></i>
                        </button>
                    </div>
                    {mobileMenuOpen && (
                        <div
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                bottom: 0,
                                left: 0,
                                position: 'fixed',
                                right: 0,
                                top: 0,
                                zIndex: 200
                            }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div
                                style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    boxShadow: 'var(--shadow)',
                                    height: '100%',
                                    overflowY: 'auto',
                                    padding: '20px',
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    width: '280px'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ marginBottom: '20px' }}>
                                    <label
                                        style={{
                                            color: 'var(--text-secondary)',
                                            display: 'block',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            letterSpacing: '0.05em',
                                            marginBottom: '6px',
                                            textTransform: 'uppercase'
                                        }}
                                    >
                                        Region
                                    </label>
                                    <select
                                        value={regionCode || ''}
                                        onChange={handleRegionChange}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = accentColor
                                            e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}20`
                                            e.currentTarget.style.outline = 'none'
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-light)'
                                            e.currentTarget.style.boxShadow = 'none'
                                        }}
                                        style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '2px solid var(--border-light)',
                                            borderRadius: '10px',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            padding: '12px',
                                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                            width: '100%'
                                        }}
                                    >
                                        {permittedRegions.length === 0 ? (
                                            <option value="">Loading...</option>
                                        ) : (
                                            permittedRegions.map((r) => (
                                                <option
                                                    key={r.regionCode || r.region_code}
                                                    value={r.regionCode || r.region_code}
                                                >
                                                    {r.regionName || r.region_name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                {standaloneItems.find((i) => i.id === 'Dashboard') && (
                                    <MobileMenuItem
                                        item={standaloneItems.find((i) => i.id === 'Dashboard')}
                                        isActive={selectedView === 'Dashboard'}
                                        onClick={() => handleMenuClick('Dashboard')}
                                        accentColor={accentColor}
                                    />
                                )}
                                {hasAssets && (
                                    <MobileSection title="Assets">
                                        {ASSET_ITEMS.map((id) => {
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
                                )}
                                {hasPeople && (
                                    <MobileSection title="People">
                                        {PEOPLE_ITEMS.map((id) => {
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
                                )}
                                {hasProductivity && (
                                    <MobileSection title="Productivity">
                                        {PRODUCTIVITY_ITEMS.map((id) => {
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
                    )}
                    <div
                        data-content-scroll
                        style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', position: 'relative' }}
                    >
                        {children}
                    </div>
                </div>
                {renderModals()}
            </>
        )
    }

    /* ══════════════════════════════════════════════
     * DESKTOP: two-level tabs layout
     * ══════════════════════════════════════════════ */
    if (isTwoLevel) {
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
                                    <i className="fas fa-users" style={{ fontSize: 13 }} />
                                    {onlineUsersCount > 0 && (
                                        <span
                                            className="absolute flex items-center justify-center rounded-full"
                                            style={{
                                                backgroundColor: '#22c55e',
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
                                            {onlineUsersCount}
                                        </span>
                                    )}
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

                {renderModals()}
            </>
        )
    }

    /* ══════════════════════════════════════════════
     * DESKTOP: top-bar basic layout (default)
     * ══════════════════════════════════════════════ */
    return (
        <>
            <div
                style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', width: '100%' }}
            >
                <header
                    style={{
                        ...headerStyle,
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        display: 'flex',
                        flexShrink: 0,
                        height: isTablet ? '56px' : '68px',
                        justifyContent: 'space-between',
                        padding: isTablet ? '0 12px' : '0 24px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            flex: 1,
                            gap: isTablet ? '10px' : '28px',
                            minWidth: 0
                        }}
                    >
                        <div
                            className="group"
                            style={{
                                alignItems: 'center',
                                borderRight: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexShrink: 0,
                                paddingRight: isTablet ? '10px' : '24px'
                            }}
                        >
                            <img
                                src={SrmLogo}
                                alt="Smyrna Ready Mix"
                                className="transition-all duration-300 ease-out group-hover:brightness-125 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.3)] group-hover:scale-105"
                                style={{ height: isTablet ? '28px' : '40px' }}
                                draggable={false}
                            />
                        </div>
                        <nav
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flex: 1,
                                gap: isTablet ? '2px' : '6px',
                                minWidth: 0
                            }}
                        >
                            {visibleMenuItems.length === 0 && (
                                <div className="flex items-center gap-2">
                                    {[72, 56, 52, 64, 48].map((w, i) => (
                                        <div
                                            key={i}
                                            className="bg-white/10 animate-pulse rounded-lg"
                                            style={{
                                                animationDelay: `${i * 80}ms`,
                                                animationFillMode: 'both',
                                                height: 32,
                                                width: w
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                            {standaloneItems.find((i) => i.id === 'Dashboard') && (
                                <div
                                    ref={registerMagnetic}
                                    style={navItemStyle(selectedView === 'Dashboard')}
                                    onClick={() => handleMenuClick('Dashboard')}
                                    title="Dashboard"
                                >
                                    <i
                                        className={`fas ${ICONS.Dashboard}`}
                                        style={{ fontSize: isTablet ? '13px' : '14px' }}
                                    ></i>
                                    {!isTablet && <span>Dashboard</span>}
                                </div>
                            )}
                            {hasAssets &&
                                renderDropdown('Assets', ICONS.Assets, ASSET_ITEMS, 'assets', () =>
                                    ASSET_ITEMS.includes(selectedView)
                                )}
                            {hasPeople &&
                                renderDropdown('People', ICONS.People, PEOPLE_ITEMS, 'people', () =>
                                    PEOPLE_ITEMS.includes(selectedView)
                                )}
                            {hasProductivity &&
                                renderDropdown(
                                    'Productivity',
                                    ICONS.Productivity,
                                    PRODUCTIVITY_ITEMS,
                                    'productivity',
                                    () => PRODUCTIVITY_ITEMS.includes(selectedView)
                                )}
                            {standaloneItems
                                .filter((i) => i.id !== 'Dashboard')
                                .map((item) => (
                                    <div
                                        key={item.id}
                                        ref={registerMagnetic}
                                        style={navItemStyle(selectedView === item.id)}
                                        onClick={() => handleMenuClick(item.id)}
                                        title={item.text}
                                        onMouseEnter={(e) => {
                                            if (selectedView !== item.id)
                                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedView !== item.id)
                                                e.currentTarget.style.backgroundColor = 'transparent'
                                        }}
                                    >
                                        <i
                                            className={`fas ${ICONS[item.id]}`}
                                            style={{ fontSize: isTablet ? '13px' : '14px' }}
                                        ></i>
                                        {!isTablet && <span>{item.text}</span>}
                                    </div>
                                ))}
                        </nav>
                    </div>
                    <div
                        style={{ alignItems: 'center', display: 'flex', flexShrink: 0, gap: isTablet ? '8px' : '16px' }}
                    >
                        <select
                            value={regionCode || ''}
                            onChange={handleRegionChange}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                                e.currentTarget.style.outline = 'none'
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.15)'
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                            style={{
                                appearance: 'none',
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 8px center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: isTablet ? '12px' : '16px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: isTablet ? '8px' : '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: isTablet ? '12px' : '14px',
                                fontWeight: 600,
                                letterSpacing: '0.01em',
                                maxWidth: isTablet ? '120px' : 'none',
                                overflow: 'hidden',
                                padding: isTablet ? '6px 24px 6px 10px' : '10px 36px 10px 16px',
                                textOverflow: 'ellipsis',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {permittedRegions.length === 0 ? (
                                <option value="" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    Loading...
                                </option>
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
                        {renderIconButton(
                            ICONS.MyAccount,
                            userName ? `My Account - ${userName}` : 'My Account',
                            () => handleMenuClick('MyAccount'),
                            selectedView === 'MyAccount',
                            null,
                            '#ef4444',
                            'account-nav'
                        )}
                        {renderIconButton(
                            'fa-bell',
                            'Notifications',
                            (e) => {
                                setNotificationsAnchor(e.currentTarget.getBoundingClientRect())
                                setShowNotifications(true)
                            },
                            false,
                            notificationsCount
                        )}
                        {renderIconButton(
                            'fa-users',
                            'Online Users',
                            (e) => {
                                setOnlineUsersAnchor(e.currentTarget.getBoundingClientRect())
                                setShowOnlineUsers(true)
                            },
                            false,
                            onlineUsersCount,
                            '#22c55e'
                        )}
                    </div>
                </header>
                <main
                    data-content-scroll
                    style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', position: 'relative' }}
                >
                    {children}
                </main>
                {renderModals()}
            </div>
        </>
    )
}
/** Labeled section divider used in the mobile navigation drawer. */
function MobileSection({ title, children }) {
    return (
        <div style={{ marginBottom: '16px' }}>
            <div
                style={{
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    padding: '8px 12px',
                    textTransform: 'uppercase'
                }}
            >
                {title}
            </div>
            {children}
        </div>
    )
}
/** Single tappable row in the mobile navigation drawer. */
function MobileMenuItem({ item, isActive, onClick, accentColor = '#1e3a5f' }) {
    return (
        <div
            onClick={onClick}
            style={{
                alignItems: 'center',
                backgroundColor: isActive ? `${accentColor}12` : 'transparent',
                borderRadius: '10px',
                color: isActive ? accentColor : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                fontWeight: isActive ? 600 : 400,
                gap: '12px',
                marginBottom: '4px',
                padding: '12px',
                transition: 'all 0.15s'
            }}
        >
            <i
                className={`fas ${ICONS[item.id] || 'fa-circle'}`}
                style={{ color: isActive ? accentColor : 'var(--text-secondary)', fontSize: '16px', width: '20px' }}
            ></i>
            <span style={{ fontSize: '15px' }}>{item.text}</span>
        </div>
    )
}
