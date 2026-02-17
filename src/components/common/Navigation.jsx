import React, { useEffect, useRef, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { useNotifications } from '../../app/hooks/useNotifications'
import SrmLogo from '../../assets/images/srm-logo.svg'
import { UserPresenceService } from '../../services/UserPresenceService'
import { UserService } from '../../services/UserService'
import NotificationsModal from './NotificationsModal'
import OnlineUsersModal from './OnlineUsersModal'

const OFFICE_VISIBLE_ITEMS = ['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions']
const AGGREGATE_HIDDEN_ITEMS = ['Mixers', 'Plants', 'Regions', 'Leaderboards', 'Calculators', 'Maintenance']
const DEFAULT_HIDDEN_ITEMS = ['Plants', 'Regions']
const OFFICE_ONLY_ITEMS = ['Roles']

const ICONS = {
    Archive: 'fa-archive',
    Assets: 'fa-truck',
    Calculators: 'fa-calculator',
    Dashboard: 'fa-tachometer-alt',
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
    { id: 'Leaderboards', permission: 'leaderboards.view', text: 'Leaderboards' }
]

const ASSET_ITEMS = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
const PEOPLE_ITEMS = ['Operators', 'Managers']
const PRODUCTIVITY_ITEMS = ['List', 'Reports']

export default function Navigation({ selectedView, onSelectView, children, userName = '', userId = null, ..._rest }) {
    const { preferences, updatePreferences } = usePreferences()
    const [visibleMenuItems, setVisibleMenuItems] = useState([])
    const [permittedRegions, setPermittedRegions] = useState([])
    const [openDropdown, setOpenDropdown] = useState(null)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notificationsAnchor, setNotificationsAnchor] = useState(null)
    const [showOnlineUsers, setShowOnlineUsers] = useState(false)
    const [onlineUsersAnchor, setOnlineUsersAnchor] = useState(null)
    const [onlineUsersCount, setOnlineUsersCount] = useState(0)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const dropdownRef = useRef(null)
    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code
    const accentColor = preferences.accentColor || '#1e3a5f'
    const { count: notificationsCount } = useNotifications(userId, preferences?.selectedRegion)

    useEffect(() => {
        const setupAndFetch = async () => {
            try {
                await UserPresenceService.setup()
                const users = await UserPresenceService.getOnlineUsers()
                setOnlineUsersCount(users?.length || 0)
            } catch {
                setOnlineUsersCount(0)
            }
        }
        setupAndFetch()
        const handlePresenceUpdate = (users) => {
            setOnlineUsersCount(users?.length || 0)
        }
        UserPresenceService.addListener(handlePresenceUpdate)

        const refreshInterval = setInterval(async () => {
            try {
                const users = await UserPresenceService.getOnlineUsers()
                setOnlineUsersCount(users?.length || 0)
            } catch {}
        }, 30000)

        return () => {
            UserPresenceService.removeListener(handlePresenceUpdate)
            clearInterval(refreshInterval)
        }
    }, [])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(null)
            }
        }
        if (openDropdown) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openDropdown])

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

    const hasAssets = visibleMenuItems.some((i) => ASSET_ITEMS.includes(i.id))
    const hasPeople = visibleMenuItems.filter((i) => PEOPLE_ITEMS.includes(i.id)).length > 1
    const hasProductivity = visibleMenuItems.filter((i) => PRODUCTIVITY_ITEMS.includes(i.id)).length > 1
    const standaloneItems = visibleMenuItems.filter(
        (i) =>
            !ASSET_ITEMS.includes(i.id) &&
            !(hasPeople && PEOPLE_ITEMS.includes(i.id)) &&
            !(hasProductivity && PRODUCTIVITY_ITEMS.includes(i.id))
    )

    const navItemStyle = (isActive) => ({
        alignItems: 'center',
        backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
        borderRadius: '10px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '14px',
        fontWeight: isActive ? 600 : 500,
        gap: '8px',
        padding: '10px 16px',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
    })

    const dropdownStyle = {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
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
                    style={{ ...navItemStyle(isActive), gap: '6px' }}
                    onClick={() => setOpenDropdown(isOpen ? null : dropdownId)}
                >
                    <i className={`fas ${icon}`} style={{ fontSize: '14px' }}></i>
                    <span>{label}</span>
                    <i
                        className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
                        style={{ fontSize: '10px', marginLeft: '2px' }}
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
                                        backgroundColor: isItemActive ? '#f0f7ff' : 'transparent',
                                        borderRadius: '8px',
                                        color: isItemActive ? '#1e3a5f' : '#374151',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        fontWeight: isItemActive ? 600 : 400,
                                        gap: '10px',
                                        padding: '10px 14px',
                                        transition: 'all 0.15s'
                                    }}
                                    onClick={() => handleMenuClick(item.id)}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor = isItemActive ? '#f0f7ff' : '#f9fafb')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor = isItemActive
                                            ? '#f0f7ff'
                                            : 'transparent')
                                    }
                                >
                                    <i
                                        className={`fas ${ICONS[item.id]}`}
                                        style={{ color: '#64748b', fontSize: '14px', width: '18px' }}
                                    ></i>
                                    <span style={{ color: isItemActive ? '#1e3a5f' : '#374151' }}>{item.text}</span>
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
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                height: '42px',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.2s ease',
                width: '42px'
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
            <i className={`fas ${icon}`} style={{ fontSize: '16px' }}></i>
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
                        fontSize: '11px',
                        fontWeight: 700,
                        height: '20px',
                        justifyContent: 'center',
                        minWidth: '20px',
                        padding: '0 6px',
                        position: 'absolute',
                        right: '-2px',
                        top: '-2px'
                    }}
                >
                    {badge}
                </span>
            )}
        </div>
    )

    if (isMobile) {
        return (
            <>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
                    <div
                        style={{
                            alignItems: 'center',
                            backgroundColor: accentColor,
                            backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                        `,
                            backgroundSize: '20px 20px',
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
                                    backgroundColor: 'white',
                                    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
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
                                    <select
                                        value={regionCode || ''}
                                        onChange={handleRegionChange}
                                        style={{
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            padding: '12px',
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

                                {standaloneItems.filter((i) => i.id !== 'Dashboard').length > 0 &&
                                    standaloneItems.find((i) => i.id === 'Dashboard') && (
                                        <MobileMenuItem
                                            item={standaloneItems.find((i) => i.id === 'Dashboard')}
                                            isActive={selectedView === 'Dashboard'}
                                            onClick={() => handleMenuClick('Dashboard')}
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
                                                />
                                            )
                                        })}
                                    </MobileSection>
                                )}

                                {hasProductivity && (
                                    <MobileSection title="Productivity">
                                        {PRODUCTIVITY_ITEMS.filter((id) => id !== 'Reports').map((id) => {
                                            const item = visibleMenuItems.find((i) => i.id === id)
                                            if (!item) return null
                                            return (
                                                <MobileMenuItem
                                                    key={id}
                                                    item={item}
                                                    isActive={selectedView === id}
                                                    onClick={() => handleMenuClick(id)}
                                                />
                                            )
                                        })}
                                    </MobileSection>
                                )}

                                {standaloneItems
                                    .filter((i) => i.id !== 'Dashboard' && i.id !== 'Reports')
                                    .map((item) => (
                                        <MobileMenuItem
                                            key={item.id}
                                            item={item}
                                            isActive={selectedView === item.id}
                                            onClick={() => handleMenuClick(item.id)}
                                        />
                                    ))}

                                <MobileSection title="Account">
                                    <MobileMenuItem
                                        item={{ id: 'MyAccount', text: 'My Account' }}
                                        isActive={selectedView === 'MyAccount'}
                                        onClick={() => handleMenuClick('MyAccount')}
                                    />
                                </MobileSection>
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>{children}</div>
                </div>
            </>
        )
    }

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
                <header
                    style={{
                        alignItems: 'center',
                        backgroundColor: accentColor,
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        display: 'flex',
                        height: '68px',
                        justifyContent: 'space-between',
                        padding: '0 24px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100
                    }}
                >
                    <div style={{ alignItems: 'center', display: 'flex', gap: '28px' }}>
                        <div
                            style={{
                                alignItems: 'center',
                                borderRight: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                paddingRight: '24px'
                            }}
                        >
                            <img src={SrmLogo} alt="Smyrna Ready Mix" style={{ height: '40px' }} draggable={false} />
                        </div>

                        <nav style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                            {standaloneItems.find((i) => i.id === 'Dashboard') && (
                                <div
                                    style={navItemStyle(selectedView === 'Dashboard')}
                                    onClick={() => handleMenuClick('Dashboard')}
                                    onMouseEnter={(e) => {
                                        if (selectedView !== 'Dashboard')
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedView !== 'Dashboard')
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                    }}
                                >
                                    <i className={`fas ${ICONS.Dashboard}`} style={{ fontSize: '14px' }}></i>
                                    <span>Dashboard</span>
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
                                        style={navItemStyle(selectedView === item.id)}
                                        onClick={() => handleMenuClick(item.id)}
                                        onMouseEnter={(e) => {
                                            if (selectedView !== item.id)
                                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedView !== item.id)
                                                e.currentTarget.style.backgroundColor = 'transparent'
                                        }}
                                    >
                                        <i className={`fas ${ICONS[item.id]}`} style={{ fontSize: '14px' }}></i>
                                        <span>{item.text}</span>
                                    </div>
                                ))}
                        </nav>
                    </div>

                    <div style={{ alignItems: 'center', display: 'flex', gap: '16px' }}>
                        <select
                            value={regionCode || ''}
                            onChange={handleRegionChange}
                            style={{
                                appearance: 'none',
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 12px center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '16px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                padding: '10px 36px 10px 16px',
                                transition: 'all 0.2s ease'
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
                                window.dispatchEvent(new CustomEvent('notifications-refresh'))
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

                <main style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>{children}</main>

                {showNotifications && (
                    <NotificationsModal
                        isOpen={showNotifications}
                        onClose={() => {
                            setShowNotifications(false)
                            window.dispatchEvent(new CustomEvent('notifications-refresh'))
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
            </div>
        </>
    )
}

function MobileSection({ title, children }) {
    return (
        <div style={{ marginBottom: '16px' }}>
            <div
                style={{
                    color: '#94a3b8',
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

function MobileMenuItem({ item, isActive, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                alignItems: 'center',
                backgroundColor: isActive ? '#f0f7ff' : 'transparent',
                borderRadius: '10px',
                color: isActive ? '#1e3a5f' : '#374151',
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
                style={{ color: isActive ? '#1e3a5f' : '#64748b', fontSize: '16px', width: '20px' }}
            ></i>
            <span style={{ fontSize: '15px' }}>{item.text}</span>
        </div>
    )
}
