import { useEffect, useMemo, useState } from 'react'

import { UserService } from '../../services/UserService'

/**
 * Classify a user's role into a coarse manager bucket. Anything not classified
 * here is excluded from the People Overview's Managers row.
 */
const classifyRole = (roleName) => {
    const name = String(roleName || '').toLowerCase()
    if (!name) return null
    if (name.includes('district') && name.includes('manager')) return 'district'
    if (name.includes('safety') && name.includes('manager')) return 'safety'
    if (name.includes('plant') && name.includes('manager')) return 'plant'
    if (name.includes('dispatch')) return 'dispatcher'
    if (name.includes('manager')) return 'other'
    return null
}

/**
 * Fetches every user with roles + plant assignments and exposes counts of
 * managers scoped by the active plant set. Cheap to use: fetches once on
 * mount, then scoping is pure derived state.
 */
export function useDashboardManagers({ plantSet }) {
    const [users, setUsers] = useState([])
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        let cancelled = false
        UserService.getAllUsersWithProfilesAndRoles()
            .then((rows) => {
                if (cancelled) return
                setUsers(Array.isArray(rows) ? rows : [])
                setLoaded(true)
            })
            .catch(() => {
                if (cancelled) return
                setUsers([])
                setLoaded(true)
            })
        return () => {
            cancelled = true
        }
    }, [])

    return useMemo(() => {
        const inScope = (user) => {
            if (!plantSet || plantSet.size === 0) return true
            if (user.plantCode && plantSet.has(user.plantCode)) return true
            return (user.additionalAssignedPlants || []).some((code) => plantSet.has(code))
        }
        const buckets = { dispatcher: 0, district: 0, other: 0, plant: 0, safety: 0 }
        let total = 0
        users.forEach((user) => {
            const bucket = classifyRole(user.roleName)
            if (!bucket) return
            if (!inScope(user)) return
            buckets[bucket] += 1
            total += 1
        })
        return { buckets, loaded, total }
    }, [users, plantSet, loaded])
}
