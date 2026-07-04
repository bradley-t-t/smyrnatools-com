import React, { useEffect, useRef, useState } from 'react'

import VersionPopup from '../../../app/components/common/VersionPopup'
import AccountAtAGlance from '../../../app/components/myaccount/AccountAtAGlance'
import AccountSideNav from '../../../app/components/myaccount/AccountSideNav'
import AccountSkeleton from '../../../app/components/myaccount/AccountSkeleton'
import AccountStatStrip from '../../../app/components/myaccount/AccountStatStrip'
import CockpitHeader from '../../../app/components/myaccount/CockpitHeader'
import PasswordModal from '../../../app/components/myaccount/PasswordModal'
import NotificationsTab from '../../../app/components/myaccount/tabs/NotificationsTab'
import PreferencesTab from '../../../app/components/myaccount/tabs/PreferencesTab'
import ProfileTab from '../../../app/components/myaccount/tabs/ProfileTab'
import SecurityTab from '../../../app/components/myaccount/tabs/SecurityTab'
import { ACCOUNT_TABS, AUTH_FUNCTION, TAB_SECTIONS } from '../../../app/constants/myAccountConstants'
import { useAuth } from '../../../app/context/AuthContext'
import { useSharedMessages } from '../../../app/context/MessagesContext'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useTutorial } from '../../../app/context/TutorialContext'
import { useMyAccountLoad } from '../../../app/hooks/useMyAccountLoad'
import { usePlanScrollSpy } from '../../../app/hooks/usePlanScrollSpy'
import { useThemeMode } from '../../../app/hooks/useThemeMode'
import { useVersion } from '../../../app/hooks/useVersion'
import { getSessionUserId } from '../../../services/SessionService'
import { UserService } from '../../../services/UserService'
import APIUtility from '../../../utils/APIUtility'
import { CacheUtility } from '../../../utils/CacheUtility'
import DashboardUtility from '../../../utils/DashboardUtility'

/**
 * Top-level user account view — profile, security, preferences, notifications.
 * Owns mutation + UI state; the load lives in `useMyAccountLoad`; rendering
 * is delegated to the components in `src/app/components/myaccount/`.
 */
