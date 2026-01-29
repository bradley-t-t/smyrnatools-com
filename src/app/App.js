import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import './index.css'
import './App.css'
import { supabase } from '../services/DatabaseService'
import { UserService } from '../services/UserService'
import { NetworkUtility } from '../utils/NetworkUtility'
import { useVersionPolling } from './hooks/useVersionPolling'
import { useOfflineDetection } from './hooks/useOfflineDetection'
import { useAuth } from './hooks/useAuth'
import Navigation from '../components/common/Navigation'
import VideoBackground from '../components/common/VideoBackground'
import WebOverlay from '../components/common/WebOverlay'
import OfflineOverlay from '../components/common/OfflineOverlay'
import LockedOverlay from '../components/common/LockedOverlay'
import TerminatedOverlay from '../components/common/TerminatedOverlay'
import AppInstallPromptModal from '../components/common/AppInstallPromptModal'
import LoginView from '../views/login/LoginView'
import DashboardView from '../views/dashboard/DashboardView'
import MixersView from '../views/mixers/MixersView'
import MixerDetailView from '../views/mixers/MixerDetailView'
import OperatorsView from '../views/operators/OperatorsView'
import ManagersView from '../views/managers/ManagersView'
import TractorsView from '../views/tractors/TractorsView'
import TrailersView from '../views/trailers/TrailersView'
import EquipmentsView from '../views/equipment/EquipmentsView'
import PickupTrucksView from '../views/pickup-trucks/PickupTrucksView'
import PlantsView from '../views/plants/PlantsView'
import RegionsView from '../views/regions/RegionsView'
import RolesView from '../views/roles/RolesView'
import ListView from '../views/list/ListView'
import ListDetailView from '../views/list/ListDetailView'
import ReportsView from '../views/reports/ReportsView'
import LeaderboardsView from '../views/leaderboards/LeaderboardsView'
import CalculatorView from '../views/calculator/CalculatorView'
import MaintenanceView from '../views/maintenance/MaintenanceView'
import MyAccountView from '../views/myaccount/MyAccountView'

const OFFICE_VISIBLE_VIEWS = new Set(['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions', 'Roles'])
const AGGREGATE_HIDDEN_VIEWS = new Set(['Mixers', 'Plants', 'Regions'])
const DEFAULT_HIDDEN_VIEWS = new Set(['Plants', 'Regions'])

function VersionPopup({ version }) {
    if (!version) return null
    return <div className="version-popup-centered">Version: {version}</div>
}

VersionPopup.propTypes = { version: PropTypes.string }

function UpdateLoadingScreen({ version }) {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const start = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - start
            setProgress((prev) => Math.min(100, prev + Math.floor(Math.random() * 7) + 2))
            if (elapsed >= 15000 && progress >= 100) {
                clearInterval(interval)
                setTimeout(() => window.location.reload(true), 500)
            }
        }, 300)
        return () => clearInterval(interval)
    }, [progress])

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000', zIndex: 99999 }}>
            <VideoBackground />
            <div
                style={{
                    position: 'absolute',
                    bottom: 60,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    zIndex: 10,
                    width: 420,
                    maxWidth: '90%',
                    background: 'rgba(31, 41, 55, 0.85)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 12,
                    padding: '24px 32px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <h1
                    style={{
                        color: '#fff',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        marginBottom: 8,
                        fontFamily: 'Inter, -apple-system, sans-serif'
                    }}
                >
                    Updating Smyrna Tools
                </h1>
                <p
                    style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.875rem',
                        marginBottom: 20,
                        fontFamily: 'Inter, -apple-system, sans-serif'
                    }}
                >
                    Please wait while we apply the latest updates...
                </p>
                <div
                    style={{
                        width: '100%',
                        height: 6,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                        marginBottom: 12
                    }}
                >
                    <div
                        style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #1e40af, #3b82f6)',
                            borderRadius: 3,
                            transition: 'width 0.3s ease'
                        }}
                    />
                </div>
                <span
                    style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.75rem',
                        fontFamily: 'Inter, -apple-system, sans-serif'
                    }}
                >
                    Version {version}
                </span>
            </div>
        </div>
    )
}

