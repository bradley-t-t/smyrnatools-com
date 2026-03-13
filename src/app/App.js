import './App.css'
import './index.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '../services/DatabaseService'
import { UserService } from '../services/UserService'
import { NetworkUtility } from '../utils/NetworkUtility'
import LoginView from '../views/login/LoginView'
import LockedOverlay from './components/common/LockedOverlay'
import Navigation from './components/common/Navigation'
import OfflineOverlay from './components/common/OfflineOverlay'
import TerminatedOverlay from './components/common/TerminatedOverlay'
import TutorialManager from './components/common/TutorialPopup'
import VersionUpdateBanner from './components/common/VersionUpdateBanner'
import WebOverlay from './components/common/WebOverlay'
import { usePreferences } from './context/PreferencesContext'
import { useTutorial } from './context/TutorialContext'
import { useAuthSession } from './hooks/useAuth'
import { useOfflineDetection } from './hooks/useOfflineDetection'
import { useThemeMode } from './hooks/useThemeMode'
import { useVersionCheck } from './hooks/useVersionCheck'
const CHUNK_RELOAD_KEY = 'chunk_reload_attempted'
/** Retries a failed dynamic import once by forcing a full page reload to clear stale chunk hashes. */
const lazyWithRetry = (importer) =>
    lazy(() =>
        importer().catch(() => {
            if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
                sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
                window.location.reload()
            }
            return importer()
        })
    )
const AppInstallPromptModal = lazyWithRetry(() => import('./components/common/AppInstallPromptModal'))
const CalculatorView = lazyWithRetry(() => import('../views/calculator/CalculatorView'))
const DashboardView = lazyWithRetry(() => import('../views/dashboard/DashboardView'))
const DocumentsView = lazyWithRetry(() => import('../views/documents/DocumentsView'))
const EquipmentsView = lazyWithRetry(() => import('../views/assets/equipment/EquipmentsView'))
const LeaderboardsView = lazyWithRetry(() => import('../views/leaderboards/LeaderboardsView'))
const ListDetailView = lazyWithRetry(() => import('../views/list/ListDetailView'))
const ListView = lazyWithRetry(() => import('../views/list/ListView'))
const MaintenanceView = lazyWithRetry(() => import('../views/maintenance/MaintenanceView'))
const ManagersView = lazyWithRetry(() => import('../views/managers/ManagersView'))
const MixerDetailView = lazyWithRetry(() => import('../views/assets/mixers/MixerDetailView'))
const MixersView = lazyWithRetry(() => import('../views/assets/mixers/MixersView'))
const MyAccountView = lazyWithRetry(() => import('../views/myaccount/MyAccountView'))
const OperatorsView = lazyWithRetry(() => import('../views/operators/OperatorsView'))
const PickupTrucksView = lazyWithRetry(() => import('../views/assets/pickup-trucks/PickupTrucksView'))
const PlanView = lazyWithRetry(() => import('../views/plan/PlanView'))
const PlantsView = lazyWithRetry(() => import('../views/plants/PlantsView'))
const RegionsView = lazyWithRetry(() => import('../views/regions/RegionsView'))
const ReportsView = lazyWithRetry(() => import('../views/reports/ReportsView'))
const RolesView = lazyWithRetry(() => import('../views/roles/RolesView'))
const TractorsView = lazyWithRetry(() => import('../views/assets/tractors/TractorsView'))
const TrailersView = lazyWithRetry(() => import('../views/assets/trailers/TrailersView'))
const NotificationsView = lazyWithRetry(() => import('../views/notifications/NotificationsView'))
/** Views only available when region type is "Office". */
const OFFICE_VISIBLE_VIEWS = new Set(['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions', 'Roles'])
/** Views hidden when region type is "Aggregate". */
const AGGREGATE_HIDDEN_VIEWS = new Set(['Mixers', 'Plants', 'Regions'])
/** Views hidden by default (non-Office, non-Aggregate). */
const DEFAULT_HIDDEN_VIEWS = new Set(['Plants', 'Regions'])
/**
 * Main application shell managing authentication state, view routing,
 * region-based view filtering, role checks, and offline/terminated overlays.
 */
