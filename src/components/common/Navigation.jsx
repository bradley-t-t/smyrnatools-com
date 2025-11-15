import React, {useEffect, useRef, useState} from 'react'
import './styles/Navigation.css'
import SmyrnaLogo from '../../assets/images/SmyrnaLogo.png'
import FlagSmyrnaLogo from '../../assets/images/FlagSmyrnaLogo.png'
import {usePreferences} from '../../app/context/PreferencesContext'
import {UserService} from "../../services/UserService"

const ANIMATION_TIMING = {
    ITEM_ENTER_DELAY: 375,
    ITEM_EXIT_DELAY: 150,
    BASE_EXIT_DURATION: 375
}

const OFFICE_VISIBLE_ITEMS = ['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions']
const AGGREGATE_HIDDEN_ITEMS = ['Mixers', 'Plants', 'Regions']
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
    const {preferences, toggleNavbarMinimized} = usePreferences()
    const [collapsed, setCollapsed] = useState(preferences.navbarMinimized)
    const [visibleMenuItems, setVisibleMenuItems] = useState([])
    const [exitingItems, setExitingItems] = useState([])
    const [enteringItemIds, setEnteringItemIds] = useState(new Set())
    const [isMenuReady, setIsMenuReady] = useState(false)
    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code
    const lastMenuItemsRef = useRef([])
    const exitAnimationTimeoutRef = useRef(null)
    const enterAnimationTimeoutRef = useRef(null)
    const enterTimeoutsRef = useRef([])

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

                const isInitialLoad = lastMenuItemsRef.current.length === 0 && filtered.length > 0
                
                if (isInitialLoad) {
                    setVisibleMenuItems([])
                    setIsMenuReady(true)
                    
                    filtered.forEach((item, index) => {
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
                const itemsToRemove = lastMenuItemsRef.current.filter(item => !newIds.has(item.id))
                const itemsToAdd = filtered.filter(item => !currentIds.has(item.id))

                if (itemsToRemove.length === 0 && itemsToAdd.length === 0) {
                    lastMenuItemsRef.current = filtered
                    return
                }

                enterTimeoutsRef.current.forEach(t => clearTimeout(t))
                enterTimeoutsRef.current = []
                if (exitAnimationTimeoutRef.current) clearTimeout(exitAnimationTimeoutRef.current)
                if (enterAnimationTimeoutRef.current) clearTimeout(enterAnimationTimeoutRef.current)

                if (itemsToRemove.length > 0) {
                    setExitingItems(itemsToRemove)
                    
                    const exitDuration = ANIMATION_TIMING.BASE_EXIT_DURATION + (itemsToRemove.length - 1) * ANIMATION_TIMING.ITEM_EXIT_DELAY
                    exitAnimationTimeoutRef.current = setTimeout(() => {
                        setExitingItems([])
                        setVisibleMenuItems(prev => prev.filter(item => newIds.has(item.id)))
                        
                        if (itemsToAdd.length > 0) {
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
                    }, exitDuration)
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
        if (visibleMenuItems.length > 0 && !visibleMenuItems.some(item => item.id === selectedView) && selectedView !== 'Settings' && selectedView !== 'MyAccount') {
            const dashboardItem = visibleMenuItems.find(item => item.id === 'Dashboard')
            if (dashboardItem) {
                onSelectView('Dashboard')
            } else {
                onSelectView(visibleMenuItems[0].id)
            }
        }
    }, [visibleMenuItems, selectedView, onSelectView])

    useEffect(() => {
        setCollapsed(preferences.navbarMinimized)
    }, [preferences.navbarMinimized])

    useEffect(() => {
        return () => {
            if (exitAnimationTimeoutRef.current) {
                clearTimeout(exitAnimationTimeoutRef.current)
            }
            if (enterAnimationTimeoutRef.current) {
                clearTimeout(enterAnimationTimeoutRef.current)
            }
            enterTimeoutsRef.current.forEach(t => clearTimeout(t))
        }
    }, [])

    const toggleCollapse = () => {
        setCollapsed(!collapsed)
        toggleNavbarMinimized()
    }

    const handleMenuItemClick = (itemId) => {
        if (window.appSwitchView && (itemId === 'List' || itemId === 'Archive')) {
            window.appSwitchView(itemId)
        } else {
            onSelectView(itemId)
        }
    }

    const getMenuItemStyles = () => {
        if (collapsed) return {}
        return {
            padding: '13px 18px',
            minHeight: 0,
            lineHeight: 1.35,
            fontSize: 17
        }
    }

    const getMenuIconStyles = () => {
        if (collapsed) return {}
        return {
            marginRight: 14,
            fontSize: 20,
            minWidth: 24
        }
    }

    const getMenuTextStyles = () => ({
        fontSize: 17,
        padding: 0,
        margin: 0
    })

    return (
        <div className="app-container">
            <div className={`vertical-navbar ${collapsed ? 'collapsed' : ''}`}>
                <div className="navbar-header">
                    <div className="logo-container">
                        {collapsed ? (
                            <img
                                src={FlagSmyrnaLogo}
                                alt="Smyrna Logo"
                                className="navbar-logo"
                                title="Smyrna Ready Mix"
                                width={40}
                                height={40}
                                style={{imageRendering: 'auto'}}
                                draggable={false}
                                decoding="async"
                                loading="eager"
                            />
                        ) : (
                            <img
                                src={SmyrnaLogo}
                                alt="Smyrna Logo"
                                className="navbar-logo large"
                                title="Smyrna Ready Mix"
                                width={260}
                                height={90}
                                style={{imageRendering: 'auto', maxWidth: 260, maxHeight: 90, margin: 0, padding: 0}}
                                draggable={false}
                                decoding="async"
                                loading="eager"
                            />
                        )}
                    </div>
                </div>
                <button className="collapse-btn" onClick={toggleCollapse}>
                    <i className="fas fa-chevron-right collapse-icon"></i>
                </button>
                <nav className="navbar-menu">
                    <ul style={!collapsed ? {padding: 0, margin: 0, gap: 0, rowGap: 0} : {}}>
                        {isMenuReady && (() => {
                            const exitingIds = new Set(exitingItems.map(item => item.id))
                            const visibleIds = new Set(visibleMenuItems.map(item => item.id))
                            const exitingMap = new Map(exitingItems.map(item => [item.id, item]))

                            const allItemsInOrder = menuItems.filter(item =>
                                visibleIds.has(item.id) || exitingIds.has(item.id)
                            ).map(item =>
                                exitingIds.has(item.id) ? exitingMap.get(item.id) : item
                            )

                            return allItemsInOrder.map((item) => {
                                const isExiting = exitingIds.has(item.id)
                                const isEntering = enteringItemIds.has(item.id)
                                const isActive = item.id === 'List' ? selectedView === 'List' : selectedView === item.id

                                const exitingItemsList = allItemsInOrder.filter(i => exitingIds.has(i.id))

                                let animationDelay = 0
                                if (isExiting) {
                                    const exitIndex = exitingItemsList.findIndex(i => i.id === item.id)
                                    animationDelay = exitIndex * 0.15
                                }

                                return (
                                    <li
                                        key={item.id}
                                        className={`menu-item ${isActive ? 'active' : ''} ${collapsed ? 'menu-item-collapsed' : ''} ${isExiting ? 'animating-out' : ''} ${isEntering ? 'animating-in' : ''}`}
                                        onClick={() => {
                                            if (isExiting) return
                                            handleMenuItemClick(item.id)
                                        }}
                                        style={{
                                            ...getMenuItemStyles(),
                                            animationDelay: isExiting ? `${animationDelay}s` : undefined
                                        }}
                                    >
                                        <span 
                                            className={`menu-icon${collapsed ? ' menu-icon-collapsed' : ''}`}
                                            title={item.text}
                                            style={getMenuIconStyles()}
                                        >
                                            {getIconForMenuItem(item.id)}
                                        </span>
                                        {!collapsed && (
                                            <span className="menu-text" style={getMenuTextStyles()}>
                                                {item.text}
                                            </span>
                                        )}
                                    </li>
                                )
                            })
                        })()}
                        <li
                            className={`menu-item ${selectedView === 'Settings' ? 'active' : ''} ${collapsed ? 'menu-item-collapsed' : ''}`}
                            onClick={() => handleMenuItemClick('Settings')}
                            style={getMenuItemStyles()}
                        >
                            <span 
                                className={`menu-icon${collapsed ? ' menu-icon-collapsed' : ''}`} 
                                title="Settings"
                                style={getMenuIconStyles()}
                            >
                                {getIconForMenuItem('Settings')}
                            </span>
                            {!collapsed && (
                                <span className="menu-text" style={getMenuTextStyles()}>
                                    Settings
                                </span>
                            )}
                        </li>
                        <li
                            className={`menu-item ${selectedView === 'MyAccount' ? 'active' : ''} ${collapsed ? 'menu-item-collapsed' : ''}`}
                            onClick={() => handleMenuItemClick('MyAccount')}
                            style={getMenuItemStyles()}
                        >
                            <span 
                                className={`menu-icon${collapsed ? ' menu-icon-collapsed' : ''}`} 
                                title="My Account"
                                style={getMenuIconStyles()}
                            >
                                {getIconForMenuItem('MyAccount')}
                            </span>
                            {!collapsed && (
                                <div className="user-menu-content">
                                    <span className="menu-text" style={getMenuTextStyles()}>
                                        My Account
                                    </span>
                                    {userName && (
                                        <span className="user-name" style={{paddingLeft: 0}}>
                                            {userName}
                                        </span>
                                    )}
                                </div>
                            )}
                        </li>
                    </ul>
                </nav>
            </div>
            <div className={`content-area ${collapsed ? 'expanded' : ''}`}>{children}</div>
        </div>
    )
}