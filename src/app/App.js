import React, {useEffect, useRef, useState} from 'react'
import PropTypes from 'prop-types'
import './index.css'
import './App.css'
import {supabase} from '../services/DatabaseService'
import MixersView from '../views/mixers/MixersView'
import ManagersView from '../views/managers/ManagersView'
import SettingsView from '../views/settings/SettingsView'
import MixerDetailView from '../views/mixers/MixerDetailView'
import OperatorsView from '../views/operators/OperatorsView'
import LoginView from '../views/login/LoginView'
import MyAccountView from '../views/myaccount/MyAccountView'
import Navigation from "../components/common/Navigation"
import ListView from '../views/list/ListView'
import WebOverlay from "../components/common/WebOverlay"
import {UserService} from "../services/UserService"
import OnlineUsersOverlay from '../components/common/OnlineUsersOverlay'
import TipBanner from '../components/common/TipBanner'
import ReportsView from '../views/reports/ReportsView'
import TractorsView from '../views/tractors/TractorsView'
import TrailersView from '../views/trailers/TrailersView'
import EquipmentsView from '../views/equipment/EquipmentsView'
import '../styles/Theme.css'
import '../styles/Global.css'
import PlantsView from '../views/plants/PlantsView'
import RegionsView from '../views/regions/RegionsView'
import RolesView from '../views/roles/RolesView'
import LockedOverlay from '../components/common/LockedOverlay'
import TerminatedOverlay from '../components/common/TerminatedOverlay'
import DesktopOnlyOverlay from '../components/common/DesktopOnlyOverlay'
import PickupTrucksView from '../views/pickup-trucks/PickupTrucksView'
import DashboardView from '../views/dashboard/DashboardView'
import OfflineOverlay from '../components/common/OfflineOverlay'
import {NetworkUtility} from '../utils/NetworkUtility'
import ListDetailView from '../views/list/ListDetailView'
import LeaderboardsView from '../views/leaderboards/LeaderboardsView'

function VersionPopup({version}) {
    if (!version) return null
    return (
        <div className="version-popup-centered">Version: {version}</div>
    )
}

VersionPopup.propTypes = {version: PropTypes.string}