UpdateLoadingScreen.propTypes = { version: PropTypes.string }

function UpdateWarningPopup({ onRefreshNow, onClose, latestVersion }) {
    return (
        <div className="global-modal-backdrop" onClick={onClose}>
            <div className="global-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="global-modal-header">
                    <h2>Update Available</h2>
                    <button className="global-close-button" onClick={onClose} aria-label="Close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="global-modal-body">
                    <p>A new version is available.</p>
                    {latestVersion && <p style={{ opacity: 0.8 }}>Version: {latestVersion}</p>}
                    <p>
                        Refresh now to apply the update, or close this popup to keep working. The page will
                        automatically refresh in 5 minutes to apply updates.
                    </p>
                </div>
                <div className="global-modal-footer">
                    <button className="global-action-button" onClick={onClose}>
                        Close
                    </button>
                    <button className="global-action-button primary" onClick={onRefreshNow}>
                        Refresh Now
                    </button>
                </div>
            </div>
        </div>
    )
}

UpdateWarningPopup.propTypes = {
    onRefreshNow: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    latestVersion: PropTypes.string
}

function ScheduledUpdateBanner({ remainingMs, onRefreshNow, onDismiss }) {
    const minutes = Math.max(0, Math.floor(remainingMs / 60000))
    const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000))

    return (
        <div className="global-update-banner">
            <div className="global-banner-content">
                <i className="fas fa-sync global-banner-icon"></i>
                <span>
                    An update is scheduled. The page will refresh in {String(minutes).padStart(2, '0')}:
                    {String(seconds).padStart(2, '0')} to apply updates.
                </span>
            </div>
            <div className="global-banner-actions">
                <button className="global-action-button" onClick={onDismiss}>
                    Dismiss
                </button>
                <button className="global-action-button primary" onClick={onRefreshNow}>
                    Refresh Now
                </button>
            </div>
        </div>
    )
}

ScheduledUpdateBanner.propTypes = {
    remainingMs: PropTypes.number.isRequired,
    onRefreshNow: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired
}

