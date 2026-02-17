import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { useTutorial } from '../../app/context/TutorialContext'
import { AuthService } from '../../services/AuthService'
import { supabase } from '../../services/DatabaseService'
import { UserService } from '../../services/UserService'

function MyAccountView({ userId }) {
    const { preferences, updatePreferences } = usePreferences()
    const { triggerTutorial } = useTutorial()
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [userRole, setUserRole] = useState('')
    const [plantCode, setPlantCode] = useState('')
    const [regionName, setRegionName] = useState('')
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [, setIsAuthenticated] = useState(false)
    const [, setUser] = useState(null)
    const [activeTab, setActiveTab] = useState('profile')
    const [permittedRegions, setPermittedRegions] = useState([])
    const [regionsLoaded, setRegionsLoaded] = useState(false)
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState('')

    const getBrowserInfo = (userAgent) => {
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
        if (userAgent.includes('Edg')) return 'Edge'
        if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera'
        return 'Unknown Browser'
    }

    const getOSInfo = (userAgent) => {
        if (userAgent.includes('Windows')) return 'Windows'
        if (userAgent.includes('Mac')) return 'macOS'
        if (userAgent.includes('Linux')) return 'Linux'
        if (userAgent.includes('Android')) return 'Android'
        if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
        return 'Unknown OS'
    }

    const getDeviceInfo = (userAgent) => {
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone'))
            return 'Mobile'
        if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet'
        return 'Desktop'
    }

    const formatSessionTime = (timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 5) return 'Active now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    const handleRevokeSession = async (sessionId) => {
        if (sessionId === currentSessionId) {
            setMessage('Cannot revoke current session. Please sign out instead.')
            setTimeout(() => setMessage(''), 3000)
            return
        }
        try {
            const { error } = await supabase.from('users_sessions').delete().eq('id', sessionId)

            if (error) throw error

            setSessions(sessions.filter((s) => s.id !== sessionId))
            setMessage('Session revoked successfully')
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            setMessage(`Error revoking session: ${error.message}`)
            setTimeout(() => setMessage(''), 3000)
        }
    }

    useEffect(() => {
        triggerTutorial('preferences-tab-hint', 500)
    }, [triggerTutorial])

    useEffect(() => {
        let cancelled = false

        async function load() {
            setLoading(true)
            setRegionsLoaded(false)
            try {
                const { data } = await supabase.auth.getSession()
                const session = data?.session
                const uid = userId || session?.user?.id || sessionStorage.getItem('userId')
                if (!uid) {
                    setIsAuthenticated(false)
                    throw new Error('No active session or user ID')
                }
                setIsAuthenticated(true)

                const [profileData, userData, highestRole, regionsList] = await Promise.all([
                    supabase
                        .from('users_profiles')
                        .select('first_name, last_name, plant_code')
                        .eq('id', uid)
                        .single()
                        .then((r) => r.data)
                        .catch(() => null),
                    supabase
                        .from('users')
                        .select('email')
                        .eq('id', uid)
                        .single()
                        .then((r) => r.data)
                        .catch(() => null),
                    UserService.getHighestRole(uid).catch(() => null),
                    UserService.getPermittedRegions(uid).catch(() => [])
                ])

                const userEmail = session?.user?.email || userData?.email || ''
                if (userEmail) setEmail(userEmail)

                if (cancelled) return

                if (highestRole?.name) setUserRole(highestRole.name)

                if (profileData) {
                    setUser({ ...profileData })
                    if (profileData.first_name) setFirstName(profileData.first_name)
                    if (profileData.last_name) setLastName(profileData.last_name)
                    if (profileData.plant_code) setPlantCode(profileData.plant_code)
                }

                if (regionsList && regionsList.length) {
                    setPermittedRegions(regionsList)
                    const currentSelCode = preferences.selectedRegion?.code
                    let chosen = regionsList.find((r) => (r.regionCode || r.region_code) === currentSelCode)
                    if (!chosen) chosen = regionsList[0]
                    const sel = {
                        code: chosen.regionCode || chosen.region_code || '',
                        name: chosen.regionName || chosen.region_name || '',
                        type: chosen.type || chosen.region_type || ''
                    }
                    updatePreferences('selectedRegion', sel)
                    setRegionName(sel.name)
                } else {
                    setPermittedRegions([])
                    updatePreferences('selectedRegion', { code: '', name: '', type: '' })
                    setRegionName('')
                }

                if (uid) {
                    const userAgent = navigator.userAgent
                    const currentBrowser = getBrowserInfo(userAgent)
                    const currentOS = getOSInfo(userAgent)
                    const currentDevice = getDeviceInfo(userAgent)

                    const { data: existingSessions } = await supabase
                        .from('users_sessions')
                        .select('*')
                        .eq('user_id', uid)
                        .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                        .order('last_active', { ascending: false })

                    let matchingSession = null
                    const duplicates = []

                    if (existingSessions && existingSessions.length > 0) {
                        const sessionsByDevice = {}

                        for (const session of existingSessions) {
                            const key = `${session.browser}_${session.os}_${session.device}`

                            if (
                                session.browser === currentBrowser &&
                                session.os === currentOS &&
                                session.device === currentDevice
                            ) {
                                if (!matchingSession) {
                                    matchingSession = session
                                } else {
                                    duplicates.push(session.id)
                                }
                            }

                            if (sessionsByDevice[key]) {
                                duplicates.push(session.id)
                            } else {
                                sessionsByDevice[key] = session
                            }
                        }

                        if (duplicates.length > 0) {
                            try {
                                await supabase.from('users_sessions').delete().in('id', duplicates)
                            } catch (err) {
                                console.error('Failed to remove duplicate sessions:', err)
                            }
                        }
                    }

                    let currentSessId
                    if (matchingSession) {
                        currentSessId = matchingSession.id
                        sessionStorage.setItem('sessionId', currentSessId)

                        try {
                            await supabase
                                .from('users_sessions')
                                .update({ last_active: new Date().toISOString() })
                                .eq('id', currentSessId)
                        } catch (err) {
                            console.error('Failed to update session:', err)
                        }
                    } else {
                        currentSessId = `${uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        sessionStorage.setItem('sessionId', currentSessId)

                        try {
                            await supabase.from('users_sessions').upsert(
                                {
                                    browser: currentBrowser,
                                    created_at: new Date().toISOString(),
                                    device: currentDevice,
                                    id: currentSessId,
                                    last_active: new Date().toISOString(),
                                    os: currentOS,
                                    user_agent: userAgent,
                                    user_id: uid
                                },
                                { onConflict: 'id' }
                            )
                        } catch (err) {
                            console.error('Failed to create session:', err)
                        }
                    }

                    setCurrentSessionId(currentSessId)

                    const { data: userSessions } = await supabase
                        .from('users_sessions')
                        .select('*')
                        .eq('user_id', uid)
                        .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                        .order('last_active', { ascending: false })
                        .limit(10)

                    if (userSessions && userSessions.length > 0) {
                        const sessionsList = userSessions.map((s) => ({
                            browser: s.browser,
                            createdAt: s.created_at,
                            device: s.device,
                            id: s.id,
                            isCurrent: s.id === currentSessId,
                            lastActive: s.last_active,
                            os: s.os
                        }))
                        setSessions(sessionsList)
                    }
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
    }, [userId])

    const updateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        try {
            const uid = userId || sessionStorage.getItem('userId')
            if (!uid) {
                const {
                    data: { session },
                    error: sessionError
                } = await supabase.auth.getSession()
                if (sessionError || !session) throw new Error('No active session or user ID')
                const { error: pe } = await supabase
                    .from('users_profiles')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', session.user.id)
                if (pe) throw pe
            } else {
                const { error: pe } = await supabase
                    .from('users_profiles')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', uid)
                if (pe) throw pe
            }
            setMessage('Profile updated successfully!')
        } catch (err) {
            setMessage(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const updatePassword = async (e) => {
        e.preventDefault()
        setLoading(true)
        setPasswordError('')
        setMessage('')
        try {
            if (!currentPassword) throw new Error('Current password is required')
            if (newPassword !== confirmPassword) throw new Error('New passwords do not match')
            if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, email, password_hash, salt')
                .eq('email', email)
                .single()
            if (userError || !userData) throw new Error('Could not verify current password')
            const { AuthUtility } = await import('../../utils/AuthUtility')
            const computedHash = await AuthUtility.hashPassword(currentPassword, userData.salt)
            if (computedHash !== userData.password_hash) throw new Error('Current password is incorrect')
            const salt = await AuthUtility.generateSalt()
            if (typeof salt !== 'string' || salt.length !== 32 || !/^[0-9a-f]{32}$/i.test(salt))
                throw new Error('Failed to generate valid salt')
            const newPasswordHash = await AuthUtility.hashPassword(newPassword, salt)
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    password_hash: newPasswordHash,
                    salt,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userData.id)
            if (updateError) throw updateError
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowPasswordModal(false)
            await AuthService.signOut()
            try {
                await supabase.auth.signOut()
            } catch {}
            sessionStorage.removeItem('userId')
            window.location.href = '/login'
        } catch (err) {
            setPasswordError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        setLoading(true)
        try {
            const sessionId = sessionStorage.getItem('sessionId')
            if (sessionId) {
                try {
                    await supabase.from('users_sessions').delete().eq('id', sessionId)
                } catch (err) {
                    console.error('Failed to delete session:', err)
                }
            }

            await AuthService.signOut()
            await supabase.auth.signOut()
            sessionStorage.removeItem('userId')
            sessionStorage.removeItem('sessionId')
            window.location.href = '/'
        } catch (err) {
            setMessage(`Error signing out: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleChangeRegion = (e) => {
        const code = e.target.value
        if (!code) {
            updatePreferences('selectedRegion', { code: '', name: '', type: '' })
            setRegionName('')
            return
        }
        const r = permittedRegions.find((x) => (x.regionCode || x.region_code) === code)
        if (!r) return
        const name = r.regionName || r.region_name || ''
        const type = r.type || r.region_type || ''
        updatePreferences('selectedRegion', { code, name, type })
        setRegionName(name)
    }

    const getInitials = () => {
        if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
        return null
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="relative overflow-hidden border-b border-gray-200 bg-white">
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `linear-gradient(to right, #1e3a5f 1px, transparent 1px), linear-gradient(to bottom, #1e3a5f 1px, transparent 1px)`,
                            backgroundSize: '20px 20px'
                        }}
                    ></div>
                    <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-8">
                        <div className="h-8 w-48 animate-pulse rounded bg-gray-200"></div>
                        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200"></div>
                    </div>
                </div>
                <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
                    <div className="grid gap-8 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <div className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm">
                                <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300"></div>
                                <div className="-mt-8 px-6 pb-6">
                                    <div className="rounded-xl bg-white p-4 shadow-lg">
                                        <div className="mx-auto mb-2 h-6 w-32 rounded bg-gray-200"></div>
                                        <div className="mx-auto h-4 w-48 rounded bg-gray-200"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 animate-pulse rounded-2xl bg-white p-2 shadow-sm">
                                <div className="h-12 rounded-lg bg-gray-100"></div>
                                <div className="mt-1 h-12 rounded-lg bg-gray-100"></div>
                            </div>
                        </div>
                        <div className="space-y-6 lg:col-span-2">
                            <div className="animate-pulse rounded-2xl bg-white p-6 shadow-sm md:p-8">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gray-200"></div>
                                    <div>
                                        <div className="h-5 w-40 rounded bg-gray-200"></div>
                                        <div className="mt-2 h-4 w-56 rounded bg-gray-200"></div>
                                    </div>
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="h-20 rounded-xl bg-gray-100"></div>
                                    <div className="h-20 rounded-xl bg-gray-100"></div>
                                </div>
                                <div className="mt-5 h-12 w-36 rounded-xl bg-gray-200"></div>
                            </div>
                            <div className="animate-pulse rounded-2xl bg-white p-6 shadow-sm md:p-8">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gray-200"></div>
                                    <div>
                                        <div className="h-5 w-36 rounded bg-gray-200"></div>
                                        <div className="mt-2 h-4 w-48 rounded bg-gray-200"></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-14 rounded-lg bg-gray-100"></div>
                                    <div className="h-14 rounded-lg bg-gray-100"></div>
                                    <div className="h-14 rounded-lg bg-gray-100"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="relative overflow-hidden border-b border-gray-200 bg-white">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #1e3a5f 1px, transparent 1px), linear-gradient(to bottom, #1e3a5f 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                ></div>
                <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-8">
                    <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your profile, security, and preferences</p>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
                {message && (
                    <div
                        className={`mb-6 flex items-center gap-3 rounded-xl p-4 ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
                    >
                        <i
                            className={`fas ${message.includes('Error') ? 'fa-exclamation-circle' : 'fa-check-circle'}`}
                        ></i>
                        <span className="flex-1 text-sm font-medium">{message}</span>
                        <button onClick={() => setMessage('')} className="text-current opacity-60 hover:opacity-100">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                                <div
                                    className="px-6 pb-16 pt-8"
                                    style={{
                                        background: `linear-gradient(to bottom right, ${preferences.accentColor || '#1e3a5f'}, ${preferences.accentColor || '#1e3a5f'}dd)`
                                    }}
                                >
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-2xl font-bold text-white backdrop-blur-sm">
                                        {getInitials() || <i className="fas fa-user"></i>}
                                    </div>
                                </div>
                                <div className="-mt-8 px-6 pb-6">
                                    <div className="rounded-xl bg-white p-4 shadow-lg">
                                        <h2 className="text-center text-lg font-bold text-gray-900">
                                            {firstName || lastName
                                                ? `${firstName || ''} ${lastName || ''}`.trim()
                                                : 'My Account'}
                                        </h2>
                                        <p className="mt-1 text-center text-sm text-gray-500">{email || 'No email'}</p>
                                        {userRole && (
                                            <div className="mt-3 flex justify-center">
                                                <span className="rounded-full bg-[#1e3a5f]/10 px-3 py-1 text-xs font-semibold text-[#1e3a5f]">
                                                    {userRole}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                                <nav className="flex flex-col">
                                    <button
                                        onClick={() => setActiveTab('profile')}
                                        className={`flex items-center gap-3 px-5 py-4 text-left transition-all ${activeTab === 'profile' ? 'border-l-4' : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50'}`}
                                        style={
                                            activeTab === 'profile'
                                                ? {
                                                      borderLeftColor: preferences.accentColor || '#1e3a5f',
                                                      backgroundColor: `${preferences.accentColor || '#1e3a5f'}10`,
                                                      color: preferences.accentColor || '#1e3a5f'
                                                  }
                                                : {}
                                        }
                                    >
                                        <i className="fas fa-user w-5 text-center"></i>
                                        <span className="font-medium">Profile</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        className={`flex items-center gap-3 px-5 py-4 text-left transition-all ${activeTab === 'security' ? 'border-l-4' : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50'}`}
                                        style={
                                            activeTab === 'security'
                                                ? {
                                                      borderLeftColor: preferences.accentColor || '#1e3a5f',
                                                      backgroundColor: `${preferences.accentColor || '#1e3a5f'}10`,
                                                      color: preferences.accentColor || '#1e3a5f'
                                                  }
                                                : {}
                                        }
                                    >
                                        <i className="fas fa-shield-alt w-5 text-center"></i>
                                        <span className="font-medium">Security</span>
                                    </button>
                                    <button
                                        data-tutorial-target="preferences-tab"
                                        onClick={() => setActiveTab('preferences')}
                                        className={`flex items-center gap-3 px-5 py-4 text-left transition-all ${activeTab === 'preferences' ? 'border-l-4' : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50'}`}
                                        style={
                                            activeTab === 'preferences'
                                                ? {
                                                      borderLeftColor: preferences.accentColor || '#1e3a5f',
                                                      backgroundColor: `${preferences.accentColor || '#1e3a5f'}10`,
                                                      color: preferences.accentColor || '#1e3a5f'
                                                  }
                                                : {}
                                        }
                                    >
                                        <i className="fas fa-cog w-5 text-center"></i>
                                        <span className="font-medium">Preferences</span>
                                    </button>
                                    <div className="mx-4 my-2 border-t border-gray-100"></div>
                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center gap-3 px-5 py-4 text-left text-red-600 transition-all hover:bg-red-50"
                                    >
                                        <i className="fas fa-sign-out-alt w-5 text-center"></i>
                                        <span className="font-medium">Sign Out</span>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 lg:col-span-2">
                        {activeTab === 'profile' && (
                            <>
                                <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f]/10">
                                            <i className="fas fa-id-card text-[#1e3a5f]"></i>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Personal Information</h3>
                                            <p className="text-sm text-gray-500">
                                                Update your name and contact details
                                            </p>
                                        </div>
                                    </div>
                                    <form onSubmit={updateProfile} className="space-y-5">
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    First Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    placeholder="Enter first name"
                                                    required
                                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    Last Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    placeholder="Enter last name"
                                                    required
                                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{ backgroundColor: preferences.accentColor || '#1e3a5f' }}
                                        >
                                            <i className="fas fa-save"></i>
                                            Save Changes
                                        </button>
                                    </form>
                                </div>

                                <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f]/10">
                                            <i className="fas fa-info-circle text-[#1e3a5f]"></i>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Account Details</h3>
                                            <p className="text-sm text-gray-500">View your account information</p>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        <div className="flex items-center justify-between py-4">
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <i className="fas fa-envelope w-5"></i>
                                                <span className="text-sm font-medium">Email</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{email || 'Not set'}</span>
                                        </div>
                                        {userRole && (
                                            <div className="flex items-center justify-between py-4">
                                                <div className="flex items-center gap-3 text-gray-600">
                                                    <i className="fas fa-user-tag w-5"></i>
                                                    <span className="text-sm font-medium">Role</span>
                                                </div>
                                                <span className="font-semibold text-gray-900">{userRole}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between py-4">
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <i className="fas fa-globe w-5"></i>
                                                <span className="text-sm font-medium">Region</span>
                                            </div>
                                            <div className="relative">
                                                <select
                                                    value={preferences.selectedRegion?.code || ''}
                                                    onChange={handleChangeRegion}
                                                    disabled={!regionsLoaded}
                                                    className="appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-10 text-sm font-semibold text-gray-900 transition-all hover:border-gray-300 focus:border-[#1e3a5f] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {permittedRegions.map((r) => (
                                                        <option
                                                            key={r.regionCode || r.region_code}
                                                            value={r.regionCode || r.region_code}
                                                        >
                                                            {r.regionName || r.region_name || ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <i className="fas fa-chevron-down text-xs text-gray-400"></i>
                                                </div>
                                            </div>
                                        </div>
                                        {plantCode && (
                                            <div className="flex items-center justify-between py-4">
                                                <div className="flex items-center gap-3 text-gray-600">
                                                    <i className="fas fa-building w-5"></i>
                                                    <span className="text-sm font-medium">Plant Code</span>
                                                </div>
                                                <span className="font-semibold text-gray-900">{plantCode}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'security' && (
                            <>
                                <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f]/10">
                                            <i className="fas fa-key text-[#1e3a5f]"></i>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Password</h3>
                                            <p className="text-sm text-gray-500">
                                                Keep your account secure with a strong password
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPasswordModal(true)}
                                        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all"
                                        style={{ backgroundColor: preferences.accentColor || '#1e3a5f' }}
                                    >
                                        <i className="fas fa-lock"></i>
                                        Change Password
                                    </button>
                                </div>

                                <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                                    <div className="mb-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f]/10">
                                                <i className="fas fa-laptop text-[#1e3a5f]"></i>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Active Sessions</h3>
                                                <p className="text-sm text-gray-500">Manage your login sessions</p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
                                            {sessions.length} active
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {sessions.length > 0 ? (
                                            sessions.map((session) => (
                                                <div
                                                    key={session.id}
                                                    className={`flex items-center justify-between rounded-xl border p-4 ${session.isCurrent ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${session.isCurrent ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}
                                                        >
                                                            <i
                                                                className={`fas ${session.device === 'Mobile' ? 'fa-mobile-alt' : session.device === 'Tablet' ? 'fa-tablet-alt' : 'fa-desktop'}`}
                                                            ></i>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-900">
                                                                    {session.browser}
                                                                </span>
                                                                {session.isCurrent && (
                                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                                                        Current
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-500">
                                                                {session.os} · {session.device} ·{' '}
                                                                {formatSessionTime(session.lastActive)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {!session.isCurrent && (
                                                        <button
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-8 text-center text-gray-500">
                                                <i className="fas fa-laptop mb-2 text-2xl"></i>
                                                <p>No active sessions found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-red-100 bg-red-50">
                                    <div className="flex items-center justify-between p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                                                <i className="fas fa-sign-out-alt text-lg text-red-600"></i>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Sign Out</h3>
                                                <p className="text-sm text-gray-600">End your current session</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSignOut}
                                            className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition-all hover:bg-red-700"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'preferences' && (
                            <>
                                <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                                            style={{ backgroundColor: `${preferences.accentColor || '#1e3a5f'}15` }}
                                        >
                                            <i
                                                className="fas fa-palette"
                                                style={{ color: preferences.accentColor || '#1e3a5f' }}
                                            ></i>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Appearance</h3>
                                            <p className="text-sm text-gray-500">
                                                Customize the look of the application
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="mb-4">
                                                <div className="font-medium text-gray-900">Accent Color</div>
                                                <div className="text-sm text-gray-500">
                                                    Choose an accent color for the navigation and buttons
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {[
                                                    { color: '#1e3a5f', name: 'Navy' },
                                                    { color: '#7f1d1d', name: 'Red' },
                                                    { color: '#374151', name: 'Gray' },
                                                    { color: '#0a0a0a', name: 'Black' }
                                                ].map(({ color, name }) => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updatePreferences('accentColor', color)}
                                                        className={`group relative h-10 w-10 rounded-xl transition-all hover:scale-110 ${(preferences.accentColor || '#1e3a5f') === color ? 'ring-2 ring-offset-2' : ''}`}
                                                        style={{
                                                            backgroundColor: color,
                                                            ringColor: color
                                                        }}
                                                        title={name}
                                                    >
                                                        {(preferences.accentColor || '#1e3a5f') === color && (
                                                            <i className="fas fa-check text-white text-sm"></i>
                                                        )}
                                                    </button>
                                                ))}
                                                <div className="relative">
                                                    <input
                                                        type="color"
                                                        value={preferences.accentColor || '#1e3a5f'}
                                                        onChange={(e) =>
                                                            updatePreferences('accentColor', e.target.value)
                                                        }
                                                        className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
                                                    />
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:border-gray-400 hover:bg-gray-100">
                                                        <i className="fas fa-eyedropper text-gray-400"></i>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center gap-4">
                                                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                                    <div
                                                        className="h-8 w-8 rounded-lg shadow-sm"
                                                        style={{
                                                            backgroundColor: preferences.accentColor || '#1e3a5f'
                                                        }}
                                                    ></div>
                                                    <div>
                                                        <div className="text-xs font-medium text-gray-500">Current</div>
                                                        <div className="font-mono text-sm font-semibold text-gray-900">
                                                            {(preferences.accentColor || '#1e3a5f').toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                                {preferences.accentColor && preferences.accentColor !== '#1e3a5f' && (
                                                    <button
                                                        onClick={() => updatePreferences('accentColor', '#1e3a5f')}
                                                        className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-200"
                                                    >
                                                        <i className="fas fa-undo text-xs"></i>
                                                        Reset to Default
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                                            style={{ backgroundColor: `${preferences.accentColor || '#1e3a5f'}15` }}
                                        >
                                            <i
                                                className="fas fa-graduation-cap"
                                                style={{ color: preferences.accentColor || '#1e3a5f' }}
                                            ></i>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Tutorials</h3>
                                            <p className="text-sm text-gray-500">Manage tutorial hints and guides</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
                                            <div>
                                                <div className="font-medium text-gray-900">Enable Tutorials</div>
                                                <div className="text-sm text-gray-500">
                                                    Show helpful tips and guides throughout the app
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => updatePreferences('tutorials', !preferences.tutorials)}
                                                className="relative h-7 w-12 rounded-full transition-colors"
                                                style={{
                                                    backgroundColor: preferences.tutorials
                                                        ? preferences.accentColor || '#1e3a5f'
                                                        : '#d1d5db'
                                                }}
                                            >
                                                <div
                                                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
                                                    style={{ left: preferences.tutorials ? '26px' : '4px' }}
                                                ></div>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('dismissed_tutorials')
                                                setMessage('Tutorials reset! Refresh the page to see them again.')
                                                setTimeout(() => setMessage(''), 3000)
                                            }}
                                            className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-200"
                                        >
                                            <i className="fas fa-redo text-xs"></i>
                                            Reset All Tutorials
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showPasswordModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={() => setShowPasswordModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f]/10">
                                    <i className="fas fa-key text-[#1e3a5f]"></i>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={updatePassword} className="p-6">
                            {passwordError && (
                                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                    <i className="fas fa-exclamation-circle"></i>
                                    <span>{passwordError}</span>
                                </div>
                            )}
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        required
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        required
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        required
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3 font-semibold text-gray-600 transition-all hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        !currentPassword ||
                                        !newPassword ||
                                        newPassword !== confirmPassword ||
                                        newPassword.length < 8
                                    }
                                    className="flex-1 rounded-xl py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ backgroundColor: preferences.accentColor || '#1e3a5f' }}
                                >
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MyAccountView
