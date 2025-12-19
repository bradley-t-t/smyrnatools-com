import React, {useEffect, useRef, useState} from 'react'
import './styles/Navigation.css'
import SrmLogo from '../../assets/images/srm-logo.svg'
import {usePreferences} from '../../app/context/PreferencesContext'
import {UserService} from "../../services/UserService"
import NotificationsModal from './NotificationsModal'
import NotificationsService from '../../services/NotificationsService'
import VideoBackground from './VideoBackground'

const ANIMATION_TIMING = {
    ITEM_ENTER_DELAY: 750,
    ITEM_EXIT_DELAY: 300,
    BASE_EXIT_DURATION: 750
}

const OFFICE_VISIBLE_ITEMS = ['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions']
const AGGREGATE_HIDDEN_ITEMS = ['Mixers', 'Plants', 'Regions', 'Leaderboards']
const DEFAULT_HIDDEN_ITEMS = ['Plants', 'Regions']
const OFFICE_ONLY_ITEMS = ['Roles']

const getIconForMenuItem = (id) => {
    switch (id) {
        case 'Dashboard':
            return <i className="fas fa-tachometer-alt"></i>
        case 'Mixers':
            return <i className="fas fa-truck"></i>
        case 'Tractors':
            return <i className="fas fa-tractor"></i>
        case 'Trailers':
            return <i className="fas fa-trailer"></i>
        case 'Pickup Trucks':
            return <i className="fas fa-truck-pickup"></i>
        case 'Heavy Equipment':
            return <i className="fas fa-snowplow"></i>
        case 'Operators':
            return <i className="fas fa-users"></i>
        case 'Managers':
            return <i className="fas fa-user-tie"></i>
        case 'Plants':
            return <i className="fas fa-industry"></i>
        case 'Regions':
            return <i className="fas fa-map-marker-alt"></i>
        case 'List':
            return <i className="fas fa-list"></i>
        case 'Leaderboards':
            return <i className="fas fa-trophy"></i>
        case 'Archive':
            return <i className="fas fa-archive"></i>
        case 'Settings':
            return <i className="fas fa-cog"></i>
        case 'MyAccount':
            return <i className="fas fa-user"></i>
        case 'Logout':
            return <i className="fas fa-sign-out-alt"></i>
        case 'Reports':
            return <i className="fas fa-file-alt"></i>
        case 'Roles':
            return <i className="fas fa-lock"></i>
        default:
            return <i className="fas fa-clipboard-list"></i>
    }
}

const menuItems = [
    {text: 'Dashboard', id: 'Dashboard', permission: 'dashboard.view', alwaysVisible: false},
    {text: 'Mixers', id: 'Mixers', permission: 'mixers.view', alwaysVisible: false},
    {text: 'Tractors', id: 'Tractors', permission: 'tractors.view', alwaysVisible: false},
    {text: 'Trailers', id: 'Trailers', permission: 'trailers.view', alwaysVisible: false},
    {text: 'Heavy Equipment', id: 'Heavy Equipment', permission: 'equipment.view', alwaysVisible: false},
    {text: 'Pickup Trucks', id: 'Pickup Trucks', permission: 'pickup_trucks.view', alwaysVisible: false},
    {text: 'Operators', id: 'Operators', permission: 'operators.view', alwaysVisible: false},
    {text: 'Managers', id: 'Managers', permission: 'managers.view', alwaysVisible: false},
    {text: 'List', id: 'List', permission: 'list.view', alwaysVisible: false},
    {text: 'Leaderboards', id: 'Leaderboards', permission: 'leaderboards.view', alwaysVisible: false},
    {text: 'Reports', id: 'Reports', permission: 'reports.view', alwaysVisible: false},
    {text: 'Plants', id: 'Plants', permission: 'plants.view', alwaysVisible: false},
    {text: 'Regions', id: 'Regions', permission: 'regions.view', alwaysVisible: false},
    {text: 'Roles', id: 'Roles', permission: 'roles.view', alwaysVisible: false}
]

