import { useEffect, useState } from 'react'

import { UserAccentService } from '../../services/UserAccentService'
import { DEFAULT_ACCENT_COLOR } from '../constants/themeConstants'

/**
 * Returns the accent colour for any user. Falls back to the default
 * accent while the lookup is in flight or when the user has no stored
 * preference. Multiple components requesting the same id in the same
 * tick share a single batched edge-function call via
 * `UserAccentService`.
 */
export function useUserAccent(userId) {
    const initial = userId ? UserAccentService.get(userId) : DEFAULT_ACCENT_COLOR
    const [accentColor, setAccentColor] = useState(initial)
    useEffect(() => {
        if (!userId) {
            setAccentColor(DEFAULT_ACCENT_COLOR)
            return
        }
        let active = true
        setAccentColor(UserAccentService.get(userId))
        UserAccentService.ensure(userId).then((color) => {
            if (active) setAccentColor(color)
        })
        const unsubscribe = UserAccentService.subscribe(() => {
            if (active) setAccentColor(UserAccentService.get(userId))
        })
        return () => {
            active = false
            unsubscribe()
        }
    }, [userId])
    return accentColor
}

/**
 * Resolves accent colours for a list of users in one batch. Useful for
 * presence / online lists where many avatars render at once. Returns a
 * `{ userId: '#hex' }` map.
 */
export function useUserAccents(userIds) {
    const ids = Array.isArray(userIds) ? userIds : []
    const initial = {}
    for (const id of ids) initial[id] = UserAccentService.get(id)
    const [accents, setAccents] = useState(initial)
    const key = ids.filter(Boolean).join(',')
    useEffect(() => {
        if (ids.length === 0) {
            setAccents({})
            return
        }
        let active = true
        UserAccentService.ensureMany(ids).then((map) => {
            if (active) setAccents(map)
        })
        const unsubscribe = UserAccentService.subscribe(() => {
            if (!active) return
            const next = {}
            for (const id of ids) next[id] = UserAccentService.get(id)
            setAccents(next)
        })
        return () => {
            active = false
            unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    return accents
}