function AppContent() {
    const [userId, setUserId] = useState(null)
    const [selectedView, setSelectedView] = useState({ initialStatusFilter: null, view: 'Dashboard' })
    const [title, setTitle] = useState('Dashboard')
    const [selectedMixer, setSelectedMixer] = useState(null)
    const [_selectedTractor, setSelectedTractor] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [webViewURL, setWebViewURL] = useState(null)
    const [userDisplayName, setUserDisplayName] = useState('')
    const [isGuestOnly, setIsGuestOnly] = useState(false)
    const [rolesLoaded, setRolesLoaded] = useState(false)
    const [offlineMode, setOfflineMode] = useState(false)
    const [terminatedMode, setTerminatedMode] = useState(false)
    const [regionKey, setRegionKey] = useState(0)
    const [sessionChecked, setSessionChecked] = useState(false)
    const { onlineStreakRef, offlineStreakRef, offlineSinceRef } = useOfflineDetection(setOfflineMode)
    const { preferences, loading: preferencesLoading } = usePreferences()
    const startPageAppliedRef = useRef(false)
    useAuthSession(setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView, setSessionChecked)
    useThemeMode()
    const { triggerTutorial } = useTutorial()
    useEffect(() => {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    }, [])
    // Navigate to user's preferred start page once preferences load
    useEffect(() => {
        if (startPageAppliedRef.current || preferencesLoading || !userId || !rolesLoaded || isGuestOnly) return
        const page = preferences.startPage
        if (page && page !== 'Dashboard') {
            setSelectedView({ initialStatusFilter: null, view: page })
        }
        startPageAppliedRef.current = true
    }, [preferencesLoading, userId, rolesLoaded, isGuestOnly, preferences.startPage])
    useEffect(() => {
        if (userId && rolesLoaded) {
            triggerTutorial('account-nav-hint', 2000)
        }
    }, [userId, rolesLoaded, triggerTutorial])
    useEffect(() => {
        UserService.getCurrentUser().catch(() => {})
    }, [userId])
    useEffect(() => {
        const handleRegionChange = (event) => {
            const regionType = event?.detail?.type
            const view = selectedView?.view
            const isViewAllowed = (v, t) => {
                if (!v || v === 'MyAccount' || v === 'Notifications') return true
                if (t === 'Office') return OFFICE_VISIBLE_VIEWS.has(v)
                if (t === 'Aggregate') return !AGGREGATE_HIDDEN_VIEWS.has(v)
                return !DEFAULT_HIDDEN_VIEWS.has(v)
            }
            if (!isViewAllowed(view, regionType)) {
                setSelectedView({ initialStatusFilter: null, view: 'Dashboard' })
            }
            setRegionKey((prev) => prev + 1)
        }
        window.addEventListener('region-changed', handleRegionChange)
        return () => window.removeEventListener('region-changed', handleRegionChange)
    }, [selectedView])
    useEffect(() => {
        if (!userId || rolesLoaded) return
        let cancelled = false
        const loadRoles = async () => {
            try {
                const roles = await UserService.getUserRoles(userId)
                if (cancelled) return
                if (roles?.some((r) => r?.name?.toLowerCase() === 'terminated')) {
                    setTerminatedMode(true)
                    setRolesLoaded(true)
                    return
                }
                const guestOnly = roles.length > 0 && roles.every((r) => r?.name?.toLowerCase() === 'guest')
                setIsGuestOnly(guestOnly)
                setRolesLoaded(true)
                if (guestOnly) setSelectedView({ initialStatusFilter: null, view: 'Guest' })
            } catch (err) {
                if (!cancelled) {
                    setIsGuestOnly(false)
                    setRolesLoaded(true)
                }
            }
        }
        loadRoles()
        return () => {
            cancelled = true
        }
    }, [userId, rolesLoaded])
    useEffect(() => {
        if (!userId) return
        supabase
            .from('users_profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single()
            .then(({ data, error }) => {
                if (!error && data) {
                    const name = `${data.first_name || ''} ${data.last_name || ''}`.trim()
                    if (name) {
                        setTitle(`Welcome, ${name}`)
                        setUserDisplayName(name)
                    } else {
                        setUserDisplayName(userId.substring(0, 8))
                    }
                }
            })
    }, [userId])
    useEffect(() => {
        document.querySelectorAll('[data-content-scroll]').forEach((el) => el.scrollTo(0, 0))
    }, [selectedView.view])
    const handleViewSelection = useCallback(
        (viewId, options = {}) => {
            if (isGuestOnly && viewId !== 'Guest') return
            setSelectedView({
                initialConversationId: options.initialConversationId || null,
                initialStatusFilter: null,
                view: viewId
            })
            setTitle(viewId === 'Guest' ? 'Access Pending' : viewId)
            setSelectedMixer((prev) => (prev && viewId !== 'Mixers' ? null : prev))
            setSelectedTractor((prev) => (prev && viewId !== 'Tractors' ? null : prev))
            setSelectedItem((prev) => (prev && viewId !== 'List' ? null : prev))
        },
        [isGuestOnly]
    )
    const handleSetSelectedView = useCallback(
        (view, initialStatusFilter = null, initialSelectedPlant = null, initialPositionFilter = null) => {
            setSelectedView({ initialPositionFilter, initialSelectedPlant, initialStatusFilter, view })
        },
        []
    )
    const handleRetryConnection = useCallback(async () => {
        if (!navigator.onLine) return
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            onlineStreakRef.current = 0
            offlineStreakRef.current = 0
            offlineSinceRef.current = null
            setOfflineMode(false)
        }
    }, [onlineStreakRef, offlineStreakRef, offlineSinceRef])
    const handleReloadIfOnline = useCallback(async () => {
        if (!navigator.onLine) return
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            onlineStreakRef.current = 0
            offlineStreakRef.current = 0
            offlineSinceRef.current = null
            setOfflineMode(false)
            window.location.reload()
        }
    }, [onlineStreakRef, offlineStreakRef, offlineSinceRef])
    const handleCloseWebView = useCallback(() => setWebViewURL(null), [])
    const renderCurrentView = () => {
        if (!userId) return <LoginView />
        if (!rolesLoaded) return null
        if (isGuestOnly) return null
        if (webViewURL) return <WebOverlay url={webViewURL} onClose={handleCloseWebView} />
        switch (selectedView.view) {
            case 'Dashboard':
                return <DashboardView />
            case 'Mixers':
                if (selectedMixer) {
                    return (
                        <MixerDetailView
                            mixerId={selectedMixer}
                            onClose={() => {
                                setSelectedMixer(null)
                                setTitle('Mixers')
                            }}
                        />
                    )
                }
                return (
                    <MixersView
                        onSelectMixer={(id) => {
                            if (id) {
                                setSelectedMixer(id)
                                setTitle('Mixer Details')
                            }
                        }}
                        setSelectedView={handleSetSelectedView}
                    />
                )
            case 'Operators':
                return (
                    <OperatorsView
                        title={title}
                        initialStatusFilter={selectedView.initialStatusFilter}
                        initialSelectedPlant={selectedView.initialSelectedPlant}
                        initialPositionFilter={selectedView.initialPositionFilter}
                    />
                )
            case 'Managers':
                return <ManagersView title={title} />
            case 'Tractors':
                return (
                    <TractorsView
                        title="Tractor Fleet"
                        onSelectTractor={setSelectedTractor}
                        setSelectedView={handleSetSelectedView}
                    />
                )
            case 'Trailers':
                return <TrailersView title="Trailer Fleet" onSelectTrailer={() => {}} />
            case 'Heavy Equipment':
                return <EquipmentsView title="Equipment Fleet" onSelectEquipment={() => {}} />
            case 'Pickup Trucks':
                return <PickupTrucksView title="Pickup Trucks" />
            case 'Plants':
                return <PlantsView title="Plants" />
            case 'Regions':
                return <RegionsView title="Regions" />
            case 'Roles':
                return <RolesView />
            case 'List':
                if (selectedItem)
                    return (
                        <ListDetailView
                            key={`detail-${selectedItem}`}
                            itemId={selectedItem}
                            onClose={() => setSelectedItem(null)}
                        />
                    )
                return <ListView key="list-view" title="Tasks List" onSelectItem={setSelectedItem} />
            case 'Archive':
                return <ListView title="Archived Items" showArchived />
            case 'Reports':
                return <ReportsView />
            case 'Leaderboards':
                return <LeaderboardsView />
            case 'Calculators':
                return <CalculatorView />
            case 'Maintenance':
                return <MaintenanceView />
            case 'MyAccount': {
                const effectiveUserId = userId || sessionStorage.getItem('userId')
                return effectiveUserId ? <MyAccountView userId={effectiveUserId} /> : <LoginView />
            }
            case 'Documents':
                return <DocumentsView />
            case 'Notifications':
                return (
                    <NotificationsView
                        userId={userId}
                        initialConversationId={selectedView.initialConversationId || null}
                    />
                )
            case 'Plan':
                return <PlanView title="My Plan" />
            default:
                return (
                    <div className="coming-soon">
                        <h2>{selectedView.view} view is coming soon!</h2>
                        <p>This feature is under development.</p>
                    </div>
                )
        }
    }
    if (terminatedMode) return <TerminatedOverlay />
    if (!sessionChecked) return null
    if (!userId) return <div className="App">{renderCurrentView()}</div>
    if (!rolesLoaded) return null
    return (
        <div className="App">
            <Navigation
                selectedView={selectedView.view}
                onSelectView={handleViewSelection}
                onExternalLink={setWebViewURL}
                userName={userDisplayName}
                userDisplayName={userDisplayName}
                userId={userId}
            >
                <Suspense fallback={null}>
                    <div key={`view-${regionKey}`}>{renderCurrentView()}</div>
                </Suspense>
            </Navigation>
            {offlineMode && <OfflineOverlay onRetry={handleRetryConnection} onReload={handleReloadIfOnline} />}
            {isGuestOnly && <LockedOverlay reason="guest-only" />}
        </div>
    )
}
/**
 * Root application component wrapping AppContent with global providers,
 * analytics, speed insights, install prompt, and tutorial manager.
 */
function App() {
    const { hasUpdate, dismiss } = useVersionCheck()
    useEffect(() => {
        document.documentElement.style.overflowX = 'hidden'
        document.body.style.overflowX = 'hidden'
        return () => {
            document.documentElement.style.overflowX = ''
            document.body.style.overflowX = ''
        }
    }, [])
    return (
        <>
            <AppContent />
            <Suspense fallback={null}>
                <AppInstallPromptModal />
            </Suspense>
            <TutorialManager />
            {hasUpdate && <VersionUpdateBanner onDismiss={dismiss} />}
            <Analytics />
            <SpeedInsights />
        </>
    )
}
export default App
