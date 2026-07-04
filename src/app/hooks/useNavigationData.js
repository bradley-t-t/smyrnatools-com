import { useEffect, useState } from 'react'

import { UserPresenceService } from '../../services/UserPresenceService'
import { UserService } from '../../services/UserService'
import {
    AGGREGATE_HIDDEN_ITEMS,
    DEFAULT_HIDDEN_ITEMS,
    IT_ACCESS_ONLY_ITEMS,
    IT_ACCESS_ROLE_NAME,
    MENU_ITEMS,
    OFFICE_ONLY_ITEMS,
    OFFICE_VISIBLE_ITEMS
} from '../constants/navigationConstants'

/** Tracks the online-user count from UserPresenceService and keeps it in sync. */
export function useOnlineUsersCount() {
    const [onlineUsersCount, setOnlineUsersCount] = useState(0)
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
    return onlineUsersCount
}

/** Loads the regions a user is permitted to access and auto-selects the first
 *  one if no region is currently selected. */
export function usePermittedRegions(userId, regionCode, updatePreferences) {
    const [permittedRegions, setPermittedRegions] = useState([])
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
    return permittedRegions
}

/** Filters the global menu by the user's permissions and the region type. */
export function useVisibleMenuItems(userId, regionType, regionCode) {
    const [visibleMenuItems, setVisibleMenuItems] = useState([])
    useEffect(() => {
        async function filterItems() {
            if (!userId) return setVisibleMenuItems([])
            try {
                const [permissions, userRoles] = await Promise.all([
                    UserService.getUserPermissions(userId),
                    UserService.getUserRoles(userId)
                ])
                const hasITAccess = userRoles.some((role) => role.name === IT_ACCESS_ROLE_NAME)
                let filtered = MENU_ITEMS.filter(
                    (item) =>
                        permissions.includes(item.permission) &&
                        (hasITAccess || !IT_ACCESS_ONLY_ITEMS.includes(item.id))
                )
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
    return visibleMenuItems
}