function MyAccountView({ onSelectView, userId }) {
    const { preferences, updatePreferences } = usePreferences()
    const { isMobile, resetAllTutorials, triggerTutorial } = useTutorial()
    const { signOut: authSignOut, updatePassword: authUpdatePassword, verifyPassword } = useAuth()
    const { themeMode } = useThemeMode()
    const version = useVersion()
    const { conversations, unreadCount: unreadMessageCount } = useSharedMessages()
    const accentColor = preferences.accentColor || '#2A3163'

    /** Jump straight to the messages center. Optional `conversationId` deep-
     *  links to a specific thread when the caller has one. */
    const handleOpenMessages = (conversationId = null) => {
        if (typeof onSelectView !== 'function') return
        onSelectView('Notifications', conversationId ? { initialConversationId: conversationId } : {})
    }

    const account = useMyAccountLoad({ preferences, updatePreferences, userId })
    const {
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
    } = account

    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [activeTab, setActiveTab] = useState('profile')
    const [cacheClearing, setCacheClearing] = useState(false)

    useEffect(() => {
        triggerTutorial('preferences-tab-hint', 500)
    }, [triggerTutorial])

    /** Deletes a remote session record. Refuses to revoke the current session —
     *  user must sign out instead. */
    const handleRevokeSession = async (sessionId) => {
        if (sessionId === currentSessionId) {
            setMessage('Cannot revoke current session. Please sign out instead.')
            setTimeout(() => setMessage(''), 3000)
            return
        }
        try {
            await APIUtility.post(`${AUTH_FUNCTION}/delete-session`, { sessionId })
            setSessions(sessions.filter((s) => s.id !== sessionId))
            setMessage('Session revoked successfully')
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            setMessage(`Error revoking session: ${error.message}`)
            setTimeout(() => setMessage(''), 3000)
        }
    }

    const updateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        try {
            const targetUid = userId || getSessionUserId()
            if (!targetUid) throw new Error('No active session or user ID')
            const { json, res } = await APIUtility.post(`${AUTH_FUNCTION}/update-profile`, {
                firstName,
                lastName,
                plantCode: plantCode || '',
                userId: targetUid
            })
            if (!res.ok) throw new Error(json?.error || 'Failed to update profile')
            setMessage('Profile updated successfully!')
        } catch (err) {
            setMessage(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    /** Verifies the current password server-side, updates to the new one, then
     *  forces sign-out so the user re-authenticates. */
    const updatePassword = async (e) => {
        e.preventDefault()
        setLoading(true)
        setPasswordError('')
        setMessage('')
        try {
            if (!currentPassword) throw new Error('Current password is required')
            if (newPassword !== confirmPassword) throw new Error('New passwords do not match')
            if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
            const uid = userId || getSessionUserId()
            if (!uid) throw new Error('No active session')
            await verifyPassword(uid, currentPassword)
            await authUpdatePassword(uid, newPassword)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowPasswordModal(false)
            await authSignOut()
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
            await authSignOut()
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
            return
        }
        const r = permittedRegions.find((x) => (x.regionCode || x.region_code) === code)
        if (!r) return
        updatePreferences('selectedRegion', {
            code,
            name: r.regionName || r.region_name || '',
            type: r.type || r.region_type || ''
        })
    }

    const getInitials = () => {
        if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
        return null
    }

    /** Wipes every client-side cache. Recovery tool when a user sees stale
     *  data after a deploy. */
    const handleClearCache = () => {
        setCacheClearing(true)
        try {
            CacheUtility.clear()
            UserService.clearCache()
            DashboardUtility.clearAISummaryCache()
            sessionStorage.removeItem('dashboard_assets_cache_v1')
            localStorage.removeItem('srm_history_ai_summaries')
            localStorage.removeItem('cachedOperators')
            localStorage.removeItem('cachedOperatorsDate')
            localStorage.removeItem('cachedManagers')
            localStorage.removeItem('cachedManagersDate')
            const keysToRemove = []
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key.endsWith('_last_view_mode') || key.startsWith('maintenance_draft_')) keysToRemove.push(key)
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key))
            localStorage.removeItem('detailview-sidebar-collapsed')
            setMessage('All caches cleared successfully!')
            setTimeout(() => setMessage(''), 3000)
        } catch {
            setMessage('Error: Failed to clear some caches')
            setTimeout(() => setMessage(''), 3000)
        } finally {
            setCacheClearing(false)
        }
    }

    const sectionsForTab = TAB_SECTIONS[activeTab] || []
    const regionLabel = preferences.selectedRegion?.name || ''

    // Hooks must run before any early-return guards — keep the scrollspy ref
    // + state at the top so React's hook order stays stable.
    const scrollContainerRef = useRef(null)
    const [activeSection, jumpTo] = usePlanScrollSpy({
        deps: [activeTab, loading, sessions.length, additionalPlants.length],
        scrollContainerRef,
        sections: sectionsForTab
    })

    if (loading) return <AccountSkeleton />

    const messageIsError = message.includes('Error')

    return (
        <div
            className="global-dashboard-container dashboard-container global-flush-top flush-top bg-bg-secondary flex flex-col overflow-hidden absolute"
            style={{ inset: 0 }}
        >
            <CockpitHeader
                accentColor={accentColor}
                activeTab={activeTab}
                isMobile={isMobile}
                onChangeTab={setActiveTab}
                onOpenMessages={onSelectView ? handleOpenMessages : undefined}
                onSignOut={handleSignOut}
                regionLabel={regionLabel}
                tabs={ACCOUNT_TABS}
                unreadMessageCount={unreadMessageCount}
            />

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6 flex gap-4">
                    <AccountSideNav
                        accentColor={accentColor}
                        activeId={activeSection}
                        onJump={jumpTo}
                        sections={sectionsForTab}
                    />

                    <main className="flex-1 min-w-0 py-3 sm:py-5 flex flex-col gap-3 sm:gap-5">
                        {message && (
                            <div
                                role={messageIsError ? 'alert' : 'status'}
                                aria-live={messageIsError ? 'assertive' : 'polite'}
                                className={`flex items-center gap-3 rounded-card border px-4 py-3 text-text-primary animate-fade-slide-in motion-reduce:animate-none ${
                                    messageIsError
                                        ? 'border-status-danger/35 bg-status-danger/10'
                                        : 'border-status-active/35 bg-status-active/10'
                                }`}
                            >
                                <i
                                    className={`fas text-[14px] ${
                                        messageIsError
                                            ? 'fa-exclamation-circle text-status-danger'
                                            : 'fa-check-circle text-status-active'
                                    }`}
                                    aria-hidden="true"
                                />
                                <span className="flex-1 text-[13px] font-medium">{message}</span>
                                <button type="button"
                                    onClick={() => setMessage('')}
                                    className="rounded p-1 text-text-secondary opacity-70 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    aria-label="Dismiss"
                                >
                                    <i className="fas fa-times text-[12px]" aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <AccountStatStrip
                            additionalPlants={additionalPlants}
                            joinedAt={joinedAt}
                            plantCode={plantCode}
                            regionName={regionLabel}
                            role={userRole}
                            sessions={sessions}
                        />

                        {activeTab === 'profile' && (
                            <ProfileTab
                                accentColor={accentColor}
                                additionalPlants={additionalPlants}
                                email={email}
                                firstName={firstName}
                                getInitials={getInitials}
                                lastName={lastName}
                                loading={loading}
                                onChangeRegion={handleChangeRegion}
                                onSubmit={updateProfile}
                                permittedRegions={permittedRegions}
                                plantCode={plantCode}
                                preferences={preferences}
                                regionsLoaded={regionsLoaded}
                                setFirstName={setFirstName}
                                setLastName={setLastName}
                                userRole={userRole}
                            />
                        )}
                        {activeTab === 'security' && (
                            <SecurityTab
                                accentColor={accentColor}
                                onOpenPasswordModal={() => setShowPasswordModal(true)}
                                onRevokeSession={handleRevokeSession}
                                sessions={sessions}
                            />
                        )}
                        {activeTab === 'preferences' && (
                            <PreferencesTab
                                accentColor={accentColor}
                                cacheClearing={cacheClearing}
                                isMobile={isMobile}
                                onClearCache={handleClearCache}
                                onResetTutorials={async () => {
                                    await resetAllTutorials()
                                    setMessage('Tutorials reset! Refresh the page to see them again.')
                                    setTimeout(() => setMessage(''), 3000)
                                }}
                                preferences={preferences}
                                themeMode={themeMode}
                                updatePreferences={updatePreferences}
                            />
                        )}
                        {activeTab === 'notifications' && (
                            <NotificationsTab
                                accentColor={accentColor}
                                conversations={conversations}
                                onOpenMessages={onSelectView ? handleOpenMessages : undefined}
                                preferences={preferences}
                                unreadMessageCount={unreadMessageCount}
                                updatePreferences={updatePreferences}
                            />
                        )}

                        <div className="h-8" />
                    </main>

                    <AccountAtAGlance
                        additionalPlants={additionalPlants}
                        email={email}
                        joinedAt={joinedAt}
                        plantCode={plantCode}
                        regionName={regionLabel}
                        sessions={sessions}
                        userRole={userRole}
                    />
                </div>
            </div>

            <VersionPopup version={version} />

            {showPasswordModal && (
                <PasswordModal
                    accentColor={accentColor}
                    confirmPassword={confirmPassword}
                    currentPassword={currentPassword}
                    loading={loading}
                    newPassword={newPassword}
                    onClose={() => setShowPasswordModal(false)}
                    onSubmit={updatePassword}
                    passwordError={passwordError}
                    setConfirmPassword={setConfirmPassword}
                    setCurrentPassword={setCurrentPassword}
                    setNewPassword={setNewPassword}
                />
            )}
        </div>
    )
}

export default MyAccountView