function UpdateLoadingScreen({version}) {
    const [progress, setProgress] = useState(0)
    useEffect(() => {
        const start = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - start
            const minDuration = 15000
            const randomStep = Math.floor(Math.random() * 7) + 2
            setProgress(prev => Math.min(100, prev + randomStep))
            if (elapsed >= minDuration && progress >= 100) {
                clearInterval(interval)
                setTimeout(() => {
                    window.location.reload(true)
                }, 500)
            }
        }, 300)
        return () => clearInterval(interval)
    }, [progress])
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: '#111827',
            zIndex: 99999
        }}>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '177.78vh',
                height: '100vh',
                minWidth: '100vw',
                minHeight: '56.25vw',
                pointerEvents: 'none'
            }}>
                <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/aBsTqfRqgiU?autoplay=1&mute=1&start=2&loop=1&playlist=aBsTqfRqgiU&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3"
                    title="Update Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    style={{display: 'block', pointerEvents: 'none'}}
                />
            </div>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(17, 24, 39, 0.7)',
                pointerEvents: 'none'
            }}/>
            <div style={{
                position: 'absolute',
                bottom: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                zIndex: 10,
                width: '420px',
                maxWidth: '90%',
                background: 'rgba(31, 41, 55, 0.85)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                padding: '24px 32px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h1 style={{
                    color: '#fff',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    marginBottom: '8px',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>Updating Smyrna Tools</h1>
                <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.875rem',
                    marginBottom: '20px',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>Please wait while we apply the latest updates...</p>
                <div style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                    marginBottom: '12px'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #1e40af, #3b82f6)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                    }}/>
                </div>
                <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.75rem',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>Version {version}</span>
            </div>
        </div>
    )
}

UpdateLoadingScreen.propTypes = {version: PropTypes.string}

function UpdateWarningPopup({onRefreshNow, onClose, latestVersion}) {
    return (
        <div className="global-modal-backdrop" onClick={onClose}>
            <div className="global-modal-content" onClick={e => e.stopPropagation()}>
                <div className="global-modal-header">
                    <h2>Update Available</h2>
                    <button className="global-close-button" onClick={onClose} aria-label="Close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="global-modal-body">
                    <p>A new version is available.</p>
                    {latestVersion ? <p style={{opacity: 0.8}}>Version: {latestVersion}</p> : null}
                    <p>Refresh now to apply the update, or close this popup to keep working. The page will automatically
                        refresh in 5 minutes to apply updates.</p>
                </div>
                <div className="global-modal-footer">
                    <button className="global-action-button" onClick={onClose} aria-label="Close">Close</button>
                    <button className="global-action-button primary" onClick={onRefreshNow}
                            aria-label="Refresh Now">Refresh
                        Now
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

function ScheduledUpdateBanner({remainingMs, onRefreshNow, onDismiss}) {
    const minutes = Math.max(0, Math.floor(remainingMs / 60000))
    const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000))
    return (
        <div className="global-update-banner">
            <div className="global-banner-content">
                <i className="fas fa-sync global-banner-icon"></i>
                <span>An update is scheduled. The page will refresh in {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')} to apply updates.</span>
            </div>
            <div className="global-banner-actions">
                <button className="global-action-button" onClick={onDismiss} aria-label="Dismiss">Dismiss</button>
                <button className="global-action-button primary" onClick={onRefreshNow} aria-label="Refresh Now">Refresh
                    Now
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
    const [selectedView, setSelectedView] = useState({view: 'Dashboard', initialStatusFilter: null})
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [title, setTitle] = useState('Dashboard')
    const [selectedMixer, setSelectedMixer] = useState(null)
    const [selectedTractor, setSelectedTractor] = useState(null)
    const [webViewURL, setWebViewURL] = useState(null)
    const [userDisplayName, setUserDisplayName] = useState('')
    const [currentVersion, setCurrentVersion] = useState('')
    const [updateMode, setUpdateMode] = useState(false)
    const [latestVersion, setLatestVersion] = useState('')
    const [isGuestOnly, setIsGuestOnly] = useState(false)
    const [rolesLoaded, setRolesLoaded] = useState(false)
    const [showUpdateWarning, setShowUpdateWarning] = useState(false)
    const [scheduledAt, setScheduledAt] = useState(null)
    const scheduledTimeoutRef = useRef(null)
    const [showScheduledBanner, setShowScheduledBanner] = useState(false)
    const [remainingMs, setRemainingMs] = useState(0)
    const [offlineMode, setOfflineMode] = useState(false)
    const [terminatedMode, setTerminatedMode] = useState(false)
    const onlineStreakRef = useRef(0)
    const offlineStreakRef = useRef(0)
    const offlineSinceRef = useRef(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [regionKey, setRegionKey] = useState(0)

    useEffect(() => {
        fetch('/version.json', {cache: 'no-store'}).then(res => res.json()).then(data => setCurrentVersion(data.version || '')).catch(() => setCurrentVersion(''))
    }, [])

    useEffect(() => {
        let intervalId

        function pollVersion() {
            fetch(`/version.json?t=${Date.now()}`, {cache: 'no-store'}).then(res => res.json()).then(data => {
                if (data.version && currentVersion && compareVersions(data.version, currentVersion) > 0) {
                    setLatestVersion(data.version)
                    if (!updateMode && !showUpdateWarning && !scheduledAt) setShowUpdateWarning(true)
                }
            }).catch((error) => {
                console.error('Failed to poll version:', error)
            })
        }

        if (currentVersion) intervalId = setInterval(pollVersion, 30000)
        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [currentVersion, updateMode, showUpdateWarning, scheduledAt])

    function compareVersions(a, b) {
        const pa = a.split('.').map(Number)
        const pb = b.split('.').map(Number)
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const na = pa[i] || 0
            const nb = pb[i] || 0
            if (na > nb) return 1
            if (na < nb) return -1
        }
        return 0
    }

    useEffect(() => {
        UserService.getCurrentUser().catch(() => {
        })
    }, [userId])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const OFFLINE_THRESHOLD = 2
        const ONLINE_THRESHOLD = 3
        const MIN_OFFLINE_MS = 10000
        const POLL_MS = 4000
        let cancelled = false
        const evalStatus = (ok) => {
            const browserOnline = navigator.onLine
            if (ok && browserOnline) {
                offlineStreakRef.current = 0
                onlineStreakRef.current += 1
                const dwellMet = !offlineSinceRef.current || (Date.now() - offlineSinceRef.current) >= MIN_OFFLINE_MS
                if (onlineStreakRef.current >= ONLINE_THRESHOLD && dwellMet) {
                    offlineSinceRef.current = null
                    setOfflineMode(false)
                }
            } else {
                onlineStreakRef.current = 0
                offlineStreakRef.current += 1
                if (offlineStreakRef.current >= OFFLINE_THRESHOLD) {
                    if (!offlineSinceRef.current) offlineSinceRef.current = Date.now()
                    setOfflineMode(true)
                }
            }
        }
        const check = async () => {
            const ok = await NetworkUtility.checkConnection()
            if (!cancelled) evalStatus(ok)
        }
        const handleOnline = () => {
            check()
        }
        const handleOffline = () => {
            onlineStreakRef.current = 0
            offlineStreakRef.current = OFFLINE_THRESHOLD
            if (!offlineSinceRef.current) offlineSinceRef.current = Date.now()
            setOfflineMode(true)
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        check()
        const intervalId = setInterval(check, POLL_MS)
        return () => {
            cancelled = true
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearInterval(intervalId)
        }
    }, [])

    useEffect(() => {
        const handleSignOut = () => {
            setUserId(null)
            setSelectedView({view: 'Dashboard', initialStatusFilter: null})
            setIsGuestOnly(false)
            setRolesLoaded(false)
        }
        window.addEventListener('authSignOut', handleSignOut)
        return () => window.removeEventListener('authSignOut', handleSignOut)
    }, [])

    useEffect(() => {
        const handleRegionChange = (event) => {
            const newRegion = event?.detail || {}
            const regionType = newRegion?.type
            const view = selectedView?.view
            const OFFICE_VISIBLE_ITEMS = new Set(['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions', 'Roles'])
            const AGGREGATE_HIDDEN_ITEMS = new Set(['Mixers', 'Plants', 'Regions'])
            const DEFAULT_HIDDEN_ITEMS = new Set(['Plants', 'Regions'])

            const isViewAllowedInRegion = (v, t) => {
                if (!v) return true
                if (v === 'Settings' || v === 'MyAccount') return true
                if (t === 'Office') return OFFICE_VISIBLE_ITEMS.has(v)
                if (t === 'Aggregate') return !AGGREGATE_HIDDEN_ITEMS.has(v)
                return !DEFAULT_HIDDEN_ITEMS.has(v)
            }

            if (!isViewAllowedInRegion(view, regionType)) {
                setSelectedView({view: 'Dashboard', initialStatusFilter: null})
            }

            setRegionKey(prev => prev + 1)
        }
        window.addEventListener('region-changed', handleRegionChange)
        return () => window.removeEventListener('region-changed', handleRegionChange)
    }, [selectedView])

    useEffect(() => {
        const storedUserId = sessionStorage.getItem('userId')
        if (storedUserId) {
            setUserId(storedUserId)
        }

        const handleAuthSuccess = (event) => {
            const userId = event.detail?.userId || sessionStorage.getItem('userId')
            if (userId) {
                setUserId(userId)
            }
        }

        window.addEventListener('authSuccess', handleAuthSuccess)

        return () => {
            window.removeEventListener('authSuccess', handleAuthSuccess)
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadRoles() {
            if (!userId) {
                setRolesLoaded(false)
                return
            }

            if (rolesLoaded) {
                return
            }

            try {
                const roles = await UserService.getUserRoles(userId)
                if (cancelled) return

                const isTerminated = roles && roles.some(r => (r?.name || '').toLowerCase() === 'terminated')

                if (isTerminated) {
                    setTerminatedMode(true)
                    setRolesLoaded(true)
                    return
                }

                const guestOnly = roles.length > 0 && roles.every(r => (r?.name || '').toLowerCase() === 'guest')
                setIsGuestOnly(guestOnly)
                setRolesLoaded(true)
                if (guestOnly) setSelectedView({view: 'Guest', initialStatusFilter: null})
            } catch (error) {
                console.error('Failed to load user roles:', error)
                if (!cancelled) {
                    setIsGuestOnly(false)
                    setRolesLoaded(true)
                }
            }
        }

        if (userId && !rolesLoaded) {
            loadRoles()
        }

        return () => {
            cancelled = true
        }
    }, [userId, rolesLoaded])

    const fetchUserProfile = async (userId) => {
        const {
            data,
            error
        } = await supabase.from('users_profiles').select('first_name, last_name').eq('id', userId).single()
        if (!error && data && (data.first_name || data.last_name)) setTitle(`Welcome, ${data.first_name || ''} ${data.last_name || ''}`.trim())
    }

    useEffect(() => {
        if (userId) fetchUserProfile(userId)
    }, [userId])

    useEffect(() => {
        if (!userId) return
        const getUserData = async () => {
            const {
                data,
                error
            } = await supabase.from('users_profiles').select('first_name, last_name').eq('id', userId).single()
            if (!error && data && (data.first_name || data.last_name)) setUserDisplayName(`${data.first_name || ''} ${data.last_name || ''}`.trim())
            else setUserDisplayName(userId.substring(0, 8))
        }
        getUserData()
    }, [userId])

    useEffect(() => {
        let raf
        if (scheduledAt && !updateMode) {
            const tick = () => {
                const now = Date.now()
                const remaining = Math.max(0, scheduledAt - now)
                setRemainingMs(remaining)
                if (remaining > 0) raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
        }
        return () => {
            if (raf) cancelAnimationFrame(raf)
        }
    }, [scheduledAt, updateMode])

    const handleViewSelection = (viewId) => {
        if (isGuestOnly && viewId !== 'Guest') return
        setSelectedView({view: viewId, initialStatusFilter: null})
        if (viewId === 'Guest') setTitle('Access Pending')
        else setTitle(viewId)
        if (selectedMixer && viewId !== 'Mixers') setSelectedMixer(null)
        if (selectedTractor && viewId !== 'Tractors') setSelectedTractor(null)
        if (selectedItem && viewId !== 'List') setSelectedItem(null)
    }

    const handleSetSelectedView = (view, initialStatusFilter = null, initialSelectedPlant = null, initialPositionFilter = null) => setSelectedView({
        view,
        initialStatusFilter,
        initialSelectedPlant,
        initialPositionFilter
    })

    const handleExternalLink = (url) => setWebViewURL(url)

    const renderCurrentView = () => {
        if (!userId) return <LoginView/>
        if (!rolesLoaded) return null
        if (isGuestOnly) return <LockedOverlay reason="guest-only"/>
        if (webViewURL) return <WebOverlay url={webViewURL} onClose={() => setWebViewURL(null)}/>
        if (selectedView.view === 'Plants') return <PlantsView title="Plants"/>
        if (selectedView.view === 'Regions') return <RegionsView title="Regions"/>
        if (selectedView.view === 'Dashboard') return <DashboardView/>
        switch (selectedView.view) {
            case 'Dashboard':
                return <DashboardView/>
            case 'Mixers': {
                if (selectedMixer) {
                    try {
                        return <MixerDetailView mixerId={selectedMixer} onClose={() => {
                            setSelectedMixer(null);
                            setTitle('Mixers')
                        }}/>
                    } catch {
                        setSelectedMixer(null);
                        setTitle('Mixers')
                    }
                }
                return <MixersView onSelectMixer={(mixerId) => {
                    if (mixerId) {
                        setSelectedMixer(mixerId);
                        setTitle('Mixer Details')
                    }
                }} setSelectedView={handleSetSelectedView}/>
            }
            case 'Operators':
                return <OperatorsView title={title} initialStatusFilter={selectedView.initialStatusFilter}
                                      initialSelectedPlant={selectedView.initialSelectedPlant}
                                      initialPositionFilter={selectedView.initialPositionFilter}/>
            case 'Managers':
                return <ManagersView title={title}/>
            case 'List': {
                if (selectedItem) {
                    return <ListDetailView itemId={selectedItem} onClose={() => setSelectedItem(null)}/>
                }
                return <ListView title="Tasks List" onSelectItem={setSelectedItem}/>
            }
            case 'Archive':
                return <ListView title="Archived Items" showArchived/>
            case 'MyAccount': {
                const effectiveUserId = userId || sessionStorage.getItem('userId')
                return effectiveUserId ? <MyAccountView userId={effectiveUserId}/> : <LoginView/>
            }
            case 'Settings':
                return <SettingsView/>
            case 'Reports':
                return <ReportsView/>
            case 'Tractors':
                return <TractorsView title="Tractor Fleet" onSelectTractor={setSelectedTractor}
                                     setSelectedView={handleSetSelectedView}/>
            case 'Trailers':
                return <TrailersView title="Trailer Fleet" onSelectTrailer={() => {
                }}/>
            case 'Pickup Trucks':
                return <PickupTrucksView title="Pickup Trucks"/>
            case 'Heavy Equipment':
                return <EquipmentsView title="Equipment Fleet" onSelectEquipment={() => {
                }}/>
            case 'Roles':
                return <RolesView/>
            case 'Leaderboards':
                return <LeaderboardsView/>
            default:
                return <div className="coming-soon"><h2>{selectedView.view} view is coming soon!</h2><p>This feature is
                    under
                    development.</p></div>
        }
    }

    const startImmediateUpdate = () => {
        if (scheduledTimeoutRef.current) {
            clearTimeout(scheduledTimeoutRef.current);
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
        scheduledTimeoutRef.current = setTimeout(() => {
            startImmediateUpdate()
        }, 5 * 60 * 1000)
    }

    const dismissScheduledBanner = () => setShowScheduledBanner(false)

    const handleRetryConnection = async () => {
        const browserOnline = navigator.onLine
        if (!browserOnline) return
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            onlineStreakRef.current = 0
            offlineStreakRef.current = 0
            offlineSinceRef.current = null
            setOfflineMode(false)
        }
    }

    const handleReloadIfOnline = async () => {
        const browserOnline = navigator.onLine
        if (!browserOnline) return
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            onlineStreakRef.current = 0
            offlineStreakRef.current = 0
            offlineSinceRef.current = null
            setOfflineMode(false)
            window.location.reload()
        }
    }

    if (terminatedMode) return <><TerminatedOverlay/></>
    if (isMobile) return <><DesktopOnlyOverlay/></>
    if (updateMode) return <><UpdateLoadingScreen version={latestVersion || currentVersion}/></>
    if (!userId) return (<div className="App">{renderCurrentView()}</div>)
    if (!rolesLoaded) return null

    return (
        <div className="App">
            <Navigation
                selectedView={selectedView.view}
                onSelectView={handleViewSelection}
                onExternalLink={handleExternalLink}
                userName={userDisplayName}
                userDisplayName={userDisplayName}
                userId={userId}
            >
                <div key={`view-${regionKey}`}>
                    {renderCurrentView()}
                </div>
            </Navigation>
            {showUpdateWarning && (<UpdateWarningPopup latestVersion={latestVersion} onRefreshNow={startImmediateUpdate}
                                                       onClose={scheduleUpdateInFiveMinutes}/>)}
            {showScheduledBanner && scheduledAt && !updateMode && (
                <ScheduledUpdateBanner remainingMs={remainingMs} onRefreshNow={startImmediateUpdate}
                                       onDismiss={dismissScheduledBanner}/>)}
            {offlineMode && <OfflineOverlay onRetry={handleRetryConnection} onReload={handleReloadIfOnline}/>}
            {isGuestOnly && <LockedOverlay reason="guest-only"/>}
        </div>
    )
}

function App() {
    React.useEffect(() => {
        document.documentElement.style.overflowX = 'hidden'
        document.body.style.overflowX = 'hidden'
        return () => {
            document.documentElement.style.overflowX = ''
            document.body.style.overflowX = ''
        }
    }, [])
    return (
        <>
            <AppContent/>
            <div style={{position: 'relative', zIndex: 9999}}><OnlineUsersOverlay/><TipBanner/></div>
        </>
    )
}

export default App
