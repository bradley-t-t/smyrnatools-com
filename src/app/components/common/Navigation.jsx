import React, { useMemo, useState } from 'react'

import {
    ADMIN_ITEMS,
    ASSET_ITEMS,
    CATEGORIES,
    PEOPLE_ITEMS,
    TOOLS_ITEMS
} from '../../constants/navigationConstants'
import { useSharedMessages } from '../../context/MessagesContext'
import { usePreferences } from '../../context/PreferencesContext'
import { useAccentColor } from '../../hooks/useAccentColor'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useMagneticHover } from '../../hooks/useMagneticHover'
import { useOnlineUsersCount, usePermittedRegions, useVisibleMenuItems } from '../../hooks/useNavigationData'
import {
    useActiveCategory,
    useDropdownOutsideClose,
    useIsTablet,
    useMobileDrawerOutsideClose,
    useTwoLevelUnderline
} from '../../hooks/useNavigationLayout'
import NavigationMobile from './navigation/NavigationMobile'
import NavigationTopBar from './navigation/NavigationTopBar'
import NavigationTwoLevel from './navigation/NavigationTwoLevel'
import NotificationsModal from './NotificationsModal'
import OnlineUsersModal from './OnlineUsersModal'

/** Computes the two-character avatar initials from a user's display name. */
const computeUserInitials = (userName) => {
    if (!userName) return '?'
    return userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

/** Unified app navigation supporting two desktop layout modes:
 *  - `top_bar_basic` (default): single-row top bar with dropdown menus
 *  - `two_level_tabs`: two-level horizontal tabs with category pills + sliding underline
 *
 *  Mobile layout is shared across both modes. */
export default function Navigation({ selectedView, onSelectView, children, userName = '', userId = null, ..._rest }) {
    const { preferences, updatePreferences } = usePreferences()
    const navStyle = preferences.navStyle || 'top_bar_basic'
    const isTwoLevel = navStyle === 'two_level_tabs'

    const [showNotifications, setShowNotifications] = useState(false)
    const [notificationsAnchor, setNotificationsAnchor] = useState(null)
    const [showOnlineUsers, setShowOnlineUsers] = useState(false)
    const [onlineUsersAnchor, setOnlineUsersAnchor] = useState(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [openDropdown, setOpenDropdown] = useState(null)

    const isMobile = useIsMobile()
    const isTablet = useIsTablet()
    const accentColor = useAccentColor()
    const { registerElement: registerMagnetic } = useMagneticHover()

    const regionType = preferences.selectedRegion?.type
    const regionCode = preferences.selectedRegion?.code

    const messagesHook = useSharedMessages()
    const combinedCount = messagesHook.unreadCount || 0
    const onlineUsersCount = useOnlineUsersCount()
    const permittedRegions = usePermittedRegions(userId, regionCode, updatePreferences)
    const visibleMenuItems = useVisibleMenuItems(userId, regionType, regionCode)

    const dropdownRef = useDropdownOutsideClose(openDropdown, setOpenDropdown)
    useMobileDrawerOutsideClose(isMobile, mobileMenuOpen, isTwoLevel, setMobileMenuOpen)
    const [activeCategory, setActiveCategory] = useActiveCategory(isTwoLevel, selectedView)
    const { secondaryNavRef, underlineRef } = useTwoLevelUnderline(
        isTwoLevel,
        selectedView,
        activeCategory,
        visibleMenuItems
    )

    const groupFlags = useMemo(
        () => ({
            hasAdmin: visibleMenuItems.some((i) => ADMIN_ITEMS.includes(i.id)),
            hasAssets: visibleMenuItems.some((i) => ASSET_ITEMS.includes(i.id)),
            hasPeople: visibleMenuItems.some((i) => PEOPLE_ITEMS.includes(i.id)),
            hasTools: visibleMenuItems.some((i) => TOOLS_ITEMS.includes(i.id))
        }),
        [visibleMenuItems]
    )

    const standaloneItems = useMemo(
        () =>
            visibleMenuItems.filter(
                (i) =>
                    !ASSET_ITEMS.includes(i.id) &&
                    !(groupFlags.hasPeople && PEOPLE_ITEMS.includes(i.id)) &&
                    !(groupFlags.hasTools && TOOLS_ITEMS.includes(i.id)) &&
                    !(groupFlags.hasAdmin && ADMIN_ITEMS.includes(i.id))
            ),
        [visibleMenuItems, groupFlags]
    )

    const visibleCategories = useMemo(
        () =>
            CATEGORIES.filter((cat) => {
                if (cat.id === 'dashboard') return visibleMenuItems.some((i) => i.id === 'Dashboard')
                return cat.items.some((itemId) => visibleMenuItems.some((i) => i.id === itemId))
            }),
        [visibleMenuItems]
    )

    const secondaryItems = useMemo(() => {
        const cat = CATEGORIES.find((c) => c.id === activeCategory)
        if (!cat || cat.items.length === 0) return []
        return cat.items.map((id) => visibleMenuItems.find((i) => i.id === id)).filter(Boolean)
    }, [activeCategory, visibleMenuItems])

    const userInitials = useMemo(() => computeUserInitials(userName), [userName])

    const handleMenuClick = (id) => {
        onSelectView(id)
        setMobileMenuOpen(false)
        setOpenDropdown(null)
    }

    const handleRegionChange = (e) => {
        const code = e.target.value
        if (!code) return
        const r = permittedRegions.find((x) => (x.regionCode || x.region_code) === code)
        if (!r) return
        const newRegion = {
            code: r.regionCode || r.region_code,
            name: r.regionName || r.region_name || '',
            type: r.type || r.region_type || ''
        }
        updatePreferences('selectedRegion', newRegion)
        window.dispatchEvent(new CustomEvent('region-changed', { detail: newRegion }))
    }

    const handleCategoryClick = (catId) => {
        setActiveCategory(catId)
        if (catId === 'dashboard') {
            handleMenuClick('Dashboard')
            return
        }
        const cat = CATEGORIES.find((c) => c.id === catId)
        if (!cat) return
        if (cat.items.includes(selectedView)) return
        const firstVisible = cat.items.find((id) => visibleMenuItems.some((i) => i.id === id))
        if (firstVisible) handleMenuClick(firstVisible)
    }

    const handleShowNotifications = (e) => {
        setNotificationsAnchor(e.currentTarget.getBoundingClientRect())
        setShowNotifications(true)
    }

    const handleShowOnlineUsers = (e) => {
        setOnlineUsersAnchor(e.currentTarget.getBoundingClientRect())
        setShowOnlineUsers(true)
    }

    const modals = (
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

    if (isMobile) {
        return (
            <>
                <NavigationMobile
                    accentColor={accentColor}
                    mobileMenuOpen={mobileMenuOpen}
                    setMobileMenuOpen={setMobileMenuOpen}
                    regionCode={regionCode}
                    permittedRegions={permittedRegions}
                    handleRegionChange={handleRegionChange}
                    visibleMenuItems={visibleMenuItems}
                    standaloneItems={standaloneItems}
                    groupFlags={groupFlags}
                    selectedView={selectedView}
                    handleMenuClick={handleMenuClick}
                >
                    {children}
                </NavigationMobile>
                {modals}
            </>
        )
    }

    if (isTwoLevel) {
        return (
            <>
                <NavigationTwoLevel
                    accentColor={accentColor}
                    visibleMenuItems={visibleMenuItems}
                    visibleCategories={visibleCategories}
                    secondaryItems={secondaryItems}
                    activeCategory={activeCategory}
                    selectedView={selectedView}
                    regionCode={regionCode}
                    permittedRegions={permittedRegions}
                    onRegionChange={handleRegionChange}
                    combinedCount={combinedCount}
                    onlineUsersCount={onlineUsersCount}
                    onShowNotifications={handleShowNotifications}
                    onShowOnlineUsers={handleShowOnlineUsers}
                    onMenuClick={handleMenuClick}
                    onCategoryClick={handleCategoryClick}
                    userInitials={userInitials}
                    userName={userName}
                    secondaryNavRef={secondaryNavRef}
                    underlineRef={underlineRef}
                >
                    {children}
                </NavigationTwoLevel>
                {modals}
            </>
        )
    }

    return (
        <>
            <NavigationTopBar
                accentColor={accentColor}
                isTablet={isTablet}
                visibleMenuItems={visibleMenuItems}
                standaloneItems={standaloneItems}
                groupFlags={groupFlags}
                selectedView={selectedView}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                dropdownRef={dropdownRef}
                onMenuClick={handleMenuClick}
                onRegionChange={handleRegionChange}
                regionCode={regionCode}
                permittedRegions={permittedRegions}
                combinedCount={combinedCount}
                onlineUsersCount={onlineUsersCount}
                onShowNotifications={handleShowNotifications}
                onShowOnlineUsers={handleShowOnlineUsers}
                userName={userName}
                registerMagnetic={registerMagnetic}
            >
                {children}
            </NavigationTopBar>
            {modals}
        </>
    )
}
