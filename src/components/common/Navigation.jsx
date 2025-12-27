import React, {useEffect, useRef, useState} from 'react'
import './styles/Navigation.css'
import SrmLogo from '../../assets/images/srm-logo.svg'
import {usePreferences} from '../../app/context/PreferencesContext'
import {UserService} from "../../services/UserService"
import VideoBackground from './VideoBackground'
import NotificationsModal from './NotificationsModal'
import {useNotifications} from '../../hooks/useNotifications'

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
        case 'People':
            return <i className="fas fa-users"></i>
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
        case 'Calculators':
            return <i className="fas fa-calculator"></i>
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
    {text: 'Roles', id: 'Roles', permission: 'roles.view', alwaysVisible: false},
    {text: 'Calculators', id: 'Calculators', permission: 'calculator.view', alwaysVisible: false},
    {text: 'Leaderboards', id: 'Leaderboards', permission: 'leaderboards.view', alwaysVisible: false}
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
    const [showPeopleDropdown, setShowPeopleDropdown] = useState(false)
    const [showProductivityDropdown, setShowProductivityDropdown] = useState(false)
    const [permittedRegions, setPermittedRegions] = useState([])
    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code
    const lastMenuItemsRef = useRef([])
    const exitAnimationTimeoutRef = useRef(null)
    const enterAnimationTimeoutRef = useRef(null)
    const enterTimeoutsRef = useRef([])
    const exitTimeoutsRef = useRef([])
    const assetsDropdownRef = useRef(null)
    const peopleDropdownRef = useRef(null)
    const productivityDropdownRef = useRef(null)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notificationsAnchor, setNotificationsAnchor] = useState(null)

    const {count: notificationsCount} = useNotifications(userId, preferences?.selectedRegion)

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
            if (peopleDropdownRef.current && !peopleDropdownRef.current.contains(event.target)) {
                setShowPeopleDropdown(false)
            }
            if (productivityDropdownRef.current && !productivityDropdownRef.current.contains(event.target)) {
                setShowProductivityDropdown(false)
            }
        }
        if (showAssetsDropdown || showPeopleDropdown || showProductivityDropdown) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside)
            }, 0)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showAssetsDropdown, showPeopleDropdown, showProductivityDropdown])

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

                const hasOperators = filtered.some(item => item.id === 'Operators')
                const hasManagers = filtered.some(item => item.id === 'Managers')
                const shouldCombinePeople = hasOperators && hasManagers

                const assetItems = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
                const peopleItems = ['Operators', 'Managers']
                const productivityItems = ['List', 'Reports']

                const shouldCombineProductivity = filtered.filter(item => productivityItems.includes(item.id)).length > 1

                const assetItemsToAdd = filtered.filter(item => assetItems.includes(item.id))
                const peopleItemsToAdd = shouldCombinePeople ? filtered.filter(item => peopleItems.includes(item.id)) : []
                const productivityItemsToAdd = shouldCombineProductivity ? filtered.filter(item => productivityItems.includes(item.id)) : []
                const dashboardItem = filtered.find(item => item.id === 'Dashboard')
                const standaloneOperatorsItem = !shouldCombinePeople && hasOperators ? filtered.find(item => item.id === 'Operators') : null
                const otherItemsForAnimation = filtered.filter(item =>
                    item.id !== 'Dashboard' &&
                    !assetItems.includes(item.id) &&
                    !(shouldCombinePeople && peopleItems.includes(item.id)) &&
                    !(shouldCombineProductivity && productivityItems.includes(item.id)) &&
                    !(item.id === 'Operators' && !shouldCombinePeople)
                )

                const isInitialLoad = lastMenuItemsRef.current.length === 0 && filtered.length > 0

                if (isInitialLoad) {
                    setVisibleMenuItems([])
                    setIsMenuReady(true)

                    let animationIndex = 0

                    if (dashboardItem) {
                        const timeout = setTimeout(() => {
                            setVisibleMenuItems(prev => [...prev, dashboardItem])
                            setEnteringItemIds(prev => new Set([...prev, dashboardItem.id]))
                            setTimeout(() => {
                                setEnteringItemIds(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(dashboardItem.id)
                                    return newSet
                                })
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                        }, animationIndex * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                        enterTimeoutsRef.current.push(timeout)
                        animationIndex++
                    }

                    if (assetItemsToAdd.length > 0) {
                        const timeout = setTimeout(() => {
                            setVisibleMenuItems(prev => [...prev, ...assetItemsToAdd])
                            setEnteringItemIds(prev => new Set([...prev, 'assets-dropdown']))
                            setTimeout(() => {
                                setEnteringItemIds(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete('assets-dropdown')
                                    return newSet
                                })
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                        }, animationIndex * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                        enterTimeoutsRef.current.push(timeout)
                        animationIndex++
                    }

                    if (peopleItemsToAdd.length > 0) {
                        const timeout = setTimeout(() => {
                            setVisibleMenuItems(prev => [...prev, ...peopleItemsToAdd])
                            setEnteringItemIds(prev => new Set([...prev, 'people-dropdown']))
                            setTimeout(() => {
                                setEnteringItemIds(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete('people-dropdown')
                                    return newSet
                                })
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                        }, animationIndex * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                        enterTimeoutsRef.current.push(timeout)
                        animationIndex++
                    }

                    if (standaloneOperatorsItem) {
                        const timeout = setTimeout(() => {
                            setVisibleMenuItems(prev => [...prev, standaloneOperatorsItem])
                            setEnteringItemIds(prev => new Set([...prev, 'Operators']))
                            setTimeout(() => {
                                setEnteringItemIds(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete('Operators')
                                    return newSet
                                })
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                        }, animationIndex * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                        enterTimeoutsRef.current.push(timeout)
                        animationIndex++
                    }

                    if (productivityItemsToAdd.length > 0) {
                        const timeout = setTimeout(() => {
                            setVisibleMenuItems(prev => [...prev, ...productivityItemsToAdd])
                            setEnteringItemIds(prev => new Set([...prev, 'productivity-dropdown']))
                            setTimeout(() => {
                                setEnteringItemIds(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete('productivity-dropdown')
                                    return newSet
                                })
                            }, ANIMATION_TIMING.BASE_EXIT_DURATION)
                        }, animationIndex * ANIMATION_TIMING.ITEM_ENTER_DELAY)
                        enterTimeoutsRef.current.push(timeout)
                        animationIndex++
                    }

                    otherItemsForAnimation.forEach((item, index) => {
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
                        }, (animationIndex + index) * ANIMATION_TIMING.ITEM_ENTER_DELAY)
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

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <>
            <VideoBackground/>
            <div className="app-container">
                {isMobile ? (
                    <>
                        <div className="mobile-navbar">
                            <div className="mobile-navbar-left">
                                <img
                                    src={SrmLogo}
                                    alt="Smyrna Logo"
                                    className="mobile-logo"
                                    draggable={false}
                                />
                            </div>
                            <div className="mobile-navbar-right">
                                <button
                                    className="mobile-menu-toggle"
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    aria-label="Toggle Menu"
                                >
                                    <i className={`fas fa-${isMobileMenuOpen ? 'times' : 'bars'}`}></i>
                                </button>
                            </div>
                        </div>

                        {isMobileMenuOpen && (
                            <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
                                <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
                                    <div className="mobile-menu-header">
                                        <select
                                            className="mobile-region-selector"
                                            value={regionCode || ''}
                                            onChange={handleRegionChange}
                                            aria-label="Region"
                                        >
                                            {permittedRegions.length === 0 ? (
                                                <option value="">Loading regions...</option>
                                            ) : (
                                                permittedRegions.map(r => (
                                                    <option key={r.regionCode || r.region_code}
                                                            value={r.regionCode || r.region_code}>
                                                        {r.regionName || r.region_name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <button
                                            className="mobile-menu-close"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            aria-label="Close Menu"
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                    <div className="mobile-menu-content">
                                        {visibleMenuItems.map((item) => {
                                            const assetItems = ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks']
                                            const peopleItems = ['Operators', 'Managers']
                                            const productivityItems = ['List', 'Reports']
                                            const mobileHiddenItems = ['Calculators', 'Leaderboards', 'Reports']

                                            if (assetItems.includes(item.id)) return null
                                            if (peopleItems.includes(item.id)) return null
                                            if (productivityItems.includes(item.id)) return null
                                            if (mobileHiddenItems.includes(item.id)) return null

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`mobile-menu-item ${selectedView === item.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        handleMenuItemClick(item.id)
                                                        setIsMobileMenuOpen(false)
                                                    }}
                                                >
                                                    <span className="mobile-menu-icon">
                                                        {getIconForMenuItem(item.id)}
                                                    </span>
                                                    <span className="mobile-menu-text">{item.text}</span>
                                                </div>
                                            )
                                        })}

                                        {visibleMenuItems.some(item => ['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks'].includes(item.id)) && (
                                            <>
                                                <div className="mobile-menu-divider">Assets</div>
                                                {['Mixers', 'Tractors', 'Trailers', 'Heavy Equipment', 'Pickup Trucks'].map(assetId => {
                                                    const item = visibleMenuItems.find(i => i.id === assetId)
                                                    if (!item) return null
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`mobile-menu-item ${selectedView === item.id ? 'active' : ''}`}
                                                            onClick={() => {
                                                                handleMenuItemClick(item.id)
                                                                setIsMobileMenuOpen(false)
                                                            }}
                                                        >
                                                            <span className="mobile-menu-icon">
                                                                {getIconForMenuItem(item.id)}
                                                            </span>
                                                            <span className="mobile-menu-text">{item.text}</span>
                                                        </div>
                                                    )
                                                })}
                                            </>
                                        )}

                                        {visibleMenuItems.some(item => ['Operators', 'Managers'].includes(item.id)) && (
                                            <>
                                                <div className="mobile-menu-divider">People</div>
                                                {['Operators', 'Managers'].map(personId => {
                                                    const item = visibleMenuItems.find(i => i.id === personId)
                                                    if (!item) return null
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`mobile-menu-item ${selectedView === item.id ? 'active' : ''}`}
                                                            onClick={() => {
                                                                handleMenuItemClick(item.id)
                                                                setIsMobileMenuOpen(false)
                                                            }}
                                                        >
                                                            <span className="mobile-menu-icon">
                                                                {getIconForMenuItem(item.id)}
                                                            </span>
                                                            <span className="mobile-menu-text">{item.text}</span>
                                                        </div>
                                                    )
                                                })}
                                            </>
                                        )}

                                        {visibleMenuItems.some(item => ['List'].includes(item.id)) && (
                                            <>
                                                <div className="mobile-menu-divider">Productivity</div>
                                                {['List'].map(prodId => {
                                                    const item = visibleMenuItems.find(i => i.id === prodId)
                                                    if (!item) return null
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`mobile-menu-item ${selectedView === item.id ? 'active' : ''}`}
                                                            onClick={() => {
                                                                handleMenuItemClick(item.id)
                                                                setIsMobileMenuOpen(false)
                                                            }}
                                                        >
                                                            <span className="mobile-menu-icon">
                                                                {getIconForMenuItem(item.id)}
                                                            </span>
                                                            <span className="mobile-menu-text">{item.text}</span>
                                                        </div>
                                                    )
                                                })}
                                            </>
                                        )}

                                        <div className="mobile-menu-divider">Account</div>
                                        <div
                                            className={`mobile-menu-item ${selectedView === 'Settings' ? 'active' : ''}`}
                                            onClick={() => {
                                                handleMenuItemClick('Settings')
                                                setIsMobileMenuOpen(false)
                                            }}
                                        >
                                            <span className="mobile-menu-icon">
                                                {getIconForMenuItem('Settings')}
                                            </span>
                                            <span className="mobile-menu-text">Settings</span>
                                        </div>
                                        <div
                                            className={`mobile-menu-item ${selectedView === 'MyAccount' ? 'active' : ''}`}
                                            onClick={() => {
                                                handleMenuItemClick('MyAccount')
                                                setIsMobileMenuOpen(false)
                                            }}
                                        >
                                            <span className="mobile-menu-icon">
                                                {getIconForMenuItem('MyAccount')}
                                            </span>
                                            <span className="mobile-menu-text">My Account</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
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

                                    const peopleItems = ['Operators', 'Managers']
                                    const hasOperators = visibleIds.has('Operators') || exitingIds.has('Operators')
                                    const hasManagers = visibleIds.has('Managers') || exitingIds.has('Managers')
                                    const shouldShowPeople = hasOperators && hasManagers
                                    const isPeopleActive = peopleItems.includes(selectedView)

                                    const productivityItems = ['List', 'Reports']
                                    const productivityCount = productivityItems.filter(id => visibleIds.has(id) || exitingIds.has(id)).length
                                    const shouldShowProductivity = productivityCount > 1
                                    const isProductivityActive = productivityItems.includes(selectedView)

                                    const dashboardItem = menuItems.find(item => item.id === 'Dashboard' && (visibleIds.has(item.id) || exitingIds.has(item.id)))
                                    const dashboardData = dashboardItem && exitingIds.has(dashboardItem.id) ? exitingMap.get(dashboardItem.id) : dashboardItem

                                    const standaloneOperators = !shouldShowPeople && (visibleIds.has('Operators') || exitingIds.has('Operators'))
                                        ? menuItems.find(item => item.id === 'Operators')
                                        : null

                                    const otherItems = menuItems.filter(item =>
                                        (visibleIds.has(item.id) || exitingIds.has(item.id)) &&
                                        item.id !== 'Dashboard' &&
                                        !assetItems.includes(item.id) &&
                                        !(shouldShowPeople && peopleItems.includes(item.id)) &&
                                        !(shouldShowProductivity && productivityItems.includes(item.id)) &&
                                        !(item.id === 'Operators' && !shouldShowPeople)
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
                                        const isAssetsEntering = enteringItemIds.has('assets-dropdown')
                                        result.push(
                                            <li
                                                key="assets-dropdown"
                                                className={`menu-item assets-dropdown-toggle ${isAssetsActive ? 'active' : ''} ${isAssetsEntering ? 'animating-in' : ''}`}
                                                ref={assetsDropdownRef}
                                                onClick={() => {
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

                                    if (shouldShowPeople) {
                                        const isPeopleEntering = enteringItemIds.has('people-dropdown')
                                        result.push(
                                            <li
                                                key="people-dropdown"
                                                className={`menu-item people-dropdown-toggle ${isPeopleActive ? 'active' : ''} ${isPeopleEntering ? 'animating-in' : ''}`}
                                                ref={peopleDropdownRef}
                                                onClick={() => {
                                                    setShowPeopleDropdown(prev => !prev)
                                                }}
                                                title="People"
                                                style={{position: 'relative', overflow: 'visible'}}
                                            >
                                            <span className="menu-icon">
                                                <i className="fas fa-users"></i>
                                            </span>
                                                <span className="menu-text">
                                                People
                                            </span>
                                                <span className="menu-icon" style={{fontSize: '12px', marginLeft: '4px'}}>
                                                <i className={`fas fa-chevron-${showPeopleDropdown ? 'up' : 'down'}`}></i>
                                            </span>
                                                {showPeopleDropdown && (
                                                    <div className="assets-dropdown" onClick={(e) => e.stopPropagation()}>
                                                        {peopleItems.map(personId => {
                                                            const item = menuItems.find(i => i.id === personId)
                                                            if (!item) return null
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className={`dropdown-item ${selectedView === item.id ? 'active' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleMenuItemClick(item.id)
                                                                        setShowPeopleDropdown(false)
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

                                    if (standaloneOperators) {
                                        const isExiting = exitingIds.has('Operators')
                                        const isEntering = enteringItemIds.has('Operators')
                                        const isActive = selectedView === 'Operators'

                                        result.push(
                                            <li
                                                key="Operators"
                                                className={`menu-item ${isActive ? 'active' : ''} ${isExiting ? 'animating-out' : ''} ${isEntering ? 'animating-in' : ''}`}
                                                onClick={() => {
                                                    if (isExiting) return
                                                    handleMenuItemClick('Operators')
                                                }}
                                                title="Operators"
                                            >
                                            <span className="menu-icon">
                                                {getIconForMenuItem('Operators')}
                                            </span>
                                                <span className="menu-text">
                                                Operators
                                            </span>
                                            </li>
                                        )
                                    }

                                    if (shouldShowProductivity) {
                                        const isProductivityEntering = enteringItemIds.has('productivity-dropdown')
                                        result.push(
                                            <li
                                                key="productivity-dropdown"
                                                className={`menu-item productivity-dropdown-toggle ${isProductivityActive ? 'active' : ''} ${isProductivityEntering ? 'animating-in' : ''}`}
                                                ref={productivityDropdownRef}
                                                onClick={() => {
                                                    setShowProductivityDropdown(prev => !prev)
                                                }}
                                                title="Productivity"
                                                style={{position: 'relative', overflow: 'visible'}}
                                            >
                                            <span className="menu-icon">
                                                <i className="fas fa-chart-line"></i>
                                            </span>
                                                <span className="menu-text">
                                                Productivity
                                            </span>
                                                <span className="menu-icon" style={{fontSize: '12px', marginLeft: '4px'}}>
                                                <i className={`fas fa-chevron-${showProductivityDropdown ? 'up' : 'down'}`}></i>
                                            </span>
                                                {showProductivityDropdown && (
                                                    <div className="assets-dropdown" onClick={(e) => e.stopPropagation()}>
                                                        {productivityItems.map(prodId => {
                                                            const item = menuItems.find(i => i.id === prodId)
                                                            if (!item) return null
                                                            if (!visibleIds.has(item.id) && !exitingIds.has(item.id)) return null
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className={`dropdown-item ${selectedView === item.id ? 'active' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleMenuItemClick(item.id)
                                                                        setShowProductivityDropdown(false)
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
                )}
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