export default function Navigation({
                                       selectedView,
                                       onSelectView,
                                       children,
                                       userName = '',
                                       userId = null,
                                       listStatusFilter = ''
                                   }) {
    const {preferences, updatePreferences} = usePreferences()
    const [visibleMenuItems, setVisibleMenuItems] = useState([])
    const [exitingItems, setExitingItems] = useState([])
    const [enteringItemIds, setEnteringItemIds] = useState(new Set())
    const [isMenuReady, setIsMenuReady] = useState(false)
    const [showAssetsDropdown, setShowAssetsDropdown] = useState(false)
    const [permittedRegions, setPermittedRegions] = useState([])
    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code
    const lastMenuItemsRef = useRef([])
    const exitAnimationTimeoutRef = useRef(null)
    const enterAnimationTimeoutRef = useRef(null)
    const enterTimeoutsRef = useRef([])
    const exitTimeoutsRef = useRef([])
    const assetsDropdownRef = useRef(null)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notificationsCount, setNotificationsCount] = useState(0)
    const [notificationsAnchor, setNotificationsAnchor] = useState(null)
    const notifRetryTimeoutsRef = useRef([])
    const notifSeqRef = useRef(0)

    useEffect(() => {
        let intervalId = null
        const clearRetryTimers = () => {
            notifRetryTimeoutsRef.current.forEach(t => clearTimeout(t))
            notifRetryTimeoutsRef.current = []
        }
        const refresh = async () => {
            const seq = ++notifSeqRef.current
            try {
                if (!userId) {
                    if (notifSeqRef.current === seq) setNotificationsCount(0)
                    return
                }
                const list = await NotificationsService.getNotifications(userId, preferences?.selectedRegion)
                if (notifSeqRef.current === seq) setNotificationsCount(Array.isArray(list) ? list.length : 0)
            } catch {
                if (notifSeqRef.current === seq) setNotificationsCount(0)
            }
        }
        refresh()
        intervalId = window.setInterval(refresh, 60000)
        const handler = () => {
            clearRetryTimers()
            refresh()
            ;[250, 1000, 2000].forEach(delay => {
                const t = setTimeout(() => {
                    refresh()
                }, delay)
                notifRetryTimeoutsRef.current.push(t)
            })
        }
        window.addEventListener('notifications-refresh', handler)
        window.addEventListener('region-changed', handler)
        return () => {
            if (intervalId) window.clearInterval(intervalId)
            window.removeEventListener('notifications-refresh', handler)
            window.removeEventListener('region-changed', handler)
            clearRetryTimers()
        }
    }, [userId, preferences?.selectedRegion?.code])

    useEffect(() => {
        const handleStatusFilterChange = (event) => {
            const {statusFilter} = event.detail
            if (statusFilter === 'completed' || listStatusFilter === 'completed') {
                setVisibleMenuItems(prev => [...prev])
            }
        }
        window.addEventListener('list-status-filter-change', handleStatusFilterChange)
        return () => {
            window.removeEventListener('list-status-filter-change', handleStatusFilterChange)
        }
    }, [listStatusFilter])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (assetsDropdownRef.current && !assetsDropdownRef.current.contains(event.target)) {
                setShowAssetsDropdown(false)
            }
        }
        if (showAssetsDropdown) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside)
            }, 0)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showAssetsDropdown])

    useEffect(() => {
        async function fetchPermittedRegions() {
            if (!userId) {
                setPermittedRegions([])
                return
            }
            try {
                const regionsList = await UserService.getPermittedRegions(userId).catch(() => [])
                setPermittedRegions(regionsList)

                if (!regionCode && regionsList.length) {
                    const first = regionsList[0]
                    updatePreferences('selectedRegion', {
                        code: first.regionCode || first.region_code,
                        name: first.regionName || first.region_name || '',
                        type: first.type || first.region_type || ''
                    })
                }
            } catch (error) {
                setPermittedRegions([])
            }
        }

        fetchPermittedRegions()
    }, [userId, regionCode, updatePreferences])

    useEffect(() => {
        async function filterMenuItems() {
            if (!userId) {
                setVisibleMenuItems([])
                return
            }

            try {
                const permissions = await UserService.getUserPermissions(userId)
                let filtered = menuItems.filter(item =>
                    item.permission && permissions.includes(item.permission)
                )

                if (regionType === 'Office') {
                    filtered = filtered.filter(item => OFFICE_VISIBLE_ITEMS.includes(item.id) || OFFICE_ONLY_ITEMS.includes(item.id))
                } else if (regionType === 'Aggregate') {
                    filtered = filtered.filter(item => !AGGREGATE_HIDDEN_ITEMS.includes(item.id) && !OFFICE_ONLY_ITEMS.includes(item.id))
                } else {
                    filtered = filtered.filter(item => !DEFAULT_HIDDEN_ITEMS.includes(item.id) && !OFFICE_ONLY_ITEMS.includes(item.id))
                }

                const assetItems = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
                const itemsForAnimation = filtered.filter(item => !assetItems.includes(item.id))
                const assetItemsToAdd = filtered.filter(item => assetItems.includes(item.id))

                const isInitialLoad = lastMenuItemsRef.current.length === 0 && filtered.length > 0

                if (isInitialLoad) {
                    setVisibleMenuItems(assetItemsToAdd)
                    setIsMenuReady(true)

                    itemsForAnimation.forEach((item, index) => {
                        const timeout = setTimeout(() => {
                            setVisibleMenuItems(prev => [...prev, item])
                            setEnteringItemIds(prev => new Set([...prev, item.id]))

                            setTimeout(() => {
                                setEnteringItemIds(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(item.id)
                                    return newSet
                                })
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                        }, index * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                        enterTimeoutsRef.current.push(timeout)
                    })

                    lastMenuItemsRef.current = filtered
                    return
                }

                const currentIds = new Set(lastMenuItemsRef.current.map(item => item.id))
                const newIds = new Set(filtered.map(item => item.id))
                const itemsToRemove = lastMenuItemsRef.current.filter(item => !newIds.has(item.id) && !assetItems.includes(item.id))
                const itemsToAdd = filtered.filter(item => !currentIds.has(item.id) && !assetItems.includes(item.id))
                const newAssetItems = filtered.filter(item => assetItems.includes(item.id) && !currentIds.has(item.id))
                const assetItemsToRemove = lastMenuItemsRef.current.filter(item => !newIds.has(item.id) && assetItems.includes(item.id))

                if (assetItemsToRemove.length > 0) {
                    const assetIdsToRemove = new Set(assetItemsToRemove.map(a => a.id))
                    setVisibleMenuItems(prev => prev.filter(item => !assetIdsToRemove.has(item.id)))
                }

                if (newAssetItems.length > 0) {
                    setVisibleMenuItems(prev => [...prev, ...newAssetItems])
                }

                if (itemsToRemove.length === 0 && itemsToAdd.length === 0) {
                    lastMenuItemsRef.current = filtered
                    return
                }

                enterTimeoutsRef.current.forEach(t => clearTimeout(t))
                enterTimeoutsRef.current = []
                if (exitAnimationTimeoutRef.current) clearTimeout(exitAnimationTimeoutRef.current)
                if (enterAnimationTimeoutRef.current) clearTimeout(enterAnimationTimeoutRef.current)

                if (itemsToRemove.length > 0) {
                    exitTimeoutsRef.current.forEach(t => clearTimeout(t))
                    exitTimeoutsRef.current = []

                    itemsToRemove.forEach((item, index) => {
                        const startDelay = index * ANIMATION_TIMING.ITEM_ENTER_DELAY
                        const addExitTimeout = setTimeout(() => {
                            setExitingItems(prev => [...prev, item])
                            const removeTimeout = setTimeout(() => {
                                setVisibleMenuItems(prev => prev.filter(x => x.id !== item.id))
                                setExitingItems(prev => prev.filter(x => x.id !== item.id))

                                if (index === itemsToRemove.length - 1 && itemsToAdd.length > 0) {
                                    itemsToAdd.forEach((toAdd, addIdx) => {
                                        const timeout = setTimeout(() => {
                                            setVisibleMenuItems(prev => [...prev, toAdd])
                                            setEnteringItemIds(prev => new Set([...prev, toAdd.id]))
                                            setTimeout(() => {
                                                setEnteringItemIds(prev => {
                                                    const newSet = new Set(prev)
                                                    newSet.delete(toAdd.id)
                                                    return newSet
                                                })
                                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                                        }, addIdx * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                                        enterTimeoutsRef.current.push(timeout)
                                    })
                                }
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                            exitTimeoutsRef.current.push(removeTimeout)
                        }, startDelay)
                        exitTimeoutsRef.current.push(addExitTimeout)
                    })
                } else if (itemsToAdd.length > 0) {
                    itemsToAdd.forEach((item, index) => {
                        const timeout = setTimeout(() => {
                            setVisibleMenuItems(prev => [...prev, item])
                            setEnteringItemIds(prev => new Set([...prev, item.id]))

                            setTimeout(() => {
                                setEnteringItemIds(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(item.id)
                                    return newSet
                                })
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                        }, index * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                        enterTimeoutsRef.current.push(timeout)
                    })
                }

                lastMenuItemsRef.current = filtered
            } catch (error) {
                setVisibleMenuItems([])
                lastMenuItemsRef.current = []
            }
        }

        filterMenuItems()
    }, [userId, regionType, regionCode])

    useEffect(() => {
        return () => {
            if (exitAnimationTimeoutRef.current) {
                clearTimeout(exitAnimationTimeoutRef.current)
            }
            if (enterAnimationTimeoutRef.current) {
                clearTimeout(enterAnimationTimeoutRef.current)
            }
            enterTimeoutsRef.current.forEach(t => clearTimeout(t))
            exitTimeoutsRef.current.forEach(t => clearTimeout(t))
        }
    }, [])

    const handleMenuItemClick = (itemId) => {
        if (window.appSwitchView && (itemId === 'List' || itemId === 'Archive')) {
            window.appSwitchView(itemId)
        } else {
            onSelectView(itemId)
        }
    }

    const handleRegionChange = (e) => {
        const code = e.target.value
        if (!code) return
        const r = permittedRegions.find(x => (x.regionCode || x.region_code) === code)
        if (r) {
            const newRegion = {
                code: r.regionCode || r.region_code,
                name: r.regionName || r.region_name || '',
                type: r.type || r.region_type || ''
            }
            updatePreferences('selectedRegion', newRegion)

            window.dispatchEvent(new CustomEvent('region-changed', {
                detail: newRegion
            }))
        }
    }

    return (
        <>
            <VideoBackground/>
            <div className="app-container">
                <div className="horizontal-navbar">
                <div className="navbar-left">
                    <div className="logo-container">
                        <img
                            src={SrmLogo}
                            alt="Smyrna Logo"
                            className="navbar-logo"
                            title="Smyrna Ready Mix"
                            draggable={false}
                            decoding="async"
                            loading="eager"
                        />
                    </div>
                </div>
                <nav className="navbar-menu">
                    <ul>
                        {isMenuReady && (() => {
                            const exitingIds = new Set(exitingItems.map(item => item.id))
                            const visibleIds = new Set(visibleMenuItems.map(item => item.id))
                            const exitingMap = new Map(exitingItems.map(item => [item.id, item]))

                            const assetItems = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
                            const hasAssets = visibleMenuItems.some(item => assetItems.includes(item.id))
                            const isAssetsActive = assetItems.includes(selectedView)

                            const dashboardItem = menuItems.find(item => item.id === 'Dashboard' && (visibleIds.has(item.id) || exitingIds.has(item.id)))
                            const dashboardData = dashboardItem && exitingIds.has(dashboardItem.id) ? exitingMap.get(dashboardItem.id) : dashboardItem

                            const otherItems = menuItems.filter(item =>
                                (visibleIds.has(item.id) || exitingIds.has(item.id)) &&
                                item.id !== 'Dashboard' &&
                                !assetItems.includes(item.id)
                            ).map(item =>
                                exitingIds.has(item.id) ? exitingMap.get(item.id) : item
                            )

                            const result = []

                            if (dashboardData) {
                                const isExiting = exitingIds.has(dashboardData.id)
                                const isEntering = enteringItemIds.has(dashboardData.id)
                                const isActive = selectedView === dashboardData.id

                                result.push(
                                    <li
                                        key={dashboardData.id}
                                        className={`menu-item ${isActive ? 'active' : ''} ${isExiting ? 'animating-out' : ''} ${isEntering ? 'animating-in' : ''}`}
                                        onClick={() => {
                                            if (isExiting) return
                                            handleMenuItemClick(dashboardData.id)
                                        }}
                                        title={dashboardData.text}
                                    >
                                        <span className="menu-icon">
                                            {getIconForMenuItem(dashboardData.id)}
                                        </span>
                                        <span className="menu-text">
                                            {dashboardData.text}
                                        </span>
                                    </li>
                                )
                            }

                            if (hasAssets) {
                                result.push(
                                    <li
                                        key="assets-dropdown"
                                        className={`menu-item assets-dropdown-toggle ${isAssetsActive ? 'active' : ''}`}
                                        ref={assetsDropdownRef}
                                        onClick={(e) => {
                                            setShowAssetsDropdown(prev => !prev)
                                        }}
                                        title="Assets"
                                        style={{position: 'relative', overflow: 'visible'}}
                                    >
                                        <span className="menu-icon">
                                            <i className="fas fa-truck"></i>
                                        </span>
                                        <span className="menu-text">
                                            Assets
                                        </span>
                                        <span className="menu-icon" style={{fontSize: '12px', marginLeft: '4px'}}>
                                            <i className={`fas fa-chevron-${showAssetsDropdown ? 'up' : 'down'}`}></i>
                                        </span>
                                        {showAssetsDropdown && (
                                            <div className="assets-dropdown" onClick={(e) => e.stopPropagation()}>
                                                {assetItems.map(assetId => {
                                                    const item = visibleMenuItems.find(i => i.id === assetId)
                                                    if (!item) return null
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`dropdown-item ${selectedView === item.id ? 'active' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleMenuItemClick(item.id)
                                                                setShowAssetsDropdown(false)
                                                            }}
                                                        >
                                                            <span className="menu-icon">
                                                                {getIconForMenuItem(item.id)}
                                                            </span>
                                                            <span className="menu-text">
                                                                {item.text}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </li>
                                )
                            }

                            result.push(...otherItems.map((item) => {
                                const isExiting = exitingIds.has(item.id)
                                const isEntering = enteringItemIds.has(item.id)
                                const isActive = selectedView === item.id

                                return (
                                    <li
                                        key={item.id}
                                        className={`menu-item ${isActive ? 'active' : ''} ${isExiting ? 'animating-out' : ''} ${isEntering ? 'animating-in' : ''}`}
                                        onClick={() => {
                                            if (isExiting) return
                                            handleMenuItemClick(item.id)
                                        }}
                                        title={item.text}
                                    >
                                        <span className="menu-icon">
                                            {getIconForMenuItem(item.id)}
                                        </span>
                                        <span className="menu-text">
                                            {item.text}
                                        </span>
                                    </li>
                                )
                            }))

                            return result
                        })()}
                    </ul>
                </nav>
                <div className="navbar-right">
                    <select
                        className="region-selector"
                        value={regionCode || ''}
                        onChange={handleRegionChange}
                        aria-label="Region"
                    >
                        {permittedRegions.length === 0 ? (
                            <option value="">Loading regions...</option>
                        ) : (
                            permittedRegions.map(r => (
                                <option key={r.regionCode || r.region_code} value={r.regionCode || r.region_code}>
                                    {r.regionName || r.region_name}
                                </option>
                            ))
                        )}
                    </select>
                    <div
                        className={`menu-item settings-item ${selectedView === 'Settings' ? 'active' : ''}`}
                        onClick={() => handleMenuItemClick('Settings')}
                        title="Settings"
                    >
                        <span className="menu-icon">
                            {getIconForMenuItem('Settings')}
                        </span>
                    </div>
                    <div
                        className={`menu-item account-item ${selectedView === 'MyAccount' ? 'active' : ''}`}
                        onClick={() => handleMenuItemClick('MyAccount')}
                        title={userName ? `My Account - ${userName}` : 'My Account'}
                    >
                        <span className="menu-icon">
                            {getIconForMenuItem('MyAccount')}
                        </span>
                    </div>
                    <div
                        className={`menu-item notifications-item ${notificationsCount > 0 ? 'has-notifications' : ''}`}
                        title="Notifications"
                        aria-label="Notifications"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setNotificationsAnchor(rect)
                            if (typeof window !== 'undefined') {
                                try {
                                    window.dispatchEvent(new CustomEvent('notifications-refresh'))
                                } catch {
                                }
                            }
                            setShowNotifications(true)
                        }}
                    >
                        <span className="menu-icon">
                            <i className="fas fa-bell"></i>
                        </span>
                        {notificationsCount > 0 && (
                            <span className="notification-badge">{notificationsCount}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="content-area">{children}</div>
            {showNotifications && (
                <NotificationsModal isOpen={showNotifications} onClose={() => {
                    setShowNotifications(false)
                    if (typeof window !== 'undefined') {
                        try {
                            window.dispatchEvent(new CustomEvent('notifications-refresh'))
                        } catch {
                        }
                    }
                }} anchorRect={notificationsAnchor}/>
            )}
            </div>
        </>
    )
}