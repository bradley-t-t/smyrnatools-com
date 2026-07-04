import { useEffect, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { getSessionUserId } from '../../services/SessionService'
import { UserService } from '../../services/UserService'
import APIUtility from '../../utils/APIUtility'
import { getBrowserName, getDeviceType, getOSName } from '../../utils/BrowserUtility'
import { AUTH_FUNCTION } from '../constants/myAccountConstants'

/**
 * One-shot loader for the account view — pulls profile, role, permitted
 * regions, and the active sessions list (including dedup of duplicates and
 * registration of the current device). Owns the state that the orchestrator
 * needs to render but doesn't itself mutate post-load; the orchestrator can
 * patch individual fields via the returned setters.
 *
 * Side effect: when `regionsList` resolves, the user's stored selected
 * region is replaced with either their previous choice (if still permitted)
 * or the first permitted region. `updatePreferences` is invoked for this.
 */
export function useMyAccountLoad({ preferences, updatePreferences, userId }) {
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [userRole, setUserRole] = useState('')
    const [plantCode, setPlantCode] = useState('')
    const [additionalPlants, setAdditionalPlants] = useState([])
    const [joinedAt, setJoinedAt] = useState(null)
    const [permittedRegions, setPermittedRegions] = useState([])
    const [regionsLoaded, setRegionsLoaded] = useState(false)
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState('')

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const { data } = await Database.auth.getSession()
                const session = data?.session
                const uid = userId || session?.user?.id || getSessionUserId()
                if (!uid) throw new Error('No active session or user ID')
                const [profileData, userData, highestRole, regionsList] = await Promise.all([
                    Database.from('users_profiles')
                        .select('*')
                        .eq('id', uid)
                        .single()
                        .then((r) => r.data)
                        .catch(() => null),
                    Database.from('users')
                        .select('email')
                        .eq('id', uid)
                        .single()
                        .then((r) => r.data)
                        .catch(() => null),
                    UserService.getHighestRole(uid).catch(() => null),
                    UserService.getPermittedRegions(uid).catch(() => [])
                ])
                if (cancelled) return
                const userEmail = session?.user?.email || userData?.email || ''
                if (userEmail) setEmail(userEmail)
                if (highestRole?.name) setUserRole(highestRole.name)
                if (profileData) {
                    if (profileData.first_name) setFirstName(profileData.first_name)
                    if (profileData.last_name) setLastName(profileData.last_name)
                    if (profileData.plant_code) setPlantCode(profileData.plant_code)
                    if (profileData.created_at) setJoinedAt(profileData.created_at)
                    if (Array.isArray(profileData.additional_assigned_plants))
                        setAdditionalPlants(profileData.additional_assigned_plants)
                }
                if (regionsList && regionsList.length) {
                    setPermittedRegions(regionsList)
                    const currentSelCode = preferences.selectedRegion?.code
                    let chosen = regionsList.find((r) => (r.regionCode || r.region_code) === currentSelCode)
                    if (!chosen) chosen = regionsList[0]
                    updatePreferences('selectedRegion', {
                        code: chosen.regionCode || chosen.region_code || '',
                        name: chosen.regionName || chosen.region_name || '',
                        type: chosen.type || chosen.region_type || ''
                    })
                } else {
                    setPermittedRegions([])
                    updatePreferences('selectedRegion', { code: '', name: '', type: '' })
                }
                const userAgent = navigator.userAgent
                const currentBrowser = getBrowserName(userAgent)
                const currentOS = getOSName(userAgent)
                const currentDevice = getDeviceType(userAgent)
                const { data: existingSessions } = await Database.from('users_sessions')
                    .select('*')
                    .eq('user_id', uid)
                    .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                    .order('last_active', { ascending: false })
                let matchingSession = null
                const duplicates = []
                if (existingSessions && existingSessions.length > 0) {
                    const sessionsByDevice = {}
                    for (const sess of existingSessions) {
                        const key = `${sess.browser}_${sess.os}_${sess.device}`
                        if (sess.browser === currentBrowser && sess.os === currentOS && sess.device === currentDevice) {
                            if (!matchingSession) matchingSession = sess
                            else duplicates.push(sess.id)
                        }
                        if (sessionsByDevice[key]) duplicates.push(sess.id)
                        else sessionsByDevice[key] = sess
                    }
                    for (const dupId of duplicates) {
                        await APIUtility.post(`${AUTH_FUNCTION}/delete-session`, { sessionId: dupId }).catch(() => {})
                    }
                }
                // Identify which row in users_sessions backs the caller's
                // current cookie/session. We don't mint here — auth-service
                // mints on sign-in. If device-fingerprint matches nothing
                // (rare, but possible for a session that pre-dates the
                // browser/os string format), fall back to the most-recently
                // active row.
                const currentSessId = matchingSession?.id || (existingSessions && existingSessions[0]?.id) || null
                if (currentSessId) sessionStorage.setItem('sessionId', currentSessId)
                if (cancelled) return
                setCurrentSessionId(currentSessId)
                const { data: userSessions } = await Database.from('users_sessions')
                    .select('*')
                    .eq('user_id', uid)
                    .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                    .order('last_active', { ascending: false })
                    .limit(10)
                if (!cancelled && userSessions && userSessions.length > 0) {
                    setSessions(
                        userSessions.map((s) => ({
                            browser: s.browser,
                            createdAt: s.created_at,
                            device: s.device,
                            id: s.id,
                            isCurrent: s.id === currentSessId,
                            lastActive: s.last_active,
                            os: s.os
                        }))
                    )
                }
            } catch (e) {
                if (!cancelled) setMessage(`Error: ${e.message}`)
            } finally {
                if (!cancelled) {
                    setRegionsLoaded(true)
                    setLoading(false)
                }
            }
        }
        load()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    return {
        additionalPlants,
        currentSessionId,
        email,
        firstName,
        joinedAt,
        lastName,
        loading,
        message,
        permittedRegions,
        plantCode,
        regionsLoaded,
        sessions,
        setFirstName,
        setLastName,
        setLoading,
        setMessage,
        setSessions,
        userRole
    }
}