function AppContent() {
    const [userId, setUserId] = useState(null)
    const [selectedView, setSelectedView] = useState({ view: 'Dashboard', initialStatusFilter: null })
    const [title, setTitle] = useState('Dashboard')
    const [selectedMixer, setSelectedMixer] = useState(null)
    const [selectedTractor, setSelectedTractor] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [webViewURL, setWebViewURL] = useState(null)
    const [userDisplayName, setUserDisplayName] = useState('')
    const [currentVersion, setCurrentVersion] = useState('')
    const [latestVersion, setLatestVersion] = useState('')
    const [updateMode, setUpdateMode] = useState(false)
    const [showUpdateWarning, setShowUpdateWarning] = useState(false)
    const [scheduledAt, setScheduledAt] = useState(null)
    const [showScheduledBanner, setShowScheduledBanner] = useState(false)
    const [remainingMs, setRemainingMs] = useState(0)
    const [isGuestOnly, setIsGuestOnly] = useState(false)
    const [rolesLoaded, setRolesLoaded] = useState(false)
    const [offlineMode, setOfflineMode] = useState(false)
    const [terminatedMode, setTerminatedMode] = useState(false)
    const [regionKey, setRegionKey] = useState(0)
    const scheduledTimeoutRef = useRef(null)

    const { onlineStreakRef, offlineStreakRef, offlineSinceRef } = useOfflineDetection(setOfflineMode)
    useAuth(setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView)
    useVersionPolling(
        currentVersion,
        updateMode,
        showUpdateWarning,
        scheduledAt,
        setLatestVersion,
        setShowUpdateWarning
    )

    useEffect(() => {
        fetch('/version.json', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => setCurrentVersion(data.version || ''))
            .catch(() => setCurrentVersion(''))
    }, [])

    useEffect(() => {
        UserService.getCurrentUser().catch(() => {})
    }, [userId])

    useEffect(() => {
        const handleRegionChange = (event) => {
            const regionType = event?.detail?.type
            const view = selectedView?.view

            const isViewAllowed = (v, t) => {
                if (!v || v === 'MyAccount') return true
                if (t === 'Office') return OFFICE_VISIBLE_VIEWS.has(v)
                if (t === 'Aggregate') return !AGGREGATE_HIDDEN_VIEWS.has(v)
                return !DEFAULT_HIDDEN_VIEWS.has(v)
            }

            if (!isViewAllowed(view, regionType)) {
                setSelectedView({ view: 'Dashboard', initialStatusFilter: null })
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
                if (guestOnly) setSelectedView({ view: 'Guest', initialStatusFilter: null })
            } catch (error) {
                console.error('Failed to load user roles:', error)
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
        if (!scheduledAt || updateMode) return

        let raf
        const tick = () => {
            const remaining = Math.max(0, scheduledAt - Date.now())
            setRemainingMs(remaining)
            if (remaining > 0) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => raf && cancelAnimationFrame(raf)
    }, [scheduledAt, updateMode])

    const handleViewSelection = (viewId) => {
        if (isGuestOnly && viewId !== 'Guest') return
        setSelectedView({ view: viewId, initialStatusFilter: null })
        setTitle(viewId === 'Guest' ? 'Access Pending' : viewId)
        if (selectedMixer && viewId !== 'Mixers') setSelectedMixer(null)
        if (selectedTractor && viewId !== 'Tractors') setSelectedTractor(null)
        if (selectedItem && viewId !== 'List') setSelectedItem(null)
    }

    const handleSetSelectedView = (
        view,
        initialStatusFilter = null,
        initialSelectedPlant = null,
        initialPositionFilter = null
    ) => {
        setSelectedView({ view, initialStatusFilter, initialSelectedPlant, initialPositionFilter })
    }

    const startImmediateUpdate = () => {
        if (scheduledTimeoutRef.current) {
            clearTimeout(scheduledTimeoutRef.current)
            scheduledTimeoutRef.current = null
        }
        setShowUpdateWarning(false)
        setShowScheduledBanner(false)
        setUpdateMode(true)
    }

    const scheduleUpdateInFiveMinutes = () => {
        if (scheduledTimeoutRef.current) return
        setShowUpdateWarning(false)
        const at = Date.now() + 5 * 60 * 1000
        setScheduledAt(at)
        setShowScheduledBanner(true)
        scheduledTimeoutRef.current = setTimeout(startImmediateUpdate, 5 * 60 * 1000)
    }

    const handleRetryConnection = async () => {
        if (!navigator.onLine) return
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            onlineStreakRef.current = 0
            offlineStreakRef.current = 0
            offlineSinceRef.current = null
            setOfflineMode(false)
        }
    }

    const handleReloadIfOnline = async () => {
        if (!navigator.onLine) return
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            onlineStreakRef.current = 0
            offlineStreakRef.current = 0
            offlineSinceRef.current = null
            setOfflineMode(false)
            window.location.reload()
        }
    }

    const renderCurrentView = () => {
        if (!userId) return <LoginView />
        if (!rolesLoaded) return null
        if (isGuestOnly) return <LockedOverlay reason="guest-only" />
        if (webViewURL) return <WebOverlay url={webViewURL} onClose={() => setWebViewURL(null)} />

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
    if (updateMode) return <UpdateLoadingScreen version={latestVersion || currentVersion} />
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
                <div key={`view-${regionKey}`}>{renderCurrentView()}</div>
            </Navigation>
            {showUpdateWarning && (
                <UpdateWarningPopup
                    latestVersion={latestVersion}
                    onRefreshNow={startImmediateUpdate}
                    onClose={scheduleUpdateInFiveMinutes}
                />
            )}
            {showScheduledBanner && scheduledAt && !updateMode && (
                <ScheduledUpdateBanner
                    remainingMs={remainingMs}
                    onRefreshNow={startImmediateUpdate}
                    onDismiss={() => setShowScheduledBanner(false)}
                />
            )}
            {offlineMode && <OfflineOverlay onRetry={handleRetryConnection} onReload={handleReloadIfOnline} />}
            {isGuestOnly && <LockedOverlay reason="guest-only" />}
        </div>
    )
}

function App() {
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
            <AppInstallPromptModal />
        </>
    )
}

export default App
