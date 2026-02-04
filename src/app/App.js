import './index.css'
import './App.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import React, { useEffect, useState } from 'react'

import AppInstallPromptModal from '../components/common/AppInstallPromptModal'
import LockedOverlay from '../components/common/LockedOverlay'
import Navigation from '../components/common/Navigation'
import OfflineOverlay from '../components/common/OfflineOverlay'
import TerminatedOverlay from '../components/common/TerminatedOverlay'
import WebOverlay from '../components/common/WebOverlay'
import { supabase } from '../services/DatabaseService'
import { UserService } from '../services/UserService'
import { NetworkUtility } from '../utils/NetworkUtility'
import CalculatorView from '../views/calculator/CalculatorView'
import DashboardView from '../views/dashboard/DashboardView'
import EquipmentsView from '../views/equipment/EquipmentsView'
import LeaderboardsView from '../views/leaderboards/LeaderboardsView'
import ListDetailView from '../views/list/ListDetailView'
import ListView from '../views/list/ListView'
import LoginView from '../views/login/LoginView'
import MaintenanceView from '../views/maintenance/MaintenanceView'
import ManagersView from '../views/managers/ManagersView'
import MixerDetailView from '../views/mixers/MixerDetailView'
import MixersView from '../views/mixers/MixersView'
import MyAccountView from '../views/myaccount/MyAccountView'
import OperatorsView from '../views/operators/OperatorsView'
import PickupTrucksView from '../views/pickup-trucks/PickupTrucksView'
import PlanView from '../views/plan/PlanView'
import PlantsView from '../views/plants/PlantsView'
import RegionsView from '../views/regions/RegionsView'
import ReportsView from '../views/reports/ReportsView'
import RolesView from '../views/roles/RolesView'
import TractorsView from '../views/tractors/TractorsView'
import TrailersView from '../views/trailers/TrailersView'
import { useAuth } from './hooks/useAuth'
import { useOfflineDetection } from './hooks/useOfflineDetection'

const OFFICE_VISIBLE_VIEWS = new Set(['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions', 'Roles'])
const AGGREGATE_HIDDEN_VIEWS = new Set(['Mixers', 'Plants', 'Regions'])
const DEFAULT_HIDDEN_VIEWS = new Set(['Plants', 'Regions'])

function AppContent() {
    const [userId, setUserId] = useState(null)
    const [selectedView, setSelectedView] = useState({ initialStatusFilter: null, view: 'Dashboard' })
    const [title, setTitle] = useState('Dashboard')
    const [selectedMixer, setSelectedMixer] = useState(null)
    const [selectedTractor, setSelectedTractor] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [webViewURL, setWebViewURL] = useState(null)
    const [userDisplayName, setUserDisplayName] = useState('')
    const [isGuestOnly, setIsGuestOnly] = useState(false)
    const [rolesLoaded, setRolesLoaded] = useState(false)
    const [offlineMode, setOfflineMode] = useState(false)
    const [terminatedMode, setTerminatedMode] = useState(false)
    const [regionKey, setRegionKey] = useState(0)

    const { onlineStreakRef, offlineStreakRef, offlineSinceRef } = useOfflineDetection(setOfflineMode)
    useAuth(setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView)

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

    const handleViewSelection = (viewId) => {
        if (isGuestOnly && viewId !== 'Guest') return
        setSelectedView({ initialStatusFilter: null, view: viewId })
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
        setSelectedView({ initialPositionFilter, initialSelectedPlant, initialStatusFilter, view })
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
            <Analytics />
            <SpeedInsights />
        </>
    )
}

export default App
