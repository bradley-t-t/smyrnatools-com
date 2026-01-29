import React, { useEffect, useRef, useState } from 'react'
import SrmLogo from '../../assets/images/srm-logo.svg'
import { usePreferences } from '../../app/context/PreferencesContext'
import { UserService } from '../../services/UserService'
import NotificationsModal from './NotificationsModal'
import OnlineUsersModal from './OnlineUsersModal'
import { useNotifications } from '../../app/hooks/useNotifications'
import { UserPresenceService } from '../../services/UserPresenceService'

const OFFICE_VISIBLE_ITEMS = ['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions']
const AGGREGATE_HIDDEN_ITEMS = ['Mixers', 'Plants', 'Regions', 'Leaderboards', 'Calculators', 'Maintenance']
const DEFAULT_HIDDEN_ITEMS = ['Plants', 'Regions']
const OFFICE_ONLY_ITEMS = ['Roles']

const ICONS = {
    Dashboard: 'fa-tachometer-alt',
    Mixers: 'fa-truck',
    Tractors: 'fa-tractor',
    Trailers: 'fa-trailer',
    'Pickup Trucks': 'fa-truck-pickup',
    'Heavy Equipment': 'fa-snowplow',
    Operators: 'fa-users',
    Managers: 'fa-user-tie',
    People: 'fa-users',
    Plants: 'fa-industry',
    Regions: 'fa-map-marker-alt',
    List: 'fa-list',
    Leaderboards: 'fa-trophy',
    Archive: 'fa-archive',
    MyAccount: 'fa-user',
    Logout: 'fa-sign-out-alt',
    Reports: 'fa-file-alt',
    Roles: 'fa-lock',
    Calculators: 'fa-calculator',
    Maintenance: 'fa-wrench',
    Assets: 'fa-truck',
    Productivity: 'fa-chart-line'
}

const menuItems = [
    { text: 'Dashboard', id: 'Dashboard', permission: 'dashboard.view' },
    { text: 'Mixers', id: 'Mixers', permission: 'mixers.view' },
    { text: 'Tractors', id: 'Tractors', permission: 'tractors.view' },
    { text: 'Trailers', id: 'Trailers', permission: 'trailers.view' },
    { text: 'Heavy Equipment', id: 'Heavy Equipment', permission: 'equipment.view' },
    { text: 'Pickup Trucks', id: 'Pickup Trucks', permission: 'pickup_trucks.view' },
    { text: 'Operators', id: 'Operators', permission: 'operators.view' },
    { text: 'Managers', id: 'Managers', permission: 'managers.view' },
    { text: 'List', id: 'List', permission: 'list.view' },
    { text: 'Reports', id: 'Reports', permission: 'reports.view' },
    { text: 'Plants', id: 'Plants', permission: 'plants.view' },
    { text: 'Regions', id: 'Regions', permission: 'regions.view' },
    { text: 'Roles', id: 'Roles', permission: 'roles.view' },
    { text: 'Calculators', id: 'Calculators', permission: 'calculator.view' },
    { text: 'Leaderboards', id: 'Leaderboards', permission: 'leaderboards.view' }
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
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: 'white',
        fontWeight: isActive ? 600 : 500,
        fontSize: '14px',
        whiteSpace: 'nowrap',
        border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
    })

    const dropdownStyle = {
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '8px',
        backgroundColor: 'white',
        borderRadius: '14px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
        border: '1px solid #e5e7eb',
        padding: '10px',
        minWidth: '220px',
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
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        backgroundColor: isItemActive ? '#f0f7ff' : 'transparent',
                                        color: isItemActive ? '#1e3a5f' : '#374151',
                                        fontWeight: isItemActive ? 600 : 400
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
                                        style={{ fontSize: '14px', width: '18px', color: '#64748b' }}
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

    const renderIconButton = (icon, title, onClick, isActive = false, badge = null, badgeColor = '#ef4444') => (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                transition: 'all 0.2s ease',
                border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)'
            }}
            onClick={onClick}
            title={title}
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
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        minWidth: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        backgroundColor: badgeColor,
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 6px',
                        border: '2px solid #1e3a5f',
                        boxShadow: `0 2px 8px ${badgeColor}66`
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: '#1e3a5f',
                            backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                        `,
                            backgroundSize: '20px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 100,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                        }}
                    >
                        <img src={SrmLogo} alt="Logo" style={{ height: '34px' }} draggable={false} />
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: mobileMenuOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`}></i>
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                zIndex: 200
                            }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: '280px',
                                    height: '100%',
                                    backgroundColor: 'white',
                                    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
                                    overflowY: 'auto',
                                    padding: '20px'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ marginBottom: '20px' }}>
                                    <select
                                        value={regionCode || ''}
                                        onChange={handleRegionChange}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid #e5e7eb',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            backgroundColor: '#f8fafc'
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

                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
                </div>
            </>
        )
    }

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 24px',
                        height: '68px',
                        backgroundColor: '#1e3a5f',
                        backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                    `,
                        backgroundSize: '20px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                paddingRight: '24px',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <img src={SrmLogo} alt="Smyrna Ready Mix" style={{ height: '40px' }} draggable={false} />
                        </div>

                        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <select
                            value={regionCode || ''}
                            onChange={handleRegionChange}
                            style={{
                                padding: '10px 36px 10px 16px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                fontSize: '14px',
                                fontWeight: 600,
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                color: 'white',
                                cursor: 'pointer',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                                backgroundSize: '16px',
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
                            selectedView === 'MyAccount'
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

                <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</main>

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
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '8px 12px',
                    marginBottom: '4px'
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
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                cursor: 'pointer',
                backgroundColor: isActive ? '#f0f7ff' : 'transparent',
                color: isActive ? '#1e3a5f' : '#374151',
                fontWeight: isActive ? 600 : 400,
                marginBottom: '4px',
                transition: 'all 0.15s'
            }}
        >
            <i
                className={`fas ${ICONS[item.id] || 'fa-circle'}`}
                style={{ fontSize: '16px', width: '20px', color: isActive ? '#1e3a5f' : '#64748b' }}
            ></i>
            <span style={{ fontSize: '15px' }}>{item.text}</span>
        </div>
    )
}
